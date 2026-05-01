// Liste des utilisateurs (admin uniquement).
import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { exigerPermission } from "@/lib/auth/require";
import {
  listerUtilisateurs,
  type FiltresUtilisateurs as TypeFiltres,
} from "@/lib/utilisateurs/queries";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableUtilisateurs } from "@/components/utilisateurs/table-utilisateurs";
import { FiltresUtilisateurs } from "@/components/utilisateurs/filtres-utilisateurs";
import { Role } from "@/app/generated/prisma/enums";

export const metadata = { title: "Utilisateurs" };
export const dynamic = "force-dynamic";

const ROLES: Role[] = [
  Role.ADMIN,
  Role.MANAGER_REGIONAL,
  Role.RESPONSABLE_MAGASIN,
  Role.OPERATEUR_SAISIE,
];

type Params = {
  recherche?: string;
  role?: string;
  actif?: string;
};

export default async function PageListeUtilisateurs({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  await exigerPermission("gererUtilisateurs");
  const params = await searchParams;

  const filtres: TypeFiltres = {
    recherche: params.recherche?.trim() || undefined,
    role:
      params.role && ROLES.includes(params.role as Role)
        ? (params.role as Role)
        : undefined,
    actif:
      params.actif === "actifs" || params.actif === "inactifs"
        ? params.actif
        : undefined,
  };

  const utilisateurs = await listerUtilisateurs(filtres);
  const actifs = utilisateurs.filter((u) => u.actif).length;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary flex items-center gap-2">
            <Users className="h-6 w-6" />
            Utilisateurs
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {utilisateurs.length} compte{utilisateurs.length > 1 ? "s" : ""}
            {filtres.actif === undefined && (
              <>
                {" — "}
                <Badge variant="secondary">{actifs} actifs</Badge>
              </>
            )}
          </p>
        </div>
        <Button render={<Link href="/utilisateurs/nouveau" />}>
          <Plus className="h-4 w-4" />
          Nouveau compte
        </Button>
      </header>

      <FiltresUtilisateurs />
      <TableUtilisateurs utilisateurs={utilisateurs} />
    </div>
  );
}
