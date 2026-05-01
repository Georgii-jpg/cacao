// ───────────────────────────────────────────────────────────────────────
//  NextAuth — Configuration "edge-safe" (sans accès DB ni bcrypt)
// ───────────────────────────────────────────────────────────────────────
//  Cette config est utilisée par le middleware (qui tourne en Edge Runtime)
//  pour autoriser/rejeter une requête à partir du cookie JWT seul.
//  Le provider Credentials avec son `authorize` (bcrypt + Prisma) est
//  ajouté séparément dans `lib/auth/index.ts` (Node runtime).
// ───────────────────────────────────────────────────────────────────────
import type { NextAuthConfig } from "next-auth";

/// Routes publiques accessibles sans connexion.
const ROUTES_PUBLIQUES = ["/", "/connexion"];

/// Préfixes de routes protégées (toutes redirigent vers /connexion si non authentifié).
const PREFIXES_PROTEGES = [
  "/dashboard",
  "/stocks",
  "/magasins",
  "/utilisateurs",
  "/rapports",
  "/parametres",
  "/profil",
];

export const authConfig = {
  pages: {
    signIn: "/connexion",
  },
  // Sessions JWT — pas de tables Account/Session en base
  session: { strategy: "jwt" },
  // Liste vidée pour le middleware ; remplie dans lib/auth/index.ts
  providers: [],
  callbacks: {
    /**
     * Contrôle d'accès route par route.
     * Renvoie true pour autoriser, false pour rediriger vers signIn,
     * ou une Response.redirect pour rediriger ailleurs.
     */
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = Boolean(auth?.user);
      const path = nextUrl.pathname;
      const isProtege = PREFIXES_PROTEGES.some((p) => path.startsWith(p));
      const isPublic = ROUTES_PUBLIQUES.includes(path);

      // Utilisateur connecté qui revient sur la page de connexion → dashboard
      if (isLoggedIn && path === "/connexion") {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      // Route protégée + non connecté → redirige vers connexion
      if (isProtege && !isLoggedIn) {
        const url = new URL("/connexion", nextUrl);
        url.searchParams.set("retour", path);
        return Response.redirect(url);
      }

      // Routes publiques toujours accessibles
      if (isPublic || !isProtege) return true;

      return isLoggedIn;
    },

    /**
     * À chaque émission/refresh du JWT : on enrichit le token avec les
     * infos métier nécessaires (rôle, magasin, région) pour les avoir
     * côté client sans requête DB additionnelle.
     */
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id ?? "";
        token.role = (user as { role?: string }).role;
        token.magasinId = (user as { magasinId?: string | null }).magasinId ?? null;
        token.regionId = (user as { regionId?: string | null }).regionId ?? null;
      }
      return token;
    },

    /**
     * Expose les champs métier au front via `useSession()` ou `auth()`.
     */
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? token.sub ?? "";
        session.user.role = token.role as
          | "ADMIN"
          | "MANAGER_REGIONAL"
          | "RESPONSABLE_MAGASIN"
          | "OPERATEUR_SAISIE"
          | undefined;
        session.user.magasinId = (token.magasinId as string | null) ?? null;
        session.user.regionId = (token.regionId as string | null) ?? null;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
