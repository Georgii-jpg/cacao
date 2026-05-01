// Tableau de fiches stock — server-friendly.
import Link from "next/link";
import { ChevronRight, Inbox } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BadgeStatutStock } from "./badge-statut-stock";
import { formatPoidsKg, formatDate } from "@/lib/utils/format";
import type { StatutStock } from "@/app/generated/prisma/enums";

type LigneStock = {
  id: string;
  date: Date;
  stockOuvertureKg: number;
  entreesKg: number;
  sortiesKg: number;
  stockClotureKg: number;
  statut: StatutStock;
  magasin: { id: string; code: string; nom: string };
  produit: { id: string; code: string; nom: string };
  saisiPar: { id: string; nom: string; prenom: string | null };
};

export function TableStocks({
  stocks,
  afficherMagasin = true,
}: {
  stocks: LigneStock[];
  afficherMagasin?: boolean;
}) {
  if (stocks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <Inbox className="mx-auto h-10 w-10 text-muted-foreground/60" />
        <p className="mt-3 text-sm text-muted-foreground">
          Aucune fiche ne correspond aux filtres en cours.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-28">Date</TableHead>
            {afficherMagasin && <TableHead>Magasin</TableHead>}
            <TableHead>Produit</TableHead>
            <TableHead className="text-right">Ouverture</TableHead>
            <TableHead className="text-right text-emerald-700">Entrées</TableHead>
            <TableHead className="text-right text-amber-700">Sorties</TableHead>
            <TableHead className="text-right">Clôture</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Saisi par</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {stocks.map((s) => {
            const saisisseur =
              [s.saisiPar.prenom, s.saisiPar.nom]
                .filter(Boolean)
                .join(" ")
                .trim() || "—";
            return (
              <TableRow key={s.id}>
                <TableCell className="text-xs">
                  <Link href={`/stocks/${s.id}`} className="hover:underline">
                    {formatDate(s.date)}
                  </Link>
                </TableCell>
                {afficherMagasin && (
                  <TableCell>
                    <Link
                      href={`/magasins/${s.magasin.id}`}
                      className="hover:underline"
                    >
                      {s.magasin.nom}
                    </Link>
                    <p className="text-xs text-muted-foreground font-mono">
                      {s.magasin.code}
                    </p>
                  </TableCell>
                )}
                <TableCell>
                  <p className="text-sm">{s.produit.nom}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {s.produit.code}
                  </p>
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm">
                  {formatPoidsKg(s.stockOuvertureKg)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm text-emerald-700">
                  {s.entreesKg > 0 ? `+${formatPoidsKg(s.entreesKg)}` : "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm text-amber-700">
                  {s.sortiesKg > 0 ? `−${formatPoidsKg(s.sortiesKg)}` : "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm font-medium">
                  {formatPoidsKg(s.stockClotureKg)}
                </TableCell>
                <TableCell>
                  <BadgeStatutStock statut={s.statut} />
                </TableCell>
                <TableCell className="text-xs">{saisisseur}</TableCell>
                <TableCell>
                  <Link
                    href={`/stocks/${s.id}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Voir la fiche"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
