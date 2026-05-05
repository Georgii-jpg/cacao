// ───────────────────────────────────────────────────────────────────────
//  SOCOPAD — Création des 3 produits de base (Cacao, Café, Anacarde)
// ───────────────────────────────────────────────────────────────────────
//  Crée 3 produits avec codes CACAO, CAFE, ANACARDE s'ils n'existent pas.
//  Le type/grade est une valeur par défaut (FEVES_SECHEES / GRADE_1) —
//  ces champs ne sont pas exposés dans la saisie rapide qui ne traite
//  que le poids acheté et le stock total.
//
//  Utilisation :
//    1) Récupérer DATABASE_PUBLIC_URL dans Railway → service Postgres
//    2) Depuis C:\dev\socopad-app :
//       $env:DATABASE_URL="postgres://..."
//       npx tsx scripts/creer-produits-base.ts
// ───────────────────────────────────────────────────────────────────────

import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const url: string = process.env.DATABASE_URL ?? "";
if (!url) {
  console.error("❌ DATABASE_URL manquant.");
  process.exit(1);
}
if (!url.startsWith("postgres://") && !url.startsWith("postgresql://")) {
  console.error("❌ DATABASE_URL doit pointer sur Postgres (production).");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});

const PRODUITS_BASE = [
  { code: "CACAO",    nom: "Cacao",    description: "Stock cacao (toutes catégories confondues)" },
  { code: "CAFE",     nom: "Café",     description: "Stock café (toutes catégories confondues)" },
  { code: "ANACARDE", nom: "Anacarde", description: "Stock anacarde (noix de cajou)" },
];

async function main() {
  console.log("🌱 Création des 3 produits de base…\n");

  for (const p of PRODUITS_BASE) {
    const existant = await prisma.produit.findUnique({ where: { code: p.code } });
    if (existant) {
      // Réactive le produit s'il avait été désactivé, met à jour le nom/description
      if (!existant.actif || existant.nom !== p.nom || existant.description !== p.description) {
        await prisma.produit.update({
          where: { code: p.code },
          data: { actif: true, nom: p.nom, description: p.description },
        });
        console.log(`   ↳ ${p.code} mis à jour (réactivé / renommé)`);
      } else {
        console.log(`   ✓ ${p.code} déjà présent et actif`);
      }
    } else {
      await prisma.produit.create({
        data: {
          code: p.code,
          nom: p.nom,
          description: p.description,
          // Valeurs par défaut — non exposées dans la saisie rapide.
          type: "FEVES_SECHEES",
          grade: "GRADE_1",
          actif: true,
        },
      });
      console.log(`   ✅ ${p.code} créé`);
    }
  }

  console.log("\n✅ Terminé.");
}

main()
  .catch((e) => {
    console.error("❌ Erreur :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
