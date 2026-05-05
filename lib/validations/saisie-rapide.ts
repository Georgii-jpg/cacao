// Schéma Zod pour la saisie rapide (mode magasinier mobile).
// Simplification du schéma stock : juste produit + acheté + stock total actuel,
// sans saisie d'ouverture/sorties/humidité. Le serveur déduit le reste.
import { z } from "zod";

const poidsKg = z.coerce
  .number({ error: "Quantité invalide" })
  .min(0, "La quantité doit être ≥ 0")
  .max(10_000_000, "Quantité trop élevée");

/// Une ligne du formulaire : un produit avec acheté + stock actuel.
/// Les deux champs vides = ligne ignorée (le magasinier ne saisit
/// que les produits qu'il manipule aujourd'hui).
export const schemaLigneSaisieRapide = z.object({
  produitId: z.string().min(1, "Produit requis"),
  acheteAujourdhuiKg: poidsKg,
  stockTotalActuelKg: poidsKg,
});

export const schemaSaisieRapide = z.object({
  /// Date métier au format YYYY-MM-DD (par défaut = aujourd'hui)
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide"),
  lignes: z
    .array(schemaLigneSaisieRapide)
    .min(1, "Saisissez au moins un produit"),
});

export type EntreesLigneSaisieRapide = z.infer<typeof schemaLigneSaisieRapide>;
export type EntreesSaisieRapide = z.infer<typeof schemaSaisieRapide>;
