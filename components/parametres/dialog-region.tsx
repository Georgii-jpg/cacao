"use client";
// Dialog création / édition d'une région.
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Save, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  enregistrerRegion,
  type EtatActionParametres,
} from "@/lib/parametres/actions";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ETAT_INITIAL: EtatActionParametres = { ok: false, erreur: null };

type Region = {
  id: string;
  code: string;
  nom: string;
  description: string | null;
};

export function DialogRegion({ region }: { region?: Region }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [etat, action, enCours] = useActionState(enregistrerRegion, ETAT_INITIAL);

  useEffect(() => {
    if (etat.ok) {
      toast.success(region ? "Région mise à jour." : "Région créée.");
      setOuvert(false);
      router.refresh();
    }
  }, [etat.ok, region, router]);

  const erreurs = etat.erreursChamps ?? {};

  return (
    <Dialog open={ouvert} onOpenChange={setOuvert}>
      <DialogTrigger
        render={
          region ? (
            <Button variant="ghost" size="sm">
              <Pencil className="h-4 w-4" />
              Modifier
            </Button>
          ) : (
            <Button>
              <Plus className="h-4 w-4" />
              Nouvelle région
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {region ? `Modifier ${region.nom}` : "Nouvelle région"}
          </DialogTitle>
          <DialogDescription>
            Les régions servent à grouper les magasins et délimiter le périmètre
            des managers régionaux.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4">
          {region && <input type="hidden" name="id" value={region.id} />}

          {etat.erreur && (
            <Alert variant="destructive">
              <AlertTitle>Action impossible</AlertTitle>
              <AlertDescription>{etat.erreur}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="code">
              Code<span className="text-destructive">*</span>
            </Label>
            <Input
              id="code"
              name="code"
              defaultValue={region?.code}
              placeholder="SUD-OUEST"
              required
              aria-invalid={!!erreurs.code}
            />
            {erreurs.code ? (
              <p className="text-xs text-destructive">{erreurs.code}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Identifiant court en majuscules (ex : SUD, CENTRE-OUEST).
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nom">
              Nom<span className="text-destructive">*</span>
            </Label>
            <Input
              id="nom"
              name="nom"
              defaultValue={region?.nom}
              placeholder="Sud-Ouest"
              required
              aria-invalid={!!erreurs.nom}
            />
            {erreurs.nom && (
              <p className="text-xs text-destructive">{erreurs.nom}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              name="description"
              defaultValue={region?.description ?? ""}
              placeholder="Région de San-Pédro et hinterland cacaoyer"
              aria-invalid={!!erreurs.description}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOuvert(false)}
              disabled={enCours}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={enCours}>
              {enCours ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enregistrement…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Enregistrer
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
