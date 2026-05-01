"use server";
// Server Actions liées à l'authentification.
// Centralisées ici pour pouvoir être appelées depuis n'importe quel client.

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth";

export type EtatConnexion = {
  erreur: string | null;
};

/**
 * Action de connexion — utilisée avec `useActionState` côté client.
 * Lève NEXT_REDIRECT si succès (NextAuth gère la redirection via redirectTo).
 */
export async function connecter(
  _prev: EtatConnexion,
  formData: FormData,
): Promise<EtatConnexion> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: (formData.get("retour") as string | null) || "/dashboard",
    });
    return { erreur: null };
  } catch (error) {
    // Cas d'erreur d'auth → retour explicite à l'UI
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { erreur: "Email ou mot de passe incorrect." };
        case "CallbackRouteError":
          return { erreur: "Erreur lors de la connexion. Veuillez réessayer." };
        default:
          return { erreur: "Erreur d'authentification." };
      }
    }
    // Tout le reste (NEXT_REDIRECT inclus) doit remonter
    throw error;
  }
}

/**
 * Action de déconnexion. Redirige vers la page d'accueil.
 */
export async function deconnecter() {
  await signOut({ redirectTo: "/" });
}
