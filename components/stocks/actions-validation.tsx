"use client";
// Boutons "Valider" et "Rejeter" pour une fiche en attente. Le rejet
// ouvre une boîte de dialogue qui demande un motif.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { rejeterStock, validerStock } from "@/lib/stocks/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  stockId: string;
  /// Indique si l'utilisateur courant a saisi cette fiche (interdit de
  /// se valider soi-même sauf admin) — désactive les boutons côté UI.
  estAuteur?: boolean;
  estAdmin?: boolean;
};

export function ActionsValidation({ stockId, estAuteur, estAdmin }: Props) {
  const router = useRouter();
  const [enValidation, startValidation] = useTransition();
  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [motif, setMotif] = useState("");
  const [enRejet, setEnRejet] = useState(false);
  const [erreurMotif, setErreurMotif] = useState<string | null>(null);

  const verrouille = estAuteur && !estAdmin;

  function valider() {
    startValidation(async () => {
      const res = await validerStock(stockId);
      if (res.ok) {
        toast.success("Fiche validée.");
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
    const res = await rejeterStock(stockId, motif.trim());
    setEnRejet(false);
    if (res.ok) {
      toast.success("Fiche rejetée. L'auteur pourra la corriger.");
      setDialogOuvert(false);
      setMotif("");
      router.refresh();
    } else {
      toast.error(res.erreur ?? "Échec du rejet.");
    }
  }

  if (verrouille) {
    return (
      <Alert>
        <AlertTitle>Validation indisponible</AlertTitle>
        <AlertDescription>
          Vous avez saisi cette fiche : un autre utilisateur (responsable
          magasin, manager régional ou admin) doit la valider.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
        <DialogTrigger
          render={
            <Button variant="destructive" disabled={enValidation || enRejet}>
              <X className="h-4 w-4" />
              Rejeter
            </Button>
          }
        />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeter la fiche</DialogTitle>
            <DialogDescription>
              L&apos;auteur sera informé du motif et pourra corriger puis
              resoumettre la fiche.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="motif-rejet">Motif de rejet</Label>
            <Input
              id="motif-rejet"
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="Ex : entrées du jour incohérentes avec le BL"
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
        disabled={enValidation || enRejet}
        className="bg-emerald-600 hover:bg-emerald-700 text-white"
      >
        {enValidation ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Validation…
          </>
        ) : (
          <>
            <Check className="h-4 w-4" />
            Valider la fiche
          </>
        )}
      </Button>
    </div>
  );
}
