// ───────────────────────────────────────────────────────────────────────
//  SOCOPAD — Seed (jeu de données fictives)
// ───────────────────────────────────────────────────────────────────────
//  Génère :
//   • 5 régions opérationnelles SOCOPAD (Daloa, San-Pedro, Duekoue, Man, Soubre)
//   • 20 magasins répartis dans ces régions
//   • 5 produits cacao (combinaisons type × grade)
//   • 1 admin + 5 managers régionaux + 20 responsables magasin
//   • 30 jours d'historique de stocks + mouvements rattachés
//
//  Lancer : `npm run db:seed`
//  Le seed est idempotent : il vide les tables métier avant de réinsérer.
//  Il NE supprime PAS les comptes utilisateurs au-delà du seed initial
//  — le mot de passe admin par défaut doit être changé en production.
// ───────────────────────────────────────────────────────────────────────

import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const url = process.env.DATABASE_URL ?? "file:./dev.db";
const estPostgres = url.startsWith("postgres://") || url.startsWith("postgresql://");
const adapter = estPostgres
  ? new PrismaPg({ connectionString: url })
  : new PrismaBetterSqlite3({ url });
const prisma = new PrismaClient({ adapter });

// PRNG déterministe pour des données reproductibles
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260501);

function randInt(min: number, max: number) {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number) {
  return rand() * (max - min) + min;
}

function dateAJ0(daysAgo: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d;
}

// ─── Données de référence ──────────────────────────────────────────────

const REGIONS = [
  { code: "DALOA",     nom: "Daloa",     description: "Pôle d'achat Daloa" },
  { code: "SAN-PEDRO", nom: "San-Pedro", description: "Pôle d'achat San-Pedro et littoral sud-ouest" },
  { code: "DUEKOUE",   nom: "Duekoue",   description: "Pôle d'achat Duekoue et zone Ouest" },
  { code: "MAN",       nom: "Man",       description: "Pôle d'achat Man et zone montagneuse" },
  { code: "SOUBRE",    nom: "Soubre",    description: "Pôle d'achat Soubre" },
];

// 20 magasins SOCOPAD × ville × région opérationnelle
// (lat/lng `null` pour les localités peu cartographiées — à compléter en exploitation)
const MAGASINS = [
  // DALOA (7)
  { code: "MAG-01",  nom: "Daloa",       ville: "Daloa",       region: "DALOA",     lat: 6.8772, lng: -6.4503 },
  { code: "MAG-06",  nom: "Belle-ville", ville: "Belle-ville", region: "DALOA",     lat: null as number | null, lng: null as number | null },
  { code: "MAG-05",  nom: "Pelezi",      ville: "Pelezi",      region: "DALOA",     lat: null as number | null, lng: null as number | null },
  { code: "MAG-07",  nom: "Gonate",      ville: "Gonate",      region: "DALOA",     lat: null as number | null, lng: null as number | null },
  { code: "MAG-004", nom: "Zebra",       ville: "Zebra",       region: "DALOA",     lat: null as number | null, lng: null as number | null },
  { code: "MAG-005", nom: "Youkorea",    ville: "Youkorea",    region: "DALOA",     lat: null as number | null, lng: null as number | null },
  { code: "MAG-006", nom: "Zalihouan",   ville: "Zalihouan",   region: "DALOA",     lat: null as number | null, lng: null as number | null },

  // SAN-PEDRO (2)
  { code: "MAG-09",  nom: "Djouroutou",  ville: "Djouroutou",  region: "SAN-PEDRO", lat: null as number | null, lng: null as number | null },
  { code: "MAG-15",  nom: "Para",        ville: "Para",        region: "SAN-PEDRO", lat: null as number | null, lng: null as number | null },

  // DUEKOUE (7)
  { code: "MAG-21",  nom: "Tai",         ville: "Tai",         region: "DUEKOUE",   lat: 5.8722, lng: -7.4500 },
  { code: "MAG-16",  nom: "Keibly",      ville: "Keibly",      region: "DUEKOUE",   lat: null as number | null, lng: null as number | null },
  { code: "MAG-37",  nom: "Kaade",       ville: "Kaade",       region: "DUEKOUE",   lat: null as number | null, lng: null as number | null },
  { code: "MAG-12",  nom: "Blolequin",   ville: "Blolequin",   region: "DUEKOUE",   lat: 6.5667, lng: -7.5333 },
  { code: "MAG-35",  nom: "Dah",         ville: "Dah",         region: "DUEKOUE",   lat: null as number | null, lng: null as number | null },
  { code: "MAG-002", nom: "Semian",      ville: "Semian",      region: "DUEKOUE",   lat: null as number | null, lng: null as number | null },
  { code: "MAG-31",  nom: "Kouibly",     ville: "Kouibly",     region: "DUEKOUE",   lat: 7.2667, lng: -7.2500 },

  // MAN (1)
  { code: "MAG-001", nom: "Danane",      ville: "Danane",      region: "MAN",       lat: 7.2606, lng: -8.1553 },

  // SOUBRE (3)
  { code: "MAG-003", nom: "Douaguerer",  ville: "Douaguerer",  region: "SOUBRE",    lat: null as number | null, lng: null as number | null },
  { code: "MAG-03",  nom: "Buyo",        ville: "Buyo",        region: "SOUBRE",    lat: 6.2833, lng: -7.0000 },
  { code: "MAG-18",  nom: "Dobre",       ville: "Dobre",       region: "SOUBRE",    lat: null as number | null, lng: null as number | null },
];

const PRODUITS = [
  { code: "FB-G1-CI", nom: "Fèves brutes Grade 1 Côte d'Ivoire",  type: "FEVES_BRUTES" as const,    grade: "GRADE_1" as const,       origine: "Coopératives CI" },
  { code: "FF-G1-CI", nom: "Fèves fermentées Grade 1",            type: "FEVES_FERMENTEES" as const,grade: "GRADE_1" as const,       origine: "Coopératives CI" },
  { code: "FS-G1-CI", nom: "Fèves séchées Grade 1 (export)",      type: "FEVES_SECHEES" as const,   grade: "GRADE_1" as const,       origine: "Coopératives CI" },
  { code: "FS-G2-CI", nom: "Fèves séchées Grade 2",               type: "FEVES_SECHEES" as const,   grade: "GRADE_2" as const,       origine: "Coopératives CI" },
  { code: "FS-HS-CI", nom: "Fèves séchées Hors standard",         type: "FEVES_SECHEES" as const,   grade: "HORS_STANDARD" as const, origine: "Producteurs divers" },
];

// ─── Comptes utilisateurs ──────────────────────────────────────────────

const ADMIN_PASSWORD = "Admin#2026";
const MANAGER_PASSWORD = "Manager#2026";
const MAGASIN_PASSWORD = "Magasin#2026";

async function main() {
  console.log("🌱 Démarrage du seed SOCOPAD…");

  // 1) Vider les tables métier (ordre inverse des dépendances)
  console.log("  ↳ Nettoyage des tables existantes");
  await prisma.auditLog.deleteMany();
  await prisma.mouvementStock.deleteMany();
  await prisma.stock.deleteMany();
  await prisma.user.deleteMany();
  await prisma.magasin.deleteMany();
  await prisma.produit.deleteMany();
  await prisma.region.deleteMany();

  // 2) Régions
  console.log("  ↳ Création des régions");
  const regionsParCode: Record<string, string> = {};
  for (const r of REGIONS) {
    const created = await prisma.region.create({ data: r });
    regionsParCode[r.code] = created.id;
  }

  // 3) Magasins
  console.log(`  ↳ Création de ${MAGASINS.length} magasins`);
  const magasinsParCode: Record<string, string> = {};
  for (const m of MAGASINS) {
    const created = await prisma.magasin.create({
      data: {
        code: m.code,
        nom: m.nom,
        ville: m.ville,
        latitude: m.lat,
        longitude: m.lng,
        statut: "ACTIF",
        regionId: regionsParCode[m.region],
      },
    });
    magasinsParCode[m.code] = created.id;
  }

  // 4) Produits
  console.log(`  ↳ Création de ${PRODUITS.length} produits`);
  const produits = await Promise.all(
    PRODUITS.map((p) => prisma.produit.create({ data: { ...p, actif: true } })),
  );

  // 5) Utilisateurs
  console.log("  ↳ Création des comptes utilisateurs");
  const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const managerHash = await bcrypt.hash(MANAGER_PASSWORD, 10);
  const magasinHash = await bcrypt.hash(MAGASIN_PASSWORD, 10);

  // 5a) Admin SOCOPAD
  const admin = await prisma.user.create({
    data: {
      email: "admin@socopad.ci",
      motDePasseHash: adminHash,
      nom: "Direction",
      prenom: "SOCOPAD",
      role: "ADMIN",
      actif: true,
    },
  });

  // 5b) Un manager par région
  const slug = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const managers: Record<string, { id: string }> = {};
  for (const r of REGIONS) {
    const manager = await prisma.user.create({
      data: {
        email: `manager.${slug(r.nom)}@socopad.ci`,
        motDePasseHash: managerHash,
        nom: `Manager ${r.nom}`,
        prenom: "Régional",
        role: "MANAGER_REGIONAL",
        regionId: regionsParCode[r.code],
        actif: true,
      },
    });
    managers[r.code] = manager;
  }

  // 5c) Un responsable par magasin
  for (const m of MAGASINS) {
    const slugMag = slug(m.ville);
    const codeSuffix = m.code.split("-").pop() ?? "01";
    const email = `mag.${slugMag}.${codeSuffix}@socopad.ci`;
    const responsable = await prisma.user.create({
      data: {
        email,
        motDePasseHash: magasinHash,
        nom: `Responsable ${m.nom}`,
        prenom: "Magasin",
        role: "RESPONSABLE_MAGASIN",
        magasinId: magasinsParCode[m.code],
        regionId: regionsParCode[m.region],
        actif: true,
      },
    });
    // Lier le magasin à son responsable
    await prisma.magasin.update({
      where: { id: magasinsParCode[m.code] },
      data: { responsableId: responsable.id },
    });
  }

  // 6) Données de stock — 30 jours, 3 produits/magasin en moyenne
  console.log("  ↳ Génération de 30 jours d'historique de stocks");
  const JOURS = 30;
  let totalStocks = 0;
  let totalMouvements = 0;

  for (const m of MAGASINS) {
    const magasinId = magasinsParCode[m.code];
    const responsable = await prisma.user.findFirst({
      where: { magasinId, role: "RESPONSABLE_MAGASIN" },
    });
    if (!responsable) continue;

    // Sélection aléatoire de 2 à 4 produits actifs pour ce magasin
    const nbProduits = randInt(2, 4);
    const produitsMagasin = [...produits].sort(() => rand() - 0.5).slice(0, nbProduits);

    for (const p of produitsMagasin) {
      // Stock d'ouverture initial dans une plage métier raisonnable (kg)
      let stockCourant = randFloat(5_000, 30_000);

      for (let j = JOURS - 1; j >= 0; j--) {
        const date = dateAJ0(j);
        const ouverture = stockCourant;
        const entrees = rand() < 0.6 ? randFloat(500, 5000) : 0;
        const sorties = rand() < 0.7 ? randFloat(300, 4500) : 0;
        const cloture = Math.max(0, ouverture + entrees - sorties);

        // 80% des fiches sont validées (J-1 et antérieur), J0 souvent BROUILLON
        let statut: "BROUILLON" | "SOUMIS" | "VALIDE" | "REJETE";
        if (j === 0) statut = rand() < 0.4 ? "BROUILLON" : "SOUMIS";
        else if (j === 1) statut = rand() < 0.7 ? "VALIDE" : "SOUMIS";
        else statut = rand() < 0.95 ? "VALIDE" : "REJETE";

        const stock = await prisma.stock.create({
          data: {
            magasinId,
            produitId: p.id,
            date,
            stockOuvertureKg: Math.round(ouverture * 10) / 10,
            entreesKg: Math.round(entrees * 10) / 10,
            sortiesKg: Math.round(sorties * 10) / 10,
            stockClotureKg: Math.round(cloture * 10) / 10,
            humiditeMoyenne: Math.round(randFloat(6.5, 8.5) * 10) / 10,
            statut,
            saisiParId: responsable.id,
            saisiLe: date,
            valideParId: statut === "VALIDE" ? admin.id : null,
            valideLe: statut === "VALIDE" ? date : null,
          },
        });
        totalStocks++;

        // Créer 1 mouvement entrée + 1 sortie quand >0
        if (entrees > 0) {
          await prisma.mouvementStock.create({
            data: {
              stockId: stock.id,
              produitId: p.id,
              type: "ENTREE_ACHAT",
              quantiteKg: entrees,
              reference: `BL-${m.code}-${j}`,
              motif: "Achat producteur",
              saisiParId: responsable.id,
              dateMvt: date,
            },
          });
          totalMouvements++;
        }
        if (sorties > 0) {
          await prisma.mouvementStock.create({
            data: {
              stockId: stock.id,
              produitId: p.id,
              type: rand() < 0.85 ? "SORTIE_VENTE" : "SORTIE_TRANSFERT",
              quantiteKg: sorties,
              reference: `OUT-${m.code}-${j}`,
              motif: "Sortie quotidienne",
              saisiParId: responsable.id,
              dateMvt: date,
            },
          });
          totalMouvements++;
        }

        stockCourant = cloture;
      }
    }
  }

  console.log(`✅ Seed terminé : ${totalStocks} états de stock, ${totalMouvements} mouvements`);
  console.log("");
  console.log("📋 Comptes de test :");
  console.log(`   • admin@socopad.ci             → ${ADMIN_PASSWORD}    (ADMIN)`);
  console.log(`   • manager.<region>@socopad.ci  → ${MANAGER_PASSWORD}  (MANAGER_REGIONAL)`);
  console.log(`   • mag.<ville>.<n>@socopad.ci   → ${MAGASIN_PASSWORD}  (RESPONSABLE_MAGASIN)`);
}

main()
  .catch((e) => {
    console.error("❌ Erreur seed :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
