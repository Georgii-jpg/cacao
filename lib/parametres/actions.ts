"use server";
// Server Actions du module Paramètres : CRUD régions et produits.
// Toutes réservées ADMIN via permission "modifierParametres".
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/db/prisma";
import { exigerPermission } from "@/lib/auth/require";
import {
  schemaProduit,
  schemaRegion,
} from "@/lib/validations/parametres";

export type EtatActionParametres = {
  ok: boolean;
  erreur: string | null;
  erreursChamps?: Record<string, string>;
  /// Identifiant créé / modifié (pour fermer un Dialog côté client)
  id?: string;
};

const ETAT_VIDE: EtatActionParametres = { ok: false, erreur: null };

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

// ─── Régions ───────────────────────────────────────────────────────────

export async function enregistrerRegion(
  _prev: EtatActionParametres,
  formData: FormData,
): Promise<EtatActionParametres> {
  const session = await exigerPermission("modifierParametres");
  const id = (formData.get("id") as string | null)?.trim() || null;

  const parsed = schemaRegion.safeParse(entreesDepuisFormData(formData));
  if (!parsed.success) {
    return {
      ...ETAT_VIDE,
      erreur: "Veuillez corriger les erreurs.",
      erreursChamps: aplatErreurs(parsed.error),
    };
  }
  const data = parsed.data;

  // Unicité du code
  const collision = await prisma.region.findUnique({
    where: { code: data.code },
    select: { id: true },
  });
  if (collision && collision.id !== id) {
    return {
      ...ETAT_VIDE,
      erreur: "Ce code est déjà utilisé.",
      erreursChamps: { code: "Code déjà utilisé" },
    };
  }

  let region;
  if (id) {
    const existant = await prisma.region.findUnique({ where: { id } });
    if (!existant) return { ...ETAT_VIDE, erreur: "Région introuvable." };
    region = await prisma.region.update({
      where: { id },
      data: {
        code: data.code,
        nom: data.nom,
        description: data.description ?? null,
      },
    });
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "MODIFICATION",
        entite: "Region",
        entiteId: id,
        ancienneValeur: JSON.stringify(existant),
        nouvelleValeur: JSON.stringify(data),
      },
    });
  } else {
    region = await prisma.region.create({
      data: {
        code: data.code,
        nom: data.nom,
        description: data.description ?? null,
      },
    });
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATION",
        entite: "Region",
        entiteId: region.id,
        nouvelleValeur: JSON.stringify(data),
      },
    });
  }

  revalidatePath("/parametres/regions");
  revalidatePath("/parametres");
  return { ok: true, erreur: null, id: region.id };
}

export async function supprimerRegion(
  regionId: string,
): Promise<EtatActionParametres> {
  const session = await exigerPermission("modifierParametres");

  const existant = await prisma.region.findUnique({
    where: { id: regionId },
    include: { _count: { select: { magasins: true } } },
  });
  if (!existant) return { ...ETAT_VIDE, erreur: "Région introuvable." };

  // Garde-fou : refuser si des magasins y sont rattachés
  if (existant._count.magasins > 0) {
    return {
      ...ETAT_VIDE,
      erreur: `Impossible : ${existant._count.magasins} magasin(s) sont rattaché(s) à cette région. Réaffectez-les avant de supprimer.`,
    };
  }

  await prisma.region.delete({ where: { id: regionId } });
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "SUPPRESSION",
      entite: "Region",
      entiteId: regionId,
      ancienneValeur: JSON.stringify(existant),
    },
  });

  revalidatePath("/parametres/regions");
  return { ok: true, erreur: null, id: regionId };
}

// ─── Produits ──────────────────────────────────────────────────────────

export async function enregistrerProduit(
  _prev: EtatActionParametres,
  formData: FormData,
): Promise<EtatActionParametres> {
  const session = await exigerPermission("modifierParametres");
  const id = (formData.get("id") as string | null)?.trim() || null;

  const parsed = schemaProduit.safeParse(entreesDepuisFormData(formData));
  if (!parsed.success) {
    return {
      ...ETAT_VIDE,
      erreur: "Veuillez corriger les erreurs.",
      erreursChamps: aplatErreurs(parsed.error),
    };
  }
  const data = parsed.data;

  const collision = await prisma.produit.findUnique({
    where: { code: data.code },
    select: { id: true },
  });
  if (collision && collision.id !== id) {
    return {
      ...ETAT_VIDE,
      erreur: "Ce code est déjà utilisé.",
      erreursChamps: { code: "Code déjà utilisé" },
    };
  }

  let produit;
  if (id) {
    const existant = await prisma.produit.findUnique({ where: { id } });
    if (!existant) return { ...ETAT_VIDE, erreur: "Produit introuvable." };
    produit = await prisma.produit.update({
      where: { id },
      data: {
        code: data.code,
        nom: data.nom,
        description: data.description ?? null,
        type: data.type,
        grade: data.grade,
        origine: data.origine ?? null,
        actif: data.actif,
      },
    });
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "MODIFICATION",
        entite: "Produit",
        entiteId: id,
        ancienneValeur: JSON.stringify(existant),
        nouvelleValeur: JSON.stringify(data),
      },
    });
  } else {
    produit = await prisma.produit.create({
      data: {
        code: data.code,
        nom: data.nom,
        description: data.description ?? null,
        type: data.type,
        grade: data.grade,
        origine: data.origine ?? null,
        actif: data.actif,
      },
    });
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATION",
        entite: "Produit",
        entiteId: produit.id,
        nouvelleValeur: JSON.stringify(data),
      },
    });
  }

  revalidatePath("/parametres/produits");
  revalidatePath("/parametres");
  // Le sélecteur produit dans la saisie de stock dépend des produits actifs
  revalidatePath("/stocks/saisie");
  return { ok: true, erreur: null, id: produit.id };
}

export async function basculerActifProduit(
  produitId: string,
): Promise<EtatActionParametres> {
  const session = await exigerPermission("modifierParametres");
  const existant = await prisma.produit.findUnique({ where: { id: produitId } });
  if (!existant) return { ...ETAT_VIDE, erreur: "Produit introuvable." };

  await prisma.produit.update({
    where: { id: produitId },
    data: { actif: !existant.actif },
  });
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "MODIFICATION",
      entite: "Produit",
      entiteId: produitId,
      ancienneValeur: JSON.stringify({ actif: existant.actif }),
      nouvelleValeur: JSON.stringify({ actif: !existant.actif }),
    },
  });

  revalidatePath("/parametres/produits");
  revalidatePath("/stocks/saisie");
  return { ok: true, erreur: null, id: produitId };
}
