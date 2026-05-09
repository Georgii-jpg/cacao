"use server";
// Server Actions du workflow caisse : VALIDER et REJETER une fiche SOUMIS.
// Mêmes règles métier que les stocks :
//   • permission validerStock requise
//   • portée magasin respectée (manager = sa région, responsable = son magasin)
//   • séparation des rôles : un non-admin ne valide pas sa propre saisie
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/db/prisma";
import { exigerAuth } from "@/lib/auth/require";
import {
  filtreMagasinPourUtilisateur,
  permissions,
  type RoleApp,
} from "@/lib/auth/permissions";
import { schemaRejet } from "@/lib/validations/stock";

export type EtatActionCaisse = {
  ok: boolean;
  erreur: string | null;
  erreursChamps?: Record<string, string>;
  caisseId?: string;
};

const ETAT_VIDE: EtatActionCaisse = { ok: false, erreur: null };

function aplatErreurs(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const champ = issue.path.join(".") || "_";
    if (!out[champ]) out[champ] = issue.message;
  }
  return out;
}

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

function revalider(magasinId: string) {
  revalidatePath("/suivi-caisse");
  revalidatePath("/saisie-rapide");
  revalidatePath("/dashboard");
  revalidatePath(`/magasins/${magasinId}`);
}

// ─── VALIDER ────────────────────────────────────────────────────────────

export async function validerCaisse(caisseId: string): Promise<EtatActionCaisse> {
  const session = await exigerAuth();
  const role = session.user.role as RoleApp | undefined;
  if (!permissions.validerStock(role)) {
    return { ...ETAT_VIDE, erreur: "Permission de validation requise." };
  }

  const fiche = await prisma.caisse.findUnique({ where: { id: caisseId } });
  if (!fiche) return { ...ETAT_VIDE, erreur: "Fiche caisse introuvable." };

  if (fiche.statut !== "SOUMIS") {
    return {
      ...ETAT_VIDE,
      erreur: "Cette fiche n'est pas en attente de validation.",
    };
  }
  if (
    !(await verifierAccesMagasin(
      { role, magasinId: session.user.magasinId, regionId: session.user.regionId },
      fiche.magasinId,
    ))
  ) {
    return { ...ETAT_VIDE, erreur: "Fiche hors de votre périmètre." };
  }
  // Séparation des rôles : on ne valide pas sa propre saisie (sauf admin)
  if (role !== "ADMIN" && fiche.saisiParId === session.user.id) {
    return {
      ...ETAT_VIDE,
      erreur:
        "Vous ne pouvez pas valider une fiche que vous avez vous-même saisie.",
    };
  }

  await prisma.caisse.update({
    where: { id: caisseId },
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
      entite: "Caisse",
      entiteId: caisseId,
    },
  });

  revalider(fiche.magasinId);
  return { ok: true, erreur: null, caisseId };
}

// ─── REJETER ────────────────────────────────────────────────────────────

export async function rejeterCaisse(
  caisseId: string,
  motifRaw: string,
): Promise<EtatActionCaisse> {
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

  const fiche = await prisma.caisse.findUnique({ where: { id: caisseId } });
  if (!fiche) return { ...ETAT_VIDE, erreur: "Fiche caisse introuvable." };
  if (fiche.statut !== "SOUMIS") {
    return {
      ...ETAT_VIDE,
      erreur: "Cette fiche n'est pas en attente de validation.",
    };
  }
  if (
    !(await verifierAccesMagasin(
      { role, magasinId: session.user.magasinId, regionId: session.user.regionId },
      fiche.magasinId,
    ))
  ) {
    return { ...ETAT_VIDE, erreur: "Fiche hors de votre périmètre." };
  }
  if (role !== "ADMIN" && fiche.saisiParId === session.user.id) {
    return {
      ...ETAT_VIDE,
      erreur:
        "Vous ne pouvez pas rejeter une fiche que vous avez vous-même saisie.",
    };
  }

  await prisma.caisse.update({
    where: { id: caisseId },
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
      entite: "Caisse",
      entiteId: caisseId,
      nouvelleValeur: JSON.stringify({ motifRejet: parsed.data.motifRejet }),
    },
  });

  revalider(fiche.magasinId);
  return { ok: true, erreur: null, caisseId };
}
