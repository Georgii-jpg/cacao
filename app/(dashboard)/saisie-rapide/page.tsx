// Saisie rapide — mode mobile pour les responsables/opérateurs magasin.
// 3 lignes fixes : Cacao, Café, Anacarde. Saisie minimaliste de 2 chiffres
// par ligne (acheté + stock total actuel). Le serveur déduit ouverture et
// sorties, et soumet directement pour validation manager.
import { redirect } from "next/navigation";

import { exigerPermission } from "@/lib/auth/require";
import { prisma } from "@/lib/db/prisma";
import { dateAujourdhui } from "@/lib/stocks/queries";
import { FormSaisieRapide } from "@/components/stocks/form-saisie-rapide";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, ClipboardCheck, Package } from "lucide-react";
import { formatNombre } from "@/lib/utils/format";

const LIBELLE_FILIERE: Record<"CACAO" | "CAFE" | "ANACARDE", string> = {
  CACAO: "Cacao",
  CAFE: "Café",
  ANACARDE: "Anacarde",
};

export const metadata = {
  title: "Saisie rapide — SOCOPAD",
};

export default async function PageSaisieRapide() {
  const session = await exigerPermission("saisirStock");
  const magasinId = session.user.magasinId;

  // Si l'utilisateur n'a pas de magasin (admin/manager), on l'oriente vers
  // la saisie complète qui propose un sélecteur de magasin.
  if (!magasinId) {
    redirect("/stocks/saisie?info=saisie-rapide-indisponible");
  }

  const ajd = dateAujourdhui();
  const dateIso = ajd.toISOString().slice(0, 10);

  // 3 produits de base affichés dans cet ordre fixe.
  // Doivent exister dans la base (cf. scripts/creer-produits-base.ts).
  const CODES_PRODUITS_BASE = ["CACAO", "CAFE", "ANACARDE"] as const;

  const [magasin, produitsBase] = await Promise.all([
    prisma.magasin.findUnique({
      where: { id: magasinId },
      select: {
        id: true,
        code: true,
        nom: true,
        ville: true,
        statut: true,
        region: { select: { nom: true } },
      },
    }),
    prisma.produit.findMany({
      where: { actif: true, code: { in: [...CODES_PRODUITS_BASE] } },
      select: { id: true, code: true, nom: true, type: true, grade: true },
    }),
  ]);

  // Trie selon l'ordre voulu (Cacao, Café, Anacarde)
  const produits = CODES_PRODUITS_BASE.map((code) =>
    produitsBase.find((p) => p.code === code),
  ).filter((p): p is NonNullable<typeof p> => p !== undefined);

  if (!magasin || magasin.statut === "INACTIF") {
    return (
      <div className="mx-auto max-w-xl space-y-4 p-4">
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Magasin indisponible</AlertTitle>
          <AlertDescription>
            Votre magasin est introuvable ou inactif. Contactez un administrateur.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Pour chaque produit : dernier stock validé connu + fiche du jour
  // (utile pour bloquer la double saisie ou pré-remplir si rejetée).
  const lignes = await Promise.all(
    produits.map(async (p) => {
      const [dernierValide, fiche] = await Promise.all([
        prisma.stock.findFirst({
          where: {
            magasinId,
            produitId: p.id,
            statut: "VALIDE",
            date: { lt: ajd },
          },
          orderBy: { date: "desc" },
          select: { stockClotureKg: true, date: true },
        }),
        prisma.stock.findUnique({
          where: {
            magasinId_produitId_date: {
              magasinId,
              produitId: p.id,
              date: ajd,
            },
          },
          select: {
            id: true,
            statut: true,
            entreesKg: true,
            stockClotureKg: true,
            motifRejet: true,
          },
        }),
      ]);

      return {
        produit: p,
        dernierStockKg: dernierValide?.stockClotureKg ?? 0,
        dernierStockDate: dernierValide?.date ?? null,
        fiche,
      };
    }),
  );

  if (lignes.length === 0) {
    return (
      <div className="mx-auto max-w-xl space-y-4 p-4">
        <Alert>
          <AlertCircle className="size-4" />
          <AlertTitle>Configuration requise</AlertTitle>
          <AlertDescription>
            Les 3 produits de base (Cacao, Café, Anacarde) ne sont pas encore
            créés. Demandez à un administrateur d&apos;exécuter le script
            <code className="mx-1 rounded bg-muted px-1 py-0.5">
              scripts/creer-produits-base.ts
            </code>
            sur la base de production.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 pb-24">
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ClipboardCheck className="size-4" />
          <span>Saisie du jour</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {magasin.nom}
        </h1>
        <p className="text-sm text-muted-foreground">
          {magasin.ville} — {magasin.region.nom}
        </p>
      </header>

      {/* Stocks courants par filière (dernière clôture validée) */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {lignes.map((l) => {
          const code = l.produit.code as "CACAO" | "CAFE" | "ANACARDE";
          return (
            <Card key={l.produit.id}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Package className="size-3.5" />
                  <span>{LIBELLE_FILIERE[code]}</span>
                </div>
                <div className="mt-1 text-lg sm:text-xl font-bold tabular-nums">
                  {formatNombre(Math.round(l.dernierStockKg))}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    kg
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <FormSaisieRapide dateIso={dateIso} lignes={lignes} />
    </div>
  );
}
