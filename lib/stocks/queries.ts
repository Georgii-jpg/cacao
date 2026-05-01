// Requêtes Prisma pour le module Stocks.
// Toutes les fonctions appliquent la portée du rôle (admin = tout,
// manager = sa région, responsable/opérateur = son magasin).
import "server-only";
import { prisma } from "@/lib/db/prisma";
import {
  filtreMagasinPourUtilisateur,
  type RoleApp,
} from "@/lib/auth/permissions";
import type { StatutStock } from "@/app/generated/prisma/enums";

export type ContexteUtilisateur = {
  role: RoleApp | undefined;
  magasinId?: string | null;
  regionId?: string | null;
};

export type FiltresHistorique = {
  magasinId?: string;
  produitId?: string;
  statut?: StatutStock;
  /// Bornes ISO YYYY-MM-DD inclusives
  dateDebut?: string;
  dateFin?: string;
};

/// Convertit un YYYY-MM-DD en Date à 00:00 UTC (cohérent avec le seed).
export function dateMetier(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
}

/// Aujourd'hui à 00:00 UTC.
export function dateAujourdhui(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Convertit le filtre rôle (sur Magasin) vers son équivalent pour Stock.
 * Magasin.id → Stock.magasinId, Magasin.regionId → Stock.magasin.regionId.
 */
function porteeStockDepuisMagasin(portee: { id?: string; regionId?: string }) {
  const out: Record<string, unknown> = {};
  if (portee.id) out.magasinId = portee.id;
  if (portee.regionId) out.magasin = { regionId: portee.regionId };
  return out;
}

export type ResultatPagine<T> = {
  lignes: T[];
  total: number;
  page: number;
  tailleLimite: number;
  nbPages: number;
};

const TAILLE_LIMITE_DEFAUT = 50;
const TAILLE_LIMITE_MAX = 200;

/**
 * Liste paginée des fiches de stock visibles par l'utilisateur, avec filtres
 * optionnels. Pagination 1-indexée (page = 1, 2, …).
 */
export async function listerStocks(
  ctx: ContexteUtilisateur,
  filtres: FiltresHistorique = {},
  pagination: { page?: number; tailleLimite?: number } = {},
) {
  const portee = filtreMagasinPourUtilisateur(ctx);
  if (portee === null) {
    return {
      lignes: [],
      total: 0,
      page: 1,
      tailleLimite: TAILLE_LIMITE_DEFAUT,
      nbPages: 0,
    };
  }

  const where: Record<string, unknown> = porteeStockDepuisMagasin(portee);
  if (filtres.magasinId) where.magasinId = filtres.magasinId;
  if (filtres.produitId) where.produitId = filtres.produitId;
  if (filtres.statut) where.statut = filtres.statut;
  if (filtres.dateDebut || filtres.dateFin) {
    const dateRange: { gte?: Date; lte?: Date } = {};
    if (filtres.dateDebut) dateRange.gte = dateMetier(filtres.dateDebut);
    if (filtres.dateFin) dateRange.lte = dateMetier(filtres.dateFin);
    where.date = dateRange;
  }

  const tailleLimite = Math.min(
    Math.max(pagination.tailleLimite ?? TAILLE_LIMITE_DEFAUT, 10),
    TAILLE_LIMITE_MAX,
  );
  const page = Math.max(pagination.page ?? 1, 1);
  const skip = (page - 1) * tailleLimite;

  const [lignes, total] = await Promise.all([
    prisma.stock.findMany({
      where,
      include: {
        magasin: { select: { id: true, code: true, nom: true } },
        produit: { select: { id: true, code: true, nom: true } },
        saisiPar: { select: { id: true, nom: true, prenom: true } },
        validePar: { select: { id: true, nom: true, prenom: true } },
      },
      orderBy: [{ date: "desc" }, { magasin: { nom: "asc" } }],
      skip,
      take: tailleLimite,
    }),
    prisma.stock.count({ where }),
  ]);

  return {
    lignes,
    total,
    page,
    tailleLimite,
    nbPages: Math.max(1, Math.ceil(total / tailleLimite)),
  };
}

/**
 * Récupère la fiche du jour si elle existe (pour la saisie / pré-remplissage),
 * et calcule le stock d'ouverture suggéré (= clôture du dernier stock validé
 * sur ce couple magasin × produit avant la date demandée).
 */
export async function getFichePourSaisie(opts: {
  magasinId: string;
  produitId: string;
  date: Date;
}) {
  const [existant, dernierAvant, magasin, produit] = await Promise.all([
    prisma.stock.findUnique({
      where: {
        magasinId_produitId_date: {
          magasinId: opts.magasinId,
          produitId: opts.produitId,
          date: opts.date,
        },
      },
      include: {
        saisiPar: { select: { id: true, nom: true, prenom: true } },
      },
    }),
    prisma.stock.findFirst({
      where: {
        magasinId: opts.magasinId,
        produitId: opts.produitId,
        date: { lt: opts.date },
        statut: "VALIDE",
      },
      orderBy: { date: "desc" },
      select: { date: true, stockClotureKg: true },
    }),
    prisma.magasin.findUnique({
      where: { id: opts.magasinId },
      select: { id: true, code: true, nom: true, capaciteKg: true, statut: true },
    }),
    prisma.produit.findUnique({
      where: { id: opts.produitId },
      select: { id: true, code: true, nom: true, type: true, grade: true, actif: true },
    }),
  ]);

  return {
    existant,
    ouvertureSuggereeKg: dernierAvant?.stockClotureKg ?? 0,
    dernierStockValide: dernierAvant,
    magasin,
    produit,
  };
}

/**
 * File d'attente des fiches en attente de validation pour le rôle courant.
 * Manager : sa région. Responsable : son magasin (mais pas ses propres saisies).
 * Admin : toutes les fiches SOUMIS.
 */
export async function listerFichesAValider(ctx: ContexteUtilisateur, userId: string) {
  const portee = filtreMagasinPourUtilisateur(ctx);
  if (portee === null) return [];

  const where: Record<string, unknown> = {
    ...porteeStockDepuisMagasin(portee),
    statut: "SOUMIS",
  };
  // Un non-admin ne valide pas ses propres saisies (séparation des rôles)
  if (ctx.role !== "ADMIN") {
    where.saisiParId = { not: userId };
  }

  return prisma.stock.findMany({
    where,
    include: {
      magasin: { select: { id: true, code: true, nom: true } },
      produit: { select: { id: true, code: true, nom: true } },
      saisiPar: { select: { id: true, nom: true, prenom: true } },
    },
    orderBy: [{ date: "asc" }, { magasin: { nom: "asc" } }],
  });
}

/**
 * Détail d'une fiche, scopée au rôle.
 */
export async function getStock(ctx: ContexteUtilisateur, id: string) {
  const portee = filtreMagasinPourUtilisateur(ctx);
  if (portee === null) return null;

  return prisma.stock.findFirst({
    where: { id, ...porteeStockDepuisMagasin(portee) },
    include: {
      magasin: { include: { region: true } },
      produit: true,
      saisiPar: { select: { id: true, email: true, nom: true, prenom: true } },
      validePar: { select: { id: true, email: true, nom: true, prenom: true } },
    },
  });
}

/**
 * Compteurs pour l'accueil du module Stocks (badges).
 */
export async function getCompteursModule(ctx: ContexteUtilisateur, userId: string) {
  const portee = filtreMagasinPourUtilisateur(ctx);
  if (portee === null) {
    return { brouillons: 0, soumis: 0, aValider: 0, rejetes: 0, valides30j: 0 };
  }
  const wherePortee = porteeStockDepuisMagasin(portee);
  const whereAValider: Record<string, unknown> = {
    ...wherePortee,
    statut: "SOUMIS",
  };
  if (ctx.role !== "ADMIN") whereAValider.saisiParId = { not: userId };

  const debut30j = new Date();
  debut30j.setUTCHours(0, 0, 0, 0);
  debut30j.setUTCDate(debut30j.getUTCDate() - 30);

  const [brouillons, soumis, aValider, rejetes, valides30j] = await Promise.all([
    prisma.stock.count({ where: { ...wherePortee, statut: "BROUILLON" } }),
    prisma.stock.count({ where: { ...wherePortee, statut: "SOUMIS" } }),
    prisma.stock.count({ where: whereAValider }),
    prisma.stock.count({ where: { ...wherePortee, statut: "REJETE" } }),
    prisma.stock.count({
      where: { ...wherePortee, statut: "VALIDE", date: { gte: debut30j } },
    }),
  ]);

  return { brouillons, soumis, aValider, rejetes, valides30j };
}

/**
 * Magasins accessibles à l'utilisateur (pour le sélecteur de saisie).
 */
export async function listerMagasinsAccessibles(ctx: ContexteUtilisateur) {
  const portee = filtreMagasinPourUtilisateur(ctx);
  if (portee === null) return [];
  return prisma.magasin.findMany({
    where: { ...portee, statut: { not: "INACTIF" } },
    select: {
      id: true,
      code: true,
      nom: true,
      ville: true,
      region: { select: { nom: true } },
    },
    orderBy: [{ region: { nom: "asc" } }, { nom: "asc" }],
  });
}

/**
 * Catalogue des produits actifs.
 */
export async function listerProduitsActifs() {
  return prisma.produit.findMany({
    where: { actif: true },
    select: {
      id: true,
      code: true,
      nom: true,
      type: true,
      grade: true,
    },
    orderBy: [{ type: "asc" }, { grade: "asc" }],
  });
}
