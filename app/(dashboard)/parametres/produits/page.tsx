// Catalogue produits (ADMIN).
import Link from "next/link";
import { ArrowLeft, Package } from "lucide-react";
import { exigerPermission } from "@/lib/auth/require";
import { listerProduitsAvecCompteurs } from "@/lib/parametres/queries";
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
import { DialogProduit } from "@/components/parametres/dialog-produit";
import { BoutonBasculerActifProduit } from "@/components/parametres/bouton-basculer-actif-produit";
import type { GradeProduit, TypeProduit } from "@/app/generated/prisma/enums";

export const metadata = { title: "Catalogue produits" };
export const dynamic = "force-dynamic";

const LIBELLE_TYPE: Record<TypeProduit, string> = {
  FEVES_BRUTES: "Fèves brutes",
  FEVES_FERMENTEES: "Fèves fermentées",
  FEVES_SECHEES: "Fèves séchées",
};
const LIBELLE_GRADE: Record<GradeProduit, string> = {
  GRADE_1: "Grade 1",
  GRADE_2: "Grade 2",
  HORS_STANDARD: "Hors standard",
};

export default async function PageProduits() {
  await exigerPermission("modifierParametres");
  const produits = await listerProduitsAvecCompteurs();
  const actifs = produits.filter((p) => p.actif).length;

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
              <Package className="h-6 w-6" />
              Catalogue produits
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {produits.length} produit{produits.length > 1 ? "s" : ""} —{" "}
              <Badge variant="secondary">{actifs} actifs</Badge>
            </p>
          </div>
          <DialogProduit />
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">Code</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Origine</TableHead>
              <TableHead className="text-center">Fiches</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="w-56" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {produits.map((p) => (
              <TableRow key={p.id} className={!p.actif ? "opacity-60" : ""}>
                <TableCell className="font-mono text-xs">{p.code}</TableCell>
                <TableCell className="font-medium">{p.nom}</TableCell>
                <TableCell className="text-sm">{LIBELLE_TYPE[p.type]}</TableCell>
                <TableCell className="text-sm">{LIBELLE_GRADE[p.grade]}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {p.origine ?? "—"}
                </TableCell>
                <TableCell className="text-center text-sm tabular-nums">
                  {p._count.stocks}
                </TableCell>
                <TableCell>
                  {p.actif ? (
                    <Badge
                      variant="outline"
                      className="border-emerald-500/30 bg-emerald-500/15 text-emerald-700"
                    >
                      Actif
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Désactivé
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <DialogProduit
                      produit={{
                        id: p.id,
                        code: p.code,
                        nom: p.nom,
                        description: p.description,
                        type: p.type,
                        grade: p.grade,
                        origine: p.origine,
                        actif: p.actif,
                      }}
                    />
                    <BoutonBasculerActifProduit
                      produitId={p.id}
                      actif={p.actif}
                      nom={p.nom}
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
