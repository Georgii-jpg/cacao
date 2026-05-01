// Schémas Zod pour les opérations sur les stocks (saisie, soumission,
// validation, rejet). Réutilisés côté Server Action et formulaire client.
import { z } from "zod";

const poidsKg = z.coerce
  .number({ error: "Quantité invalide" })
  .min(0, "La quantité doit être ≥ 0")
  .max(10_000_000, "Quantité trop élevée");

const humidite = z.coerce
  .number({ error: "Humidité invalide" })
  .min(0)
  .max(100)
  .nullish()
  .or(z.literal("").transform(() => null));

/// Saisie / mise à jour d'une fiche journalière (BROUILLON ou REJETE → BROUILLON).
export const schemaSaisieStock = z.object({
  /// Identifiant de la fiche existante (édition). Absent en création.
  id: z
    .string()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  magasinId: z.string().min(1, "Magasin requis"),
  produitId: z.string().min(1, "Produit requis"),
  /// Date métier au format YYYY-MM-DD (jour calendaire local)
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide (format JJ/MM/AAAA)"),
  stockOuvertureKg: poidsKg,
  entreesKg: poidsKg,
  sortiesKg: poidsKg,
  humiditeMoyenne: humidite,
  notesQualite: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export const schemaRejet = z.object({
  motifRejet: z
    .string()
    .trim()
    .min(5, "Indiquez un motif d'au moins 5 caractères")
    .max(500),
});

export type EntreesSaisieStock = z.infer<typeof schemaSaisieStock>;
export type EntreesRejet = z.infer<typeof schemaRejet>;
