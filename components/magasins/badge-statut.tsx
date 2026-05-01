// Badge visuel pour le statut d'un magasin (réutilisable liste + détail).
import { Badge } from "@/components/ui/badge";
import type { StatutMagasin } from "@/app/generated/prisma/enums";
import { cn } from "@/lib/utils";

const LIBELLE: Record<StatutMagasin, string> = {
  ACTIF: "Actif",
  INACTIF: "Archivé",
  MAINTENANCE: "Maintenance",
};

const STYLE: Record<StatutMagasin, string> = {
  ACTIF: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  INACTIF: "bg-muted text-muted-foreground border-border",
  MAINTENANCE: "bg-amber-500/15 text-amber-700 border-amber-500/30",
};

export function BadgeStatutMagasin({ statut }: { statut: StatutMagasin }) {
  return (
    <Badge variant="outline" className={cn("border", STYLE[statut])}>
      {LIBELLE[statut]}
    </Badge>
  );
}
