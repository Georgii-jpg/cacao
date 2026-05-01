// Schémas Zod pour la validation des entrées du module Magasins.
// Utilisés à la fois côté Server Action (validation back) et côté
// formulaire (résolveur react-hook-form).
import { z } from "zod";
import { StatutMagasin } from "@/app/generated/prisma/enums";

const codeMagasin = z
  .string()
  .trim()
  .min(3, "Le code doit contenir au moins 3 caractères")
  .max(20, "Le code ne doit pas dépasser 20 caractères")
  .regex(
    /^[A-Z0-9-]+$/,
    "Le code ne peut contenir que des majuscules, chiffres et tirets",
  );

const coord = (libelle: string) =>
  z.coerce
    .number({ error: `${libelle} doit être un nombre` })
    .min(-180)
    .max(180)
    .nullish()
    .or(z.literal("").transform(() => null));

/// Schéma commun aux opérations création / édition.
const baseMagasin = z.object({
  code: codeMagasin,
  nom: z.string().trim().min(2, "Nom requis").max(80),
  ville: z.string().trim().min(2, "Ville requise").max(60),
  adresse: z
    .string()
    .trim()
    .max(200)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  telephone: z
    .string()
    .trim()
    .max(30)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  capaciteKg: z.coerce
    .number({ error: "Capacité invalide" })
    .positive("La capacité doit être positive")
    .max(10_000_000, "Capacité trop élevée"),
  statut: z.enum([
    StatutMagasin.ACTIF,
    StatutMagasin.INACTIF,
    StatutMagasin.MAINTENANCE,
  ]),
  regionId: z.string().min(1, "Région requise"),
  latitude: coord("Latitude"),
  longitude: coord("Longitude"),
  responsableId: z
    .string()
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export const schemaCreationMagasin = baseMagasin;
export const schemaEditionMagasin = baseMagasin.partial({ statut: true }).extend({
  statut: z
    .enum([
      StatutMagasin.ACTIF,
      StatutMagasin.INACTIF,
      StatutMagasin.MAINTENANCE,
    ])
    .optional(),
});

export type EntreesCreationMagasin = z.infer<typeof schemaCreationMagasin>;
export type EntreesEditionMagasin = z.infer<typeof schemaEditionMagasin>;
