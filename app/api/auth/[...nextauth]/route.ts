// Route handlers NextAuth — points d'entrée HTTP pour le flux d'auth
// (signin, signout, callback, csrf, session).
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;

// Utiliser le runtime Node pour bcrypt + Prisma (pas Edge)
export const runtime = "nodejs";

// NextAuth a besoin de body parsing
export const dynamic = "force-dynamic";
