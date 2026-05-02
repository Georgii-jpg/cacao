// Tableau de bord centralisé — KPIs, graphiques et alertes adaptés au rôle.
import Link from "next/link";
import {
  Building2,
  Package,
  CheckCircle2,
  AlertTriangle,
  ClipboardCheck,
} from "lucide-react";
import { exigerAuth } from "@/lib/auth/require";
import type { RoleApp } from "@/lib/auth/permissions";
import { LIBELLE_ROLE } from "@/lib/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getDernieresFichesRejetees,
  getEvolutionStock,
  getKpisReseau,
  getMagasinsSansSaisieAujourdhui,
  getRepartitionParProduit,
  getTauxRemontee,
} from "@/lib/dashboard/queries";
import { ChartEvolutionStock } from "@/components/dashboard/chart-evolution-stock";
import { ChartRepartitionProduits } from "@/components/dashboard/chart-repartition-produits";
import { ChartRemontee } from "@/components/dashboard/chart-remontee";
import {
  CarteFichesRejetees,
  CarteMagasinsSansSaisie,
} from "@/components/dashboard/liste-alertes";
import { formatPoidsKg, formatPourcent } from "@/lib/utils/format";

export const metadata = { title: "Tableau de bord" };
export const dynamic = "force-dynamic";

export default async function PageDashboard() {
  const session = await exigerAuth();
  const role = session.user.role as RoleApp | undefined;
  const prenom = session.user.name?.split(" ")[0] ?? "";

  const ctx = {
    role,
    magasinId: session.user.magasinId,
    regionId: session.user.regionId,
  };

  // Tous les calculs en parallèle pour minimiser le temps de rendu serveur
  const [kpis, evolution, repartition, remontees, magasinsRetard, fichesRejetees] =
    await Promise.all([
      getKpisReseau(ctx, session.user.id),
      getEvolutionStock(ctx, 30),
      getRepartitionParProduit(ctx),
      getTauxRemontee(ctx, 7),
      getMagasinsSansSaisieAujourdhui(ctx),
      getDernieresFichesRejetees(ctx, 5),
    ]);

  const tauxRemontee =
    kpis.magasinsActifs > 0
      ? kpis.remonteesAujourdhui / kpis.magasinsActifs
      : 0;

  const titreRemontee = role === "ADMIN" ? "Remontées par région (7 j)" : "Remontées par magasin (7 j)";
  const descRemontee =
    role === "ADMIN"
      ? "Pourcentage de jours saisis par magasin, agrégé sur la région."
      : "Jours saisis sur les 7 derniers jours, par magasin de votre périmètre.";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-primary">
          Bonjour {prenom}
        </h1>
        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
          Connecté en tant que
          {role && <Badge variant="secondary">{LIBELLE_ROLE[role]}</Badge>}
        </p>
      </header>

      {/* KPIs principaux ─────────────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KpiCard
          libelle="Magasins actifs"
          valeur={`${kpis.magasinsActifs}`}
          sousTexte={`sur ${kpis.magasinsTotal} au total`}
          icone={<Building2 className="h-4 w-4 text-muted-foreground" />}
        />
        <KpiCard
          libelle="Stock total réseau"
          valeur={formatPoidsKg(kpis.stockTotalKg)}
          sousTexte="dernières clôtures validées"
          icone={<Package className="h-4 w-4 text-muted-foreground" />}
        />
        <KpiCard
          libelle="Remontées du jour"
          valeur={`${kpis.remonteesAujourdhui} / ${kpis.magasinsActifs}`}
          sousTexte={
            kpis.magasinsActifs > 0
              ? `${formatPourcent(tauxRemontee, 0)} des magasins`
              : "—"
          }
          icone={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          ton={
            tauxRemontee >= 0.8
              ? "emerald"
              : tauxRemontee >= 0.5
                ? "amber"
                : "destructive"
          }
        />
        <KpiCard
          libelle="Alertes ouvertes"
          valeur={`${kpis.fichesAValider + kpis.fichesRejetees}`}
          sousTexte={`${kpis.fichesAValider} à valider · ${kpis.fichesRejetees} rejetées`}
          icone={<AlertTriangle className="h-4 w-4 text-amber-600" />}
          ton={kpis.fichesAValider + kpis.fichesRejetees > 0 ? "amber" : "default"}
        />
      </div>

      {/* Lien vers la file de validation si fiches en attente ───── */}
      {kpis.fichesAValider > 0 && (
        <Card className="border-amber-500/40 bg-amber-50/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardCheck className="h-5 w-5 text-amber-700" />
                {kpis.fichesAValider} fiche
                {kpis.fichesAValider > 1 ? "s" : ""} en attente de validation
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Traitez la file pour libérer les opérateurs.
              </p>
            </div>
            <Button render={<Link href="/stocks/validation" />} variant="outline" size="sm">
              Ouvrir la file
            </Button>
          </CardHeader>
        </Card>
      )}

      {/* Graphiques ──────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        <ChartEvolutionStock data={evolution} />
        <ChartRepartitionProduits data={repartition} />
      </div>

      <ChartRemontee data={remontees} titre={titreRemontee} description={descRemontee} />

      {/* Alertes opérationnelles ─────────────────────────────────── */}
      <div className="grid gap-6 md:grid-cols-2">
        <CarteMagasinsSansSaisie magasins={magasinsRetard} />
        <CarteFichesRejetees fiches={fichesRejetees} />
      </div>
    </div>
  );
}

function KpiCard({
  libelle,
  valeur,
  sousTexte,
  icone,
  ton = "default",
}: {
  libelle: string;
  valeur: string;
  sousTexte?: string;
  icone?: React.ReactNode;
  ton?: "default" | "emerald" | "amber" | "destructive";
}) {
  const styles: Record<typeof ton, string> = {
    default: "text-primary",
    emerald: "text-emerald-700",
    amber: "text-amber-700",
    destructive: "text-destructive",
  };
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {libelle}
        </CardTitle>
        {icone}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold tabular-nums ${styles[ton]}`}>
          {valeur}
        </div>
        {sousTexte && (
          <p className="text-xs text-muted-foreground">{sousTexte}</p>
        )}
      </CardContent>
    </Card>
  );
}
