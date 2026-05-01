// Augmente les types NextAuth pour inclure les champs métier SOCOPAD.
// Permet d'accéder à `session.user.role`, `magasinId`, `regionId` avec autocomplétion.
import { DefaultSession } from "next-auth";
import type { Role } from "@/app/generated/prisma/enums";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: (typeof Role)[keyof typeof Role];
      magasinId?: string | null;
      regionId?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role?: (typeof Role)[keyof typeof Role];
    magasinId?: string | null;
    regionId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: (typeof Role)[keyof typeof Role];
    magasinId?: string | null;
    regionId?: string | null;
  }
}

export {};
