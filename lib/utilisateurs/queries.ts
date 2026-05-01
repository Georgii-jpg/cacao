// Requêtes Prisma pour le module Utilisateurs.
// Réservé ADMIN (gererUtilisateurs) — pas de scope par région ici.
import "server-only";
import { prisma } from "@/lib/db/prisma";
import type { Role } from "@/app/generated/prisma/enums";

export type FiltresUtilisateurs = {
  recherche?: string;
  role?: Role;
  /// "actifs" | "inactifs" — non précisé = tous
  actif?: "actifs" | "inactifs";
  magasinId?: string;
  regionId?: string;
};

export async function listerUtilisateurs(filtres: FiltresUtilisateurs = {}) {
  const where: Record<string, unknown> = {};
  if (filtres.role) where.role = filtres.role;
  if (filtres.actif === "actifs") where.actif = true;
  if (filtres.actif === "inactifs") where.actif = false;
  if (filtres.magasinId) where.magasinId = filtres.magasinId;
  if (filtres.regionId) where.regionId = filtres.regionId;
  if (filtres.recherche) {
    const q = filtres.recherche.trim();
    if (q.length > 0) {
      where.OR = [
        { email: { contains: q.toLowerCase() } },
        { nom: { contains: q } },
        { prenom: { contains: q } },
      ];
    }
  }

  return prisma.user.findMany({
    where,
    select: {
      id: true,
      email: true,
      nom: true,
      prenom: true,
      telephone: true,
      role: true,
      actif: true,
      derniereConnexion: true,
      createdAt: true,
      magasin: { select: { id: true, code: true, nom: true } },
    },
    orderBy: [{ actif: "desc" }, { role: "asc" }, { nom: "asc" }],
  });
}

export async function getUtilisateur(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      nom: true,
      prenom: true,
      telephone: true,
      role: true,
      actif: true,
      regionId: true,
      magasinId: true,
      derniereConnexion: true,
      createdAt: true,
      magasin: { select: { id: true, code: true, nom: true } },
      magasinResponsable: { select: { id: true, code: true, nom: true } },
    },
  });
}

export async function listerRegionsPourSelect() {
  return prisma.region.findMany({
    orderBy: { nom: "asc" },
    select: { id: true, code: true, nom: true },
  });
}

export async function listerMagasinsPourSelect() {
  return prisma.magasin.findMany({
    where: { statut: { not: "INACTIF" } },
    orderBy: [{ region: { nom: "asc" } }, { nom: "asc" }],
    select: {
      id: true,
      code: true,
      nom: true,
      region: { select: { nom: true } },
    },
  });
}
