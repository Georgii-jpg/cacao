// Requêtes Prisma pour le module Paramètres.
// Réservé ADMIN — pas de scope par rôle ici.
import "server-only";
import { prisma } from "@/lib/db/prisma";

export async function listerRegionsAvecCompteurs() {
  return prisma.region.findMany({
    orderBy: { nom: "asc" },
    include: {
      _count: { select: { magasins: true } },
    },
  });
}

export async function getRegion(id: string) {
  return prisma.region.findUnique({
    where: { id },
    include: { _count: { select: { magasins: true } } },
  });
}

export async function listerProduitsAvecCompteurs() {
  return prisma.produit.findMany({
    orderBy: [{ actif: "desc" }, { type: "asc" }, { grade: "asc" }],
    include: {
      _count: { select: { stocks: true, mouvements: true } },
    },
  });
}

export async function getProduit(id: string) {
  return prisma.produit.findUnique({
    where: { id },
    include: { _count: { select: { stocks: true, mouvements: true } } },
  });
}
