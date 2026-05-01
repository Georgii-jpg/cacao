// ───────────────────────────────────────────────────────────────────────
//  SOCOPAD — Seed (jeu de données fictives)
// ───────────────────────────────────────────────────────────────────────
//  Génère :
//   • 5 régions (zones cacao Côte d'Ivoire)
//   • 25 magasins répartis dans ces régions
//   • 5 produits cacao (combinaisons type × grade)
//   • 1 admin + 5 managers régionaux + 25 responsables magasin
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
  { code: "SUD", nom: "Sud", description: "Région d'Abidjan et littoral est" },
  { code: "SUD-OUEST", nom: "Sud-Ouest", description: "San-Pédro et hinterland cacaoyer" },
  { code: "CENTRE-OUEST", nom: "Centre-Ouest", description: "Daloa, cœur historique du cacao" },
  { code: "OUEST", nom: "Ouest", description: "Man, zone montagneuse" },
  { code: "CENTRE", nom: "Centre", description: "Yamoussoukro et bassin central" },
];

// 25 magasins × ville × région × capacité (kg)
const MAGASINS = [
  // SUD (5)
  { code: "MAG-ABJ-01", nom: "Abidjan Plateau",     ville: "Abidjan",     region: "SUD",          capaciteKg: 80000, lat: 5.3197, lng: -4.0267 },
  { code: "MAG-ABJ-02", nom: "Abidjan Treichville", ville: "Abidjan",     region: "SUD",          capaciteKg: 60000, lat: 5.2922, lng: -4.0167 },
  { code: "MAG-ABJ-03", nom: "Abidjan Yopougon",    ville: "Abidjan",     region: "SUD",          capaciteKg: 50000, lat: 5.3417, lng: -4.0867 },
  { code: "MAG-BAS-01", nom: "Grand-Bassam",        ville: "Grand-Bassam",region: "SUD",          capaciteKg: 30000, lat: 5.2125, lng: -3.7372 },
  { code: "MAG-ABO-01", nom: "Aboisso",             ville: "Aboisso",     region: "SUD",          capaciteKg: 25000, lat: 5.4711, lng: -3.2069 },

  // SUD-OUEST (6)
  { code: "MAG-SP-01",  nom: "San-Pédro Port",      ville: "San-Pédro",   region: "SUD-OUEST",    capaciteKg: 120000, lat: 4.7485, lng: -6.6363 },
  { code: "MAG-SP-02",  nom: "San-Pédro Centre",    ville: "San-Pédro",   region: "SUD-OUEST",    capaciteKg: 60000,  lat: 4.7485, lng: -6.6363 },
  { code: "MAG-TAB-01", nom: "Tabou",               ville: "Tabou",       region: "SUD-OUEST",    capaciteKg: 30000,  lat: 4.4231, lng: -7.3539 },
  { code: "MAG-SOU-01", nom: "Soubré",              ville: "Soubré",      region: "SUD-OUEST",    capaciteKg: 70000,  lat: 5.7833, lng: -6.6000 },
  { code: "MAG-MEA-01", nom: "Méagui",              ville: "Méagui",      region: "SUD-OUEST",    capaciteKg: 40000,  lat: 5.4500, lng: -6.5500 },
  { code: "MAG-SAS-01", nom: "Sassandra",           ville: "Sassandra",   region: "SUD-OUEST",    capaciteKg: 35000,  lat: 4.9500, lng: -6.0833 },

  // CENTRE-OUEST (6)
  { code: "MAG-DAL-01", nom: "Daloa Centre",        ville: "Daloa",       region: "CENTRE-OUEST", capaciteKg: 90000,  lat: 6.8772, lng: -6.4503 },
  { code: "MAG-DAL-02", nom: "Daloa Sud",           ville: "Daloa",       region: "CENTRE-OUEST", capaciteKg: 50000,  lat: 6.8772, lng: -6.4503 },
  { code: "MAG-ISS-01", nom: "Issia",               ville: "Issia",       region: "CENTRE-OUEST", capaciteKg: 45000,  lat: 6.4925, lng: -6.5839 },
  { code: "MAG-VAV-01", nom: "Vavoua",              ville: "Vavoua",      region: "CENTRE-OUEST", capaciteKg: 40000,  lat: 7.3833, lng: -6.4667 },
  { code: "MAG-BOU-01", nom: "Bouaflé",             ville: "Bouaflé",     region: "CENTRE-OUEST", capaciteKg: 35000,  lat: 6.9833, lng: -5.7500 },
  { code: "MAG-SIN-01", nom: "Sinfra",              ville: "Sinfra",      region: "CENTRE-OUEST", capaciteKg: 30000,  lat: 6.6167, lng: -5.9167 },

  // OUEST (4)
  { code: "MAG-MAN-01", nom: "Man",                 ville: "Man",         region: "OUEST",        capaciteKg: 55000,  lat: 7.4125, lng: -7.5538 },
  { code: "MAG-DUE-01", nom: "Duékoué",             ville: "Duékoué",     region: "OUEST",        capaciteKg: 40000,  lat: 6.7416, lng: -7.3478 },
  { code: "MAG-GUI-01", nom: "Guiglo",              ville: "Guiglo",      region: "OUEST",        capaciteKg: 35000,  lat: 6.5447, lng: -7.4906 },
  { code: "MAG-BAN-01", nom: "Bangolo",             ville: "Bangolo",     region: "OUEST",        capaciteKg: 25000,  lat: 7.0167, lng: -7.4833 },

  // CENTRE (4)
  { code: "MAG-YAM-01", nom: "Yamoussoukro",        ville: "Yamoussoukro",region: "CENTRE",       capaciteKg: 70000,  lat: 6.8276, lng: -5.2893 },
  { code: "MAG-BKE-01", nom: "Bouaké",              ville: "Bouaké",      region: "CENTRE",       capaciteKg: 60000,  lat: 7.6906, lng: -5.0356 },
  { code: "MAG-TOU-01", nom: "Toumodi",             ville: "Toumodi",     region: "CENTRE",       capaciteKg: 35000,  lat: 6.5500, lng: -5.0167 },
  { code: "MAG-DIM-01", nom: "Dimbokro",            ville: "Dimbokro",    region: "CENTRE",       capaciteKg: 30000,  lat: 6.6500, lng: -4.7000 },
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
        capaciteKg: m.capaciteKg,
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
      // Stock d'ouverture initial proportionnel à la capacité
      let stockCourant = randFloat(m.capaciteKg * 0.2, m.capaciteKg * 0.6);

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
