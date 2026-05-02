"use server";
// Server Actions du module Magasins.
// Toutes mutent la base et écrivent un AuditLog. Restreintes à ADMIN
// (gererMagasins) — voir lib/auth/permissions.ts.
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/db/prisma";
import { exigerPermission } from "@/lib/auth/require";
import {
  schemaCreationMagasin,
  schemaEditionMagasin,
} from "@/lib/validations/magasin";
import { StatutMagasin } from "@/app/generated/prisma/enums";

export type EtatActionMagasin = {
  ok: boolean;
  erreur: string | null;
  /// Erreurs champ → message (rendues sous chaque input)
  erreursChamps?: Record<string, string>;
  /// Identifiant de l'entité créée/modifiée — utile pour redirection client
  magasinId?: string;
};

const ETAT_VIDE: EtatActionMagasin = { ok: false, erreur: null };

function entreesDepuisFormData(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  // Les champs vides côté HTML arrivent en string "" — on laisse Zod gérer.
  return raw;
}

function aplatErreurs(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const champ = issue.path.join(".") || "_";
    if (!out[champ]) out[champ] = issue.message;
  }
  return out;
}

/**
 * Création d'un magasin (ADMIN uniquement).
 */
export async function creerMagasin(
  _prev: EtatActionMagasin,
  formData: FormData,
): Promise<EtatActionMagasin> {
  const session = await exigerPermission("gererMagasins");

  const parsed = schemaCreationMagasin.safeParse(entreesDepuisFormData(formData));
  if (!parsed.success) {
    return {
      ...ETAT_VIDE,
      erreur: "Veuillez corriger les erreurs du formulaire.",
      erreursChamps: aplatErreurs(parsed.error),
    };
  }
  const data = parsed.data;

  // Unicité du code (Prisma renverrait sinon une P2002 peu lisible)
  const dejaUtilise = await prisma.magasin.findUnique({
    where: { code: data.code },
    select: { id: true },
  });
  if (dejaUtilise) {
    return {
      ...ETAT_VIDE,
      erreur: "Ce code magasin est déjà utilisé.",
      erreursChamps: { code: "Code déjà utilisé" },
    };
  }

  // Si responsable fourni, vérifier qu'il n'est pas déjà rattaché ailleurs
  if (data.responsableId) {
    const dejaResponsable = await prisma.magasin.findFirst({
      where: { responsableId: data.responsableId },
      select: { id: true, nom: true },
    });
    if (dejaResponsable) {
      return {
        ...ETAT_VIDE,
        erreur: `Ce responsable est déjà affecté au magasin « ${dejaResponsable.nom} ».`,
        erreursChamps: { responsableId: "Déjà responsable d'un autre magasin" },
      };
    }
  }

  const magasin = await prisma.magasin.create({
    data: {
      code: data.code,
      nom: data.nom,
      ville: data.ville,
      adresse: data.adresse ?? null,
      telephone: data.telephone ?? null,
      statut: data.statut,
      regionId: data.regionId,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      responsableId: data.responsableId ?? null,
    },
  });

  // Si un responsable a été désigné, on l'affecte aussi via la relation
  // d'affectation (utilisateurs[]) et on met à jour son magasinId/regionId.
  if (data.responsableId) {
    await prisma.user.update({
      where: { id: data.responsableId },
      data: { magasinId: magasin.id, regionId: data.regionId },
    });
  }

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "CREATION",
      entite: "Magasin",
      entiteId: magasin.id,
      nouvelleValeur: JSON.stringify(data),
    },
  });

  revalidatePath("/magasins");
  revalidatePath("/dashboard");

  return { ok: true, erreur: null, magasinId: magasin.id };
}

/**
 * Édition d'un magasin existant (ADMIN uniquement).
 * L'identifiant est passé via un input hidden `id` dans le formulaire.
 */
export async function modifierMagasin(
  _prev: EtatActionMagasin,
  formData: FormData,
): Promise<EtatActionMagasin> {
  const session = await exigerPermission("gererMagasins");

  const id = (formData.get("id") as string | null)?.trim();
  if (!id) return { ...ETAT_VIDE, erreur: "Identifiant manquant." };

  const parsed = schemaEditionMagasin.safeParse(entreesDepuisFormData(formData));
  if (!parsed.success) {
    return {
      ...ETAT_VIDE,
      erreur: "Veuillez corriger les erreurs du formulaire.",
      erreursChamps: aplatErreurs(parsed.error),
    };
  }
  const data = parsed.data;

  const existant = await prisma.magasin.findUnique({ where: { id } });
  if (!existant) return { ...ETAT_VIDE, erreur: "Magasin introuvable." };

  // Le code peut changer mais doit rester unique
  if (data.code && data.code !== existant.code) {
    const collision = await prisma.magasin.findUnique({
      where: { code: data.code },
      select: { id: true },
    });
    if (collision && collision.id !== id) {
      return {
        ...ETAT_VIDE,
        erreur: "Ce code magasin est déjà utilisé.",
        erreursChamps: { code: "Code déjà utilisé" },
      };
    }
  }

  // Changement de responsable : libérer l'ancien, vérifier le nouveau
  const ancienResp = existant.responsableId;
  const nouveauResp = data.responsableId ?? null;
  if (nouveauResp && nouveauResp !== ancienResp) {
    const dejaResponsable = await prisma.magasin.findFirst({
      where: { responsableId: nouveauResp, NOT: { id } },
      select: { id: true, nom: true },
    });
    if (dejaResponsable) {
      return {
        ...ETAT_VIDE,
        erreur: `Ce responsable est déjà affecté au magasin « ${dejaResponsable.nom} ».`,
        erreursChamps: { responsableId: "Déjà responsable d'un autre magasin" },
      };
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.magasin.update({
      where: { id },
      data: {
        code: data.code ?? existant.code,
        nom: data.nom ?? existant.nom,
        ville: data.ville ?? existant.ville,
        adresse: data.adresse ?? null,
        telephone: data.telephone ?? null,
        statut: data.statut ?? existant.statut,
        regionId: data.regionId ?? existant.regionId,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        responsableId: nouveauResp,
      },
    });

    if (ancienResp && ancienResp !== nouveauResp) {
      await tx.user.update({
        where: { id: ancienResp },
        data: { magasinId: null },
      });
    }
    if (nouveauResp) {
      await tx.user.update({
        where: { id: nouveauResp },
        data: {
          magasinId: id,
          regionId: data.regionId ?? existant.regionId,
        },
      });
    }
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "MODIFICATION",
      entite: "Magasin",
      entiteId: id,
      ancienneValeur: JSON.stringify(existant),
      nouvelleValeur: JSON.stringify(data),
    },
  });

  revalidatePath("/magasins");
  revalidatePath(`/magasins/${id}`);
  revalidatePath("/dashboard");

  return { ok: true, erreur: null, magasinId: id };
}

/**
 * Archivage d'un magasin (passe en INACTIF — soft-delete).
 * Préserve l'historique de stocks ; le magasin disparaîtra du
 * sélecteur de saisie mais reste consultable dans les rapports.
 */
export async function archiverMagasin(magasinId: string): Promise<EtatActionMagasin> {
  const session = await exigerPermission("gererMagasins");

  const existant = await prisma.magasin.findUnique({
    where: { id: magasinId },
    select: { id: true, statut: true, nom: true },
  });
  if (!existant) return { ...ETAT_VIDE, erreur: "Magasin introuvable." };

  await prisma.magasin.update({
    where: { id: magasinId },
    data: { statut: StatutMagasin.INACTIF },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "SUPPRESSION",
      entite: "Magasin",
      entiteId: magasinId,
      ancienneValeur: JSON.stringify({ statut: existant.statut }),
      nouvelleValeur: JSON.stringify({ statut: StatutMagasin.INACTIF }),
    },
  });

  revalidatePath("/magasins");
  revalidatePath(`/magasins/${magasinId}`);

  return { ok: true, erreur: null, magasinId };
}
