"use client";
// Composant de pagination simple — boutons Précédent / Suivant + numéros de
// page autour de la page courante. Met à jour le param `page` dans l'URL.
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  page: number;
  nbPages: number;
  total: number;
  tailleLimite: number;
};

export function PaginationLiens({ page, nbPages, total, tailleLimite }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  function aller(p: number) {
    const next = new URLSearchParams(params.toString());
    if (p <= 1) next.delete("page");
    else next.set("page", String(p));
    startTransition(() => {
      router.replace(`?${next.toString()}`);
    });
  }

  if (nbPages <= 1) return null;

  // Construit la liste de pages à afficher (max 7 boutons)
  const pages: number[] = [];
  const max = 7;
  if (nbPages <= max) {
    for (let i = 1; i <= nbPages; i++) pages.push(i);
  } else {
    pages.push(1);
    const debut = Math.max(2, page - 2);
    const fin = Math.min(nbPages - 1, page + 2);
    if (debut > 2) pages.push(-1); // ellipsis
    for (let i = debut; i <= fin; i++) pages.push(i);
    if (fin < nbPages - 1) pages.push(-1);
    pages.push(nbPages);
  }

  const debut = (page - 1) * tailleLimite + 1;
  const fin = Math.min(page * tailleLimite, total);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-foreground">
        Lignes <span className="font-medium">{debut}</span>–
        <span className="font-medium">{fin}</span> sur{" "}
        <span className="font-medium">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => aller(page - 1)}
          aria-label="Page précédente"
        >
          <ChevronLeft className="h-4 w-4" />
          Précédent
        </Button>
        {pages.map((p, i) =>
          p === -1 ? (
            <span key={`gap-${i}`} className="px-2 text-xs text-muted-foreground">
              …
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? "default" : "ghost"}
              size="sm"
              onClick={() => aller(p)}
              className="min-w-9"
            >
              {p}
            </Button>
          ),
        )}
        <Button
          variant="outline"
          size="sm"
          disabled={page >= nbPages}
          onClick={() => aller(page + 1)}
          aria-label="Page suivante"
        >
          Suivant
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
