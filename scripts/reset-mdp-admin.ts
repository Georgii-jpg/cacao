// ───────────────────────────────────────────────────────────────────────
//  SOCOPAD — Reset du mot de passe admin
// ───────────────────────────────────────────────────────────────────────
//  Remet le mot de passe d'admin@socopad.ci à `Admin#2026`.
//  À utiliser uniquement en cas d'oubli — à changer immédiatement après
//  via la page /profil de l'app.
//
//  Utilisation :
//    $env:DATABASE_URL="postgres://..."
//    npx tsx scripts/reset-mdp-admin.ts
// ───────────────────────────────────────────────────────────────────────

import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const url: string = process.env.DATABASE_URL ?? "";
if (!url) {
  console.error("❌ DATABASE_URL manquant.");
  process.exit(1);
}
if (!url.startsWith("postgres://") && !url.startsWith("postgresql://")) {
  console.error("❌ DATABASE_URL doit pointer sur Postgres (production).");
  process.exit(1);
}

const NOUVEAU_MDP = "Admin#2026";
const EMAIL_ADMIN = "admin@socopad.ci";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});

async function main() {
  console.log(`🔌 Connecté à : ${url.replace(/:[^:@]+@/, ":***@")}\n`);

  const admin = await prisma.user.findUnique({
    where: { email: EMAIL_ADMIN },
    select: { id: true, email: true, actif: true },
  });

  if (!admin) {
    console.error(`❌ Compte ${EMAIL_ADMIN} introuvable.`);
    process.exit(1);
  }

  const hash = await bcrypt.hash(NOUVEAU_MDP, 10);

  await prisma.user.update({
    where: { id: admin.id },
    data: { motDePasseHash: hash, actif: true },
  });

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: "MODIFICATION",
      entite: "User",
      entiteId: admin.id,
      nouvelleValeur: JSON.stringify({
        source: "scripts/reset-mdp-admin.ts",
        action: "reset mot de passe + réactivation",
      }),
    },
  });

  console.log(`✅ Mot de passe ${EMAIL_ADMIN} remis à : ${NOUVEAU_MDP}`);
  console.log(`   Compte réactivé si nécessaire.`);
  console.log(`\n⚠️  Change-le immédiatement via /profil après connexion.`);
}

main()
  .catch((e) => {
    console.error("❌ Erreur :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
