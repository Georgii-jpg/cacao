// Page d'accueil du module Rapports.
// 3 rapports CSV exportables : historique, snapshot, activité magasins.
// Réservé ADMIN + MANAGER_REGIONAL via permission "exporter".
import { FileText, History, Camera, Activity } from "lucide-react";
import { exigerPermission } from "@/lib/auth/require";
import type { RoleApp } from "@/lib/auth/permissions";
import { listerMagasinsAccessibles } from "@/lib/stocks/queries";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormulaireExport } from "@/components/rapports/formulaire-export";

export const metadata = { title: "Rapports & exports" };
export const dynamic = "force-dynamic";

export default async function PageRapports() {
  const session = await exigerPermission("exporter");
  const role = session.user.role as RoleApp | undefined;

  const magasins = await listerMagasinsAccessibles({
    role,
    magasinId: session.user.magasinId,
    regionId: session.user.regionId,
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-primary flex items-center gap-2">
          <FileText className="h-6 w-6" />
          Rapports & exports
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Téléchargez vos données au format CSV (compatible Excel) selon le
          périmètre de votre rôle.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary mb-2">
              <History className="h-5 w-5" />
            </div>
            <CardTitle>Historique des stocks</CardTitle>
            <CardDescription>
              Toutes les fiches journalières sur la période choisie, avec
              ouverture / entrées / sorties / clôture, statut et auteur.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormulaireExport
              type="historique"
              magasins={magasins}
              champPeriode
              champMagasin
              champStatut
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary mb-2">
              <Camera className="h-5 w-5" />
            </div>
            <CardTitle>Snapshot des stocks</CardTitle>
            <CardDescription>
              Photo instantanée : pour chaque couple magasin × produit, la
              dernière clôture validée et le taux d&apos;occupation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormulaireExport
              type="snapshot"
              magasins={magasins}
              champPeriode={false}
              champMagasin={false}
            />
            <p className="text-xs text-muted-foreground mt-3">
              Pas de paramètres : couvre tout votre périmètre.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary mb-2">
              <Activity className="h-5 w-5" />
            </div>
            <CardTitle>Activité par magasin</CardTitle>
            <CardDescription>
              Pour chaque magasin sur la période : taux de remontée, nombre de
              fiches par statut, total entrées / sorties.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormulaireExport
              type="activite"
              magasins={magasins}
              champPeriode
              champMagasin={false}
              periodeDefautJours={30}
            />
          </CardContent>
        </Card>
      </div>

      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-base">À propos des exports</CardTitle>
          <CardDescription className="space-y-1">
            <p>
              • Les CSV sont encodés UTF-8 avec BOM et utilisent le
              point-virgule comme séparateur — Excel français les ouvre
              directement sans configuration.
            </p>
            <p>
              • Chaque téléchargement est tracé dans le journal d&apos;audit
              (action EXPORT, paramètres, nombre de lignes).
            </p>
            <p>
              • L&apos;export est limité à votre périmètre : un manager
              régional ne peut pas exporter les données d&apos;une autre région.
            </p>
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
