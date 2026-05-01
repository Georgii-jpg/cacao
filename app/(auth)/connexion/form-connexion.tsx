"use client";
// Formulaire de connexion — client component avec useActionState (React 19).
// Affiche les erreurs renvoyées par la server action `connecter`.
import { useActionState } from "react";
import { Loader2, LogIn } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { connecter, type EtatConnexion } from "@/lib/auth/actions";

const ETAT_INITIAL: EtatConnexion = { erreur: null };

export function FormConnexion({ retour }: { retour?: string }) {
  const [etat, action, enCours] = useActionState(connecter, ETAT_INITIAL);

  return (
    <Card className="w-full max-w-md border-accent/30 shadow-xl shadow-primary/5">
      <CardHeader className="space-y-2 text-center">
        <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-8 w-8"
            aria-hidden="true"
          >
            <ellipse cx="12" cy="12" rx="6" ry="9" />
            <path d="M12 3 v18" />
          </svg>
        </div>
        <CardTitle className="text-2xl text-primary">SOCOPAD</CardTitle>
        <CardDescription>Connectez-vous pour accéder à la plateforme</CardDescription>
      </CardHeader>
      <form action={action}>
        <CardContent className="space-y-4">
          {etat.erreur && (
            <Alert variant="destructive">
              <AlertTitle>Connexion impossible</AlertTitle>
              <AlertDescription>{etat.erreur}</AlertDescription>
            </Alert>
          )}
          <input type="hidden" name="retour" value={retour ?? ""} />
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="admin@socopad.ci"
              disabled={enCours}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              disabled={enCours}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 mt-2">
          <Button type="submit" className="w-full" disabled={enCours} size="lg">
            {enCours ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Connexion en cours…
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                Se connecter
              </>
            )}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Comptes de test seedés :{" "}
            <code className="font-mono">admin@socopad.ci</code> /{" "}
            <code className="font-mono">Admin#2026</code>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
