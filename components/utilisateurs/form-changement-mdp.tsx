"use client";
// Formulaire de changement de mot de passe par l'utilisateur lui-même.
// Demande l'ancien MDP + nouveau + confirmation.
import { useActionState, useEffect, useState } from "react";
import { Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  changerMonMotDePasse,
  type EtatActionUtilisateur,
} from "@/lib/utilisateurs/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ETAT_INITIAL: EtatActionUtilisateur = { ok: false, erreur: null };

export function FormChangementMdp() {
  const [etat, action, enCours] = useActionState(changerMonMotDePasse, ETAT_INITIAL);
  const [voirMdp, setVoirMdp] = useState(false);

  useEffect(() => {
    if (etat.ok) {
      toast.success("Mot de passe modifié.");
      // Réinitialise le formulaire en rechargeant la page (re-render Server Component)
      const form = document.getElementById("form-mdp") as HTMLFormElement | null;
      form?.reset();
    }
  }, [etat.ok]);

  const erreurs = etat.erreursChamps ?? {};

  return (
    <form id="form-mdp" action={action} className="space-y-4">
      {etat.erreur && (
        <Alert variant="destructive">
          <AlertTitle>Modification impossible</AlertTitle>
          <AlertDescription>{etat.erreur}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="motDePasseActuel">Mot de passe actuel</Label>
        <Input
          id="motDePasseActuel"
          name="motDePasseActuel"
          type={voirMdp ? "text" : "password"}
          required
          autoComplete="current-password"
          aria-invalid={!!erreurs.motDePasseActuel}
        />
        {erreurs.motDePasseActuel && (
          <p className="text-xs text-destructive">{erreurs.motDePasseActuel}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="motDePasse">Nouveau mot de passe</Label>
        <div className="relative">
          <Input
            id="motDePasse"
            name="motDePasse"
            type={voirMdp ? "text" : "password"}
            required
            minLength={8}
            autoComplete="new-password"
            aria-invalid={!!erreurs.motDePasse}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setVoirMdp((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={voirMdp ? "Masquer" : "Afficher"}
          >
            {voirMdp ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {erreurs.motDePasse ? (
          <p className="text-xs text-destructive">{erreurs.motDePasse}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Min 8 caractères, avec majuscule, minuscule et chiffre.
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmation">Confirmer le nouveau mot de passe</Label>
        <Input
          id="confirmation"
          name="confirmation"
          type={voirMdp ? "text" : "password"}
          required
          autoComplete="new-password"
          aria-invalid={!!erreurs.confirmation}
        />
        {erreurs.confirmation && (
          <p className="text-xs text-destructive">{erreurs.confirmation}</p>
        )}
      </div>

      <Button type="submit" disabled={enCours} className="w-full">
        {enCours ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Mise à jour…
          </>
        ) : (
          <>
            <KeyRound className="h-4 w-4" />
            Changer le mot de passe
          </>
        )}
      </Button>
    </form>
  );
}
