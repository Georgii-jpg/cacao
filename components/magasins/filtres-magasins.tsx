"use client";
// Barre de filtres de la liste des magasins. Les filtres sont stockés
// dans l'URL (?recherche=&region=&statut=) pour être bookmarkables et
// permettre la navigation back/forward sans état perdu.
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition, useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StatutMagasin } from "@/app/generated/prisma/enums";

type Region = { id: string; code: string; nom: string };

type Props = {
  regions: Region[];
  /** Limiter le filtre région (manager régional bloqué sur sa région) */
  regionForcee?: string | null;
};

const STATUTS: { value: StatutMagasin | "TOUS"; libelle: string }[] = [
  { value: "TOUS", libelle: "Tous statuts" },
  { value: "ACTIF", libelle: "Actifs" },
  { value: "MAINTENANCE", libelle: "Maintenance" },
  { value: "INACTIF", libelle: "Archivés" },
];

export function FiltresMagasins({ regions, regionForcee }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [recherche, setRecherche] = useState(searchParams.get("recherche") ?? "");

  // Debounce 300 ms sur la recherche pour éviter une URL update à chaque touche
  useEffect(() => {
    const t = setTimeout(() => {
      poserParam("recherche", recherche || null);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recherche]);

  function poserParam(cle: string, valeur: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (valeur && valeur !== "TOUS") params.set(cle, valeur);
    else params.delete(cle);
    startTransition(() => {
      router.replace(`?${params.toString()}`, { scroll: false });
    });
  }

  const region = searchParams.get("region") ?? "TOUS";
  const statut = searchParams.get("statut") ?? "TOUS";
  const aFiltres =
    !!recherche || (region !== "TOUS" && !regionForcee) || statut !== "TOUS";

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher un magasin (code, nom, ville)…"
          className="pl-9"
        />
      </div>

      {!regionForcee && (
        <Select
          value={region}
          onValueChange={(v) => poserParam("region", v === "TOUS" ? null : v)}
        >
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Toutes régions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TOUS">Toutes régions</SelectItem>
            {regions.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.nom}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select
        value={statut}
        onValueChange={(v) => poserParam("statut", v === "TOUS" ? null : v)}
      >
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder="Statut" />
        </SelectTrigger>
        <SelectContent>
          {STATUTS.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.libelle}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {aFiltres && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setRecherche("");
            startTransition(() => router.replace("?"));
          }}
        >
          <X className="h-4 w-4" />
          Réinitialiser
        </Button>
      )}
    </div>
  );
}
