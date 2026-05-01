// Requêtes agrégées pour le tableau de bord.
// Toutes scopées au rôle : Admin = réseau, Manager = sa région,
// Responsable/Opérateur = son magasin.
import "server-only";
import { prisma } from "@/lib/db/prisma";
import {
  filtreMagasinPourUtilisateur,
  type RoleApp,
} from "@/lib/auth/permissions";

export type ContexteUtilisateur = {
  role: RoleApp | undefined;
  magasinId?: string | null;
  regionId?: string | null;
};

function porteeStockDepuisMagasin(portee: { id?: string; regionId?: string }) {
  const out: Record<string, unknown> = {};
  if (portee.id) out.magasinId = portee.id;
  if (portee.regionId) out.magasin = { regionId: portee.regionId };
  return out;
}

function dateAujourdhui0h(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// ─── KPI principaux ────────────────────────────────────────────────────

export type KpisReseau = {
  magasinsActifs: number;
  magasinsTotal: number;
  capaciteTotaleKg: number;
  stockTotalKg: number;
  remonteesAujourdhui: number;
  magasinsAvecSaisie: number;
  fichesAValider: number;
  fichesRejetees: number;
};

export async function getKpisReseau(
  ctx: ContexteUtilisateur,
  userId: string,
): Promise<KpisReseau> {
  const portee = filtreMagasinPourUtilisateur(ctx);
  if (portee === null) {
    return {
      magasinsActifs: 0,
      magasinsTotal: 0,
      capaciteTotaleKg: 0,
      stockTotalKg: 0,
      remonteesAujourdhui: 0,
      magasinsAvecSaisie: 0,
      fichesAValider: 0,
      fichesRejetees: 0,
    };
  }

  const wherePortee = porteeStockDepuisMagasin(portee);
  const aujourdhui = dateAujourdhui0h();
  const whereAValider: Record<string, unknown> = {
    ...wherePortee,
    statut: "SOUMIS",
  };
  if (ctx.role !== "ADMIN") whereAValider.saisiParId = { not: userId };

  const [magasinsActifs, magasinsTotal, capaciteAgg, fichesAValider, fichesRejetees, fichesAujourdhui] =
    await Promise.all([
      prisma.magasin.count({ where: { ...portee, statut: "ACTIF" } }),
      prisma.magasin.count({ where: portee }),
      prisma.magasin.aggregate({
        where: { ...portee, statut: { not: "INACTIF" } },
        _sum: { capaciteKg: true },
      }),
      prisma.stock.count({ where: whereAValider }),
      prisma.stock.count({ where: { ...wherePortee, statut: "REJETE" } }),
      prisma.stock.findMany({
        where: { ...wherePortee, date: aujourdhui },
        select: { magasinId: true },
        distinct: ["magasinId"],
      }),
    ]);

  // Stock total réseau = somme des dernières clôtures validées par
  // (magasin × produit). On limite aux fiches validées dans les 30 derniers
  // jours pour éviter de sommer des données obsolètes.
  const debutPeriode = new Date(aujourdhui);
  debutPeriode.setUTCDate(debutPeriode.getUTCDate() - 30);

  const dernieresValides = await prisma.stock.findMany({
    where: { ...wherePortee, statut: "VALIDE", date: { gte: debutPeriode } },
    select: {
      magasinId: true,
      produitId: true,
      date: true,
      stockClotureKg: true,
    },
    orderBy: { date: "desc" },
  });
  const vuParCouple = new Set<string>();
  let stockTotal = 0;
  for (const s of dernieresValides) {
    const cle = `${s.magasinId}:${s.produitId}`;
    if (vuParCouple.has(cle)) continue;
    vuParCouple.add(cle);
    stockTotal += s.stockClotureKg;
  }

  return {
    magasinsActifs,
    magasinsTotal,
    capaciteTotaleKg: capaciteAgg._sum.capaciteKg ?? 0,
    stockTotalKg: stockTotal,
    remonteesAujourdhui: fichesAujourdhui.length,
    magasinsAvecSaisie: fichesAujourdhui.length,
    fichesAValider,
    fichesRejetees,
  };
}

// ─── Évolution du stock total (30 jours glissants) ─────────────────────

export type PointEvolution = {
  date: string; // YYYY-MM-DD
  stockTotalKg: number;
  entreesKg: number;
  sortiesKg: number;
};

export async function getEvolutionStock(
  ctx: ContexteUtilisateur,
  jours = 30,
): Promise<PointEvolution[]> {
  const portee = filtreMagasinPourUtilisateur(ctx);
  if (portee === null) return [];
  const wherePortee = porteeStockDepuisMagasin(portee);

  const aujourdhui = dateAujourdhui0h();
  const debut = new Date(aujourdhui);
  debut.setUTCDate(debut.getUTCDate() - (jours - 1));

  const stocks = await prisma.stock.findMany({
    where: {
      ...wherePortee,
      date: { gte: debut, lte: aujourdhui },
      statut: { in: ["VALIDE", "SOUMIS"] },
    },
    select: {
      date: true,
      stockClotureKg: true,
      entreesKg: true,
      sortiesKg: true,
    },
  });

  // Bucketing par date ISO
  const parDate = new Map<string, PointEvolution>();
  for (let i = 0; i < jours; i++) {
    const d = new Date(debut);
    d.setUTCDate(debut.getUTCDate() + i);
    const iso = d.toISOString().slice(0, 10);
    parDate.set(iso, { date: iso, stockTotalKg: 0, entreesKg: 0, sortiesKg: 0 });
  }
  for (const s of stocks) {
    const iso = s.date.toISOString().slice(0, 10);
    const p = parDate.get(iso);
    if (!p) continue;
    p.stockTotalKg += s.stockClotureKg;
    p.entreesKg += s.entreesKg;
    p.sortiesKg += s.sortiesKg;
  }
  return Array.from(parDate.values());
}

// ─── Répartition par produit ───────────────────────────────────────────

export type RepartitionProduit = {
  produitId: string;
  nom: string;
  code: string;
  stockKg: number;
};

export async function getRepartitionParProduit(
  ctx: ContexteUtilisateur,
): Promise<RepartitionProduit[]> {
  const portee = filtreMagasinPourUtilisateur(ctx);
  if (portee === null) return [];
  const wherePortee = porteeStockDepuisMagasin(portee);

  const aujourdhui = dateAujourdhui0h();
  const debutPeriode = new Date(aujourdhui);
  debutPeriode.setUTCDate(debutPeriode.getUTCDate() - 30);

  const stocks = await prisma.stock.findMany({
    where: {
      ...wherePortee,
      statut: "VALIDE",
      date: { gte: debutPeriode },
    },
    select: {
      magasinId: true,
      produitId: true,
      date: true,
      stockClotureKg: true,
      produit: { select: { nom: true, code: true } },
    },
    orderBy: { date: "desc" },
  });

  // Dernière clôture par (magasin × produit), agrégée par produit
  const vuParCouple = new Set<string>();
  const accumule = new Map<string, RepartitionProduit>();
  for (const s of stocks) {
    const cle = `${s.magasinId}:${s.produitId}`;
    if (vuParCouple.has(cle)) continue;
    vuParCouple.add(cle);
    const existant = accumule.get(s.produitId);
    if (existant) {
      existant.stockKg += s.stockClotureKg;
    } else {
      accumule.set(s.produitId, {
        produitId: s.produitId,
        nom: s.produit.nom,
        code: s.produit.code,
        stockKg: s.stockClotureKg,
      });
    }
  }
  return Array.from(accumule.values()).sort((a, b) => b.stockKg - a.stockKg);
}

// ─── Taux de remontée par région (admin) ou par magasin (manager) ──────

export type LigneRemontee = {
  id: string;
  libelle: string;
  joursAvecSaisie: number;
  joursAttendus: number;
  taux: number;
};

export async function getTauxRemontee(
  ctx: ContexteUtilisateur,
  jours = 7,
): Promise<LigneRemontee[]> {
  const portee = filtreMagasinPourUtilisateur(ctx);
  if (portee === null) return [];

  const aujourdhui = dateAujourdhui0h();
  const debut = new Date(aujourdhui);
  debut.setUTCDate(debut.getUTCDate() - (jours - 1));

  // Si admin : agréger par région ; sinon : par magasin
  const groupParRegion = ctx.role === "ADMIN";

  const magasins = await prisma.magasin.findMany({
    where: { ...portee, statut: "ACTIF" },
    select: {
      id: true,
      nom: true,
      regionId: true,
      region: { select: { id: true, nom: true } },
    },
  });
  if (magasins.length === 0) return [];

  const stocks = await prisma.stock.findMany({
    where: {
      magasinId: { in: magasins.map((m) => m.id) },
      date: { gte: debut, lte: aujourdhui },
    },
    select: { magasinId: true, date: true },
  });

  // Pour chaque magasin : nombre de jours distincts saisis sur la période
  const joursParMagasin = new Map<string, Set<string>>();
  for (const s of stocks) {
    const iso = s.date.toISOString().slice(0, 10);
    const set = joursParMagasin.get(s.magasinId) ?? new Set<string>();
    set.add(iso);
    joursParMagasin.set(s.magasinId, set);
  }

  if (groupParRegion) {
    const parRegion = new Map<string, { id: string; nom: string; joursSaisis: number; magasinsCount: number }>();
    for (const m of magasins) {
      const acc = parRegion.get(m.region.id) ?? {
        id: m.region.id,
        nom: m.region.nom,
        joursSaisis: 0,
        magasinsCount: 0,
      };
      acc.joursSaisis += joursParMagasin.get(m.id)?.size ?? 0;
      acc.magasinsCount += 1;
      parRegion.set(m.region.id, acc);
    }
    return Array.from(parRegion.values())
      .map((r) => ({
        id: r.id,
        libelle: r.nom,
        joursAvecSaisie: r.joursSaisis,
        joursAttendus: r.magasinsCount * jours,
        taux: r.magasinsCount > 0 ? r.joursSaisis / (r.magasinsCount * jours) : 0,
      }))
      .sort((a, b) => b.taux - a.taux);
  }

  return magasins
    .map((m) => {
      const j = joursParMagasin.get(m.id)?.size ?? 0;
      return {
        id: m.id,
        libelle: m.nom,
        joursAvecSaisie: j,
        joursAttendus: jours,
        taux: jours > 0 ? j / jours : 0,
      };
    })
    .sort((a, b) => b.taux - a.taux);
}

// ─── Magasins sans saisie aujourd'hui ──────────────────────────────────

export async function getMagasinsSansSaisieAujourdhui(ctx: ContexteUtilisateur) {
  const portee = filtreMagasinPourUtilisateur(ctx);
  if (portee === null) return [];

  const aujourdhui = dateAujourdhui0h();
  const magasinsActifs = await prisma.magasin.findMany({
    where: { ...portee, statut: "ACTIF" },
    select: {
      id: true,
      code: true,
      nom: true,
      ville: true,
      region: { select: { nom: true } },
      responsable: { select: { nom: true, prenom: true, email: true } },
    },
  });

  if (magasinsActifs.length === 0) return [];

  const fichesJour = await prisma.stock.findMany({
    where: {
      magasinId: { in: magasinsActifs.map((m) => m.id) },
      date: aujourdhui,
    },
    select: { magasinId: true },
    distinct: ["magasinId"],
  });
  const setSaisi = new Set(fichesJour.map((f) => f.magasinId));
  return magasinsActifs.filter((m) => !setSaisi.has(m.id));
}

// ─── Dernières fiches rejetées ─────────────────────────────────────────

export async function getDernieresFichesRejetees(
  ctx: ContexteUtilisateur,
  limite = 5,
) {
  const portee = filtreMagasinPourUtilisateur(ctx);
  if (portee === null) return [];
  const wherePortee = porteeStockDepuisMagasin(portee);

  return prisma.stock.findMany({
    where: { ...wherePortee, statut: "REJETE" },
    include: {
      magasin: { select: { id: true, nom: true, code: true } },
      produit: { select: { nom: true, code: true } },
      saisiPar: { select: { nom: true, prenom: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: limite,
  });
}
