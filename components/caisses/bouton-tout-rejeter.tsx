"use client";
// Bouton "Tout rejeter" — déclenche rejeterToutesCaissesEnAttente() après
// confirmation et saisie d'un motif unique appliqué à toutes les fiches.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X, XCircle } from "lucide-react";
import { toast } from "sonner";
import { rejeterToutesCaissesEnAttente } from "@/lib/caisses/actions";
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
  nbEnAttente: number;
};

export function BoutonToutRejeter({ nbEnAttente }: Props) {
  const router = useRouter();
  const [enCours, startTransition] = useTransition();
  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [motif, setMotif] = useState("");
  const [erreurMotif, setErreurMotif] = useState<string | null>(null);

  if (nbEnAttente === 0) return null;

  function lancer() {
    setErreurMotif(null);
    if (motif.trim().length < 5) {
      setErreurMotif("Indiquez un motif d'au moins 5 caractères");
      return;
    }
    const motifNet = motif.trim();
    startTransition(async () => {
      const res = await rejeterToutesCaissesEnAttente(motifNet);
      if (res.ok) {
        const rejetees = res.nbValidees ?? 0;
        const ignorees = res.nbIgnorees ?? 0;
        if (rejetees === 0 && ignorees > 0) {
          toast.info(
            `Aucune fiche rejetée. ${ignorees} de vos saisies ne peuvent pas être rejetées par vous-même.`,
          );
        } else if (rejetees === 0) {
          toast.info("Plus aucune fiche en attente.");
        } else {
          const suffixe =
            ignorees > 0
              ? ` (${ignorees} ignorée${ignorees > 1 ? "s" : ""} — vos propres saisies)`
              : "";
          toast.success(
            `${rejetees} fiche${rejetees > 1 ? "s" : ""} rejetée${rejetees > 1 ? "s" : ""}${suffixe}.`,
          );
        }
        setDialogOuvert(false);
        setMotif("");
        router.refresh();
      } else {
        toast.error(res.erreur ?? "Échec du rejet en masse.");
      }
    });
  }

  return (
    <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            disabled={enCours}
            className="border-destructive/30 text-destructive hover:bg-destructive/10"
          >
            <XCircle className="h-4 w-4" />
            Tout rejeter ({nbEnAttente})
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rejeter toutes les fiches en attente ?</DialogTitle>
          <DialogDescription>
            {nbEnAttente} fiche{nbEnAttente > 1 ? "s" : ""} caisse
            {nbEnAttente > 1 ? "s" : ""} dans votre périmètre {nbEnAttente > 1 ? "passeront" : "passera"} en
            statut <strong>Rejeté</strong> avec le même motif. L&apos;auteur
            de chaque fiche pourra corriger puis resoumettre.
            <br />
            <br />
            Les fiches que vous avez vous-même saisies ne seront pas rejetées
            (sauf si vous êtes administrateur).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="motif-rejet-bulk">Motif appliqué à toutes les fiches</Label>
          <Input
            id="motif-rejet-bulk"
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            placeholder="Ex : à corriger — soldes incohérents pour la journée"
            maxLength={500}
            autoFocus
            disabled={enCours}
          />
          {erreurMotif && (
            <p className="text-xs text-destructive">{erreurMotif}</p>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setDialogOuvert(false)}
            disabled={enCours}
          >
            Annuler
          </Button>
          <Button variant="destructive" onClick={lancer} disabled={enCours}>
            {enCours ? (
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
  );
}
