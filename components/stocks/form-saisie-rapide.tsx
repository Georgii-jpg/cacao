"use client";
// Formulaire de saisie rapide (mode mobile magasinier).
// Une carte par produit, avec 2 champs : acheté aujourd'hui + stock total
// actuel. Pour les produits déjà soumis/validés aujourd'hui : lecture seule.
// En complément : un bloc "Caisse du jour" avec encaissements / décaissements
// / solde, soumis dans le même envoi.
import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  Send,
  AlertCircle,
  AlertTriangle,
  Wallet,
} from "lucide-react";
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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatFCFA, formatPoidsKg } from "@/lib/utils/format";
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

type FicheCaisse = {
  id: string;
  statut: StatutStock;
  encaissementsFcfa: number;
  decaissementsFcfa: number;
  soldeFcfa: number;
  motifRejet: string | null;
} | null;

type Props = {
  dateIso: string;
  lignes: Ligne[];
  ficheCaisse: FicheCaisse;
};

export function FormSaisieRapide({ dateIso, lignes, ficheCaisse }: Props) {
  const router = useRouter();
  const [etat, formAction, enCours] = useActionState(
    enregistrerSaisieRapide,
    ETAT_INITIAL,
  );

  // Saisies locales (par produitId)
  const [achetes, setAchetes] = useState<Record<string, string>>({});
  const [stocksActuels, setStocksActuels] = useState<Record<string, string>>({});

  // Saisies caisse
  const [encaissements, setEncaissements] = useState("");
  const [decaissements, setDecaissements] = useState("");
  const [soldeCaisse, setSoldeCaisse] = useState("");

  const caisseVerrouillee = estCaisseVerrouillee(ficheCaisse);
  const caisseRemplie = useMemo(
    () =>
      !caisseVerrouillee &&
      [encaissements, decaissements, soldeCaisse].some(
        (v) => v.trim() !== "",
      ),
    [caisseVerrouillee, encaissements, decaissements, soldeCaisse],
  );

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

  const totalElementsRemplis = nbRemplies + (caisseRemplie ? 1 : 0);

  useEffect(() => {
    if (etat.ok) {
      toast.success(
        etat.erreur ??
          `${etat.nbTraitees ?? 0} saisie(s) transmise(s) pour validation.`,
      );
      setAchetes({});
      setStocksActuels({});
      setEncaissements("");
      setDecaissements("");
      setSoldeCaisse("");
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

        <CarteCaisse
          fiche={ficheCaisse}
          encaissements={encaissements}
          decaissements={decaissements}
          solde={soldeCaisse}
          onEncaissementsChange={setEncaissements}
          onDecaissementsChange={setDecaissements}
          onSoldeChange={setSoldeCaisse}
        />
      </div>

      {/* Barre d'action sticky en bas (mobile-friendly) */}
      <div className="sticky bottom-4 z-10 mt-6">
        <div className="rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur">
          <Button
            type="submit"
            size="lg"
            className="h-14 w-full text-base"
            disabled={enCours || totalElementsRemplis === 0}
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
                {totalElementsRemplis > 0
                  ? `(${libelleRecap(nbRemplies, caisseRemplie)})`
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

function libelleRecap(nbProduits: number, caisse: boolean): string {
  const parts: string[] = [];
  if (nbProduits > 0) {
    parts.push(`${nbProduits} produit${nbProduits > 1 ? "s" : ""}`);
  }
  if (caisse) parts.push("caisse");
  return parts.join(" + ");
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
          <CardTitle className="text-lg">{ligne.produit.nom}</CardTitle>
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

function estCaisseVerrouillee(fiche: FicheCaisse): boolean {
  return !!fiche && (fiche.statut === "SOUMIS" || fiche.statut === "VALIDE");
}

// ─── Sous-composant : carte caisse du jour ──────────────────────────────

function CarteCaisse({
  fiche,
  encaissements,
  decaissements,
  solde,
  onEncaissementsChange,
  onDecaissementsChange,
  onSoldeChange,
}: {
  fiche: FicheCaisse;
  encaissements: string;
  decaissements: string;
  solde: string;
  onEncaissementsChange: (v: string) => void;
  onDecaissementsChange: (v: string) => void;
  onSoldeChange: (v: string) => void;
}) {
  const verrouillee = estCaisseVerrouillee(fiche);

  return (
    <Card className={verrouillee ? "opacity-90" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Wallet className="size-5" />
            Caisse du jour
          </CardTitle>
          {verrouillee && <BadgeStatut statut={fiche!.statut} />}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {verrouillee ? (
          <ContenuCaisseVerrouille fiche={fiche!} />
        ) : (
          <>
            {fiche?.statut === "REJETE" && fiche.motifRejet && (
              <Alert>
                <AlertTriangle className="size-4" />
                <AlertTitle>Saisie caisse précédente rejetée</AlertTitle>
                <AlertDescription>
                  Motif&nbsp;: {fiche.motifRejet}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="caisse-encaissements">
                  Encaissements (FCFA)
                </Label>
                <Input
                  id="caisse-encaissements"
                  name="caisse.encaissementsFcfa"
                  type="number"
                  inputMode="numeric"
                  step="1"
                  min="0"
                  placeholder="0"
                  value={encaissements}
                  onChange={(e) => onEncaissementsChange(e.target.value)}
                  className="h-12 text-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="caisse-decaissements">
                  Décaissements (FCFA)
                </Label>
                <Input
                  id="caisse-decaissements"
                  name="caisse.decaissementsFcfa"
                  type="number"
                  inputMode="numeric"
                  step="1"
                  min="0"
                  placeholder="0"
                  value={decaissements}
                  onChange={(e) => onDecaissementsChange(e.target.value)}
                  className="h-12 text-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="caisse-solde">Solde en caisse (FCFA)</Label>
                <Input
                  id="caisse-solde"
                  name="caisse.soldeFcfa"
                  type="number"
                  inputMode="numeric"
                  step="1"
                  min="0"
                  placeholder="0"
                  value={solde}
                  onChange={(e) => onSoldeChange(e.target.value)}
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

function ContenuCaisseVerrouille({
  fiche,
}: {
  fiche: NonNullable<FicheCaisse>;
}) {
  return (
    <div className="grid grid-cols-3 gap-3 text-sm">
      <div>
        <p className="text-muted-foreground">Encaissements</p>
        <p className="font-medium">{formatFCFA(fiche.encaissementsFcfa)}</p>
      </div>
      <div>
        <p className="text-muted-foreground">Décaissements</p>
        <p className="font-medium">{formatFCFA(fiche.decaissementsFcfa)}</p>
      </div>
      <div>
        <p className="text-muted-foreground">Solde</p>
        <p className="font-medium">{formatFCFA(fiche.soldeFcfa)}</p>
      </div>
    </div>
  );
}
