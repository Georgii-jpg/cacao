// Requêtes Prisma pour le module Magasins.
// Toutes les fonctions appliquent le périmètre du rôle (admin = tout,
// manager = sa région, responsable/opérateur = son magasin) afin
// d'éviter les fuites de données entre régions.
import "server-only";
import { prisma } from "@/lib/db/prisma";
import {
  filtreMagasinPourUtilisateur,
  type RoleApp,
} from "@/lib/auth/permissions";
import type { StatutMagasin } from "@/app/generated/prisma/enums";

export type ContexteUtilisateur = {
  role: RoleApp | undefined;
  magasinId?: string | null;
  regionId?: string | null;
};

export type FiltresListeMagasins = {
  recherche?: string;
  regionId?: string;
  statut?: StatutMagasin;
};

/**
 * Liste les magasins visibles par l'utilisateur, avec filtres optionnels.
 * Inclut la région et le responsable, et un compteur d'utilisateurs.
 */
export async function listerMagasins(
  ctx: ContexteUtilisateur,
  filtres: FiltresListeMagasins = {},
) {
  const portee = filtreMagasinPourUtilisateur(ctx);
  if (portee === null) return [];

  const where: Record<string, unknown> = { ...portee };
  // Le filtre régional saisi dans l'UI ne peut qu'affiner — un manager
  // ne pourra jamais sortir de sa région via ce paramètre.
  if (filtres.regionId && (ctx.role === "ADMIN" || ctx.role === "MANAGER_REGIONAL")) {
    where.regionId = filtres.regionId;
  }
  if (filtres.statut) where.statut = filtres.statut;
  if (filtres.recherche) {
    const q = filtres.recherche.trim();
    if (q.length > 0) {
      where.OR = [
        { code: { contains: q } },
        { nom: { contains: q } },
        { ville: { contains: q } },
      ];
    }
  }

  return prisma.magasin.findMany({
    where,
    include: {
      region: { select: { id: true, code: true, nom: true } },
      responsable: { select: { id: true, nom: true, prenom: true, email: true } },
      _count: { select: { utilisateurs: true } },
    },
    orderBy: [{ region: { nom: "asc" } }, { nom: "asc" }],
  });
}

/**
 * Récupère un magasin par identifiant en respectant la portée du rôle.
 * Retourne null si non trouvé ou hors portée.
 */
export async function getMagasin(ctx: ContexteUtilisateur, id: string) {
  const portee = filtreMagasinPourUtilisateur(ctx);
  if (portee === null) return null;

  const magasin = await prisma.magasin.findFirst({
    where: { id, ...portee },
    include: {
      region: true,
      responsable: {
        select: {
          id: true,
          email: true,
          nom: true,
          prenom: true,
          telephone: true,
          role: true,
        },
      },
      utilisateurs: {
        select: {
          id: true,
          email: true,
          nom: true,
          prenom: true,
          role: true,
          actif: true,
        },
        orderBy: [{ role: "asc" }, { nom: "asc" }],
      },
    },
  });
  return magasin;
}

/**
 * KPIs propres à un magasin sur les N derniers jours :
 *  - dernier stock validé (clôture)
 *  - taux de remontée (jours saisis / N)
 *  - total entrées / sorties période
 */
export async function getKpisMagasin(magasinId: string, jours = 30) {
  const debut = new Date();
  debut.setUTCHours(0, 0, 0, 0);
  debut.setUTCDate(debut.getUTCDate() - (jours - 1));

  const [stocks, dernier] = await Promise.all([
    prisma.stock.findMany({
      where: { magasinId, date: { gte: debut } },
      select: {
        date: true,
        entreesKg: true,
        sortiesKg: true,
        stockClotureKg: true,
        statut: true,
      },
    }),
    prisma.stock.findFirst({
      where: { magasinId, statut: "VALIDE" },
      orderBy: { date: "desc" },
      select: {
        date: true,
        stockClotureKg: true,
        produit: { select: { nom: true, code: true } },
      },
    }),
  ]);

  const joursSaisis = new Set(stocks.map((s) => s.date.toISOString().slice(0, 10)));
  const totalEntrees = stocks.reduce((acc, s) => acc + s.entreesKg, 0);
  const totalSorties = stocks.reduce((acc, s) => acc + s.sortiesKg, 0);
  const enAttenteValidation = stocks.filter((s) => s.statut === "SOUMIS").length;

  return {
    periodeJours: jours,
    joursAvecSaisie: joursSaisis.size,
    tauxRemontee: joursSaisis.size / jours,
    totalEntreesKg: totalEntrees,
    totalSortiesKg: totalSorties,
    enAttenteValidation,
    dernierStockValide: dernier,
  };
}

/**
 * Charge la liste des régions (utilisée par les formulaires et filtres).
 */
export async function listerRegions() {
  return prisma.region.findMany({
    orderBy: { nom: "asc" },
    select: { id: true, code: true, nom: true },
  });
}

/**
 * Liste les utilisateurs candidats au rôle de responsable d'un magasin :
 * RESPONSABLE_MAGASIN actifs, non déjà responsables d'un autre magasin.
 * Si magasinIdActuel fourni, on inclut le responsable actuel pour permettre
 * sa préselection en édition.
 */
export async function listerCandidatsResponsable(magasinIdActuel?: string) {
  return prisma.user.findMany({
    where: {
      actif: true,
      role: "RESPONSABLE_MAGASIN",
      OR: [
        { magasinResponsable: null },
        ...(magasinIdActuel
          ? [{ magasinResponsable: { id: magasinIdActuel } }]
          : []),
      ],
    },
    select: {
      id: true,
      email: true,
      nom: true,
      prenom: true,
      magasinId: true,
    },
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
  });
}
