// Liste des magasins — page server, scopée au rôle de l'utilisateur.
import Link from "next/link";
import { Plus, Building2 } from "lucide-react";
import { exigerAuth } from "@/lib/auth/require";
import { permissions, type RoleApp } from "@/lib/auth/permissions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableMagasins } from "@/components/magasins/table-magasins";
import { FiltresMagasins } from "@/components/magasins/filtres-magasins";
import {
  listerMagasins,
  listerRegions,
  type FiltresListeMagasins,
} from "@/lib/magasins/queries";
import type { StatutMagasin } from "@/app/generated/prisma/enums";

export const metadata = { title: "Magasins" };
export const dynamic = "force-dynamic";

type SearchParams = {
  recherche?: string;
  region?: string;
  statut?: string;
};

const STATUTS_VALIDES: StatutMagasin[] = ["ACTIF", "INACTIF", "MAINTENANCE"];

export default async function PageListeMagasins({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await exigerAuth();
  const role = session.user.role as RoleApp | undefined;
  const params = await searchParams;

  // Manager régional bloqué sur sa région — on ignore tout filtre régional UI
  const regionForcee =
    role === "MANAGER_REGIONAL" ? session.user.regionId ?? null : null;

  const filtres: FiltresListeMagasins = {
    recherche: params.recherche?.trim() || undefined,
    regionId: regionForcee ?? params.region ?? undefined,
    statut:
      params.statut && STATUTS_VALIDES.includes(params.statut as StatutMagasin)
        ? (params.statut as StatutMagasin)
        : undefined,
  };

  const [magasins, regions] = await Promise.all([
    listerMagasins(
      {
        role,
        magasinId: session.user.magasinId,
        regionId: session.user.regionId,
      },
      filtres,
    ),
    listerRegions(),
  ]);

  const peutCreer = permissions.gererMagasins(role);
  const totalActifs = magasins.filter((m) => m.statut === "ACTIF").length;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Magasins
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {magasins.length} magasin{magasins.length > 1 ? "s" : ""} affiché
            {magasins.length > 1 ? "s" : ""}
            {filtres.statut === undefined && (
              <>
                {" — "}
                <Badge variant="secondary">{totalActifs} actifs</Badge>
              </>
            )}
          </p>
        </div>
        {peutCreer && (
          <Button render={<Link href="/magasins/nouveau" />}>
            <Plus className="h-4 w-4" />
            Nouveau magasin
          </Button>
        )}
      </header>

      <FiltresMagasins regions={regions} regionForcee={regionForcee} />

      <TableMagasins magasins={magasins} />
    </div>
  );
}
