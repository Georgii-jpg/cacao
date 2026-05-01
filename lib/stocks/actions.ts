"use server";
// Server Actions du module Stocks.
// Workflow : BROUILLON → SOUMIS → VALIDE | REJETE → (resoumission possible).
// Règle métier : un non-admin ne peut pas valider sa propre saisie.
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/db/prisma";
import { exigerAuth } from "@/lib/auth/require";
import {
  filtreMagasinPourUtilisateur,
  permissions,
  type RoleApp,
} from "@/lib/auth/permissions";
import {
  schemaSaisieStock,
  schemaRejet,
} from "@/lib/validations/stock";
import { dateMetier } from "./queries";

export type EtatActionStock = {
  ok: boolean;
  erreur: string | null;
  erreursChamps?: Record<string, string>;
  /// id de la fiche après l'action (pour redirection client)
  stockId?: string;
};

const ETAT_VIDE: EtatActionStock = { ok: false, erreur: null };

function aplatErreurs(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const champ = issue.path.join(".") || "_";
    if (!out[champ]) out[champ] = issue.message;
  }
  return out;
}

function entreesDepuisFormData(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

/**
 * Vérifie que l'utilisateur a accès au magasin selon sa portée de rôle.
 */
async function verifierAccesMagasin(
  ctx: {
    role: RoleApp | undefined;
    magasinId: string | null | undefined;
    regionId: string | null | undefined;
  },
  magasinId: string,
): Promise<boolean> {
  const portee = filtreMagasinPourUtilisateur({
    role: ctx.role,
    magasinId: ctx.magasinId ?? null,
    regionId: ctx.regionId ?? null,
  });
  if (portee === null) return false;
  const m = await prisma.magasin.findFirst({
    where: { id: magasinId, ...portee },
    select: { id: true },
  });
  return m !== null;
}

// ─── Saisie / mise à jour d'une fiche ──────────────────────────────────

/**
 * Crée ou met à jour une fiche journalière (BROUILLON).
 * Si la fiche existe en VALIDE/SOUMIS, la modification est refusée
 * (sauf cas spécifique d'un admin qui souhaiterait corriger — pour le MVP
 * on impose le rejet+resoumission).
 */
export async function enregistrerStock(
  _prev: EtatActionStock,
  formData: FormData,
): Promise<EtatActionStock> {
  const session = await exigerAuth();
  const role = session.user.role as RoleApp | undefined;
  if (!permissions.saisirStock(role)) {
    return { ...ETAT_VIDE, erreur: "Vous n'avez pas la permission de saisir un stock." };
  }

  const parsed = schemaSaisieStock.safeParse(entreesDepuisFormData(formData));
  if (!parsed.success) {
    return {
      ...ETAT_VIDE,
      erreur: "Veuillez corriger les erreurs du formulaire.",
      erreursChamps: aplatErreurs(parsed.error),
    };
  }
  const data = parsed.data;
  const dateJ = dateMetier(data.date);

  // Vérifier l'accès au magasin
  const ctxAcces = {
    role,
    magasinId: session.user.magasinId,
    regionId: session.user.regionId,
  };
  if (!(await verifierAccesMagasin(ctxAcces, data.magasinId))) {
    return { ...ETAT_VIDE, erreur: "Magasin hors de votre périmètre." };
  }

  // Calcul serveur de la clôture
  const cloture = Math.max(
    0,
    data.stockOuvertureKg + data.entreesKg - data.sortiesKg,
  );

  // Cherche la fiche existante (par id si fourni, sinon par triplet unique)
  const existant = data.id
    ? await prisma.stock.findUnique({ where: { id: data.id } })
    : await prisma.stock.findUnique({
        where: {
          magasinId_produitId_date: {
            magasinId: data.magasinId,
            produitId: data.produitId,
            date: dateJ,
          },
        },
      });

  // Garde-fous workflow : on ne modifie pas un VALIDE ni un SOUMIS via cette action
  if (existant && (existant.statut === "VALIDE" || existant.statut === "SOUMIS")) {
    return {
      ...ETAT_VIDE,
      erreur:
        existant.statut === "VALIDE"
          ? "Cette fiche est déjà validée et ne peut plus être modifiée."
          : "Cette fiche est en attente de validation : impossible de la modifier sans la rejeter d'abord.",
      stockId: existant.id,
    };
  }

  // Sauvegarde
  let stock;
  if (existant) {
    stock = await prisma.stock.update({
      where: { id: existant.id },
      data: {
        stockOuvertureKg: data.stockOuvertureKg,
        entreesKg: data.entreesKg,
        sortiesKg: data.sortiesKg,
        stockClotureKg: cloture,
        humiditeMoyenne: data.humiditeMoyenne ?? null,
        notesQualite: data.notesQualite ?? null,
        // Reprise après rejet : on remet en BROUILLON et on efface le motif
        statut: "BROUILLON",
        motifRejet: null,
        valideParId: null,
        valideLe: null,
      },
    });
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "MODIFICATION",
        entite: "Stock",
        entiteId: stock.id,
        ancienneValeur: JSON.stringify(existant),
        nouvelleValeur: JSON.stringify(data),
      },
    });
  } else {
    stock = await prisma.stock.create({
      data: {
        magasinId: data.magasinId,
        produitId: data.produitId,
        date: dateJ,
        stockOuvertureKg: data.stockOuvertureKg,
        entreesKg: data.entreesKg,
        sortiesKg: data.sortiesKg,
        stockClotureKg: cloture,
        humiditeMoyenne: data.humiditeMoyenne ?? null,
        notesQualite: data.notesQualite ?? null,
        statut: "BROUILLON",
        saisiParId: session.user.id,
        saisiLe: new Date(),
      },
    });
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATION",
        entite: "Stock",
        entiteId: stock.id,
        nouvelleValeur: JSON.stringify(data),
      },
    });
  }

  revalidatePath("/stocks");
  revalidatePath("/stocks/historique");
  revalidatePath(`/stocks/${stock.id}`);
  revalidatePath(`/magasins/${data.magasinId}`);
  revalidatePath("/dashboard");

  return { ok: true, erreur: null, stockId: stock.id };
}

// ─── Workflow : SOUMETTRE ──────────────────────────────────────────────

export async function soumettreStock(stockId: string): Promise<EtatActionStock> {
  const session = await exigerAuth();
  const role = session.user.role as RoleApp | undefined;

  const stock = await prisma.stock.findUnique({ where: { id: stockId } });
  if (!stock) return { ...ETAT_VIDE, erreur: "Fiche introuvable." };

  // Vérifier la portée
  if (
    !(await verifierAccesMagasin(
      { role, magasinId: session.user.magasinId, regionId: session.user.regionId },
      stock.magasinId,
    ))
  ) {
    return { ...ETAT_VIDE, erreur: "Fiche hors de votre périmètre." };
  }

  if (stock.statut !== "BROUILLON" && stock.statut !== "REJETE") {
    return {
      ...ETAT_VIDE,
      erreur: "Seules les fiches en brouillon ou rejetées peuvent être soumises.",
    };
  }

  await prisma.stock.update({
    where: { id: stockId },
    data: { statut: "SOUMIS", motifRejet: null },
  });
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "SOUMISSION",
      entite: "Stock",
      entiteId: stockId,
    },
  });

  revalidatePath("/stocks");
  revalidatePath("/stocks/historique");
  revalidatePath("/stocks/validation");
  revalidatePath(`/stocks/${stockId}`);

  return { ok: true, erreur: null, stockId };
}

// ─── Workflow : VALIDER ────────────────────────────────────────────────

export async function validerStock(stockId: string): Promise<EtatActionStock> {
  const session = await exigerAuth();
  const role = session.user.role as RoleApp | undefined;
  if (!permissions.validerStock(role)) {
    return { ...ETAT_VIDE, erreur: "Permission de validation requise." };
  }

  const stock = await prisma.stock.findUnique({ where: { id: stockId } });
  if (!stock) return { ...ETAT_VIDE, erreur: "Fiche introuvable." };

  if (stock.statut !== "SOUMIS") {
    return { ...ETAT_VIDE, erreur: "Cette fiche n'est pas en attente de validation." };
  }
  if (
    !(await verifierAccesMagasin(
      { role, magasinId: session.user.magasinId, regionId: session.user.regionId },
      stock.magasinId,
    ))
  ) {
    return { ...ETAT_VIDE, erreur: "Fiche hors de votre périmètre." };
  }
  // Séparation des rôles : on ne valide pas sa propre saisie (sauf admin)
  if (role !== "ADMIN" && stock.saisiParId === session.user.id) {
    return {
      ...ETAT_VIDE,
      erreur: "Vous ne pouvez pas valider une fiche que vous avez vous-même saisie.",
    };
  }

  await prisma.stock.update({
    where: { id: stockId },
    data: {
      statut: "VALIDE",
      valideParId: session.user.id,
      valideLe: new Date(),
      motifRejet: null,
    },
  });
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "VALIDATION",
      entite: "Stock",
      entiteId: stockId,
    },
  });

  revalidatePath("/stocks");
  revalidatePath("/stocks/historique");
  revalidatePath("/stocks/validation");
  revalidatePath(`/stocks/${stockId}`);
  revalidatePath(`/magasins/${stock.magasinId}`);
  revalidatePath("/dashboard");

  return { ok: true, erreur: null, stockId };
}

// ─── Workflow : REJETER ────────────────────────────────────────────────

export async function rejeterStock(
  stockId: string,
  motifRaw: string,
): Promise<EtatActionStock> {
  const session = await exigerAuth();
  const role = session.user.role as RoleApp | undefined;
  if (!permissions.validerStock(role)) {
    return { ...ETAT_VIDE, erreur: "Permission de validation requise." };
  }

  const parsed = schemaRejet.safeParse({ motifRejet: motifRaw });
  if (!parsed.success) {
    return {
      ...ETAT_VIDE,
      erreur: "Motif de rejet invalide.",
      erreursChamps: aplatErreurs(parsed.error),
    };
  }

  const stock = await prisma.stock.findUnique({ where: { id: stockId } });
  if (!stock) return { ...ETAT_VIDE, erreur: "Fiche introuvable." };
  if (stock.statut !== "SOUMIS") {
    return { ...ETAT_VIDE, erreur: "Cette fiche n'est pas en attente de validation." };
  }
  if (
    !(await verifierAccesMagasin(
      { role, magasinId: session.user.magasinId, regionId: session.user.regionId },
      stock.magasinId,
    ))
  ) {
    return { ...ETAT_VIDE, erreur: "Fiche hors de votre périmètre." };
  }
  if (role !== "ADMIN" && stock.saisiParId === session.user.id) {
    return {
      ...ETAT_VIDE,
      erreur: "Vous ne pouvez pas rejeter une fiche que vous avez vous-même saisie.",
    };
  }

  await prisma.stock.update({
    where: { id: stockId },
    data: {
      statut: "REJETE",
      motifRejet: parsed.data.motifRejet,
      valideParId: null,
      valideLe: null,
    },
  });
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "REJET",
      entite: "Stock",
      entiteId: stockId,
      nouvelleValeur: JSON.stringify({ motifRejet: parsed.data.motifRejet }),
    },
  });

  revalidatePath("/stocks");
  revalidatePath("/stocks/historique");
  revalidatePath("/stocks/validation");
  revalidatePath(`/stocks/${stockId}`);

  return { ok: true, erreur: null, stockId };
}
