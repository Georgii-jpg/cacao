// Table des magasins — server component pur.
// Reçoit les données déjà scopées au rôle par la query côté page.
import Link from "next/link";
import { ChevronRight, Building2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BadgeStatutMagasin } from "./badge-statut";
import { formatPoidsKg } from "@/lib/utils/format";
import type { StatutMagasin } from "@/app/generated/prisma/enums";

type LigneMagasin = {
  id: string;
  code: string;
  nom: string;
  ville: string;
  capaciteKg: number;
  statut: StatutMagasin;
  region: { id: string; code: string; nom: string };
  responsable: {
    id: string;
    nom: string;
    prenom: string | null;
    email: string;
  } | null;
  _count: { utilisateurs: number };
};

export function TableMagasins({ magasins }: { magasins: LigneMagasin[] }) {
  if (magasins.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <Building2 className="mx-auto h-10 w-10 text-muted-foreground/60" />
        <p className="mt-3 text-sm text-muted-foreground">
          Aucun magasin ne correspond aux filtres en cours.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-32">Code</TableHead>
            <TableHead>Nom</TableHead>
            <TableHead>Ville</TableHead>
            <TableHead>Région</TableHead>
            <TableHead className="text-right">Capacité</TableHead>
            <TableHead>Responsable</TableHead>
            <TableHead className="text-center">Équipe</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {magasins.map((m) => {
            const nomResp = m.responsable
              ? [m.responsable.prenom, m.responsable.nom]
                  .filter(Boolean)
                  .join(" ")
                  .trim() || m.responsable.email
              : null;
            return (
              <TableRow
                key={m.id}
                className="cursor-pointer"
                onClick={undefined}
              >
                <TableCell className="font-mono text-xs text-muted-foreground">
                  <Link href={`/magasins/${m.id}`} className="hover:underline">
                    {m.code}
                  </Link>
                </TableCell>
                <TableCell className="font-medium">
                  <Link href={`/magasins/${m.id}`} className="hover:underline">
                    {m.nom}
                  </Link>
                </TableCell>
                <TableCell>{m.ville}</TableCell>
                <TableCell>
                  <span className="text-xs text-muted-foreground">
                    {m.region.nom}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatPoidsKg(m.capaciteKg)}
                </TableCell>
                <TableCell>
                  {nomResp ? (
                    <span className="text-sm">{nomResp}</span>
                  ) : (
                    <span className="text-xs italic text-muted-foreground">
                      Non assigné
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-center text-sm tabular-nums">
                  {m._count.utilisateurs}
                </TableCell>
                <TableCell>
                  <BadgeStatutMagasin statut={m.statut} />
                </TableCell>
                <TableCell>
                  <Link
                    href={`/magasins/${m.id}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label={`Voir le magasin ${m.nom}`}
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
