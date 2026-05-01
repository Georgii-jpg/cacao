"use client";
// Filtres de l'historique des stocks (URL state).
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StatutStock } from "@/app/generated/prisma/enums";

type Magasin = { id: string; code: string; nom: string };
type Produit = { id: string; code: string; nom: string };

type Props = {
  magasins: Magasin[];
  produits: Produit[];
  /// Verrouillé sur ce magasin si l'utilisateur n'a pas le droit de changer
  magasinForce?: string | null;
};

const STATUTS: { value: StatutStock | "TOUS"; libelle: string }[] = [
  { value: "TOUS", libelle: "Tous statuts" },
  { value: "BROUILLON", libelle: "Brouillons" },
  { value: "SOUMIS", libelle: "À valider" },
  { value: "VALIDE", libelle: "Validés" },
  { value: "REJETE", libelle: "Rejetés" },
];

export function FiltresStocks({ magasins, produits, magasinForce }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  function poser(cle: string, valeur: string | null) {
    const next = new URLSearchParams(params.toString());
    if (valeur && valeur !== "TOUS") next.set(cle, valeur);
    else next.delete(cle);
    startTransition(() => {
      router.replace(`?${next.toString()}`, { scroll: false });
    });
  }

  const magasinId = params.get("magasin") ?? "TOUS";
  const produitId = params.get("produit") ?? "TOUS";
  const statut = params.get("statut") ?? "TOUS";
  const dateDebut = params.get("debut") ?? "";
  const dateFin = params.get("fin") ?? "";
  const aFiltres =
    (!magasinForce && magasinId !== "TOUS") ||
    produitId !== "TOUS" ||
    statut !== "TOUS" ||
    !!dateDebut ||
    !!dateFin;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
      {!magasinForce && (
        <div className="space-y-1.5">
          <Label className="text-xs">Magasin</Label>
          <Select
            value={magasinId}
            onValueChange={(v) => poser("magasin", v === "TOUS" ? null : v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TOUS">Tous magasins</SelectItem>
              {magasins.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs">Produit</Label>
        <Select
          value={produitId}
          onValueChange={(v) => poser("produit", v === "TOUS" ? null : v)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TOUS">Tous produits</SelectItem>
            {produits.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.nom}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Statut</Label>
        <Select
          value={statut}
          onValueChange={(v) => poser("statut", v === "TOUS" ? null : v)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUTS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.libelle}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Du</Label>
        <Input
          type="date"
          value={dateDebut}
          onChange={(e) => poser("debut", e.target.value || null)}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Au</Label>
        <Input
          type="date"
          value={dateFin}
          onChange={(e) => poser("fin", e.target.value || null)}
        />
      </div>

      {aFiltres && (
        <div className="lg:col-span-5 -mt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => startTransition(() => router.replace("?"))}
          >
            <X className="h-4 w-4" />
            Réinitialiser les filtres
          </Button>
        </div>
      )}
    </div>
  );
}
