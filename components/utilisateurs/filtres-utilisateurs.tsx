"use client";
// Filtres URL pour la liste des utilisateurs.
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Role } from "@/app/generated/prisma/enums";
import { LIBELLE_ROLE } from "@/lib/navigation";

const ROLES: Role[] = [
  Role.ADMIN,
  Role.MANAGER_REGIONAL,
  Role.RESPONSABLE_MAGASIN,
  Role.OPERATEUR_SAISIE,
];

export function FiltresUtilisateurs() {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const [recherche, setRecherche] = useState(params.get("recherche") ?? "");

  useEffect(() => {
    const t = setTimeout(() => poser("recherche", recherche || null), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recherche]);

  function poser(cle: string, valeur: string | null) {
    const next = new URLSearchParams(params.toString());
    if (valeur && valeur !== "TOUS") next.set(cle, valeur);
    else next.delete(cle);
    startTransition(() => {
      router.replace(`?${next.toString()}`, { scroll: false });
    });
  }

  const role = params.get("role") ?? "TOUS";
  const actif = params.get("actif") ?? "TOUS";
  const aFiltres = !!recherche || role !== "TOUS" || actif !== "TOUS";

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher (email, nom, prénom)…"
          className="pl-9"
        />
      </div>
      <Select value={role} onValueChange={(v) => poser("role", v ?? "TOUS")}>
        <SelectTrigger className="w-full sm:w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="TOUS">Tous rôles</SelectItem>
          {ROLES.map((r) => (
            <SelectItem key={r} value={r}>
              {LIBELLE_ROLE[r]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={actif} onValueChange={(v) => poser("actif", v ?? "TOUS")}>
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="TOUS">Tous statuts</SelectItem>
          <SelectItem value="actifs">Actifs</SelectItem>
          <SelectItem value="inactifs">Désactivés</SelectItem>
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
