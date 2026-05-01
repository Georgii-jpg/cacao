// Définition centrale des items de navigation et leurs permissions par rôle.
// Modifier ici pour ajouter/retirer un module du menu.
//
// IMPORTANT : `icone` est un identifiant string et non un composant React,
// car ce module est importé depuis des Server Components qui passent ces
// items à des Client Components. RSC interdit la sérialisation de fonctions —
// le mapping id → composant Lucide est résolu côté client (cf. nav-icones.tsx).
import type { RoleApp } from "@/lib/auth/permissions";

export type IdIcone =
  | "home"
  | "package"
  | "building"
  | "users"
  | "file-text"
  | "settings";

export type ItemNavigation = {
  href: string;
  libelle: string;
  icone: IdIcone;
  roles: ReadonlyArray<RoleApp>;
};

export const itemsNavigation: ReadonlyArray<ItemNavigation> = [
  {
    href: "/dashboard",
    libelle: "Tableau de bord",
    icone: "home",
    roles: ["ADMIN", "MANAGER_REGIONAL", "RESPONSABLE_MAGASIN", "OPERATEUR_SAISIE"],
  },
  {
    href: "/stocks",
    libelle: "Stocks",
    icone: "package",
    roles: ["ADMIN", "MANAGER_REGIONAL", "RESPONSABLE_MAGASIN", "OPERATEUR_SAISIE"],
  },
  {
    href: "/magasins",
    libelle: "Magasins",
    icone: "building",
    roles: ["ADMIN", "MANAGER_REGIONAL"],
  },
  {
    href: "/utilisateurs",
    libelle: "Utilisateurs",
    icone: "users",
    roles: ["ADMIN"],
  },
  {
    href: "/rapports",
    libelle: "Rapports",
    icone: "file-text",
    roles: ["ADMIN", "MANAGER_REGIONAL"],
  },
  {
    href: "/parametres",
    libelle: "Paramètres",
    icone: "settings",
    roles: ["ADMIN"],
  },
];

/**
 * Filtre les items accessibles à un rôle donné.
 */
export function itemsPourRole(role: RoleApp | undefined): ItemNavigation[] {
  if (!role) return [];
  return itemsNavigation.filter((item) => item.roles.includes(role));
}

/**
 * Libellé lisible pour chaque rôle.
 */
export const LIBELLE_ROLE: Record<RoleApp, string> = {
  ADMIN: "Administrateur",
  MANAGER_REGIONAL: "Manager régional",
  RESPONSABLE_MAGASIN: "Responsable magasin",
  OPERATEUR_SAISIE: "Opérateur saisie",
};
