// ───────────────────────────────────────────────────────────────────────
//  NextAuth — Configuration runtime Node (avec accès DB + bcrypt)
// ───────────────────────────────────────────────────────────────────────
//  Étend `auth.config.ts` (edge-safe) en y ajoutant le provider
//  Credentials qui interroge la base via Prisma et vérifie bcrypt.
//  C'est ce module qui exporte `auth`, `signIn`, `signOut`, `handlers`.
// ───────────────────────────────────────────────────────────────────────
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/db/prisma";

// Schéma de validation des identifiants entrants
const schemaConnexion = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      // Champs attendus depuis le formulaire de connexion
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(raw) {
        const parsed = schemaConnexion.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        });

        // Compte inexistant ou désactivé → échec silencieux
        if (!user || !user.actif) return null;

        const motDePasseValide = await bcrypt.compare(password, user.motDePasseHash);
        if (!motDePasseValide) return null;

        // Mise à jour timestamp dernière connexion (best-effort)
        await prisma.user
          .update({
            where: { id: user.id },
            data: { derniereConnexion: new Date() },
          })
          .catch(() => null);

        // Trace audit — connexion réussie
        await prisma.auditLog
          .create({
            data: {
              userId: user.id,
              action: "CONNEXION",
              entite: "User",
              entiteId: user.id,
            },
          })
          .catch(() => null);

        // Données minimales remontées dans le JWT (cf. callbacks dans authConfig)
        return {
          id: user.id,
          email: user.email,
          name: [user.prenom, user.nom].filter(Boolean).join(" ").trim() || user.email,
          role: user.role,
          magasinId: user.magasinId,
          regionId: user.regionId,
        };
      },
    }),
  ],
});
