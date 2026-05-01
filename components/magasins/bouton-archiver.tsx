"use client";
// Bouton "Archiver" qui ouvre une boîte de dialogue de confirmation
// avant d'appeler la Server Action correspondante. L'archivage est
// un soft-delete (passe le magasin en INACTIF) — voir actions.ts.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { archiverMagasin } from "@/lib/magasins/actions";
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
  magasinId: string;
  nomMagasin: string;
  /// Désactivé si déjà INACTIF
  desactive?: boolean;
};

export function BoutonArchiverMagasin({ magasinId, nomMagasin, desactive }: Props) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [enCours, startTransition] = useTransition();

  function confirmer() {
    startTransition(async () => {
      const res = await archiverMagasin(magasinId);
      if (res.ok) {
        toast.success(`Magasin « ${nomMagasin} » archivé.`);
        setOuvert(false);
        router.refresh();
      } else {
        toast.error(res.erreur ?? "Échec de l'archivage.");
      }
    });
  }

  return (
    <Dialog open={ouvert} onOpenChange={setOuvert}>
      <DialogTrigger
        render={
          <Button variant="destructive" size="sm" disabled={desactive}>
            <Archive className="h-4 w-4" />
            Archiver
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Archiver « {nomMagasin} » ?</DialogTitle>
          <DialogDescription>
            Le magasin sera marqué comme inactif. Son historique de stocks et
            ses données restent consultables dans les rapports, mais il ne sera
            plus disponible pour la saisie.
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
                Archivage…
              </>
            ) : (
              <>
                <Archive className="h-4 w-4" />
                Confirmer l&apos;archivage
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
