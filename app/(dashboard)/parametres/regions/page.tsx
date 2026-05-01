// Gestion des régions (ADMIN).
import Link from "next/link";
import { ArrowLeft, MapPin } from "lucide-react";
import { exigerPermission } from "@/lib/auth/require";
import { listerRegionsAvecCompteurs } from "@/lib/parametres/queries";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DialogRegion } from "@/components/parametres/dialog-region";
import { BoutonSupprimerRegion } from "@/components/parametres/bouton-supprimer-region";

export const metadata = { title: "Régions" };
export const dynamic = "force-dynamic";

export default async function PageRegions() {
  await exigerPermission("modifierParametres");
  const regions = await listerRegionsAvecCompteurs();

  return (
    <div className="space-y-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          render={<Link href="/parametres" />}
          className="mb-2 -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Paramètres
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-primary flex items-center gap-2">
              <MapPin className="h-6 w-6" />
              Régions
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {regions.length} région{regions.length > 1 ? "s" : ""} configurée
              {regions.length > 1 ? "s" : ""}.
            </p>
          </div>
          <DialogRegion />
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">Code</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-center">Magasins</TableHead>
              <TableHead className="w-56" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {regions.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.code}</TableCell>
                <TableCell className="font-medium">{r.nom}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {r.description ?? "—"}
                </TableCell>
                <TableCell className="text-center">
                  {r._count.magasins > 0 ? (
                    <Badge variant="secondary">{r._count.magasins}</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">0</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <DialogRegion
                      region={{
                        id: r.id,
                        code: r.code,
                        nom: r.nom,
                        description: r.description,
                      }}
                    />
                    <BoutonSupprimerRegion
                      regionId={r.id}
                      nom={r.nom}
                      nbMagasins={r._count.magasins}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
