// Profil utilisateur — accessible à tous les rôles connectés.
// Affiche les infos du compte et permet de changer son propre mot de passe.
import { User, Mail, Phone, Building2, Calendar } from "lucide-react";
import { exigerAuth } from "@/lib/auth/require";
import { prisma } from "@/lib/db/prisma";
import { LIBELLE_ROLE } from "@/lib/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FormChangementMdp } from "@/components/utilisateurs/form-changement-mdp";
import { formatDateHeure } from "@/lib/utils/format";

export const metadata = { title: "Mon profil" };
export const dynamic = "force-dynamic";

export default async function PageProfil() {
  const session = await exigerAuth();
  const utilisateur = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      nom: true,
      prenom: true,
      telephone: true,
      role: true,
      derniereConnexion: true,
      createdAt: true,
      magasin: { select: { id: true, code: true, nom: true } },
    },
  });
  if (!utilisateur) {
    return null;
  }
  const nomComplet =
    [utilisateur.prenom, utilisateur.nom].filter(Boolean).join(" ").trim() ||
    utilisateur.email;

  return (
    <div className="max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-primary flex items-center gap-2">
          <User className="h-6 w-6" />
          Mon profil
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Vos informations personnelles et le changement de mot de passe.
        </p>
      </header>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{nomComplet}</CardTitle>
            <Badge variant="secondary">{LIBELLE_ROLE[utilisateur.role]}</Badge>
          </div>
          <CardDescription>
            Pour modifier vos informations personnelles, contactez votre
            administrateur.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
          <Ligne icone={<Mail className="h-4 w-4" />} libelle="Email">
            {utilisateur.email}
          </Ligne>
          {utilisateur.telephone && (
            <Ligne icone={<Phone className="h-4 w-4" />} libelle="Téléphone">
              {utilisateur.telephone}
            </Ligne>
          )}
          {utilisateur.magasin && (
            <Ligne icone={<Building2 className="h-4 w-4" />} libelle="Magasin">
              {utilisateur.magasin.nom}
              <span className="text-xs font-mono text-muted-foreground">
                {" "}
                · {utilisateur.magasin.code}
              </span>
            </Ligne>
          )}
          <Ligne icone={<Calendar className="h-4 w-4" />} libelle="Compte créé le">
            {formatDateHeure(utilisateur.createdAt)}
          </Ligne>
          <Ligne icone={<Calendar className="h-4 w-4" />} libelle="Dernière connexion">
            {utilisateur.derniereConnexion ? (
              formatDateHeure(utilisateur.derniereConnexion)
            ) : (
              <span className="italic text-muted-foreground">À votre première connexion</span>
            )}
          </Ligne>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Changer mon mot de passe</CardTitle>
          <CardDescription>
            Pour des raisons de sécurité, vous devez saisir votre mot de passe
            actuel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormChangementMdp />
        </CardContent>
      </Card>
    </div>
  );
}

function Ligne({
  icone,
  libelle,
  children,
}: {
  icone: React.ReactNode;
  libelle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 text-muted-foreground">{icone}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {libelle}
        </p>
        <p className="text-sm">{children}</p>
      </div>
    </div>
  );
}
