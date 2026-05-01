// Détail d'une fiche de stock + actions contextuelles.
// Affiche les valeurs, le workflow, et selon le rôle/statut :
//  - Modifier (BROUILLON, REJETE, ou ADMIN)
//  - Soumettre (auteur ou ADMIN)
//  - Valider / Rejeter (validateurs, sauf l'auteur si non admin)
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Package,
  Pencil,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { exigerAuth } from "@/lib/auth/require";
import { permissions, type RoleApp } from "@/lib/auth/permissions";
import { getStock } from "@/lib/stocks/queries";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BadgeStatutStock } from "@/components/stocks/badge-statut-stock";
import { ActionsValidation } from "@/components/stocks/actions-validation";
import {
  formatDate,
  formatDateLongue,
  formatPoidsKg,
  formatDateHeure,
  formatPourcent,
} from "@/lib/utils/format";

export const metadata = { title: "Fiche de stock" };

type Props = {
  params: Promise<{ id: string }>;
};

export default async function PageFicheStock({ params }: Props) {
  const { id } = await params;
  const session = await exigerAuth();
  const role = session.user.role as RoleApp | undefined;

  const stock = await getStock(
    {
      role,
      magasinId: session.user.magasinId,
      regionId: session.user.regionId,
    },
    id,
  );
  if (!stock) notFound();

  const dateIso = stock.date.toISOString().slice(0, 10);
  const lienSaisie = `/stocks/saisie?magasin=${stock.magasinId}&produit=${stock.produitId}&date=${dateIso}`;

  const peutModifier =
    (stock.statut === "BROUILLON" || stock.statut === "REJETE") &&
    permissions.saisirStock(role);

  const peutValider =
    stock.statut === "SOUMIS" && permissions.validerStock(role);

  const auteur =
    [stock.saisiPar.prenom, stock.saisiPar.nom].filter(Boolean).join(" ").trim() ||
    stock.saisiPar.email;
  const validateur = stock.validePar
    ? [stock.validePar.prenom, stock.validePar.nom].filter(Boolean).join(" ").trim() ||
      stock.validePar.email
    : null;

  return (
    <div className="space-y-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          render={<Link href="/stocks/historique" />}
          className="mb-2 -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à l&apos;historique
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-primary">
                Fiche du {formatDate(stock.date)}
              </h1>
              <BadgeStatutStock statut={stock.statut} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {stock.magasin.nom}{" "}
              <span className="font-mono text-xs">({stock.magasin.code})</span>
              {" · "}
              {stock.produit.nom}
            </p>
          </div>
          {peutModifier && (
            <Button render={<Link href={lienSaisie} />} variant="outline">
              <Pencil className="h-4 w-4" />
              Modifier la fiche
            </Button>
          )}
        </div>
      </div>

      {stock.statut === "REJETE" && stock.motifRejet && (
        <Alert variant="destructive">
          <AlertTitle>Fiche rejetée</AlertTitle>
          <AlertDescription>
            <span className="font-medium">Motif : </span>
            {stock.motifRejet}
          </AlertDescription>
        </Alert>
      )}

      {/* KPIs ────────────────────────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Carte
          libelle="Ouverture"
          valeur={formatPoidsKg(stock.stockOuvertureKg)}
        />
        <Carte
          libelle="Entrées"
          valeur={
            stock.entreesKg > 0 ? `+${formatPoidsKg(stock.entreesKg)}` : "—"
          }
          icone={<TrendingUp className="h-4 w-4 text-emerald-600" />}
          ton="emerald"
        />
        <Carte
          libelle="Sorties"
          valeur={
            stock.sortiesKg > 0 ? `−${formatPoidsKg(stock.sortiesKg)}` : "—"
          }
          icone={<TrendingDown className="h-4 w-4 text-amber-600" />}
          ton="amber"
        />
        <Carte
          libelle="Clôture"
          valeur={formatPoidsKg(stock.stockClotureKg)}
          ton="primary"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Détails de la fiche</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Ligne icone={<Calendar className="h-4 w-4" />} libelle="Date métier">
              {formatDateLongue(stock.date)}
            </Ligne>
            <Ligne
              icone={<Building2 className="h-4 w-4" />}
              libelle="Magasin"
            >
              <Link
                href={`/magasins/${stock.magasin.id}`}
                className="hover:underline"
              >
                {stock.magasin.nom}
              </Link>
              <span className="text-xs text-muted-foreground">
                {" "}
                · {stock.magasin.region.nom}
              </span>
            </Ligne>
            <Ligne icone={<Package className="h-4 w-4" />} libelle="Produit">
              {stock.produit.nom}
              <span className="font-mono text-xs text-muted-foreground">
                {" "}
                · {stock.produit.code}
              </span>
            </Ligne>
            {stock.humiditeMoyenne !== null && (
              <Ligne libelle="Humidité moyenne">
                {formatPourcent(stock.humiditeMoyenne / 100, 1)}
              </Ligne>
            )}
            {stock.notesQualite && (
              <Ligne libelle="Notes qualité">{stock.notesQualite}</Ligne>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workflow</CardTitle>
            <CardDescription>Traçabilité de la saisie</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Saisi par
              </p>
              <p>{auteur}</p>
              <p className="text-xs text-muted-foreground">
                le {formatDateHeure(stock.saisiLe)}
              </p>
            </div>
            {validateur && stock.valideLe && (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Validé par
                </p>
                <p>{validateur}</p>
                <p className="text-xs text-muted-foreground">
                  le {formatDateHeure(stock.valideLe)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {peutValider && (
        <Card>
          <CardHeader>
            <CardTitle>Action de validation</CardTitle>
            <CardDescription>
              Valider entérine définitivement les valeurs. Rejeter renvoie la
              fiche à l&apos;auteur avec un motif.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActionsValidation
              stockId={stock.id}
              estAuteur={stock.saisiParId === session.user.id}
              estAdmin={role === "ADMIN"}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Carte({
  libelle,
  valeur,
  icone,
  ton = "default",
}: {
  libelle: string;
  valeur: string;
  icone?: React.ReactNode;
  ton?: "default" | "primary" | "emerald" | "amber";
}) {
  const styles: Record<typeof ton, string> = {
    default: "text-foreground",
    primary: "text-primary",
    emerald: "text-emerald-700",
    amber: "text-amber-700",
  };
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {libelle}
        </CardTitle>
        {icone}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold tabular-nums ${styles[ton]}`}>
          {valeur}
        </div>
      </CardContent>
    </Card>
  );
}

function Ligne({
  icone,
  libelle,
  children,
}: {
  icone?: React.ReactNode;
  libelle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      {icone && (
        <div className="mt-0.5 text-muted-foreground">{icone}</div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {libelle}
        </p>
        <p className="text-sm">{children}</p>
      </div>
    </div>
  );
}
