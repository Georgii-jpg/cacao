// Helpers de contrôle d'accès basé sur le rôle (RBAC).
// Centralise toutes les règles métier d'autorisation pour éviter
// la dispersion des conditions `if (role === "ADMIN") ...` dans le code.
import { Role } from "@/app/generated/prisma/enums";

export type RoleApp = (typeof Role)[keyof typeof Role];

/**
 * Hiérarchie indicative des rôles, du plus puissant au moins.
 * Sert pour des checks "rôle au moins X".
 */
export const HIERARCHIE_ROLES: Record<RoleApp, number> = {
  ADMIN: 4,
  MANAGER_REGIONAL: 3,
  RESPONSABLE_MAGASIN: 2,
  OPERATEUR_SAISIE: 1,
};

export function aRoleAuMoins(role: RoleApp | undefined, minimum: RoleApp): boolean {
  if (!role) return false;
  return HIERARCHIE_ROLES[role] >= HIERARCHIE_ROLES[minimum];
}

// ─── Permissions métier ────────────────────────────────────────────────

export const permissions = {
  // Stocks
  saisirStock: (role?: RoleApp) =>
    !!role && ["ADMIN", "MANAGER_REGIONAL", "RESPONSABLE_MAGASIN", "OPERATEUR_SAISIE"].includes(role),

  validerStock: (role?: RoleApp) =>
    !!role && ["ADMIN", "MANAGER_REGIONAL", "RESPONSABLE_MAGASIN"].includes(role),

  consulterTousMagasins: (role?: RoleApp) =>
    !!role && ["ADMIN", "MANAGER_REGIONAL"].includes(role),

  // Magasins
  gererMagasins: (role?: RoleApp) => role === "ADMIN",

  // Utilisateurs
  gererUtilisateurs: (role?: RoleApp) => role === "ADMIN",

  // Rapports / exports
  exporter: (role?: RoleApp) =>
    !!role && ["ADMIN", "MANAGER_REGIONAL"].includes(role),

  // Paramètres système
  modifierParametres: (role?: RoleApp) => role === "ADMIN",
};

/**
 * Détermine le périmètre de magasins visible par l'utilisateur.
 * Retourne un filtre Prisma à appliquer aux requêtes Stock/Magasin.
 */
export function filtreMagasinPourUtilisateur(opts: {
  role?: RoleApp;
  magasinId?: string | null;
  regionId?: string | null;
}): { id?: string; regionId?: string } | null {
  const { role, magasinId, regionId } = opts;
  if (!role) return null;
  // Admin : pas de filtre
  if (role === "ADMIN") return {};
  // Manager : limité à sa région
  if (role === "MANAGER_REGIONAL" && regionId) return { regionId };
  // Responsable / Opérateur : limité à son magasin
  if ((role === "RESPONSABLE_MAGASIN" || role === "OPERATEUR_SAISIE") && magasinId) {
    return { id: magasinId };
  }
  // Sinon : aucun accès
  return null;
}
