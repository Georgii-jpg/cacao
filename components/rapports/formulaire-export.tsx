"use client";
// Formulaire de paramétrage pour télécharger un rapport CSV.
// Construit l'URL de téléchargement et déclenche un GET via une simple
// ancre (pas besoin de fetch — le navigateur télécharge directement).
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
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

type Magasin = { id: string; code: string; nom: string };

type ChampPeriode = boolean;
type ChampMagasin = boolean;
type ChampStatut = boolean;

type Props = {
  type: "historique" | "snapshot" | "activite";
  magasins: Magasin[];
  /// Champs à afficher pour ce rapport
  champPeriode?: ChampPeriode;
  champMagasin?: ChampMagasin;
  champStatut?: ChampStatut;
  /// Valeur par défaut pour la période (en jours, applique fin = aujourd'hui)
  periodeDefautJours?: number;
};

function isoAujourdhui(): string {
  return new Date().toISOString().slice(0, 10);
}
function isoIlYa(jours: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - jours);
  return d.toISOString().slice(0, 10);
}

export function FormulaireExport({
  type,
  magasins,
  champPeriode = true,
  champMagasin = true,
  champStatut = false,
  periodeDefautJours = 30,
}: Props) {
  const [debut, setDebut] = useState(
    champPeriode ? isoIlYa(periodeDefautJours - 1) : "",
  );
  const [fin, setFin] = useState(champPeriode ? isoAujourdhui() : "");
  const [magasinId, setMagasinId] = useState<string>("TOUS");
  const [statut, setStatut] = useState<string>("TOUS");

  const url = useMemo(() => {
    const p = new URLSearchParams();
    if (champPeriode && debut) p.set("debut", debut);
    if (champPeriode && fin) p.set("fin", fin);
    if (champMagasin && magasinId !== "TOUS") p.set("magasin", magasinId);
    if (champStatut && statut !== "TOUS") p.set("statut", statut);
    const qs = p.toString();
    return `/api/rapports/${type}${qs ? `?${qs}` : ""}`;
  }, [type, debut, fin, magasinId, statut, champPeriode, champMagasin, champStatut]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {champPeriode && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor={`debut-${type}`} className="text-xs">
                Du
              </Label>
              <Input
                id={`debut-${type}`}
                type="date"
                value={debut}
                onChange={(e) => setDebut(e.target.value)}
                max={fin || undefined}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`fin-${type}`} className="text-xs">
                Au
              </Label>
              <Input
                id={`fin-${type}`}
                type="date"
                value={fin}
                onChange={(e) => setFin(e.target.value)}
                max={isoAujourdhui()}
                min={debut || undefined}
              />
            </div>
          </>
        )}

        {champMagasin && (
          <div className={`space-y-1.5 ${champPeriode ? "sm:col-span-2" : ""}`}>
            <Label className="text-xs">Magasin</Label>
            <Select
              value={magasinId}
              onValueChange={(v) => setMagasinId(v ?? "TOUS")}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TOUS">Tous les magasins</SelectItem>
                {magasins.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {champStatut && (
          <div className="space-y-1.5">
            <Label className="text-xs">Statut</Label>
            <Select
              value={statut}
              onValueChange={(v) => setStatut(v ?? "TOUS")}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TOUS">Tous statuts</SelectItem>
                <SelectItem value="BROUILLON">Brouillons</SelectItem>
                <SelectItem value="SOUMIS">À valider</SelectItem>
                <SelectItem value="VALIDE">Validés</SelectItem>
                <SelectItem value="REJETE">Rejetés</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <Button render={<a href={url} download />} className="w-full">
        <Download className="h-4 w-4" />
        Télécharger le CSV
      </Button>
    </div>
  );
}
