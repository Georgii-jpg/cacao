"use server";
// Server Actions du module Utilisateurs.
// Création / édition / réinitialisation MDP / activation / changement MDP propre.
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/db/prisma";
import { exigerAuth, exigerPermission } from "@/lib/auth/require";
import {
  schemaCreationUtilisateur,
  schemaEditionUtilisateur,
  schemaReinitMdp,
  schemaChangementMdpPropre,
} from "@/lib/validations/utilisateur";

export type EtatActionUtilisateur = {
  ok: boolean;
  erreur: string | null;
  erreursChamps?: Record<string, string>;
  utilisateurId?: string;
};

const ETAT_VIDE: EtatActionUtilisateur = { ok: false, erreur: null };
const COUT_BCRYPT = 10;

function aplatErreurs(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const champ = issue.path.join(".") || "_";
    if (!out[champ]) out[champ] = issue.message;
  }
  return out;
}

function entreesDepuisFormData(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

// ─── Création (admin) ──────────────────────────────────────────────────

export async function creerUtilisateur(
  _prev: EtatActionUtilisateur,
  formData: FormData,
): Promise<EtatActionUtilisateur> {
  const session = await exigerPermission("gererUtilisateurs");

  const parsed = schemaCreationUtilisateur.safeParse(entreesDepuisFormData(formData));
  if (!parsed.success) {
    return {
      ...ETAT_VIDE,
      erreur: "Veuillez corriger les erreurs du formulaire.",
      erreursChamps: aplatErreurs(parsed.error),
    };
  }
  const data = parsed.data;

  const dejaUtilise = await prisma.user.findUnique({
    where: { email: data.email },
    select: { id: true },
  });
  if (dejaUtilise) {
    return {
      ...ETAT_VIDE,
      erreur: "Un compte avec cet email existe déjà.",
      erreursChamps: { email: "Email déjà utilisé" },
    };
  }

  const hash = await bcrypt.hash(data.motDePasse, COUT_BCRYPT);

  const utilisateur = await prisma.user.create({
    data: {
      email: data.email,
      motDePasseHash: hash,
      nom: data.nom,
      prenom: data.prenom ?? null,
      telephone: data.telephone ?? null,
      role: data.role,
      actif: data.actif,
      regionId: data.regionId ?? null,
      magasinId: data.magasinId ?? null,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "CREATION",
      entite: "User",
      entiteId: utilisateur.id,
      // ne PAS logger le mot de passe (même hashé) dans l'audit
      nouvelleValeur: JSON.stringify({ ...data, motDePasse: "[redacted]" }),
    },
  });

  revalidatePath("/utilisateurs");
  return { ok: true, erreur: null, utilisateurId: utilisateur.id };
}

// ─── Édition (admin) ───────────────────────────────────────────────────

export async function modifierUtilisateur(
  _prev: EtatActionUtilisateur,
  formData: FormData,
): Promise<EtatActionUtilisateur> {
  const session = await exigerPermission("gererUtilisateurs");

  const id = (formData.get("id") as string | null)?.trim();
  if (!id) return { ...ETAT_VIDE, erreur: "Identifiant manquant." };

  const parsed = schemaEditionUtilisateur.safeParse(entreesDepuisFormData(formData));
  if (!parsed.success) {
    return {
      ...ETAT_VIDE,
      erreur: "Veuillez corriger les erreurs du formulaire.",
      erreursChamps: aplatErreurs(parsed.error),
    };
  }
  const data = parsed.data;

  const existant = await prisma.user.findUnique({ where: { id } });
  if (!existant) return { ...ETAT_VIDE, erreur: "Utilisateur introuvable." };

  // Email modifiable mais doit rester unique
  if (data.email !== existant.email) {
    const collision = await prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true },
    });
    if (collision && collision.id !== id) {
      return {
        ...ETAT_VIDE,
        erreur: "Un autre compte utilise déjà cet email.",
        erreursChamps: { email: "Email déjà utilisé" },
      };
    }
  }

  await prisma.user.update({
    where: { id },
    data: {
      email: data.email,
      nom: data.nom,
      prenom: data.prenom ?? null,
      telephone: data.telephone ?? null,
      role: data.role,
      actif: data.actif,
      regionId: data.regionId ?? null,
      magasinId: data.magasinId ?? null,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "MODIFICATION",
      entite: "User",
      entiteId: id,
      ancienneValeur: JSON.stringify({
        ...existant,
        motDePasseHash: "[redacted]",
      }),
      nouvelleValeur: JSON.stringify(data),
    },
  });

  revalidatePath("/utilisateurs");
  revalidatePath(`/utilisateurs/${id}`);
  return { ok: true, erreur: null, utilisateurId: id };
}

// ─── Réinitialisation MDP (admin) ──────────────────────────────────────

export async function reinitialiserMdp(
  utilisateurId: string,
  motDePasse: string,
): Promise<EtatActionUtilisateur> {
  const session = await exigerPermission("gererUtilisateurs");

  const parsed = schemaReinitMdp.safeParse({ motDePasse });
  if (!parsed.success) {
    return {
      ...ETAT_VIDE,
      erreur: "Mot de passe invalide.",
      erreursChamps: aplatErreurs(parsed.error),
    };
  }

  const existant = await prisma.user.findUnique({ where: { id: utilisateurId } });
  if (!existant) return { ...ETAT_VIDE, erreur: "Utilisateur introuvable." };

  const hash = await bcrypt.hash(parsed.data.motDePasse, COUT_BCRYPT);
  await prisma.user.update({
    where: { id: utilisateurId },
    data: { motDePasseHash: hash },
  });
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "MODIFICATION",
      entite: "User",
      entiteId: utilisateurId,
      nouvelleValeur: JSON.stringify({ motDePasse: "[reset by admin]" }),
    },
  });

  revalidatePath(`/utilisateurs/${utilisateurId}`);
  return { ok: true, erreur: null, utilisateurId };
}

// ─── Activation / désactivation (admin) ────────────────────────────────

export async function basculerActifUtilisateur(
  utilisateurId: string,
): Promise<EtatActionUtilisateur> {
  const session = await exigerPermission("gererUtilisateurs");
  const existant = await prisma.user.findUnique({ where: { id: utilisateurId } });
  if (!existant) return { ...ETAT_VIDE, erreur: "Utilisateur introuvable." };

  // Sécurité : un admin ne peut pas se désactiver lui-même
  if (existant.id === session.user.id && existant.actif) {
    return {
      ...ETAT_VIDE,
      erreur: "Vous ne pouvez pas désactiver votre propre compte.",
    };
  }

  await prisma.user.update({
    where: { id: utilisateurId },
    data: { actif: !existant.actif },
  });
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "MODIFICATION",
      entite: "User",
      entiteId: utilisateurId,
      ancienneValeur: JSON.stringify({ actif: existant.actif }),
      nouvelleValeur: JSON.stringify({ actif: !existant.actif }),
    },
  });

  revalidatePath("/utilisateurs");
  revalidatePath(`/utilisateurs/${utilisateurId}`);
  return { ok: true, erreur: null, utilisateurId };
}

// ─── Changement MDP par l'utilisateur lui-même ─────────────────────────

export async function changerMonMotDePasse(
  _prev: EtatActionUtilisateur,
  formData: FormData,
): Promise<EtatActionUtilisateur> {
  const session = await exigerAuth();

  const parsed = schemaChangementMdpPropre.safeParse(entreesDepuisFormData(formData));
  if (!parsed.success) {
    return {
      ...ETAT_VIDE,
      erreur: "Veuillez corriger les erreurs du formulaire.",
      erreursChamps: aplatErreurs(parsed.error),
    };
  }

  const utilisateur = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  if (!utilisateur) {
    return { ...ETAT_VIDE, erreur: "Compte introuvable." };
  }

  const okActuel = await bcrypt.compare(
    parsed.data.motDePasseActuel,
    utilisateur.motDePasseHash,
  );
  if (!okActuel) {
    return {
      ...ETAT_VIDE,
      erreur: "Mot de passe actuel incorrect.",
      erreursChamps: { motDePasseActuel: "Incorrect" },
    };
  }

  const nouveauHash = await bcrypt.hash(parsed.data.motDePasse, COUT_BCRYPT);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { motDePasseHash: nouveauHash },
  });
  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "MODIFICATION",
      entite: "User",
      entiteId: session.user.id,
      nouvelleValeur: JSON.stringify({ motDePasse: "[self changed]" }),
    },
  });

  return { ok: true, erreur: null, utilisateurId: session.user.id };
}
