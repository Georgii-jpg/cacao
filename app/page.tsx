// Page d'accueil publique — redirige les utilisateurs connectés vers le dashboard.
// Pour le moment (Itération 1), c'est une simple landing page placeholder.
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function PageAccueil() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 sm:p-12 bg-gradient-to-br from-background via-secondary to-background">
      <div className="w-full max-w-2xl text-center space-y-8">
        {/* Logo placeholder — fève de cacao stylisée */}
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-12 w-12"
            aria-hidden="true"
          >
            {/* Fève de cacao stylisée */}
            <ellipse cx="12" cy="12" rx="6" ry="9" />
            <path d="M12 3 v18" />
          </svg>
        </div>

        <div className="space-y-3">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-primary">
            SOCOPAD
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground">
            Plateforme de gestion opérationnelle du réseau cacao
          </p>
        </div>

        <Card className="text-left border-accent/30 shadow-xl shadow-primary/5">
          <CardHeader>
            <CardTitle className="text-primary">Bienvenue</CardTitle>
            <CardDescription>
              Centralisation des stocks, pilotage des 25 points de vente et
              suivi de la qualité — en un seul endroit.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/connexion"
              className={cn(buttonVariants({ size: "lg" }), "flex-1")}
            >
              Se connecter
            </Link>
            <Link
              href="/dashboard"
              className={cn(buttonVariants({ size: "lg", variant: "outline" }), "flex-1")}
            >
              Accéder au tableau de bord
            </Link>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          Application interne SOCOPAD · Côte d&apos;Ivoire · {new Date().getFullYear()}
        </p>
      </div>
    </main>
  );
}
