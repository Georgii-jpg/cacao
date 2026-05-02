"use client";
// Formulaire de saisie / édition d'une fiche de stock journalière.
// Calcule la clôture en temps réel côté client (le serveur recalcule).
import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Send, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  enregistrerStock,
  soumettreStock,
  type EtatActionStock,
} from "@/lib/stocks/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPoidsKg } from "@/lib/utils/format";
import type { StatutStock } from "@/app/generated/prisma/enums";

const ETAT_INITIAL: EtatActionStock = { ok: false, erreur: null };

type FicheInitiale = {
  id: string;
  stockOuvertureKg: number;
  entreesKg: number;
  sortiesKg: number;
  humiditeMoyenne: number | null;
  notesQualite: string | null;
  statut: StatutStock;
  motifRejet: string | null;
};

type Props = {
  magasinId: string;
  produitId: string;
  /// Date au format YYYY-MM-DD
  date: string;
  /// Suggestion de stock d'ouverture (= clôture du dernier validé)
  ouvertureSuggereeKg: number;
  fiche?: FicheInitiale;
  /// L'utilisateur courant peut-il soumettre cette fiche ?
  peutSoumettre?: boolean;
};

export function FormSaisieStock({
  magasinId,
  produitId,
  date,
  ouvertureSuggereeKg,
  fiche,
  peutSoumettre = true,
}: Props) {
  const router = useRouter();
  const [etat, formAction, enCours] = useActionState(
    enregistrerStock,
    ETAT_INITIAL,
  );

  const initiale = {
    ouverture: fiche?.stockOuvertureKg ?? ouvertureSuggereeKg,
    entrees: fiche?.entreesKg ?? 0,
    sorties: fiche?.sortiesKg ?? 0,
  };
  const [ouverture, setOuverture] = useState(initiale.ouverture);
  const [entrees, setEntrees] = useState(initiale.entrees);
  const [sorties, setSorties] = useState(initiale.sorties);

  const cloture = useMemo(
    () => Math.max(0, (ouverture || 0) + (entrees || 0) - (sorties || 0)),
    [ouverture, entrees, sorties],
  );
  const sortieExcessive = (sorties || 0) > (ouverture || 0) + (entrees || 0);

  useEffect(() => {
    if (etat.ok && etat.stockId) {
      toast.success(
        fiche ? "Fiche mise à jour." : "Fiche créée en brouillon.",
      );
      router.refresh();
      router.push(`/stocks/${etat.stockId}`);
    }
  }, [etat.ok, etat.stockId, fiche, router]);

  const erreurs = etat.erreursChamps ?? {};
  const figee = fiche?.statut === "VALIDE" || fiche?.statut === "SOUMIS";

  return (
    <div className="space-y-6">
      {fiche?.statut === "REJETE" && fiche.motifRejet && (
        <Alert variant="destructive">
          <AlertTitle className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Fiche rejetée
          </AlertTitle>
          <AlertDescription>
            <span className="font-medium">Motif : </span>
            {fiche.motifRejet}
            <p className="text-xs mt-1">
              Corrigez les valeurs ci-dessous puis resoumettez.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {figee && (
        <Alert>
          <AlertTitle>Fiche {fiche?.statut === "VALIDE" ? "validée" : "en attente"}</AlertTitle>
          <AlertDescription>
            {fiche?.statut === "VALIDE"
              ? "Cette fiche est validée et ne peut plus être modifiée."
              : "Cette fiche est en attente de validation. Pour la modifier, elle doit être rejetée d'abord."}
          </AlertDescription>
        </Alert>
      )}

      <form action={formAction} className="space-y-6">
        {fiche && <input type="hidden" name="id" value={fiche.id} />}
        <input type="hidden" name="magasinId" value={magasinId} />
        <input type="hidden" name="produitId" value={produitId} />
        <input type="hidden" name="date" value={date} />

        {etat.erreur && (
          <Alert variant="destructive">
            <AlertTitle>Enregistrement impossible</AlertTitle>
            <AlertDescription>{etat.erreur}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Quantités du jour</CardTitle>
            <CardDescription>
              Ouverture par défaut : clôture du dernier stock validé sur ce
              produit (modifiable si écart constaté).
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <ChampNombre
              id="stockOuvertureKg"
              libelle="Stock d'ouverture (kg)"
              value={ouverture}
              onChange={setOuverture}
              erreur={erreurs.stockOuvertureKg}
              disabled={figee}
            />
            <ChampNombre
              id="entreesKg"
              libelle="Entrées du jour (kg)"
              value={entrees}
              onChange={setEntrees}
              erreur={erreurs.entreesKg}
              disabled={figee}
            />
            <ChampNombre
              id="sortiesKg"
              libelle="Sorties du jour (kg)"
              value={sorties}
              onChange={setSorties}
              erreur={erreurs.sortiesKg}
              disabled={figee}
            />
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">
                Stock de clôture (calculé)
              </Label>
              <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm font-medium tabular-nums">
                {formatPoidsKg(cloture)}
              </div>
              {sortieExcessive && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Sorties supérieures aux disponibilités
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Qualité (optionnel)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="humiditeMoyenne">Humidité moyenne (%)</Label>
              <Input
                id="humiditeMoyenne"
                name="humiditeMoyenne"
                type="number"
                step="0.1"
                min="0"
                max="100"
                defaultValue={fiche?.humiditeMoyenne ?? ""}
                placeholder="7.5"
                aria-invalid={!!erreurs.humiditeMoyenne}
                disabled={figee}
              />
              {erreurs.humiditeMoyenne && (
                <p className="text-xs text-destructive">
                  {erreurs.humiditeMoyenne}
                </p>
              )}
            </div>
            <div className="space-y-1.5 sm:col-span-1">
              <Label htmlFor="notesQualite">Notes qualité</Label>
              <Input
                id="notesQualite"
                name="notesQualite"
                defaultValue={fiche?.notesQualite ?? ""}
                placeholder="Observation libre"
                maxLength={500}
                disabled={figee}
              />
            </div>
          </CardContent>
        </Card>

        {!figee && (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="submit"
              variant="outline"
              disabled={enCours}
              name="_action"
              value="enregistrer"
            >
              {enCours ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enregistrement…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Enregistrer en brouillon
                </>
              )}
            </Button>
          </div>
        )}
      </form>

      {/* Soumission séparée — appelée APRÈS enregistrement réussi */}
      {fiche &&
        !figee &&
        peutSoumettre &&
        (fiche.statut === "BROUILLON" || fiche.statut === "REJETE") && (
          <BoutonSoumettre stockId={fiche.id} />
        )}
    </div>
  );
}

function BoutonSoumettre({ stockId }: { stockId: string }) {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);

  async function handler() {
    setEnCours(true);
    const res = await soumettreStock(stockId);
    setEnCours(false);
    if (res.ok) {
      toast.success("Fiche soumise pour validation.");
      router.refresh();
    } else {
      toast.error(res.erreur ?? "Échec de la soumission.");
    }
  }

  return (
    <div className="flex justify-end">
      <Button onClick={handler} disabled={enCours}>
        {enCours ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Soumission…
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            Soumettre pour validation
          </>
        )}
      </Button>
    </div>
  );
}

// ─── Sous-composant numérique avec contrôle d'état ──────────────────────

function ChampNombre({
  id,
  libelle,
  value,
  onChange,
  erreur,
  disabled,
}: {
  id: string;
  libelle: string;
  value: number;
  onChange: (n: number) => void;
  erreur?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{libelle}</Label>
      <Input
        id={id}
        name={id}
        type="number"
        step="0.1"
        min="0"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => {
          const n = Number(e.target.value);
          onChange(Number.isFinite(n) ? n : 0);
        }}
        aria-invalid={!!erreur}
        disabled={disabled}
        required
      />
      {erreur && <p className="text-xs text-destructive">{erreur}</p>}
    </div>
  );
}
