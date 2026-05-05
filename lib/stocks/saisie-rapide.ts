"use server";
// Server Action de la saisie rapide (mode mobile magasinier).
// Pour chaque ligne du formulaire :
//   1. Récupère l'ouverture suggérée = clôture du dernier stock VALIDE
//      antérieur (sinon 0).
//   2. Calcule sorties = max(0, ouverture + acheté - stock_actuel).
//   3. Crée ou met à jour la fiche du jour (magasin × produit × date),
//      directement en statut SOUMIS pour validation manager.
// Refus si la fiche du jour est déjà SOUMIS ou VALIDE (pas de double saisie).
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/db/prisma";
import { exigerAuth } from "@/lib/auth/require";
import { permissions, type RoleApp } from "@/lib/auth/permissions";
import { schemaSaisieRapide } from "@/lib/validations/saisie-rapide";
import { dateMetier, dateAujourdhui } from "./queries";

export type EtatActionSaisieRapide = {
  ok: boolean;
  erreur: string | null;
  erreursChamps?: Record<string, string>;
  /// Nombre de fiches créées/mises à jour avec succès
  nbTraitees?: number;
};

const ETAT_VIDE: EtatActionSaisieRapide = { ok: false, erreur: null };

function aplatErreurs(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const champ = issue.path.join(".") || "_";
    if (!out[champ]) out[champ] = issue.message;
  }
  return out;
}

/**
 * Reconstruit la liste des lignes depuis le FormData.
 * Convention de nommage : `lignes[<i>].produitId`, `lignes[<i>].acheteAujourdhuiKg`,
 * `lignes[<i>].stockTotalActuelKg`. Les lignes dont les deux quantités sont vides
 * ou nulles sont ignorées (le magasinier saisit seulement les produits du jour).
 */
function lignesDepuisFormData(formData: FormData) {
  const map = new Map<
    string,
    { produitId?: string; acheteAujourdhuiKg?: string; stockTotalActuelKg?: string }
  >();
  for (const [cle, val] of formData.entries()) {
    const m = /^lignes\[(\d+)\]\.(produitId|acheteAujourdhuiKg|stockTotalActuelKg)$/.exec(cle);
    if (!m) continue;
    const idx = m[1];
    const champ = m[2] as "produitId" | "acheteAujourdhuiKg" | "stockTotalActuelKg";
    if (!map.has(idx)) map.set(idx, {});
    map.get(idx)![champ] = String(val);
  }
  // Ne garde que les lignes où au moins un des deux champs quantité est rempli (>0)
  const lignes: Array<{
    produitId: string;
    acheteAujourdhuiKg: number;
    stockTotalActuelKg: number;
  }> = [];
  for (const ligne of map.values()) {
    if (!ligne.produitId) continue;
    const achete = Number(ligne.acheteAujourdhuiKg ?? "0");
    const stock = Number(ligne.stockTotalActuelKg ?? "0");
    const acheteRempli = ligne.acheteAujourdhuiKg !== undefined && ligne.acheteAujourdhuiKg !== "";
    const stockRempli = ligne.stockTotalActuelKg !== undefined && ligne.stockTotalActuelKg !== "";
    if (!acheteRempli && !stockRempli) continue;
    lignes.push({
      produitId: ligne.produitId,
      acheteAujourdhuiKg: Number.isFinite(achete) ? achete : 0,
      stockTotalActuelKg: Number.isFinite(stock) ? stock : 0,
    });
  }
  return lignes;
}

export async function enregistrerSaisieRapide(
  _prev: EtatActionSaisieRapide,
  formData: FormData,
): Promise<EtatActionSaisieRapide> {
  const session = await exigerAuth();
  const role = session.user.role as RoleApp | undefined;

  if (!permissions.saisirStock(role)) {
    return { ...ETAT_VIDE, erreur: "Permission refusée." };
  }

  // La saisie rapide est conçue pour les utilisateurs rattachés à un magasin
  const magasinId = session.user.magasinId;
  if (!magasinId) {
    return {
      ...ETAT_VIDE,
      erreur:
        "Aucun magasin n'est associé à votre compte. Contactez un administrateur.",
    };
  }

  const dateRaw = String(formData.get("date") ?? "");
  const lignes = lignesDepuisFormData(formData);

  const parsed = schemaSaisieRapide.safeParse({ date: dateRaw, lignes });
  if (!parsed.success) {
    return {
      ...ETAT_VIDE,
      erreur: "Veuillez corriger les erreurs du formulaire.",
      erreursChamps: aplatErreurs(parsed.error),
    };
  }
  const data = parsed.data;
  const dateJ = dateMetier(data.date);

  // Garde-fou : on n'accepte que la date du jour (évite les saisies rétro
  // sauvages depuis le téléphone — le mode complet sert pour les corrections).
  const ajd = dateAujourdhui();
  if (dateJ.getTime() !== ajd.getTime()) {
    return { ...ETAT_VIDE, erreur: "La saisie rapide ne couvre que la date du jour." };
  }

  // Vérifier que le magasin est actif
  const magasin = await prisma.magasin.findUnique({
    where: { id: magasinId },
    select: { id: true, statut: true },
  });
  if (!magasin || magasin.statut === "INACTIF") {
    return { ...ETAT_VIDE, erreur: "Magasin introuvable ou inactif." };
  }

  // Récupère les produits cités pour vérifier qu'ils sont actifs
  const produitIds = [...new Set(data.lignes.map((l) => l.produitId))];
  const produits = await prisma.produit.findMany({
    where: { id: { in: produitIds }, actif: true },
    select: { id: true },
  });
  const produitsActifsIds = new Set(produits.map((p) => p.id));
  for (const l of data.lignes) {
    if (!produitsActifsIds.has(l.produitId)) {
      return {
        ...ETAT_VIDE,
        erreur: "Un des produits sélectionnés n'est plus disponible.",
      };
    }
  }

  // Pour chaque ligne : récupère ouverture suggérée + fiche existante
  let nbTraitees = 0;
  const erreursLignes: string[] = [];

  for (const l of data.lignes) {
    const [existant, dernierAvant] = await Promise.all([
      prisma.stock.findUnique({
        where: {
          magasinId_produitId_date: {
            magasinId,
            produitId: l.produitId,
            date: dateJ,
          },
        },
      }),
      prisma.stock.findFirst({
        where: {
          magasinId,
          produitId: l.produitId,
          date: { lt: dateJ },
          statut: "VALIDE",
        },
        orderBy: { date: "desc" },
        select: { stockClotureKg: true },
      }),
    ]);

    // Refuse si déjà SOUMIS ou VALIDE pour aujourd'hui (pas de double saisie)
    if (existant && (existant.statut === "SOUMIS" || existant.statut === "VALIDE")) {
      erreursLignes.push(
        existant.statut === "SOUMIS"
          ? "Une fiche est déjà en attente de validation pour ce produit aujourd'hui."
          : "Une fiche est déjà validée pour ce produit aujourd'hui.",
      );
      continue;
    }

    const ouverture = dernierAvant?.stockClotureKg ?? 0;
    const sorties = Math.max(0, ouverture + l.acheteAujourdhuiKg - l.stockTotalActuelKg);

    if (existant) {
      // Mise à jour BROUILLON/REJETE → SOUMIS direct
      await prisma.$transaction([
        prisma.stock.update({
          where: { id: existant.id },
          data: {
            stockOuvertureKg: ouverture,
            entreesKg: l.acheteAujourdhuiKg,
            sortiesKg: sorties,
            stockClotureKg: l.stockTotalActuelKg,
            statut: "SOUMIS",
            motifRejet: null,
            valideParId: null,
            valideLe: null,
          },
        }),
        prisma.auditLog.create({
          data: {
            userId: session.user.id,
            action: "SOUMISSION",
            entite: "Stock",
            entiteId: existant.id,
            ancienneValeur: JSON.stringify(existant),
            nouvelleValeur: JSON.stringify({
              source: "saisie-rapide",
              acheteAujourdhuiKg: l.acheteAujourdhuiKg,
              stockTotalActuelKg: l.stockTotalActuelKg,
              ouvertureSuggeree: ouverture,
              sortiesCalculees: sorties,
            }),
          },
        }),
      ]);
    } else {
      const stock = await prisma.stock.create({
        data: {
          magasinId,
          produitId: l.produitId,
          date: dateJ,
          stockOuvertureKg: ouverture,
          entreesKg: l.acheteAujourdhuiKg,
          sortiesKg: sorties,
          stockClotureKg: l.stockTotalActuelKg,
          statut: "SOUMIS",
          saisiParId: session.user.id,
          saisiLe: new Date(),
        },
      });
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "SOUMISSION",
          entite: "Stock",
          entiteId: stock.id,
          nouvelleValeur: JSON.stringify({
            source: "saisie-rapide",
            acheteAujourdhuiKg: l.acheteAujourdhuiKg,
            stockTotalActuelKg: l.stockTotalActuelKg,
            ouvertureSuggeree: ouverture,
            sortiesCalculees: sorties,
          }),
        },
      });
    }
    nbTraitees++;
  }

  revalidatePath("/saisie-rapide");
  revalidatePath("/stocks");
  revalidatePath("/stocks/historique");
  revalidatePath("/stocks/validation");
  revalidatePath("/dashboard");
  revalidatePath(`/magasins/${magasinId}`);

  if (nbTraitees === 0 && erreursLignes.length > 0) {
    return { ...ETAT_VIDE, erreur: erreursLignes[0] };
  }

  return {
    ok: true,
    erreur:
      erreursLignes.length > 0
        ? `${nbTraitees} saisie(s) transmise(s). ${erreursLignes.length} ignorée(s) (déjà soumise(s)).`
        : null,
    nbTraitees,
  };
}
