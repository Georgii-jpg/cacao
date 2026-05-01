// Édition d'un magasin existant (ADMIN uniquement).
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { exigerPermission } from "@/lib/auth/require";
import { prisma } from "@/lib/db/prisma";
import {
  listerCandidatsResponsable,
  listerRegions,
} from "@/lib/magasins/queries";
import { FormMagasin } from "@/components/magasins/form-magasin";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Modifier un magasin" };

type Props = { params: Promise<{ id: string }> };

export default async function PageModifierMagasin({ params }: Props) {
  await exigerPermission("gererMagasins");
  const { id } = await params;

  const magasin = await prisma.magasin.findUnique({ where: { id } });
  if (!magasin) notFound();

  const [regions, candidatsResponsable] = await Promise.all([
    listerRegions(),
    listerCandidatsResponsable(magasin.id),
  ]);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          render={<Link href={`/magasins/${magasin.id}`} />}
          className="mb-2 -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à la fiche
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          Modifier {magasin.nom}
        </h1>
        <p className="text-sm text-muted-foreground mt-1 font-mono">
          {magasin.code}
        </p>
      </div>
      <FormMagasin
        regions={regions}
        candidatsResponsable={candidatsResponsable}
        magasin={{
          id: magasin.id,
          code: magasin.code,
          nom: magasin.nom,
          ville: magasin.ville,
          adresse: magasin.adresse,
          telephone: magasin.telephone,
          capaciteKg: magasin.capaciteKg,
          statut: magasin.statut,
          regionId: magasin.regionId,
          latitude: magasin.latitude,
          longitude: magasin.longitude,
          responsableId: magasin.responsableId,
        }}
      />
    </div>
  );
}
