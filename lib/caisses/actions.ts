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

export type EtatActionBulkCaisse = {
  ok: boolean;
  erreur: string | null;
  /// Nombre de fiches effectivement validées
  nbValidees?: number;
  /// Nombre ignorées (saisies par l'utilisateur courant — non-admin)
  nbIgnorees?: number;
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

// ─── VALIDER EN MASSE ───────────────────────────────────────────────────

/**
 * Valide d'un coup toutes les fiches caisse SOUMIS visibles dans le périmètre
 * de l'utilisateur. Un non-admin ne peut pas valider ses propres saisies :
 * elles sont ignorées et comptées séparément.
 */
export async function validerToutesCaissesEnAttente(): Promise<EtatActionBulkCaisse> {
  const session = await exigerAuth();
  const role = session.user.role as RoleApp | undefined;
  if (!permissions.validerStock(role)) {
    return { ok: false, erreur: "Permission de validation requise." };
  }

  const portee = filtreMagasinPourUtilisateur({
    role,
    magasinId: session.user.magasinId ?? null,
    regionId: session.user.regionId ?? null,
  });
  if (portee === null) {
    return { ok: false, erreur: "Aucun magasin accessible avec votre rôle." };
  }

  // Construit le filtre Caisse correspondant à la portée magasin
  const wherePortee: Record<string, unknown> = {};
  if (portee.id) wherePortee.magasinId = portee.id;
  if (portee.regionId) wherePortee.magasin = { regionId: portee.regionId };

  // Lecture des candidates (séparation des rôles : exclut les saisies de
  // l'utilisateur courant si ce n'est pas un admin)
  const whereCandidates: Record<string, unknown> = {
    ...wherePortee,
    statut: "SOUMIS",
  };
  if (role !== "ADMIN") {
    whereCandidates.saisiParId = { not: session.user.id };
  }

  const candidates = await prisma.caisse.findMany({
    where: whereCandidates,
    select: { id: true, magasinId: true },
  });

  // Compte des "ignorées" pour information (non-admin uniquement)
  let nbIgnorees = 0;
  if (role !== "ADMIN") {
    nbIgnorees = await prisma.caisse.count({
      where: { ...wherePortee, statut: "SOUMIS", saisiParId: session.user.id },
    });
  }

  if (candidates.length === 0) {
    return {
      ok: true,
      erreur: null,
      nbValidees: 0,
      nbIgnorees,
    };
  }

  const ids = candidates.map((c) => c.id);

  // Transaction unique : UPDATE en masse + un audit log par fiche
  const auditRows = candidates.map((c) => ({
    userId: session.user.id,
    action: "VALIDATION" as const,
    entite: "Caisse",
    entiteId: c.id,
  }));

  const [updateResult] = await prisma.$transaction([
    prisma.caisse.updateMany({
      where: { id: { in: ids }, statut: "SOUMIS" },
      data: {
        statut: "VALIDE",
        valideParId: session.user.id,
        valideLe: new Date(),
        motifRejet: null,
      },
    }),
    prisma.auditLog.createMany({ data: auditRows }),
  ]);

  // Revalidation : on dédoublonne les magasins concernés
  const magasinsAffectes = [...new Set(candidates.map((c) => c.magasinId))];
  for (const m of magasinsAffectes) revalider(m);

  return {
    ok: true,
    erreur: null,
    nbValidees: updateResult.count,
    nbIgnorees,
  };
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

// ─── REJETER EN MASSE ───────────────────────────────────────────────────

/**
 * Rejette d'un coup toutes les fiches SOUMIS du périmètre de l'utilisateur,
 * avec un motif unique appliqué à toutes. Un non-admin ne peut pas rejeter
 * ses propres saisies (elles restent SOUMIS et sont comptées séparément).
 */
export async function rejeterToutesCaissesEnAttente(
  motifRaw: string,
): Promise<EtatActionBulkCaisse> {
  const session = await exigerAuth();
  const role = session.user.role as RoleApp | undefined;
  if (!permissions.validerStock(role)) {
    return { ok: false, erreur: "Permission de validation requise." };
  }

  const parsed = schemaRejet.safeParse({ motifRejet: motifRaw });
  if (!parsed.success) {
    return {
      ok: false,
      erreur:
        parsed.error.issues[0]?.message ?? "Motif de rejet invalide.",
    };
  }
  const motif = parsed.data.motifRejet;

  const portee = filtreMagasinPourUtilisateur({
    role,
    magasinId: session.user.magasinId ?? null,
    regionId: session.user.regionId ?? null,
  });
  if (portee === null) {
    return { ok: false, erreur: "Aucun magasin accessible avec votre rôle." };
  }

  const wherePortee: Record<string, unknown> = {};
  if (portee.id) wherePortee.magasinId = portee.id;
  if (portee.regionId) wherePortee.magasin = { regionId: portee.regionId };

  const whereCandidates: Record<string, unknown> = {
    ...wherePortee,
    statut: "SOUMIS",
  };
  if (role !== "ADMIN") {
    whereCandidates.saisiParId = { not: session.user.id };
  }

  const candidates = await prisma.caisse.findMany({
    where: whereCandidates,
    select: { id: true, magasinId: true },
  });

  let nbIgnorees = 0;
  if (role !== "ADMIN") {
    nbIgnorees = await prisma.caisse.count({
      where: { ...wherePortee, statut: "SOUMIS", saisiParId: session.user.id },
    });
  }

  if (candidates.length === 0) {
    return { ok: true, erreur: null, nbValidees: 0, nbIgnorees };
  }

  const ids = candidates.map((c) => c.id);
  const auditPayload = JSON.stringify({ motifRejet: motif });
  const auditRows = candidates.map((c) => ({
    userId: session.user.id,
    action: "REJET" as const,
    entite: "Caisse",
    entiteId: c.id,
    nouvelleValeur: auditPayload,
  }));

  const [updateResult] = await prisma.$transaction([
    prisma.caisse.updateMany({
      where: { id: { in: ids }, statut: "SOUMIS" },
      data: {
        statut: "REJETE",
        motifRejet: motif,
        valideParId: null,
        valideLe: null,
      },
    }),
    prisma.auditLog.createMany({ data: auditRows }),
  ]);

  const magasinsAffectes = [...new Set(candidates.map((c) => c.magasinId))];
  for (const m of magasinsAffectes) revalider(m);

  return {
    ok: true,
    erreur: null,
    /// On réutilise le champ nbValidees pour transporter le compteur
    /// (sémantique = nb de fiches traitées par cette action en masse).
    nbValidees: updateResult.count,
    nbIgnorees,
  };
}
