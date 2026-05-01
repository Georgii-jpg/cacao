// Accueil du module Paramètres — réservé ADMIN.
// Liste les sous-sections gérables : régions et catalogue produits.
import Link from "next/link";
import { Settings, MapPin, Package, ChevronRight } from "lucide-react";
import { exigerPermission } from "@/lib/auth/require";
import { prisma } from "@/lib/db/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Paramètres" };
export const dynamic = "force-dynamic";

export default async function PageAccueilParametres() {
  await exigerPermission("modifierParametres");

  const [nbRegions, nbProduits, nbProduitsActifs] = await Promise.all([
    prisma.region.count(),
    prisma.produit.count(),
    prisma.produit.count({ where: { actif: true } }),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-primary flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Paramètres
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Données de référence du système : régions et catalogue produits.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <CarteSection
          href="/parametres/regions"
          icone={<MapPin className="h-5 w-5" />}
          titre="Régions"
          description="Zones administratives qui regroupent les magasins. Définit le périmètre des managers régionaux."
          compteur={`${nbRegions} région${nbRegions > 1 ? "s" : ""}`}
        />
        <CarteSection
          href="/parametres/produits"
          icone={<Package className="h-5 w-5" />}
          titre="Catalogue produits"
          description="Variantes de cacao gérées (type × grade × origine). Activer ou désactiver pour la saisie."
          compteur={
            <>
              <Badge variant="secondary">{nbProduitsActifs} actifs</Badge>
              {nbProduits - nbProduitsActifs > 0 && (
                <span className="text-xs text-muted-foreground ml-2">
                  · {nbProduits - nbProduitsActifs} désactivé
                  {nbProduits - nbProduitsActifs > 1 ? "s" : ""}
                </span>
              )}
            </>
          }
        />
      </div>
    </div>
  );
}

function CarteSection({
  href,
  icone,
  titre,
  description,
  compteur,
}: {
  href: string;
  icone: React.ReactNode;
  titre: string;
  description: string;
  compteur: React.ReactNode;
}) {
  return (
    <Card>
      <Link
        href={href}
        className="block hover:bg-muted/40 transition-colors rounded-xl"
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              {icone}
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
          <CardTitle className="mt-2">{titre}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm">{compteur}</div>
        </CardContent>
      </Link>
    </Card>
  );
}
