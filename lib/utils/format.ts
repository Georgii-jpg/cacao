// Helpers de formatage francophones (FR-CI : devise FCFA, unités kg, dates).

const NBSP = " "; // espace insécable utilisé par Intl en français

/** Formate un nombre selon la convention FR (séparateur de milliers = espace). */
export function formatNombre(valeur: number, decimales = 0): string {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(valeur);
}

/** Formate un montant en FCFA (XOF) — pas de décimales par convention en Côte d'Ivoire. */
export function formatFCFA(valeur: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    maximumFractionDigits: 0,
  })
    .format(valeur)
    .replace("XOF", "FCFA");
}

/** Formate un poids cacao en kg ou tonnes selon la grandeur. */
export function formatPoidsKg(valeurKg: number): string {
  if (Math.abs(valeurKg) >= 1000) {
    return `${formatNombre(valeurKg / 1000, 2)}${NBSP}t`;
  }
  return `${formatNombre(valeurKg, 1)}${NBSP}kg`;
}

/** Formate une date (jj/mm/aaaa). */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

/** Formate une date longue (5 mai 2026). */
export function formatDateLongue(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

/** Formate une date + heure (jj/mm/aaaa hh:mm). */
export function formatDateHeure(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/** Formate un pourcentage (12,3 %). */
export function formatPourcent(ratio: number, decimales = 1): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "percent",
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(ratio);
}
