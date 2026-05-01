// Accueil du module Stocks — vue d'ensemble + raccourcis vers les
// sous-modules saisie, validation, historique.
import Link from "next/link";
import {
  ClipboardCheck,
  ClipboardList,
  History,
  PenLine,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { exigerAuth } from "@/lib/auth/require";
import { permissions, type RoleApp } from "@/lib/auth/permissions";
import { getCompteursModule } from "@/lib/stocks/queries";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Stocks" };
export const dynamic = "force-dynamic";

export default async function PageAccueilStocks() {
  const session = await exigerAuth();
  const role = session.user.role as RoleApp | undefined;

  const compteurs = await getCompteursModule(
    {
      role,
      magasinId: session.user.magasinId,
      regionId: session.user.regionId,
    },
    session.user.id,
  );

  const peutValider = permissions.validerStock(role);
  const peutSaisir = permissions.saisirStock(role);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-primary flex items-center gap-2">
          <ClipboardList className="h-6 w-6" />
          Stocks
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Saisie quotidienne, workflow de validation et historique des stocks
          par magasin.
        </p>
      </header>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Compteur
          libelle="Brouillons"
          valeur={compteurs.brouillons}
          ton="muted"
          icone={<PenLine className="h-4 w-4 text-muted-foreground" />}
        />
        <Compteur
          libelle="À valider"
          valeur={compteurs.aValider}
          ton="amber"
          icone={<AlertCircle className="h-4 w-4 text-amber-600" />}
        />
        <Compteur
          libelle="Validés (30 j)"
          valeur={compteurs.valides30j}
          ton="emerald"
          icone={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
        />
        <Compteur
          libelle="Rejetés"
          valeur={compteurs.rejetes}
          ton="destructive"
          icone={<AlertCircle className="h-4 w-4 text-destructive" />}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {peutSaisir && (
          <Carte
            href="/stocks/saisie"
            titre="Saisie quotidienne"
            description="Renseigner les entrées, sorties et clôture du jour pour un produit."
            icone={<PenLine className="h-5 w-5" />}
            cta="Saisir une fiche"
          />
        )}
        {peutValider && (
          <Carte
            href="/stocks/validation"
            titre="File de validation"
            description="Valider ou rejeter les fiches soumises par les opérateurs."
            icone={<ClipboardCheck className="h-5 w-5" />}
            cta="Voir la file"
            badge={
              compteurs.aValider > 0 ? (
                <Badge variant="default">{compteurs.aValider}</Badge>
              ) : null
            }
          />
        )}
        <Carte
          href="/stocks/historique"
          titre="Historique"
          description="Consulter et filtrer toutes les fiches de votre périmètre."
          icone={<History className="h-5 w-5" />}
          cta="Ouvrir l'historique"
        />
      </div>
    </div>
  );
}

function Compteur({
  libelle,
  valeur,
  icone,
  ton,
}: {
  libelle: string;
  valeur: number;
  icone: React.ReactNode;
  ton: "muted" | "amber" | "emerald" | "destructive";
}) {
  const styles: Record<typeof ton, string> = {
    muted: "text-foreground",
    amber: "text-amber-700",
    emerald: "text-emerald-700",
    destructive: "text-destructive",
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

function Carte({
  href,
  titre,
  description,
  icone,
  cta,
  badge,
}: {
  href: string;
  titre: string;
  description: string;
  icone: React.ReactNode;
  cta: string;
  badge?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
            {icone}
          </div>
          {badge}
        </div>
        <CardTitle className="mt-2">{titre}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button render={<Link href={href} />} variant="outline" size="sm">
          {cta}
        </Button>
      </CardContent>
    </Card>
  );
}
