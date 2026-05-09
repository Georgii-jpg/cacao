// Schéma Zod pour la saisie rapide (mode magasinier mobile).
// Simplification du schéma stock : juste produit + acheté + stock total actuel,
// sans saisie d'ouverture/sorties/humidité. Le serveur déduit le reste.
// Inclut aussi la fiche caisse du jour (encaissements / décaissements / solde).
import { z } from "zod";

const poidsKg = z.coerce
  .number({ error: "Quantité invalide" })
  .min(0, "La quantité doit être ≥ 0")
  .max(10_000_000, "Quantité trop élevée");

const montantFcfa = z.coerce
  .number({ error: "Montant invalide" })
  .min(0, "Le montant doit être ≥ 0")
  .max(1_000_000_000, "Montant trop élevé");

/// Une ligne du formulaire : un produit avec acheté + stock actuel.
/// Les deux champs vides = ligne ignorée (le magasinier ne saisit
/// que les produits qu'il manipule aujourd'hui).
export const schemaLigneSaisieRapide = z.object({
  produitId: z.string().min(1, "Produit requis"),
  acheteAujourdhuiKg: poidsKg,
  stockTotalActuelKg: poidsKg,
});

/// Bloc caisse facultatif. Soumis à la validation manager si au moins un
/// des trois montants est fourni. Si aucun champ n'est rempli, le bloc
/// est ignoré côté serveur.
export const schemaCaisseSaisieRapide = z.object({
  encaissementsFcfa: montantFcfa,
  decaissementsFcfa: montantFcfa,
  soldeFcfa: montantFcfa,
});

export const schemaSaisieRapide = z
  .object({
    /// Date métier au format YYYY-MM-DD (par défaut = aujourd'hui)
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide"),
    lignes: z.array(schemaLigneSaisieRapide),
    caisse: schemaCaisseSaisieRapide.nullable(),
  })
  .refine((v) => v.lignes.length > 0 || v.caisse !== null, {
    message: "Saisissez au moins un produit ou la caisse du jour",
    path: ["lignes"],
  });

export type EntreesLigneSaisieRapide = z.infer<typeof schemaLigneSaisieRapide>;
export type EntreesCaisseSaisieRapide = z.infer<typeof schemaCaisseSaisieRapide>;
export type EntreesSaisieRapide = z.infer<typeof schemaSaisieRapide>;
