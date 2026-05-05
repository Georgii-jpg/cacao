// ───────────────────────────────────────────────────────────────────────
//  SOCOPAD — Désactivation des comptes seedés en production
// ───────────────────────────────────────────────────────────────────────
//  Met `actif = false` sur :
//   • les 5 managers régionaux seedés (manager.<region>@socopad.ci)
//   • les 20 responsables de magasin seedés (mag.<ville>.<n>@socopad.ci)
//
//  NE TOUCHE PAS au compte admin@socopad.ci.
//  Trace une entrée AuditLog (action MODIFICATION) par compte désactivé.
//
//  Utilisation :
//    1) Récupérer l'URL publique Postgres dans Railway → service Postgres
//       → onglet Variables → DATABASE_PUBLIC_URL (ou copier
//       postgres://...@switchyard.proxy.rlwy.net:<port>/railway)
//
//    2) Dry-run (lecture seule, affiche ce qui serait fait) :
//       $env:DATABASE_URL="postgres://..."; npx tsx scripts/desactiver-comptes-seedes.ts
//
//    3) Exécution réelle (après vérification du dry-run) :
//       $env:DATABASE_URL="postgres://..."; npx tsx scripts/desactiver-comptes-seedes.ts --confirm
// ───────────────────────────────────────────────────────────────────────

import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const url: string = process.env.DATABASE_URL ?? "";
if (!url) {
  console.error("❌ DATABASE_URL manquant. Définir l'URL publique Postgres de Railway.");
  process.exit(1);
}
if (!url.startsWith("postgres://") && !url.startsWith("postgresql://")) {
  console.error("❌ DATABASE_URL doit pointer sur Postgres (production), pas SQLite.");
  process.exit(1);
}

const confirm = process.argv.includes("--confirm");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});

async function main() {
  console.log(`🔌 Connecté à : ${url.replace(/:[^:@]+@/, ":***@")}`);
  console.log(`🛡️  Mode : ${confirm ? "EXÉCUTION RÉELLE" : "DRY-RUN (aucune écriture)"}`);
  console.log("");

  const admin = await prisma.user.findUnique({
    where: { email: "admin@socopad.ci" },
    select: { id: true, email: true, actif: true },
  });
  if (!admin) {
    console.error("❌ admin@socopad.ci introuvable. Vérifier la base.");
    process.exit(1);
  }
  if (!admin.actif) {
    console.warn("⚠️  Le compte admin@socopad.ci est désactivé — à réactiver avant tout.");
  }

  // Cibler uniquement les comptes seedés (par pattern d'email + rôle)
  const cibles = await prisma.user.findMany({
    where: {
      actif: true,
      OR: [
        { role: "MANAGER_REGIONAL", email: { startsWith: "manager.", endsWith: "@socopad.ci" } },
        { role: "RESPONSABLE_MAGASIN", email: { startsWith: "mag.", endsWith: "@socopad.ci" } },
      ],
    },
    select: { id: true, email: true, role: true, nom: true },
    orderBy: [{ role: "asc" }, { email: "asc" }],
  });

  console.log(`📋 ${cibles.length} compte(s) seedé(s) actif(s) à désactiver :`);
  for (const u of cibles) {
    console.log(`   • [${u.role}] ${u.email} — ${u.nom}`);
  }
  console.log("");

  if (cibles.length === 0) {
    console.log("✅ Rien à faire — aucun compte seedé actif.");
    return;
  }

  if (!confirm) {
    console.log("ℹ️  Dry-run — relance avec --confirm pour appliquer.");
    return;
  }

  // Désactivation + audit log dans une transaction
  let n = 0;
  for (const u of cibles) {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: u.id },
        data: { actif: false },
      }),
      prisma.auditLog.create({
        data: {
          userId: admin.id,
          action: "MODIFICATION",
          entite: "User",
          entiteId: u.id,
          ancienneValeur: JSON.stringify({ actif: true }),
          nouvelleValeur: JSON.stringify({ actif: false, motif: "Désactivation comptes seedés post-déploiement" }),
        },
      }),
    ]);
    n++;
  }

  console.log(`✅ ${n} compte(s) désactivé(s). Connexion impossible jusqu'à réactivation.`);
  console.log("   Pour réactiver un compte plus tard : page /utilisateurs (admin).");
}

main()
  .catch((e) => {
    console.error("❌ Erreur :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
