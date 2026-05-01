// Schémas Zod pour le module Utilisateurs.
import { z } from "zod";
import { Role } from "@/app/generated/prisma/enums";

const motDePasse = z
  .string()
  .min(8, "Au moins 8 caractères")
  .max(128, "Trop long")
  .regex(/[A-Z]/, "Au moins une majuscule")
  .regex(/[a-z]/, "Au moins une minuscule")
  .regex(/[0-9]/, "Au moins un chiffre");

const baseUtilisateur = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Email invalide")
    .max(120),
  nom: z.string().trim().min(2, "Nom requis").max(60),
  prenom: z
    .string()
    .trim()
    .max(60)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  telephone: z
    .string()
    .trim()
    .max(30)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  role: z.enum([
    Role.ADMIN,
    Role.MANAGER_REGIONAL,
    Role.RESPONSABLE_MAGASIN,
    Role.OPERATEUR_SAISIE,
  ]),
  regionId: z
    .string()
    .optional()
    .or(z.literal("").transform(() => undefined))
    .or(z.literal("AUCUNE").transform(() => undefined)),
  magasinId: z
    .string()
    .optional()
    .or(z.literal("").transform(() => undefined))
    .or(z.literal("AUCUN").transform(() => undefined)),
  actif: z
    .union([z.boolean(), z.literal("true"), z.literal("false"), z.literal("on")])
    .transform((v) => v === true || v === "true" || v === "on")
    .optional()
    .default(true),
});

/// Validation transverse : cohérence rôle ↔ affectation
function validerCoherence(data: z.infer<typeof baseUtilisateur>, ctx: z.RefinementCtx) {
  if (data.role === "MANAGER_REGIONAL" && !data.regionId) {
    ctx.addIssue({
      code: "custom",
      path: ["regionId"],
      message: "Région requise pour un manager régional",
    });
  }
  if (
    (data.role === "RESPONSABLE_MAGASIN" || data.role === "OPERATEUR_SAISIE") &&
    !data.magasinId
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["magasinId"],
      message: "Magasin requis pour ce rôle",
    });
  }
}

export const schemaCreationUtilisateur = baseUtilisateur
  .extend({ motDePasse })
  .superRefine(validerCoherence);

export const schemaEditionUtilisateur = baseUtilisateur.superRefine(validerCoherence);

export const schemaReinitMdp = z.object({
  motDePasse,
});

export const schemaChangementMdpPropre = z
  .object({
    motDePasseActuel: z.string().min(1, "Mot de passe actuel requis"),
    motDePasse,
    confirmation: z.string(),
  })
  .refine((d) => d.motDePasse === d.confirmation, {
    path: ["confirmation"],
    message: "Les mots de passe ne correspondent pas",
  });

export type EntreesCreationUtilisateur = z.infer<typeof schemaCreationUtilisateur>;
export type EntreesEditionUtilisateur = z.infer<typeof schemaEditionUtilisateur>;
