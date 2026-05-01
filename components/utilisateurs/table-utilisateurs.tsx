// Tableau des utilisateurs — server-friendly.
import Link from "next/link";
import { ChevronRight, UserX, Users } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LIBELLE_ROLE } from "@/lib/navigation";
import { formatDateHeure } from "@/lib/utils/format";
import type { Role } from "@/app/generated/prisma/enums";

type LigneUtilisateur = {
  id: string;
  email: string;
  nom: string;
  prenom: string | null;
  telephone: string | null;
  role: Role;
  actif: boolean;
  derniereConnexion: Date | null;
  magasin: { id: string; code: string; nom: string } | null;
};

const COULEUR_ROLE: Record<Role, string> = {
  ADMIN: "bg-primary text-primary-foreground",
  MANAGER_REGIONAL: "bg-accent text-accent-foreground",
  RESPONSABLE_MAGASIN: "bg-secondary text-secondary-foreground",
  OPERATEUR_SAISIE: "bg-muted text-muted-foreground",
};

export function TableUtilisateurs({ utilisateurs }: { utilisateurs: LigneUtilisateur[] }) {
  if (utilisateurs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <Users className="mx-auto h-10 w-10 text-muted-foreground/60" />
        <p className="mt-3 text-sm text-muted-foreground">
          Aucun utilisateur ne correspond aux filtres.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Rôle</TableHead>
            <TableHead>Magasin</TableHead>
            <TableHead>Dernière connexion</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {utilisateurs.map((u) => {
            const nomComplet =
              [u.prenom, u.nom].filter(Boolean).join(" ").trim() || "—";
            return (
              <TableRow key={u.id} className={!u.actif ? "opacity-50" : ""}>
                <TableCell className="font-medium">
                  <Link href={`/utilisateurs/${u.id}`} className="hover:underline">
                    {nomComplet}
                  </Link>
                  {u.telephone && (
                    <p className="text-xs text-muted-foreground">{u.telephone}</p>
                  )}
                </TableCell>
                <TableCell className="text-sm">{u.email}</TableCell>
                <TableCell>
                  <Badge className={COULEUR_ROLE[u.role]}>
                    {LIBELLE_ROLE[u.role]}
                  </Badge>
                </TableCell>
                <TableCell>
                  {u.magasin ? (
                    <Link
                      href={`/magasins/${u.magasin.id}`}
                      className="text-sm hover:underline"
                    >
                      {u.magasin.nom}
                    </Link>
                  ) : (
                    <span className="text-xs italic text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {u.derniereConnexion ? (
                    formatDateHeure(u.derniereConnexion)
                  ) : (
                    <span className="italic">jamais</span>
                  )}
                </TableCell>
                <TableCell>
                  {u.actif ? (
                    <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/15 text-emerald-700">
                      Actif
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      <UserX className="h-3 w-3" />
                      Désactivé
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/utilisateurs/${u.id}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Voir l'utilisateur"
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
