// Fiche détail d'un magasin — server component.
// Affiche infos, KPIs 30 jours, équipe, et boutons d'action (admin).
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  MapPin,
  Phone,
  Building2,
  Users,
  Package,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { exigerAuth } from "@/lib/auth/require";
import { permissions, type RoleApp } from "@/lib/auth/permissions";
import { getKpisMagasin, getMagasin } from "@/lib/magasins/queries";
import { BadgeStatutMagasin } from "@/components/magasins/badge-statut";
import { BoutonArchiverMagasin } from "@/components/magasins/bouton-archiver";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LIBELLE_ROLE } from "@/lib/navigation";
import { formatPoidsKg, formatPourcent, formatDate } from "@/lib/utils/format";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const session = await exigerAuth();
  const role = session.user.role as RoleApp | undefined;
  const magasin = await getMagasin(
    {
      role,
      magasinId: session.user.magasinId,
      regionId: session.user.regionId,
    },
    id,
  );
  return { title: magasin?.nom ?? "Magasin" };
}

export default async function PageDetailMagasin({ params }: Props) {
  const { id } = await params;
  const session = await exigerAuth();
  const role = session.user.role as RoleApp | undefined;

  const magasin = await getMagasin(
    {
      role,
      magasinId: session.user.magasinId,
      regionId: session.user.regionId,
    },
    id,
  );
  if (!magasin) notFound();

  const kpis = await getKpisMagasin(magasin.id, 30);
  const peutGerer = permissions.gererMagasins(role);

  const nomResp = magasin.responsable
    ? [magasin.responsable.prenom, magasin.responsable.nom]
        .filter(Boolean)
        .join(" ")
        .trim() || magasin.responsable.email
    : null;

  return (
    <div className="space-y-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          render={<Link href="/magasins" />}
          className="mb-2 -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Tous les magasins
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-primary">
                {magasin.nom}
              </h1>
              <BadgeStatutMagasin statut={magasin.statut} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground font-mono">
              {magasin.code} · {magasin.region.nom}
            </p>
          </div>
          {peutGerer && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                render={<Link href={`/magasins/${magasin.id}/modifier`} />}
              >
                <Pencil className="h-4 w-4" />
                Modifier
              </Button>
              <BoutonArchiverMagasin
                magasinId={magasin.id}
                nomMagasin={magasin.nom}
                desactive={magasin.statut === "INACTIF"}
              />
            </div>
          )}
        </div>
      </div>

      {/* KPIs sur 30 j ─────────────────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Carte
          titre="Capacité"
          valeur={formatPoidsKg(magasin.capaciteKg)}
          icone={<Package className="h-4 w-4 text-muted-foreground" />}
          sousTexte="stockage maximal"
        />
        <Carte
          titre="Taux de remontée 30 j"
          valeur={formatPourcent(kpis.tauxRemontee, 0)}
          icone={<CheckCircle2 className="h-4 w-4 text-muted-foreground" />}
          sousTexte={`${kpis.joursAvecSaisie} / ${kpis.periodeJours} jours saisis`}
        />
        <Carte
          titre="Entrées 30 j"
          valeur={formatPoidsKg(kpis.totalEntreesKg)}
          icone={<TrendingUp className="h-4 w-4 text-emerald-600" />}
        />
        <Carte
          titre="Sorties 30 j"
          valeur={formatPoidsKg(kpis.totalSortiesKg)}
          icone={<TrendingDown className="h-4 w-4 text-amber-600" />}
        />
      </div>

      {kpis.enAttenteValidation > 0 && (
        <Card className="border-amber-500/40 bg-amber-50/40">
          <CardHeader className="flex flex-row items-center gap-3 space-y-0">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <div>
              <CardTitle className="text-base">
                {kpis.enAttenteValidation} fiche
                {kpis.enAttenteValidation > 1 ? "s" : ""} en attente de
                validation
              </CardTitle>
              <CardDescription>
                Saisie soumise sur les 30 derniers jours, à valider par un
                responsable.
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Colonne gauche : infos générales ────────────────────────── */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Informations générales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Ligne icone={<MapPin className="h-4 w-4" />} libelle="Adresse">
              {magasin.adresse ? (
                <>
                  {magasin.adresse}
                  <span className="text-muted-foreground"> · {magasin.ville}</span>
                </>
              ) : (
                magasin.ville
              )}
            </Ligne>
            <Ligne icone={<Building2 className="h-4 w-4" />} libelle="Région">
              {magasin.region.nom}
              <span className="font-mono text-xs text-muted-foreground">
                {" "}
                · {magasin.region.code}
              </span>
            </Ligne>
            {magasin.telephone && (
              <Ligne icone={<Phone className="h-4 w-4" />} libelle="Téléphone">
                {magasin.telephone}
              </Ligne>
            )}
            {magasin.latitude !== null && magasin.longitude !== null && (
              <Ligne icone={<MapPin className="h-4 w-4" />} libelle="Coordonnées">
                <span className="font-mono text-xs">
                  {magasin.latitude.toFixed(4)}, {magasin.longitude.toFixed(4)}
                </span>
              </Ligne>
            )}
            {kpis.dernierStockValide && (
              <Ligne
                icone={<Package className="h-4 w-4" />}
                libelle="Dernier stock validé"
              >
                {formatPoidsKg(kpis.dernierStockValide.stockClotureKg)}
                <span className="text-muted-foreground">
                  {" "}
                  · {kpis.dernierStockValide.produit.nom}
                </span>
                <span className="text-xs text-muted-foreground">
                  {" "}
                  · {formatDate(kpis.dernierStockValide.date)}
                </span>
              </Ligne>
            )}
          </CardContent>
        </Card>

        {/* Colonne droite : équipe ────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Équipe
            </CardTitle>
            <CardDescription>
              {magasin.utilisateurs.length} membre
              {magasin.utilisateurs.length > 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {nomResp ? (
              <div className="rounded-md border bg-accent/10 p-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Responsable
                </p>
                <p className="font-medium">{nomResp}</p>
                <p className="text-xs text-muted-foreground">
                  {magasin.responsable!.email}
                </p>
              </div>
            ) : (
              <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                Responsable à pourvoir
              </div>
            )}
            {magasin.utilisateurs.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                Aucun opérateur affecté.
              </p>
            ) : (
              <ul className="space-y-2">
                {magasin.utilisateurs
                  .filter((u) => u.id !== magasin.responsable?.id)
                  .map((u) => {
                    const nom =
                      [u.prenom, u.nom].filter(Boolean).join(" ").trim() ||
                      u.email;
                    return (
                      <li
                        key={u.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <div>
                          <p>{nom}</p>
                          <p className="text-xs text-muted-foreground">
                            {u.email}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {LIBELLE_ROLE[u.role]}
                        </Badge>
                      </li>
                    );
                  })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Sous-composants locaux ─────────────────────────────────────────────

function Carte({
  titre,
  valeur,
  sousTexte,
  icone,
}: {
  titre: string;
  valeur: string;
  sousTexte?: string;
  icone?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {titre}
        </CardTitle>
        {icone}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-primary">{valeur}</div>
        {sousTexte && (
          <p className="text-xs text-muted-foreground">{sousTexte}</p>
        )}
      </CardContent>
    </Card>
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
