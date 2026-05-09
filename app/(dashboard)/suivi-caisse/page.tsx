// Vue synthétique des caisses : pour chaque magasin, la dernière fiche
// caisse VALIDE (encaissements / décaissements / solde) + cartes KPI réseau
// + tableau des fiches en attente de validation. Calqué sur /suivi-stock.
import Link from "next/link";
import {
  Wallet,
  TrendingDown,
  TrendingUp,
  Coins,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { exigerPermission } from "@/lib/auth/require";
import {
  filtreMagasinPourUtilisateur,
  type RoleApp,
} from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import { formatFCFA, formatDate } from "@/lib/utils/format";
import { BadgeStatutStock } from "@/components/stocks/badge-statut-stock";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata = { title: "Suivi caisse" };
export const dynamic = "force-dynamic";

export default async function PageSuiviCaisse() {
  const session = await exigerPermission("consulterTousMagasins");
  const role = session.user.role as RoleApp | undefined;

  const portee = filtreMagasinPourUtilisateur({
    role,
    magasinId: session.user.magasinId,
    regionId: session.user.regionId,
  });

  if (portee === null) {
    return (
      <div className="text-sm text-muted-foreground">
        Aucun magasin accessible avec votre rôle.
      </div>
    );
  }

  const magasins = await prisma.magasin.findMany({
    where: { ...portee, statut: { not: "INACTIF" } },
    orderBy: [{ region: { nom: "asc" } }, { nom: "asc" }],
    select: {
      id: true,
      code: true,
      nom: true,
      region: { select: { nom: true } },
    },
  });

  const magasinIds = magasins.map((m) => m.id);

  // Borne des 30 derniers jours pour les KPI "tendance"
  const debut30j = new Date();
  debut30j.setUTCHours(0, 0, 0, 0);
  debut30j.setUTCDate(debut30j.getUTCDate() - 30);

  const [agrege30j, dernieresValidees, enAttente, recentes] = await Promise.all([
    // Somme des encaissements / décaissements VALIDÉS sur 30j
    prisma.caisse.aggregate({
      where: {
        magasinId: { in: magasinIds },
        statut: "VALIDE",
        date: { gte: debut30j },
      },
      _sum: { encaissementsFcfa: true, decaissementsFcfa: true },
    }),

    // Pour chaque magasin : sa dernière fiche VALIDE (toutes dates)
    prisma.caisse.findMany({
      where: { magasinId: { in: magasinIds }, statut: "VALIDE" },
      orderBy: [{ magasinId: "asc" }, { date: "desc" }],
      distinct: ["magasinId"],
      select: {
        magasinId: true,
        date: true,
        encaissementsFcfa: true,
        decaissementsFcfa: true,
        soldeFcfa: true,
      },
    }),

    // Fiches en attente (SOUMIS) — pour la file de validation
    prisma.caisse.findMany({
      where: { magasinId: { in: magasinIds }, statut: "SOUMIS" },
      orderBy: [{ date: "desc" }],
      select: {
        id: true,
        date: true,
        encaissementsFcfa: true,
        decaissementsFcfa: true,
        soldeFcfa: true,
        magasin: { select: { id: true, nom: true, code: true } },
        saisiPar: { select: { nom: true, prenom: true } },
      },
      take: 50,
    }),

    // Activité récente (toutes statuts confondus, 30 derniers jours)
    prisma.caisse.findMany({
      where: {
        magasinId: { in: magasinIds },
        date: { gte: debut30j },
      },
      orderBy: [{ date: "desc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        date: true,
        statut: true,
        encaissementsFcfa: true,
        decaissementsFcfa: true,
        soldeFcfa: true,
        magasin: { select: { id: true, nom: true, code: true } },
      },
      take: 20,
    }),
  ]);

  const dernierParMagasin = new Map<string, (typeof dernieresValidees)[number]>();
  for (const f of dernieresValidees) dernierParMagasin.set(f.magasinId, f);

  const totalEnc30j = agrege30j._sum.encaissementsFcfa ?? 0;
  const totalDec30j = agrege30j._sum.decaissementsFcfa ?? 0;
  const soldeReseauCourant = dernieresValidees.reduce(
    (acc, f) => acc + f.soldeFcfa,
    0,
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-primary flex items-center gap-2">
          <Wallet className="h-6 w-6" />
          Suivi caisse
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Encaissements, décaissements et solde courant par magasin
          {role === "ADMIN" ? " (réseau)" : " (votre périmètre)"}.
        </p>
      </header>

      {/* KPI réseau */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Kpi
          libelle="Encaissements 30 j"
          valeur={formatFCFA(totalEnc30j)}
          icone={<TrendingUp className="h-4 w-4 text-emerald-600" />}
          tonValeur="text-emerald-700"
        />
        <Kpi
          libelle="Décaissements 30 j"
          valeur={formatFCFA(totalDec30j)}
          icone={<TrendingDown className="h-4 w-4 text-amber-600" />}
          tonValeur="text-amber-700"
        />
        <Kpi
          libelle="Solde réseau"
          valeur={formatFCFA(soldeReseauCourant)}
          icone={<Coins className="h-4 w-4 text-primary" />}
          tonValeur="text-foreground"
        />
        <Kpi
          libelle="À valider"
          valeur={enAttente.length.toString()}
          icone={<AlertCircle className="h-4 w-4 text-amber-600" />}
          tonValeur={
            enAttente.length > 0 ? "text-amber-700" : "text-muted-foreground"
          }
        />
      </div>

      {/* Tableau principal : ligne par magasin */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Solde courant par magasin
        </h2>
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Magasin</TableHead>
                <TableHead>Dernière saisie validée</TableHead>
                <TableHead className="text-right text-emerald-700">
                  Encaissements
                </TableHead>
                <TableHead className="text-right text-amber-700">
                  Décaissements
                </TableHead>
                <TableHead className="text-right">Solde</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {magasins.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-8 text-center text-muted-foreground"
                  >
                    Aucun magasin dans votre périmètre.
                  </TableCell>
                </TableRow>
              )}
              {magasins.map((m) => {
                const f = dernierParMagasin.get(m.id);
                return (
                  <TableRow key={m.id}>
                    <TableCell>
                      <Link
                        href={`/magasins/${m.id}`}
                        className="font-medium hover:underline"
                      >
                        {m.nom}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {m.code}
                        {m.region?.nom ? ` · ${m.region.nom}` : ""}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {f ? formatDate(f.date) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm text-emerald-700">
                      {f ? formatFCFA(f.encaissementsFcfa) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm text-amber-700">
                      {f ? formatFCFA(f.decaissementsFcfa) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm font-medium">
                      {f ? formatFCFA(f.soldeFcfa) : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            {magasins.length > 0 && (
              <tfoot className="border-t bg-muted/50 font-medium">
                <TableRow>
                  <TableCell colSpan={4}>Total réseau (soldes courants)</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    {formatFCFA(soldeReseauCourant)}
                  </TableCell>
                </TableRow>
              </tfoot>
            )}
          </Table>
        </div>
      </section>

      {/* File des fiches en attente */}
      {enAttente.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            En attente de validation ({enAttente.length})
          </h2>
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">Date</TableHead>
                  <TableHead>Magasin</TableHead>
                  <TableHead className="text-right text-emerald-700">
                    Encaissements
                  </TableHead>
                  <TableHead className="text-right text-amber-700">
                    Décaissements
                  </TableHead>
                  <TableHead className="text-right">Solde</TableHead>
                  <TableHead>Saisi par</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enAttente.map((f) => {
                  const saisisseur =
                    [f.saisiPar.prenom, f.saisiPar.nom]
                      .filter(Boolean)
                      .join(" ")
                      .trim() || "—";
                  return (
                    <TableRow key={f.id}>
                      <TableCell className="text-xs">
                        {formatDate(f.date)}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/magasins/${f.magasin.id}`}
                          className="hover:underline"
                        >
                          {f.magasin.nom}
                        </Link>
                        <p className="text-xs text-muted-foreground font-mono">
                          {f.magasin.code}
                        </p>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm text-emerald-700">
                        {formatFCFA(f.encaissementsFcfa)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm text-amber-700">
                        {formatFCFA(f.decaissementsFcfa)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm font-medium">
                        {formatFCFA(f.soldeFcfa)}
                      </TableCell>
                      <TableCell className="text-xs">{saisisseur}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {/* Activité récente toutes statuts (30j) */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Activité récente (30 j)
        </h2>
        <Card>
          <CardContent className="p-0">
            {recentes.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Aucune saisie de caisse sur les 30 derniers jours.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28">Date</TableHead>
                    <TableHead>Magasin</TableHead>
                    <TableHead className="text-right">Solde</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentes.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="text-xs">
                        {formatDate(f.date)}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/magasins/${f.magasin.id}`}
                          className="hover:underline"
                        >
                          {f.magasin.nom}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm font-medium">
                        {formatFCFA(f.soldeFcfa)}
                      </TableCell>
                      <TableCell>
                        <BadgeStatutStock statut={f.statut} />
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/magasins/${f.magasin.id}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                          aria-label="Voir le magasin"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Kpi({
  libelle,
  valeur,
  icone,
  tonValeur,
}: {
  libelle: string;
  valeur: string;
  icone: React.ReactNode;
  tonValeur: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {libelle}
        </CardTitle>
        {icone}
      </CardHeader>
      <CardContent>
        <div className={`text-xl font-bold tabular-nums ${tonValeur}`}>
          {valeur}
        </div>
      </CardContent>
    </Card>
  );
}
