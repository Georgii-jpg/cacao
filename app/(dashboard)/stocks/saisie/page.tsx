// Saisie d'une fiche de stock journalière.
// Workflow URL : ?magasin=&produit=&date=YYYY-MM-DD
// - Sans paramètres : sélecteur seul
// - Avec triplet complet : sélecteur + formulaire pré-rempli
import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { exigerAuth } from "@/lib/auth/require";
import { permissions, type RoleApp } from "@/lib/auth/permissions";
import {
  dateMetier,
  getFichePourSaisie,
  listerMagasinsAccessibles,
  listerProduitsActifs,
} from "@/lib/stocks/queries";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SelecteurSaisie } from "@/components/stocks/selecteur-saisie";
import { FormSaisieStock } from "@/components/stocks/form-saisie-stock";
import { BadgeStatutStock } from "@/components/stocks/badge-statut-stock";
import { formatDateLongue } from "@/lib/utils/format";

export const metadata = { title: "Saisie de stock" };
export const dynamic = "force-dynamic";

type Params = {
  magasin?: string;
  produit?: string;
  date?: string;
};

export default async function PageSaisie({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const session = await exigerAuth();
  const role = session.user.role as RoleApp | undefined;

  if (!permissions.saisirStock(role)) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Permission insuffisante</AlertTitle>
        <AlertDescription>
          Vous n&apos;avez pas le droit de saisir des stocks.
        </AlertDescription>
      </Alert>
    );
  }

  const params = await searchParams;
  const ctx = {
    role,
    magasinId: session.user.magasinId,
    regionId: session.user.regionId,
  };

  const [magasins, produits] = await Promise.all([
    listerMagasinsAccessibles(ctx),
    listerProduitsActifs(),
  ]);

  // Magasin imposé pour les rôles à un seul magasin
  const magasinForce =
    role === "RESPONSABLE_MAGASIN" || role === "OPERATEUR_SAISIE"
      ? session.user.magasinId
      : null;

  // Résolution du triplet effectif
  const magasinId = magasinForce ?? params.magasin;
  const produitId = params.produit;
  const dateIso = params.date;

  // Cas : triplet incomplet → afficher juste le sélecteur
  const tripletComplet =
    !!magasinId && !!produitId && !!dateIso && /^\d{4}-\d{2}-\d{2}$/.test(dateIso);

  return (
    <div className="space-y-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          render={<Link href="/stocks" />}
          className="mb-2 -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Module Stocks
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          Saisie quotidienne
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Renseignez les mouvements du jour pour un produit dans un magasin.
        </p>
      </div>

      <SelecteurSaisie
        magasins={magasins}
        produits={produits}
        magasinForce={magasinForce}
        magasinId={magasinId}
        produitId={produitId}
        date={dateIso}
      />

      {!tripletComplet ? (
        <Card>
          <CardHeader>
            <CardTitle>Choisissez magasin, produit et date</CardTitle>
            <CardDescription>
              Le formulaire de saisie apparaîtra dès que les trois sélections
              auront été faites.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <SaisiePourTriplet
          magasinId={magasinId!}
          produitId={produitId!}
          dateIso={dateIso!}
          ctxUserId={session.user.id}
          role={role}
        />
      )}
    </div>
  );
}

async function SaisiePourTriplet({
  magasinId,
  produitId,
  dateIso,
  ctxUserId,
  role,
}: {
  magasinId: string;
  produitId: string;
  dateIso: string;
  ctxUserId: string;
  role: RoleApp | undefined;
}) {
  const date = dateMetier(dateIso);
  const fiche = await getFichePourSaisie({ magasinId, produitId, date });

  if (!fiche.magasin) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Magasin introuvable</AlertTitle>
        <AlertDescription>
          Ce magasin n&apos;existe pas ou n&apos;est pas dans votre périmètre.
        </AlertDescription>
      </Alert>
    );
  }
  if (!fiche.produit) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Produit introuvable</AlertTitle>
        <AlertDescription>Ce produit n&apos;existe pas.</AlertDescription>
      </Alert>
    );
  }

  // Indicateur "qui peut soumettre" — au moins l'auteur ou l'admin
  const peutSoumettre =
    role === "ADMIN" ||
    !fiche.existant ||
    fiche.existant.saisiParId === ctxUserId ||
    role === "RESPONSABLE_MAGASIN" ||
    role === "MANAGER_REGIONAL";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>
                {fiche.magasin.nom}{" "}
                <span className="text-muted-foreground font-normal text-sm">
                  · {fiche.produit.nom}
                </span>
              </CardTitle>
              <CardDescription>
                {formatDateLongue(date)}
                <span className="font-mono text-xs"> · {fiche.magasin.code}</span>
              </CardDescription>
            </div>
            {fiche.existant && <BadgeStatutStock statut={fiche.existant.statut} />}
          </div>
        </CardHeader>
      </Card>

      {fiche.dernierStockValide && (
        <Alert>
          <AlertTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Dernier stock validé pour ce produit
          </AlertTitle>
          <AlertDescription>
            Clôture de {fiche.dernierStockValide.stockClotureKg.toLocaleString("fr-FR")} kg
            au {formatDateLongue(fiche.dernierStockValide.date)}. Cette valeur
            est suggérée comme stock d&apos;ouverture par défaut.
          </AlertDescription>
        </Alert>
      )}

      <FormSaisieStock
        magasinId={magasinId}
        produitId={produitId}
        date={dateIso}
        ouvertureSuggereeKg={fiche.ouvertureSuggereeKg}
        peutSoumettre={peutSoumettre}
        fiche={
          fiche.existant
            ? {
                id: fiche.existant.id,
                stockOuvertureKg: fiche.existant.stockOuvertureKg,
                entreesKg: fiche.existant.entreesKg,
                sortiesKg: fiche.existant.sortiesKg,
                humiditeMoyenne: fiche.existant.humiditeMoyenne,
                notesQualite: fiche.existant.notesQualite,
                statut: fiche.existant.statut,
                motifRejet: fiche.existant.motifRejet,
              }
            : undefined
        }
      />
    </div>
  );
}
