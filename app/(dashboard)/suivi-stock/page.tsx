// Vue synthétique : pour chaque magasin, le stock courant (dernier inventaire
// VALIDE) des 3 produits de base — Cacao, Café, Anacarde.
import { BarChart3 } from "lucide-react";
import { exigerPermission } from "@/lib/auth/require";
import {
  filtreMagasinPourUtilisateur,
  type RoleApp,
} from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata = { title: "Suivi stock" };
export const dynamic = "force-dynamic";

// Codes des 3 produits de base créés par scripts/creer-produits-base.ts
const CODES_FILIERE = ["CACAO", "CAFE", "ANACARDE"] as const;
type CodeFiliere = (typeof CODES_FILIERE)[number];

const formatKg = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

export default async function PageSuiviStock() {
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

  const [magasins, produits] = await Promise.all([
    prisma.magasin.findMany({
      where: { ...portee, statut: { not: "INACTIF" } },
      orderBy: [{ region: { nom: "asc" } }, { nom: "asc" }],
      select: {
        id: true,
        code: true,
        nom: true,
        region: { select: { nom: true } },
      },
    }),
    prisma.produit.findMany({
      where: { code: { in: [...CODES_FILIERE] } },
      select: { id: true, code: true },
    }),
  ]);

  const produitParCode = new Map<string, string>(); // code → produitId
  for (const p of produits) produitParCode.set(p.code, p.id);

  // Dernier stock VALIDE par (magasin, produit) parmi nos 3 produits de base.
  const stocks = await prisma.stock.findMany({
    where: {
      statut: "VALIDE",
      magasinId: { in: magasins.map((m) => m.id) },
      produitId: { in: produits.map((p) => p.id) },
    },
    orderBy: { date: "desc" },
    select: {
      magasinId: true,
      produitId: true,
      stockClotureKg: true,
      date: true,
    },
  });

  // Pour chaque (magasin, produit), on retient la ligne la plus récente.
  // Comme `stocks` est trié date desc, le premier match l'emporte.
  const dernierParCouple = new Map<string, number>();
  for (const s of stocks) {
    const cle = `${s.magasinId}:${s.produitId}`;
    if (!dernierParCouple.has(cle)) {
      dernierParCouple.set(cle, s.stockClotureKg);
    }
  }

  function totalPourMagasin(magasinId: string, code: CodeFiliere): number {
    const produitId = produitParCode.get(code);
    if (!produitId) return 0;
    return dernierParCouple.get(`${magasinId}:${produitId}`) ?? 0;
  }

  // Totaux réseau par filière (pied de tableau)
  const totauxReseau: Record<CodeFiliere, number> = {
    CACAO: 0,
    CAFE: 0,
    ANACARDE: 0,
  };
  for (const m of magasins) {
    for (const code of CODES_FILIERE) {
      totauxReseau[code] += totalPourMagasin(m.id, code);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-primary flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          Suivi stock
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Stock courant par magasin et par filière (dernier inventaire validé).
        </p>
      </header>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Magasin</TableHead>
              <TableHead className="text-right">Cacao (kg)</TableHead>
              <TableHead className="text-right">Café (kg)</TableHead>
              <TableHead className="text-right">Anacarde (kg)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {magasins.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-8 text-center text-muted-foreground"
                >
                  Aucun magasin dans votre périmètre.
                </TableCell>
              </TableRow>
            )}
            {magasins.map((m) => (
              <TableRow key={m.id}>
                <TableCell>
                  <div className="font-medium">{m.nom}</div>
                  <div className="text-xs text-muted-foreground">
                    {m.code}
                    {m.region?.nom ? ` · ${m.region.nom}` : ""}
                  </div>
                </TableCell>
                {CODES_FILIERE.map((code) => {
                  const valeur = totalPourMagasin(m.id, code);
                  return (
                    <TableCell
                      key={code}
                      className="text-right font-mono tabular-nums"
                    >
                      {valeur > 0 ? formatKg.format(valeur) : "—"}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
          {magasins.length > 0 && (
            <tfoot className="border-t bg-muted/50 font-medium">
              <TableRow>
                <TableCell>Total réseau</TableCell>
                {CODES_FILIERE.map((code) => (
                  <TableCell
                    key={code}
                    className="text-right font-mono tabular-nums font-semibold"
                  >
                    {formatKg.format(totauxReseau[code])}
                  </TableCell>
                ))}
              </TableRow>
            </tfoot>
          )}
        </Table>
      </div>
    </div>
  );
}
