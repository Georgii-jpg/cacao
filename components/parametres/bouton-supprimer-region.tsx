"use client";
// Bouton de suppression d'une région avec confirmation.
// Refusé serveur si des magasins y sont rattachés.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supprimerRegion } from "@/lib/parametres/actions";
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
  regionId: string;
  nom: string;
  nbMagasins: number;
};

export function BoutonSupprimerRegion({ regionId, nom, nbMagasins }: Props) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [enCours, startTransition] = useTransition();
  const desactive = nbMagasins > 0;

  function confirmer() {
    startTransition(async () => {
      const res = await supprimerRegion(regionId);
      if (res.ok) {
        toast.success(`Région « ${nom} » supprimée.`);
        setOuvert(false);
        router.refresh();
      } else {
        toast.error(res.erreur ?? "Échec.");
      }
    });
  }

  return (
    <Dialog open={ouvert} onOpenChange={setOuvert}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            disabled={desactive}
            title={
              desactive
                ? `Impossible : ${nbMagasins} magasin(s) rattaché(s)`
                : undefined
            }
          >
            <Trash2 className="h-4 w-4" />
            Supprimer
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Supprimer « {nom} » ?</DialogTitle>
          <DialogDescription>
            Cette action est irréversible. La région sera définitivement
            supprimée.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOuvert(false)}
            disabled={enCours}
          >
            Annuler
          </Button>
          <Button variant="destructive" onClick={confirmer} disabled={enCours}>
            {enCours ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Suppression…
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Confirmer la suppression
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
