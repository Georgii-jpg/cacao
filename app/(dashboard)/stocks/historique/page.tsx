// Historique des fiches de stock — tableau filtrable.
import Link from "next/link";
import { ArrowLeft, History } from "lucide-react";
import { exigerAuth } from "@/lib/auth/require";
import type { RoleApp } from "@/lib/auth/permissions";
import {
  listerStocks,
  listerMagasinsAccessibles,
  listerProduitsActifs,
  type FiltresHistorique,
} from "@/lib/stocks/queries";
import { Button } from "@/components/ui/button";
import { TableStocks } from "@/components/stocks/table-stocks";
import { FiltresStocks } from "@/components/stocks/filtres-stocks";
import { PaginationLiens } from "@/components/ui/pagination-liens";
import type { StatutStock } from "@/app/generated/prisma/enums";

export const metadata = { title: "Historique des stocks" };
export const dynamic = "force-dynamic";

const STATUTS_VALIDES: StatutStock[] = ["BROUILLON", "SOUMIS", "VALIDE", "REJETE"];

type Params = {
  magasin?: string;
  produit?: string;
  statut?: string;
  debut?: string;
  fin?: string;
  page?: string;
};

export default async function PageHistorique({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const session = await exigerAuth();
  const role = session.user.role as RoleApp | undefined;
  const params = await searchParams;

  const ctx = {
    role,
    magasinId: session.user.magasinId,
    regionId: session.user.regionId,
  };

  // Magasin imposé pour les opérateurs / responsables — sélecteur masqué
  const magasinForce =
    role === "RESPONSABLE_MAGASIN" || role === "OPERATEUR_SAISIE"
      ? session.user.magasinId
      : null;

  const filtres: FiltresHistorique = {
    magasinId: magasinForce ?? params.magasin ?? undefined,
    produitId: params.produit ?? undefined,
    statut:
      params.statut && STATUTS_VALIDES.includes(params.statut as StatutStock)
        ? (params.statut as StatutStock)
        : undefined,
    dateDebut: params.debut ?? undefined,
    dateFin: params.fin ?? undefined,
  };

  const page = Math.max(1, Number(params.page) || 1);

  const [resultat, magasins, produits] = await Promise.all([
    listerStocks(ctx, filtres, { page }),
    listerMagasinsAccessibles(ctx),
    listerProduitsActifs(),
  ]);

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
          <History className="h-6 w-6" />
          Historique des stocks
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {resultat.total} fiche{resultat.total > 1 ? "s" : ""} au total
          {resultat.nbPages > 1 && ` — page ${resultat.page} / ${resultat.nbPages}`}
        </p>
      </div>

      <FiltresStocks
        magasins={magasins}
        produits={produits}
        magasinForce={magasinForce}
      />

      <TableStocks stocks={resultat.lignes} afficherMagasin={!magasinForce} />

      <PaginationLiens
        page={resultat.page}
        nbPages={resultat.nbPages}
        total={resultat.total}
        tailleLimite={resultat.tailleLimite}
      />
    </div>
  );
}
