// Singleton Prisma Client — évite la création de connexions multiples en dev (HMR Next.js).
// Prisma 7 utilise un driver adapter — on choisit dynamiquement selon DATABASE_URL :
//   • file:...                                    → better-sqlite3 (dev local)
//   • postgresql:// ou postgres:// (Supabase/RDS) → pg
import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  // eslint-disable-next-line no-var
  var prismaInstance: PrismaClient | undefined;
}

function creerClient(): PrismaClient {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  const estPostgres = url.startsWith("postgres://") || url.startsWith("postgresql://");
  const adapter = estPostgres
    ? new PrismaPg({ connectionString: url })
    : new PrismaBetterSqlite3({ url });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma: PrismaClient = globalThis.prismaInstance ?? creerClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaInstance = prisma;
}
