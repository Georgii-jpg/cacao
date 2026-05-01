// Route handler — génère et télécharge un rapport CSV.
// Auth + permission "exporter" requises (ADMIN, MANAGER_REGIONAL).
// URL: /api/rapports/historique?debut=YYYY-MM-DD&fin=YYYY-MM-DD&magasin=&statut=
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { permissions, type RoleApp } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/prisma";
import {
  estTypeRapport,
  genererActivite,
  genererHistorique,
  genererSnapshot,
  type ContexteUtilisateur,
  type ParamsRapport,
} from "@/lib/rapports/exports";
import type { StatutStock } from "@/app/generated/prisma/enums";

const STATUTS_VALIDES: StatutStock[] = ["BROUILLON", "SOUMIS", "VALIDE", "REJETE"];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Authentification requise", { status: 401 });
  }
  const role = session.user.role as RoleApp | undefined;
  if (!permissions.exporter(role)) {
    return new Response("Permission refusée", { status: 403 });
  }

  const { type } = await params;
  if (!estTypeRapport(type)) {
    return new Response("Type de rapport inconnu", { status: 404 });
  }

  const url = new URL(req.url);
  const ctx: ContexteUtilisateur = {
    role,
    magasinId: session.user.magasinId,
    regionId: session.user.regionId,
  };
  const statutParam = url.searchParams.get("statut");
  const paramsRapport: ParamsRapport = {
    dateDebut: url.searchParams.get("debut") ?? undefined,
    dateFin: url.searchParams.get("fin") ?? undefined,
    magasinId: url.searchParams.get("magasin") ?? undefined,
    statut:
      statutParam && STATUTS_VALIDES.includes(statutParam as StatutStock)
        ? (statutParam as StatutStock)
        : undefined,
  };

  let resultat: { contenu: string; nomFichier: string; nbLignes: number };
  if (type === "historique") {
    resultat = await genererHistorique(ctx, paramsRapport);
  } else if (type === "snapshot") {
    resultat = await genererSnapshot(ctx);
  } else {
    resultat = await genererActivite(ctx, paramsRapport);
  }

  // Trace audit (best-effort)
  await prisma.auditLog
    .create({
      data: {
        userId: session.user.id,
        action: "EXPORT",
        entite: "Rapport",
        entiteId: type,
        nouvelleValeur: JSON.stringify({ ...paramsRapport, lignes: resultat.nbLignes }),
      },
    })
    .catch(() => null);

  return new Response(resultat.contenu, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${resultat.nomFichier}"`,
      "Cache-Control": "no-store",
    },
  });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
