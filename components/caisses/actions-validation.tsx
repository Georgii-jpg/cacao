"use client";
// Boutons "Valider" et "Rejeter" pour une fiche caisse en attente.
// Calqué sur le composant équivalent des stocks.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { rejeterCaisse, validerCaisse } from "@/lib/caisses/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type Props = {
  caisseId: string;
  /// Désactive les boutons côté UI si l'utilisateur courant est l'auteur
  /// de la saisie (un non-admin ne peut pas se valider lui-même).
  estAuteur?: boolean;
  estAdmin?: boolean;
  /// Mode compact (boutons icône uniquement, pour intégration dans un tableau)
  compact?: boolean;
};

export function ActionsValidationCaisse({
  caisseId,
  estAuteur,
  estAdmin,
  compact = false,
}: Props) {
  const router = useRouter();
  const [enValidation, startValidation] = useTransition();
  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [motif, setMotif] = useState("");
  const [enRejet, setEnRejet] = useState(false);
  const [erreurMotif, setErreurMotif] = useState<string | null>(null);

  const verrouille = estAuteur && !estAdmin;

  function valider() {
    startValidation(async () => {
      const res = await validerCaisse(caisseId);
      if (res.ok) {
        toast.success("Caisse validée.");
        router.refresh();
      } else {
        toast.error(res.erreur ?? "Échec de la validation.");
      }
    });
  }

  async function rejeter() {
    setErreurMotif(null);
    if (motif.trim().length < 5) {
      setErreurMotif("Indiquez un motif d'au moins 5 caractères");
      return;
    }
    setEnRejet(true);
    const res = await rejeterCaisse(caisseId, motif.trim());
    setEnRejet(false);
    if (res.ok) {
      toast.success("Caisse rejetée. L'auteur pourra corriger.");
      setDialogOuvert(false);
      setMotif("");
      router.refresh();
    } else {
      toast.error(res.erreur ?? "Échec du rejet.");
    }
  }

  if (verrouille) {
    return (
      <span className="text-xs text-muted-foreground italic">
        Saisie par vous
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1.5 justify-end">
      <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
        <DialogTrigger
          render={
            <Button
              variant="outline"
              size={compact ? "sm" : "default"}
              disabled={enValidation || enRejet}
              className="border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              <X className="h-4 w-4" />
              {!compact && "Rejeter"}
            </Button>
          }
        />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeter la fiche caisse</DialogTitle>
            <DialogDescription>
              L&apos;auteur sera informé du motif et pourra corriger puis
              resoumettre la fiche.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor={`motif-rejet-${caisseId}`}>Motif de rejet</Label>
            <Input
              id={`motif-rejet-${caisseId}`}
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="Ex : solde incohérent avec les recettes"
              maxLength={500}
              autoFocus
            />
            {erreurMotif && (
              <p className="text-xs text-destructive">{erreurMotif}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOuvert(false)}
              disabled={enRejet}
            >
              Annuler
            </Button>
            <Button variant="destructive" onClick={rejeter} disabled={enRejet}>
              {enRejet ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Rejet…
                </>
              ) : (
                <>
                  <X className="h-4 w-4" />
                  Confirmer le rejet
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Button
        onClick={valider}
        size={compact ? "sm" : "default"}
        disabled={enValidation || enRejet}
        className="bg-emerald-600 hover:bg-emerald-700 text-white"
      >
        {enValidation ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Check className="h-4 w-4" />
            {!compact && "Valider"}
          </>
        )}
      </Button>
    </div>
  );
}
