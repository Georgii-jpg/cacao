"use client";
// Bouton "Tout valider" — déclenche validerToutesCaissesEnAttente() après
// confirmation. Affiché dans la file d'attente de /suivi-caisse.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, CheckCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { validerToutesCaissesEnAttente } from "@/lib/caisses/actions";
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

type Props = {
  /// Nombre de fiches en attente affiché dans le bouton (information)
  nbEnAttente: number;
};

export function BoutonToutValider({ nbEnAttente }: Props) {
  const router = useRouter();
  const [enCours, startTransition] = useTransition();
  const [dialogOuvert, setDialogOuvert] = useState(false);

  if (nbEnAttente === 0) return null;

  function lancer() {
    startTransition(async () => {
      const res = await validerToutesCaissesEnAttente();
      if (res.ok) {
        const validees = res.nbValidees ?? 0;
        const ignorees = res.nbIgnorees ?? 0;
        if (validees === 0 && ignorees > 0) {
          toast.info(
            `Aucune fiche validée. ${ignorees} de vos saisies ne peuvent pas être validées par vous-même.`,
          );
        } else if (validees === 0) {
          toast.info("Plus aucune fiche en attente.");
        } else {
          const suffixe =
            ignorees > 0
              ? ` (${ignorees} ignorée${ignorees > 1 ? "s" : ""} — vos propres saisies)`
              : "";
          toast.success(
            `${validees} fiche${validees > 1 ? "s" : ""} validée${validees > 1 ? "s" : ""}${suffixe}.`,
          );
        }
        setDialogOuvert(false);
        router.refresh();
      } else {
        toast.error(res.erreur ?? "Échec de la validation en masse.");
      }
    });
  }

  return (
    <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
      <DialogTrigger
        render={
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={enCours}
          >
            <CheckCheck className="h-4 w-4" />
            Tout valider ({nbEnAttente})
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Valider toutes les fiches en attente ?</DialogTitle>
          <DialogDescription>
            {nbEnAttente} fiche{nbEnAttente > 1 ? "s" : ""} caisse
            {nbEnAttente > 1 ? "s" : ""} dans votre périmètre {nbEnAttente > 1 ? "passeront" : "passera"} en
            statut <strong>Validé</strong>. Action irréversible (sauf à
            rejeter individuellement chaque fiche ensuite).
            <br />
            <br />
            Les fiches que vous avez vous-même saisies ne seront pas validées
            (sauf si vous êtes administrateur) et resteront en attente.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setDialogOuvert(false)}
            disabled={enCours}
          >
            Annuler
          </Button>
          <Button
            onClick={lancer}
            disabled={enCours}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {enCours ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Validation…
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Confirmer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
