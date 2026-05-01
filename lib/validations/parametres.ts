// Schémas Zod pour le module Paramètres (régions, produits).
import { z } from "zod";
import { GradeProduit, TypeProduit } from "@/app/generated/prisma/enums";

// ─── Région ────────────────────────────────────────────────────────────

const codeRegion = z
  .string()
  .trim()
  .min(2, "Au moins 2 caractères")
  .max(20, "Maximum 20 caractères")
  .regex(/^[A-Z0-9-]+$/, "Majuscules, chiffres et tirets uniquement");

export const schemaRegion = z.object({
  code: codeRegion,
  nom: z.string().trim().min(2, "Nom requis").max(60),
  description: z
    .string()
    .trim()
    .max(200)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

// ─── Produit ───────────────────────────────────────────────────────────

const codeProduit = z
  .string()
  .trim()
  .min(2, "Au moins 2 caractères")
  .max(30, "Maximum 30 caractères")
  .regex(/^[A-Z0-9-]+$/, "Majuscules, chiffres et tirets uniquement");

export const schemaProduit = z.object({
  code: codeProduit,
  nom: z.string().trim().min(2, "Nom requis").max(120),
  description: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  type: z.enum([
    TypeProduit.FEVES_BRUTES,
    TypeProduit.FEVES_FERMENTEES,
    TypeProduit.FEVES_SECHEES,
  ]),
  grade: z.enum([
    GradeProduit.GRADE_1,
    GradeProduit.GRADE_2,
    GradeProduit.HORS_STANDARD,
  ]),
  origine: z
    .string()
    .trim()
    .max(80)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  actif: z
    .union([z.boolean(), z.literal("true"), z.literal("false"), z.literal("on")])
    .transform((v) => v === true || v === "true" || v === "on")
    .optional()
    .default(true),
});

export type EntreesRegion = z.infer<typeof schemaRegion>;
export type EntreesProduit = z.infer<typeof schemaProduit>;
