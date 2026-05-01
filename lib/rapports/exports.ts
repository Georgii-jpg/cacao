// Génération de rapports au format CSV.
// Le CSV est encodé UTF-8 avec BOM pour qu'Excel détecte les accents
// correctement à l'ouverture (Excel devine sinon Windows-1252).
import "server-only";
import { prisma } from "@/lib/db/prisma";
import {
  filtreMagasinPourUtilisateur,
  type RoleApp,
} from "@/lib/auth/permissions";
import type { StatutStock } from "@/app/generated/prisma/enums";
import { dateMetier } from "@/lib/stocks/queries";

const BOM_UTF8 = "﻿";
const SEP = ";"; // séparateur point-virgule = lecture directe par Excel FR

export type ContexteUtilisateur = {
  role: RoleApp | undefined;
  magasinId?: string | null;
  regionId?: string | null;
};

export type TypeRapport = "historique" | "snapshot" | "activite";

/// Liste des types valides — pour validation côté route handler
export const TYPES_RAPPORT: ReadonlyArray<TypeRapport> = [
  "historique",
  "snapshot",
  "activite",
];

export function estTypeRapport(s: string): s is TypeRapport {
  return (TYPES_RAPPORT as ReadonlyArray<string>).includes(s);
}

export type ParamsRapport = {
  /// YYYY-MM-DD inclusif
  dateDebut?: string;
  dateFin?: string;
  magasinId?: string;
  statut?: StatutStock;
};

function porteeStockDepuisMagasin(portee: { id?: string; regionId?: string }) {
  const out: Record<string, unknown> = {};
  if (portee.id) out.magasinId = portee.id;
  if (portee.regionId) out.magasin = { regionId: portee.regionId };
  return out;
}

/// Échappe une cellule CSV : entoure de guillemets si elle contient SEP, ", \n
function csvEscape(valeur: unknown): string {
  if (valeur === null || valeur === undefined) return "";
  const s = String(valeur);
  if (s.includes(SEP) || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function ligneCsv(cellules: unknown[]): string {
  return cellules.map(csvEscape).join(SEP);
}

/// Formate un nombre en FR (virgule décimale) sans séparateur de milliers
function nombreCsv(n: number, dec = 1): string {
  return n.toFixed(dec).replace(".", ",");
}

function dateIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ─── 1. Historique des stocks ──────────────────────────────────────────

export async function genererHistorique(
  ctx: ContexteUtilisateur,
  params: ParamsRapport,
): Promise<{ contenu: string; nomFichier: string; nbLignes: number }> {
  const portee = filtreMagasinPourUtilisateur(ctx);
  if (portee === null) {
    return { contenu: BOM_UTF8, nomFichier: "historique.csv", nbLignes: 0 };
  }
  const where: Record<string, unknown> = porteeStockDepuisMagasin(portee);
  if (params.magasinId) where.magasinId = params.magasinId;
  if (params.statut) where.statut = params.statut;
  if (params.dateDebut || params.dateFin) {
    const range: { gte?: Date; lte?: Date } = {};
    if (params.dateDebut) range.gte = dateMetier(params.dateDebut);
    if (params.dateFin) range.lte = dateMetier(params.dateFin);
    where.date = range;
  }

  const stocks = await prisma.stock.findMany({
    where,
    include: {
      magasin: { select: { code: true, nom: true, ville: true, region: { select: { nom: true } } } },
      produit: { select: { code: true, nom: true, type: true, grade: true } },
      saisiPar: { select: { nom: true, prenom: true } },
      validePar: { select: { nom: true, prenom: true } },
    },
    orderBy: [{ date: "desc" }, { magasin: { nom: "asc" } }],
    take: 10000,
  });

  const entetes = [
    "Date",
    "Code magasin",
    "Magasin",
    "Ville",
    "Region",
    "Code produit",
    "Produit",
    "Type",
    "Grade",
    "Stock ouverture (kg)",
    "Entrees (kg)",
    "Sorties (kg)",
    "Stock cloture (kg)",
    "Humidite (%)",
    "Statut",
    "Saisi par",
    "Valide par",
    "Motif rejet",
  ];

  const lignes = [ligneCsv(entetes)];
  for (const s of stocks) {
    const auteur = [s.saisiPar.prenom, s.saisiPar.nom].filter(Boolean).join(" ").trim();
    const validateur = s.validePar
      ? [s.validePar.prenom, s.validePar.nom].filter(Boolean).join(" ").trim()
      : "";
    lignes.push(
      ligneCsv([
        dateIso(s.date),
        s.magasin.code,
        s.magasin.nom,
        s.magasin.ville,
        s.magasin.region.nom,
        s.produit.code,
        s.produit.nom,
        s.produit.type,
        s.produit.grade,
        nombreCsv(s.stockOuvertureKg),
        nombreCsv(s.entreesKg),
        nombreCsv(s.sortiesKg),
        nombreCsv(s.stockClotureKg),
        s.humiditeMoyenne !== null ? nombreCsv(s.humiditeMoyenne) : "",
        s.statut,
        auteur,
        validateur,
        s.motifRejet ?? "",
      ]),
    );
  }

  const debut = params.dateDebut ?? "tout";
  const fin = params.dateFin ?? "tout";
  return {
    contenu: BOM_UTF8 + lignes.join("\r\n") + "\r\n",
    nomFichier: `socopad-historique-${debut}-${fin}.csv`,
    nbLignes: stocks.length,
  };
}

// ─── 2. Snapshot stocks actuels ────────────────────────────────────────
// Pour chaque (magasin × produit) : dernière clôture validée + date.

export async function genererSnapshot(
  ctx: ContexteUtilisateur,
): Promise<{ contenu: string; nomFichier: string; nbLignes: number }> {
  const portee = filtreMagasinPourUtilisateur(ctx);
  if (portee === null) {
    return { contenu: BOM_UTF8, nomFichier: "snapshot.csv", nbLignes: 0 };
  }
  const where = {
    ...porteeStockDepuisMagasin(portee),
    statut: "VALIDE" as const,
  };

  const stocks = await prisma.stock.findMany({
    where,
    include: {
      magasin: { select: { code: true, nom: true, ville: true, capaciteKg: true, region: { select: { nom: true } } } },
      produit: { select: { code: true, nom: true, type: true, grade: true } },
    },
    orderBy: { date: "desc" },
  });

  // Dernier par (magasin, produit)
  const vu = new Set<string>();
  const retenus: typeof stocks = [];
  for (const s of stocks) {
    const cle = `${s.magasinId}:${s.produitId}`;
    if (vu.has(cle)) continue;
    vu.add(cle);
    retenus.push(s);
  }

  const entetes = [
    "Code magasin",
    "Magasin",
    "Ville",
    "Region",
    "Capacite (kg)",
    "Code produit",
    "Produit",
    "Type",
    "Grade",
    "Date derniere validation",
    "Stock cloture (kg)",
    "Taux occupation produit (%)",
  ];

  const lignes = [ligneCsv(entetes)];
  for (const s of retenus) {
    const taux =
      s.magasin.capaciteKg > 0
        ? nombreCsv((s.stockClotureKg / s.magasin.capaciteKg) * 100, 1)
        : "";
    lignes.push(
      ligneCsv([
        s.magasin.code,
        s.magasin.nom,
        s.magasin.ville,
        s.magasin.region.nom,
        nombreCsv(s.magasin.capaciteKg, 0),
        s.produit.code,
        s.produit.nom,
        s.produit.type,
        s.produit.grade,
        dateIso(s.date),
        nombreCsv(s.stockClotureKg),
        taux,
      ]),
    );
  }

  return {
    contenu: BOM_UTF8 + lignes.join("\r\n") + "\r\n",
    nomFichier: `socopad-snapshot-${dateIso(new Date())}.csv`,
    nbLignes: retenus.length,
  };
}

// ─── 3. Activité par magasin sur période ───────────────────────────────

export async function genererActivite(
  ctx: ContexteUtilisateur,
  params: ParamsRapport,
): Promise<{ contenu: string; nomFichier: string; nbLignes: number }> {
  const portee = filtreMagasinPourUtilisateur(ctx);
  if (portee === null) {
    return { contenu: BOM_UTF8, nomFichier: "activite.csv", nbLignes: 0 };
  }

  const aujourdhui = new Date();
  aujourdhui.setUTCHours(0, 0, 0, 0);
  const debut = params.dateDebut
    ? dateMetier(params.dateDebut)
    : (() => {
        const d = new Date(aujourdhui);
        d.setUTCDate(d.getUTCDate() - 30);
        return d;
      })();
  const fin = params.dateFin ? dateMetier(params.dateFin) : aujourdhui;

  // Nombre de jours calendaires de la période (inclusif)
  const msParJour = 24 * 60 * 60 * 1000;
  const nbJours = Math.max(
    1,
    Math.round((fin.getTime() - debut.getTime()) / msParJour) + 1,
  );

  const magasins = await prisma.magasin.findMany({
    where: portee,
    select: {
      id: true,
      code: true,
      nom: true,
      ville: true,
      capaciteKg: true,
      statut: true,
      region: { select: { nom: true } },
    },
    orderBy: [{ region: { nom: "asc" } }, { nom: "asc" }],
  });

  const stocks = await prisma.stock.findMany({
    where: {
      magasinId: { in: magasins.map((m) => m.id) },
      date: { gte: debut, lte: fin },
    },
    select: {
      magasinId: true,
      date: true,
      entreesKg: true,
      sortiesKg: true,
      statut: true,
    },
  });

  // Agrégation par magasin
  type Acc = {
    joursSaisis: Set<string>;
    fichesValide: number;
    fichesRejetees: number;
    fichesSoumises: number;
    fichesBrouillon: number;
    entrees: number;
    sorties: number;
  };
  const agg = new Map<string, Acc>();
  for (const m of magasins) {
    agg.set(m.id, {
      joursSaisis: new Set(),
      fichesValide: 0,
      fichesRejetees: 0,
      fichesSoumises: 0,
      fichesBrouillon: 0,
      entrees: 0,
      sorties: 0,
    });
  }
  for (const s of stocks) {
    const a = agg.get(s.magasinId);
    if (!a) continue;
    a.joursSaisis.add(s.date.toISOString().slice(0, 10));
    a.entrees += s.entreesKg;
    a.sorties += s.sortiesKg;
    if (s.statut === "VALIDE") a.fichesValide += 1;
    else if (s.statut === "REJETE") a.fichesRejetees += 1;
    else if (s.statut === "SOUMIS") a.fichesSoumises += 1;
    else if (s.statut === "BROUILLON") a.fichesBrouillon += 1;
  }

  const entetes = [
    "Code magasin",
    "Magasin",
    "Ville",
    "Region",
    "Statut magasin",
    "Periode debut",
    "Periode fin",
    "Jours periode",
    "Jours avec saisie",
    "Taux remontee (%)",
    "Fiches validees",
    "Fiches a valider",
    "Fiches rejetees",
    "Fiches brouillon",
    "Total entrees (kg)",
    "Total sorties (kg)",
  ];

  const lignes = [ligneCsv(entetes)];
  for (const m of magasins) {
    const a = agg.get(m.id)!;
    const taux = (a.joursSaisis.size / nbJours) * 100;
    lignes.push(
      ligneCsv([
        m.code,
        m.nom,
        m.ville,
        m.region.nom,
        m.statut,
        dateIso(debut),
        dateIso(fin),
        nbJours,
        a.joursSaisis.size,
        nombreCsv(taux, 1),
        a.fichesValide,
        a.fichesSoumises,
        a.fichesRejetees,
        a.fichesBrouillon,
        nombreCsv(a.entrees),
        nombreCsv(a.sorties),
      ]),
    );
  }

  return {
    contenu: BOM_UTF8 + lignes.join("\r\n") + "\r\n",
    nomFichier: `socopad-activite-${dateIso(debut)}-${dateIso(fin)}.csv`,
    nbLignes: magasins.length,
  };
}
