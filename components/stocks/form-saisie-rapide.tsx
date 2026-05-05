"use client";
// Formulaire de saisie rapide (mode mobile magasinier).
// Une carte par produit, avec 2 champs : acheté aujourd'hui + stock total
// actuel. Affiche le dernier stock validé connu pour aider le magasinier.
// Pour les produits déjà soumis/validés aujourd'hui : carte en lecture seule.
import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Send, AlertCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import {
  enregistrerSaisieRapide,
  type EtatActionSaisieRapide,
} from "@/lib/stocks/saisie-rapide";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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

const ETAT_INITIAL: EtatActionSaisieRapide = { ok: false, erreur: null };

type Produit = {
  id: string;
  code: string;
  nom: string;
  type: string;
  grade: string;
};

type FicheJour = {
  id: string;
  statut: StatutStock;
  entreesKg: number;
  stockClotureKg: number;
  motifRejet: string | null;
} | null;

type Ligne = {
  produit: Produit;
  dernierStockKg: number;
  dernierStockDate: Date | null;
  fiche: FicheJour;
};

type Props = {
  dateIso: string;
  lignes: Ligne[];
};

export function FormSaisieRapide({ dateIso, lignes }: Props) {
  const router = useRouter();
  const [etat, formAction, enCours] = useActionState(
    enregistrerSaisieRapide,
    ETAT_INITIAL,
  );

  // Saisies locales (par produitId)
  const [achetes, setAchetes] = useState<Record<string, string>>({});
  const [stocksActuels, setStocksActuels] = useState<Record<string, string>>({});

  // Combien de lignes ont au moins un champ rempli (compteur en bas)
  const nbRemplies = useMemo(() => {
    let n = 0;
    for (const l of lignes) {
      if (estVerrouillee(l.fiche)) continue;
      const a = achetes[l.produit.id]?.trim();
      const s = stocksActuels[l.produit.id]?.trim();
      if ((a && a !== "") || (s && s !== "")) n++;
    }
    return n;
  }, [achetes, stocksActuels, lignes]);

  useEffect(() => {
    if (etat.ok) {
      toast.success(
        etat.erreur ??
          `${etat.nbTraitees ?? 0} saisie(s) transmise(s) pour validation.`,
      );
      setAchetes({});
      setStocksActuels({});
      router.refresh();
    } else if (etat.erreur) {
      toast.error(etat.erreur);
    }
  }, [etat, router]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="date" value={dateIso} />

      {etat.erreur && !etat.ok && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{etat.erreur}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        {lignes.map((ligne, index) => (
          <CarteLigne
            key={ligne.produit.id}
            ligne={ligne}
            index={index}
            achete={achetes[ligne.produit.id] ?? ""}
            stockActuel={stocksActuels[ligne.produit.id] ?? ""}
            onAcheteChange={(v) =>
              setAchetes((p) => ({ ...p, [ligne.produit.id]: v }))
            }
            onStockActuelChange={(v) =>
              setStocksActuels((p) => ({ ...p, [ligne.produit.id]: v }))
            }
          />
        ))}
      </div>

      {/* Barre d'action sticky en bas (mobile-friendly) */}
      <div className="sticky bottom-4 z-10 mt-6">
        <div className="rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur">
          <Button
            type="submit"
            size="lg"
            className="h-14 w-full text-base"
            disabled={enCours || nbRemplies === 0}
          >
            {enCours ? (
              <>
                <Loader2 className="size-5 animate-spin" />
                Envoi en cours…
              </>
            ) : (
              <>
                <Send className="size-5" />
                Envoyer{" "}
                {nbRemplies > 0
                  ? `(${nbRemplies} produit${nbRemplies > 1 ? "s" : ""})`
                  : ""}
              </>
            )}
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Vos saisies seront transmises au manager pour validation.
          </p>
        </div>
      </div>
    </form>
  );
}

// ─── Sous-composant : une carte produit ─────────────────────────────────

function CarteLigne({
  ligne,
  index,
  achete,
  stockActuel,
  onAcheteChange,
  onStockActuelChange,
}: {
  ligne: Ligne;
  index: number;
  achete: string;
  stockActuel: string;
  onAcheteChange: (v: string) => void;
  onStockActuelChange: (v: string) => void;
}) {
  const verrouillee = estVerrouillee(ligne.fiche);

  return (
    <Card className={verrouillee ? "opacity-90" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base">{ligne.produit.nom}</CardTitle>
            <CardDescription className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono">
                {ligne.produit.code}
              </span>
              <span>
                Dernier stock validé :{" "}
                <strong>{formatPoidsKg(ligne.dernierStockKg)}</strong>
                {ligne.dernierStockDate && (
                  <>
                    {" "}le{" "}
                    {new Intl.DateTimeFormat("fr-FR").format(
                      new Date(ligne.dernierStockDate),
                    )}
                  </>
                )}
              </span>
            </CardDescription>
          </div>
          {verrouillee && <BadgeStatut statut={ligne.fiche!.statut} />}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {verrouillee ? (
          <ContenuVerrouille fiche={ligne.fiche!} />
        ) : (
          <>
            {ligne.fiche?.statut === "REJETE" && ligne.fiche.motifRejet && (
              <Alert>
                <AlertTriangle className="size-4" />
                <AlertTitle>Saisie précédente rejetée</AlertTitle>
                <AlertDescription>
                  Motif&nbsp;: {ligne.fiche.motifRejet}
                </AlertDescription>
              </Alert>
            )}

            {/* Identifiant du produit pour la server action */}
            <input
              type="hidden"
              name={`lignes[${index}].produitId`}
              value={ligne.produit.id}
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={`achete-${ligne.produit.id}`}>
                  Acheté aujourd&apos;hui (kg)
                </Label>
                <Input
                  id={`achete-${ligne.produit.id}`}
                  name={`lignes[${index}].acheteAujourdhuiKg`}
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="0"
                  placeholder="0"
                  value={achete}
                  onChange={(e) => onAcheteChange(e.target.value)}
                  className="h-12 text-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`stock-${ligne.produit.id}`}>
                  Stock total actuel (kg)
                </Label>
                <Input
                  id={`stock-${ligne.produit.id}`}
                  name={`lignes[${index}].stockTotalActuelKg`}
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="0"
                  placeholder="0"
                  value={stockActuel}
                  onChange={(e) => onStockActuelChange(e.target.value)}
                  className="h-12 text-lg"
                />
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ContenuVerrouille({
  fiche,
}: {
  fiche: NonNullable<FicheJour>;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 text-sm">
      <div>
        <p className="text-muted-foreground">Acheté aujourd&apos;hui</p>
        <p className="font-medium">{formatPoidsKg(fiche.entreesKg)}</p>
      </div>
      <div>
        <p className="text-muted-foreground">Stock actuel</p>
        <p className="font-medium">{formatPoidsKg(fiche.stockClotureKg)}</p>
      </div>
    </div>
  );
}

function BadgeStatut({ statut }: { statut: StatutStock }) {
  if (statut === "VALIDE") {
    return (
      <Badge className="gap-1 bg-emerald-600 text-white hover:bg-emerald-600">
        <CheckCircle2 className="size-3" /> Validé
      </Badge>
    );
  }
  if (statut === "SOUMIS") {
    return (
      <Badge variant="secondary" className="gap-1">
        <Loader2 className="size-3" /> En attente
      </Badge>
    );
  }
  return null;
}

function estVerrouillee(fiche: FicheJour): boolean {
  return !!fiche && (fiche.statut === "SOUMIS" || fiche.statut === "VALIDE");
}
