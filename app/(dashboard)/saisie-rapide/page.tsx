// Saisie rapide — mode mobile pour les responsables/opérateurs magasin.
// Affiche par produit le dernier stock validé connu et 2 champs simples :
// "Acheté aujourd'hui" + "Stock total actuel". Le serveur déduit ouverture
// et sorties, et soumet directement pour validation manager.
import { redirect } from "next/navigation";

import { exigerPermission } from "@/lib/auth/require";
import { prisma } from "@/lib/db/prisma";
import { dateAujourdhui } from "@/lib/stocks/queries";
import { FormSaisieRapide } from "@/components/stocks/form-saisie-rapide";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, ClipboardCheck } from "lucide-react";

export const metadata = {
  title: "Saisie rapide — SOCOPAD",
};

export default async function PageSaisieRapide() {
  const session = await exigerPermission("saisirStock");
  const magasinId = session.user.magasinId;

  // Si l'utilisateur n'a pas de magasin (admin/manager), on l'oriente vers
  // la saisie complète qui propose un sélecteur de magasin.
  if (!magasinId) {
    redirect("/stocks/saisie?info=saisie-rapide-indisponible");
  }

  const ajd = dateAujourdhui();
  const dateIso = ajd.toISOString().slice(0, 10);

  const [magasin, produits] = await Promise.all([
    prisma.magasin.findUnique({
      where: { id: magasinId },
      select: {
        id: true,
        code: true,
        nom: true,
        ville: true,
        statut: true,
        region: { select: { nom: true } },
      },
    }),
    prisma.produit.findMany({
      where: { actif: true },
      select: { id: true, code: true, nom: true, type: true, grade: true },
      orderBy: [{ type: "asc" }, { grade: "asc" }],
    }),
  ]);

  if (!magasin || magasin.statut === "INACTIF") {
    return (
      <div className="mx-auto max-w-xl space-y-4 p-4">
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Magasin indisponible</AlertTitle>
          <AlertDescription>
            Votre magasin est introuvable ou inactif. Contactez un administrateur.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Pour chaque produit : dernier stock validé connu + fiche du jour
  // (utile pour bloquer la double saisie ou pré-remplir si rejetée).
  const lignes = await Promise.all(
    produits.map(async (p) => {
      const [dernierValide, fiche] = await Promise.all([
        prisma.stock.findFirst({
          where: {
            magasinId,
            produitId: p.id,
            statut: "VALIDE",
            date: { lt: ajd },
          },
          orderBy: { date: "desc" },
          select: { stockClotureKg: true, date: true },
        }),
        prisma.stock.findUnique({
          where: {
            magasinId_produitId_date: {
              magasinId,
              produitId: p.id,
              date: ajd,
            },
          },
          select: {
            id: true,
            statut: true,
            entreesKg: true,
            stockClotureKg: true,
            motifRejet: true,
          },
        }),
      ]);

      return {
        produit: p,
        dernierStockKg: dernierValide?.stockClotureKg ?? 0,
        dernierStockDate: dernierValide?.date ?? null,
        fiche,
      };
    }),
  );

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 pb-24">
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ClipboardCheck className="size-4" />
          <span>Saisie du jour</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {magasin.nom}
        </h1>
        <p className="text-sm text-muted-foreground">
          {magasin.ville} — {magasin.region.nom}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comment ça marche</CardTitle>
          <CardDescription>
            Pour chaque produit que vous avez manipulé aujourd&apos;hui, indiquez
            la quantité <strong>achetée</strong> et votre <strong>stock total
            actuel</strong>. Laissez vide les produits sans mouvement.
          </CardDescription>
        </CardHeader>
      </Card>

      <FormSaisieRapide dateIso={dateIso} lignes={lignes} />
    </div>
  );
}
