// Édition d'un utilisateur existant + actions sur le compte.
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone, Building2 } from "lucide-react";
import { exigerPermission } from "@/lib/auth/require";
import {
  getUtilisateur,
  listerMagasinsPourSelect,
  listerRegionsPourSelect,
} from "@/lib/utilisateurs/queries";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormUtilisateur } from "@/components/utilisateurs/form-utilisateur";
import { ActionsCompte } from "@/components/utilisateurs/actions-compte";
import { LIBELLE_ROLE } from "@/lib/navigation";
import { formatDateHeure } from "@/lib/utils/format";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const u = await getUtilisateur(id);
  return { title: u ? `${u.prenom ?? ""} ${u.nom}`.trim() || u.email : "Utilisateur" };
}

export default async function PageDetailUtilisateur({ params }: Props) {
  const session = await exigerPermission("gererUtilisateurs");
  const { id } = await params;
  const u = await getUtilisateur(id);
  if (!u) notFound();

  const [regions, magasins] = await Promise.all([
    listerRegionsPourSelect(),
    listerMagasinsPourSelect(),
  ]);
  const nomComplet =
    [u.prenom, u.nom].filter(Boolean).join(" ").trim() || u.email;

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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-primary">
                {nomComplet}
              </h1>
              <Badge variant="secondary">{LIBELLE_ROLE[u.role]}</Badge>
              {!u.actif && <Badge variant="outline">Désactivé</Badge>}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                {u.email}
              </span>
              {u.telephone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  {u.telephone}
                </span>
              )}
              {u.magasin && (
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" />
                  {u.magasin.nom}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activité</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Création du compte
            </p>
            <p>{formatDateHeure(u.createdAt)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Dernière connexion
            </p>
            <p>
              {u.derniereConnexion ? (
                formatDateHeure(u.derniereConnexion)
              ) : (
                <span className="italic text-muted-foreground">Jamais</span>
              )}
            </p>
          </div>
          {u.magasinResponsable && (
            <div className="sm:col-span-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Responsable du magasin
              </p>
              <Link
                href={`/magasins/${u.magasinResponsable.id}`}
                className="text-sm text-primary hover:underline"
              >
                {u.magasinResponsable.nom}
                <span className="font-mono text-xs text-muted-foreground">
                  {" "}
                  · {u.magasinResponsable.code}
                </span>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      <FormUtilisateur
        regions={regions}
        magasins={magasins}
        utilisateur={{
          id: u.id,
          email: u.email,
          nom: u.nom,
          prenom: u.prenom,
          telephone: u.telephone,
          role: u.role,
          actif: u.actif,
          regionId: u.regionId,
          magasinId: u.magasinId,
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>Actions sur le compte</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionsCompte
            utilisateurId={u.id}
            email={u.email}
            actif={u.actif}
            estMoi={u.id === session.user.id}
          />
        </CardContent>
      </Card>
    </div>
  );
}
