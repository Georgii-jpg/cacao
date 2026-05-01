// Helpers à utiliser dans les Server Components / Server Actions / Route Handlers
// pour garantir une session et/ou un rôle minimum avant d'exécuter la logique.
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { permissions, type RoleApp } from "./permissions";

/**
 * Garantit qu'une session existe. Redirige sinon vers /connexion en
 * conservant l'URL d'origine pour permettre un retour après login.
 */
export async function exigerAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/connexion");
  }
  return session;
}

/**
 * Garantit qu'une session existe ET que l'utilisateur a l'un des rôles
 * autorisés. Redirige vers le dashboard avec un toast d'erreur sinon.
 */
export async function exigerRole(roles: RoleApp[]) {
  const session = await exigerAuth();
  const role = session.user.role as RoleApp | undefined;
  if (!role || !roles.includes(role)) {
    redirect("/dashboard?erreur=permission");
  }
  return session;
}

/**
 * Variante : exige qu'une permission métier soit accordée.
 */
export async function exigerPermission(
  perm: keyof typeof permissions,
) {
  const session = await exigerAuth();
  const role = session.user.role as RoleApp | undefined;
  if (!permissions[perm](role)) {
    redirect("/dashboard?erreur=permission");
  }
  return session;
}
