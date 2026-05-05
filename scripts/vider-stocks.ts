// ───────────────────────────────────────────────────────────────────────
//  SOCOPAD — Vider toutes les fiches de stock + mouvements
// ───────────────────────────────────────────────────────────────────────
//  Supprime toutes les lignes Stock et MouvementStock de la base.
//  La suppression de Stock cascade automatiquement sur MouvementStock
//  (FK onDelete: Cascade dans le schéma).
//
//  CONSERVE : User, Magasin, Region, Produit, AuditLog.
//  (Les AuditLog sur Stock deviennent des références orphelines — c'est OK,
//  entiteId n'est pas une FK.)
//
//  Utilisation :
//    1) Récupérer DATABASE_PUBLIC_URL dans Railway (à jour après rotation)
//    2) Depuis C:\dev\socopad-app :
//       $env:DATABASE_URL="postgres://..."
//       npx tsx scripts/vider-stocks.ts             # dry-run
//       npx tsx scripts/vider-stocks.ts --confirm   # applique
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

const confirm = process.argv.includes("--confirm");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});

async function main() {
  console.log(`🔌 Connecté à : ${url.replace(/:[^:@]+@/, ":***@")}`);
  console.log(`🛡️  Mode : ${confirm ? "EXÉCUTION RÉELLE" : "DRY-RUN (aucune écriture)"}\n`);

  const [nbStocks, nbMouvements] = await Promise.all([
    prisma.stock.count(),
    prisma.mouvementStock.count(),
  ]);

  console.log(`📊 État actuel :`);
  console.log(`   • Stock           : ${nbStocks} ligne(s)`);
  console.log(`   • MouvementStock  : ${nbMouvements} ligne(s)\n`);

  if (nbStocks === 0 && nbMouvements === 0) {
    console.log("✅ Rien à supprimer — la base est déjà vide.");
    return;
  }

  if (!confirm) {
    console.log("ℹ️  Dry-run — relance avec --confirm pour appliquer.");
    return;
  }

  // L'ordre n'a pas d'importance grâce au cascade, mais on supprime
  // les mouvements explicitement pour le compteur de retour.
  const supprMvts = await prisma.mouvementStock.deleteMany();
  const supprStocks = await prisma.stock.deleteMany();

  console.log(`✅ Supprimé :`);
  console.log(`   • Stock           : ${supprStocks.count} ligne(s)`);
  console.log(`   • MouvementStock  : ${supprMvts.count} ligne(s)`);
  console.log("\nLes utilisateurs, magasins, régions, produits et audit logs sont conservés.");
}

main()
  .catch((e) => {
    console.error("❌ Erreur :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
