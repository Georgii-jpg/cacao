// Création d'un nouveau magasin (ADMIN uniquement).
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { exigerPermission } from "@/lib/auth/require";
import {
  listerCandidatsResponsable,
  listerRegions,
} from "@/lib/magasins/queries";
import { FormMagasin } from "@/components/magasins/form-magasin";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Nouveau magasin" };

export default async function PageNouveauMagasin() {
  await exigerPermission("gererMagasins");
  const [regions, candidatsResponsable] = await Promise.all([
    listerRegions(),
    listerCandidatsResponsable(),
  ]);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          render={<Link href="/magasins" />}
          className="mb-2 -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à la liste
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          Nouveau magasin
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Renseignez les informations du nouveau point de vente.
        </p>
      </div>
      <FormMagasin regions={regions} candidatsResponsable={candidatsResponsable} />
    </div>
  );
}
