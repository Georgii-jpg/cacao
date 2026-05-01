// Proxy NextAuth — remplace l'ancien middleware (Next 16 dépréciation).
// Tourne en Edge Runtime, donc on n'utilise QUE auth.config (sans bcrypt
// ni Prisma). Le provider Credentials avec accès DB vit dans lib/auth/index.ts.
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

// Next 16 attend un export nommé `proxy` (ou default) — pas `middleware`.
export const proxy = auth;

// Exclure les fichiers statiques + routes API auth (servies par leurs handlers)
export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
