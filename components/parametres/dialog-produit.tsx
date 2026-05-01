"use client";
// Dialog création / édition d'un produit catalogue.
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Save, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  enregistrerProduit,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GradeProduit, TypeProduit } from "@/app/generated/prisma/enums";

const ETAT_INITIAL: EtatActionParametres = { ok: false, erreur: null };

const LIBELLE_TYPE: Record<TypeProduit, string> = {
  FEVES_BRUTES: "Fèves brutes",
  FEVES_FERMENTEES: "Fèves fermentées",
  FEVES_SECHEES: "Fèves séchées",
};

const LIBELLE_GRADE: Record<GradeProduit, string> = {
  GRADE_1: "Grade 1",
  GRADE_2: "Grade 2",
  HORS_STANDARD: "Hors standard",
};

type Produit = {
  id: string;
  code: string;
  nom: string;
  description: string | null;
  type: TypeProduit;
  grade: GradeProduit;
  origine: string | null;
  actif: boolean;
};

export function DialogProduit({ produit }: { produit?: Produit }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [etat, action, enCours] = useActionState(
    enregistrerProduit,
    ETAT_INITIAL,
  );

  useEffect(() => {
    if (etat.ok) {
      toast.success(produit ? "Produit mis à jour." : "Produit créé.");
      setOuvert(false);
      router.refresh();
    }
  }, [etat.ok, produit, router]);

  const erreurs = etat.erreursChamps ?? {};

  return (
    <Dialog open={ouvert} onOpenChange={setOuvert}>
      <DialogTrigger
        render={
          produit ? (
            <Button variant="ghost" size="sm">
              <Pencil className="h-4 w-4" />
              Modifier
            </Button>
          ) : (
            <Button>
              <Plus className="h-4 w-4" />
              Nouveau produit
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {produit ? `Modifier ${produit.nom}` : "Nouveau produit"}
          </DialogTitle>
          <DialogDescription>
            Le catalogue produit est utilisé dans la saisie de stock. Désactiver
            un produit le retire des choix sans toucher à l&apos;historique.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4">
          {produit && <input type="hidden" name="id" value={produit.id} />}

          {etat.erreur && (
            <Alert variant="destructive">
              <AlertTitle>Action impossible</AlertTitle>
              <AlertDescription>{etat.erreur}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="code">
                Code<span className="text-destructive">*</span>
              </Label>
              <Input
                id="code"
                name="code"
                defaultValue={produit?.code}
                placeholder="FS-G1-CI"
                required
                aria-invalid={!!erreurs.code}
              />
              {erreurs.code && (
                <p className="text-xs text-destructive">{erreurs.code}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="actif">Statut</Label>
              <Select
                name="actif"
                defaultValue={produit?.actif === false ? "false" : "true"}
              >
                <SelectTrigger id="actif" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Actif</SelectItem>
                  <SelectItem value="false">Désactivé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="nom">
                Nom<span className="text-destructive">*</span>
              </Label>
              <Input
                id="nom"
                name="nom"
                defaultValue={produit?.nom}
                placeholder="Fèves séchées Grade 1 Côte d'Ivoire"
                required
                aria-invalid={!!erreurs.nom}
              />
              {erreurs.nom && (
                <p className="text-xs text-destructive">{erreurs.nom}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="type">
                Type<span className="text-destructive">*</span>
              </Label>
              <Select
                name="type"
                defaultValue={produit?.type ?? TypeProduit.FEVES_SECHEES}
              >
                <SelectTrigger id="type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LIBELLE_TYPE).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="grade">
                Grade<span className="text-destructive">*</span>
              </Label>
              <Select
                name="grade"
                defaultValue={produit?.grade ?? GradeProduit.GRADE_1}
              >
                <SelectTrigger id="grade" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LIBELLE_GRADE).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="origine">Origine</Label>
              <Input
                id="origine"
                name="origine"
                defaultValue={produit?.origine ?? ""}
                placeholder="Coopératives CI / Producteurs divers / …"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                name="description"
                defaultValue={produit?.description ?? ""}
                placeholder="Notes libres : marché cible, conditionnement…"
              />
            </div>
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
