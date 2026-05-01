// Liste d'alertes opérationnelles : magasins sans saisie aujourd'hui
// + dernières fiches rejetées. Server-friendly.
import Link from "next/link";
import { AlertTriangle, ChevronRight, Building2, X } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils/format";

type MagasinSansSaisie = {
  id: string;
  code: string;
  nom: string;
  ville: string;
  region: { nom: string };
  responsable: { nom: string; prenom: string | null; email: string } | null;
};

type FicheRejetee = {
  id: string;
  date: Date;
  motifRejet: string | null;
  magasin: { id: string; nom: string; code: string };
  produit: { nom: string; code: string };
  saisiPar: { nom: string; prenom: string | null };
};

export function CarteMagasinsSansSaisie({
  magasins,
}: {
  magasins: MagasinSansSaisie[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          Magasins sans saisie aujourd&apos;hui
        </CardTitle>
        <CardDescription>
          {magasins.length === 0
            ? "Tous les magasins actifs ont remonté leurs données."
            : `${magasins.length} magasin${magasins.length > 1 ? "s" : ""} en retard`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {magasins.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Rien à signaler.</p>
        ) : (
          <ul className="divide-y">
            {magasins.slice(0, 8).map((m) => {
              const nomResp = m.responsable
                ? [m.responsable.prenom, m.responsable.nom]
                    .filter(Boolean)
                    .join(" ")
                    .trim() || m.responsable.email
                : null;
              return (
                <li key={m.id} className="py-2.5 first:pt-0 last:pb-0">
                  <Link
                    href={`/magasins/${m.id}`}
                    className="flex items-center gap-3 hover:bg-muted/40 -mx-2 px-2 py-1 rounded-md"
                  >
                    <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{m.nom}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {m.region.nom}
                        {nomResp && ` · ${nomResp}`}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </li>
              );
            })}
            {magasins.length > 8 && (
              <li className="pt-2 text-center">
                <span className="text-xs text-muted-foreground">
                  + {magasins.length - 8} autre
                  {magasins.length - 8 > 1 ? "s" : ""}…
                </span>
              </li>
            )}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function CarteFichesRejetees({ fiches }: { fiches: FicheRejetee[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <X className="h-5 w-5 text-destructive" />
          Dernières fiches rejetées
        </CardTitle>
        <CardDescription>
          {fiches.length === 0
            ? "Aucune fiche rejetée récente."
            : `${fiches.length} fiche${fiches.length > 1 ? "s" : ""} à corriger`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {fiches.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Rien à signaler.</p>
        ) : (
          <ul className="divide-y">
            {fiches.map((f) => {
              const auteur =
                [f.saisiPar.prenom, f.saisiPar.nom]
                  .filter(Boolean)
                  .join(" ")
                  .trim() || "—";
              return (
                <li key={f.id} className="py-2.5 first:pt-0 last:pb-0">
                  <Link
                    href={`/stocks/${f.id}`}
                    className="flex items-center gap-3 hover:bg-muted/40 -mx-2 px-2 py-1 rounded-md"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {f.magasin.nom}{" "}
                        <span className="text-muted-foreground font-normal">
                          · {f.produit.nom}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {formatDate(f.date)} · saisi par {auteur}
                      </p>
                      {f.motifRejet && (
                        <p className="text-xs text-destructive truncate mt-0.5">
                          {f.motifRejet}
                        </p>
                      )}
                    </div>
                    <Badge variant="destructive" className="shrink-0">
                      Rejet
                    </Badge>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
