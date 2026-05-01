// Création d'un nouveau compte (admin uniquement).
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { exigerPermission } from "@/lib/auth/require";
import {
  listerMagasinsPourSelect,
  listerRegionsPourSelect,
} from "@/lib/utilisateurs/queries";
import { Button } from "@/components/ui/button";
import { FormUtilisateur } from "@/components/utilisateurs/form-utilisateur";

export const metadata = { title: "Nouvel utilisateur" };

export default async function PageNouvelUtilisateur() {
  await exigerPermission("gererUtilisateurs");
  const [regions, magasins] = await Promise.all([
    listerRegionsPourSelect(),
    listerMagasinsPourSelect(),
  ]);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          render={<Link href="/utilisateurs" />}
          className="mb-2 -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à la liste
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          Nouveau compte utilisateur
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Définissez l&apos;identité, le rôle et le mot de passe initial.
        </p>
      </div>
      <FormUtilisateur regions={regions} magasins={magasins} />
    </div>
  );
}
