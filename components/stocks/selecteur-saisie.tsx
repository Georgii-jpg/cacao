"use client";
// Sélecteur magasin / produit / date pour la page de saisie.
// Met à jour les searchParams pour que la page serveur charge la fiche.
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Calendar, Building2, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Magasin = {
  id: string;
  code: string;
  nom: string;
  ville: string;
  region: { nom: string };
};
type Produit = { id: string; code: string; nom: string };

type Props = {
  magasins: Magasin[];
  produits: Produit[];
  /// Magasin imposé (responsable / opérateur) — sélecteur masqué
  magasinForce?: string | null;
  /// Valeurs courantes (issues de l'URL)
  magasinId?: string;
  produitId?: string;
  date?: string;
};

export function SelecteurSaisie({
  magasins,
  produits,
  magasinForce,
  magasinId,
  produitId,
  date,
}: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  function poser(cle: string, valeur: string | null) {
    const next = new URLSearchParams(params.toString());
    if (valeur) next.set(cle, valeur);
    else next.delete(cle);
    startTransition(() => {
      router.replace(`?${next.toString()}`, { scroll: false });
    });
  }

  const dateAujourdhui = new Date().toISOString().slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Choisir la fiche à saisir</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        {!magasinForce && (
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              Magasin
            </Label>
            <Select
              value={magasinId ?? ""}
              onValueChange={(v) => poser("magasin", v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choisir un magasin" />
              </SelectTrigger>
              <SelectContent>
                {magasins.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nom}
                    <span className="text-xs text-muted-foreground">
                      {m.region.nom}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5" />
            Produit
          </Label>
          <Select
            value={produitId ?? ""}
            onValueChange={(v) => poser("produit", v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choisir un produit" />
            </SelectTrigger>
            <SelectContent>
              {produits.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Date
          </Label>
          <Input
            type="date"
            max={dateAujourdhui}
            value={date ?? dateAujourdhui}
            onChange={(e) => poser("date", e.target.value || null)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
