"use client";
// Actions sur un compte : réinitialiser le MDP (admin) + activer/désactiver.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, KeyRound, Loader2, Power, PowerOff } from "lucide-react";
import { toast } from "sonner";
import {
  basculerActifUtilisateur,
  reinitialiserMdp,
} from "@/lib/utilisateurs/actions";
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

type Props = {
  utilisateurId: string;
  email: string;
  actif: boolean;
  /// L'utilisateur connecté est-il en train d'éditer son propre compte ?
  estMoi?: boolean;
};

export function ActionsCompte({ utilisateurId, email, actif, estMoi }: Props) {
  const router = useRouter();
  const [enBascule, startBascule] = useTransition();
  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [nouveauMdp, setNouveauMdp] = useState("");
  const [voirMdp, setVoirMdp] = useState(false);
  const [enReset, setEnReset] = useState(false);
  const [erreurMdp, setErreurMdp] = useState<string | null>(null);

  function basculer() {
    startBascule(async () => {
      const res = await basculerActifUtilisateur(utilisateurId);
      if (res.ok) {
        toast.success(actif ? "Compte désactivé." : "Compte activé.");
        router.refresh();
      } else {
        toast.error(res.erreur ?? "Échec.");
      }
    });
  }

  async function reset() {
    setErreurMdp(null);
    setEnReset(true);
    const res = await reinitialiserMdp(utilisateurId, nouveauMdp);
    setEnReset(false);
    if (res.ok) {
      toast.success("Mot de passe réinitialisé.");
      setDialogOuvert(false);
      setNouveauMdp("");
      router.refresh();
    } else {
      setErreurMdp(res.erreursChamps?.motDePasse ?? res.erreur ?? "Échec.");
    }
  }

  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
        <DialogTrigger
          render={
            <Button variant="outline">
              <KeyRound className="h-4 w-4" />
              Réinitialiser le mot de passe
            </Button>
          }
        />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Réinitialiser le mot de passe</DialogTitle>
            <DialogDescription>
              Définissez un nouveau mot de passe pour <span className="font-mono">{email}</span>.
              Communiquez-le à l&apos;utilisateur via un canal sécurisé. Il pourra
              le changer ensuite depuis son profil.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="nouveau-mdp">Nouveau mot de passe</Label>
            <div className="relative">
              <Input
                id="nouveau-mdp"
                type={voirMdp ? "text" : "password"}
                value={nouveauMdp}
                onChange={(e) => setNouveauMdp(e.target.value)}
                minLength={8}
                autoFocus
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setVoirMdp((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {voirMdp ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {erreurMdp ? (
              <p className="text-xs text-destructive">{erreurMdp}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Min 8 caractères, avec majuscule, minuscule et chiffre.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOuvert(false)}
              disabled={enReset}
            >
              Annuler
            </Button>
            <Button onClick={reset} disabled={enReset || nouveauMdp.length < 8}>
              {enReset ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Application…
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4" />
                  Appliquer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {actif ? (
        <Button
          variant="destructive"
          onClick={basculer}
          disabled={enBascule || estMoi}
          title={estMoi ? "Vous ne pouvez pas désactiver votre propre compte" : undefined}
        >
          <PowerOff className="h-4 w-4" />
          Désactiver le compte
        </Button>
      ) : (
        <Button
          onClick={basculer}
          disabled={enBascule}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Power className="h-4 w-4" />
          Réactiver le compte
        </Button>
      )}
    </div>
  );
}
