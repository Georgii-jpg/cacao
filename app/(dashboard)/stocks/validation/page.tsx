// File d'attente des fiches en attente de validation.
// Visible par : RESPONSABLE_MAGASIN, MANAGER_REGIONAL, ADMIN.
// Un non-admin ne voit pas ses propres saisies (séparation des rôles).
import Link from "next/link";
import { ArrowLeft, ClipboardCheck } from "lucide-react";
import { exigerPermission } from "@/lib/auth/require";
import type { RoleApp } from "@/lib/auth/permissions";
import { listerFichesAValider } from "@/lib/stocks/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TableStocks } from "@/components/stocks/table-stocks";

export const metadata = { title: "File de validation" };
export const dynamic = "force-dynamic";

export default async function PageValidation() {
  const session = await exigerPermission("validerStock");
  const role = session.user.role as RoleApp | undefined;

  const fiches = await listerFichesAValider(
    {
      role,
      magasinId: session.user.magasinId,
      regionId: session.user.regionId,
    },
    session.user.id,
  );

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
        <h1 className="text-2xl font-bold tracking-tight text-primary flex items-center gap-2">
          <ClipboardCheck className="h-6 w-6" />
          File de validation
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {fiches.length} fiche{fiches.length > 1 ? "s" : ""} en attente
          {role !== "ADMIN" && " (vos propres saisies sont masquées)"}.
        </p>
      </div>

      {fiches.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Aucune fiche en attente</CardTitle>
            <CardDescription>
              Toutes les fiches soumises ont été traitées. Bravo !
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button render={<Link href="/stocks/historique" />} variant="outline">
              Voir l&apos;historique
            </Button>
          </CardContent>
        </Card>
      ) : (
        <TableStocks stocks={fiches} />
      )}
    </div>
  );
}
