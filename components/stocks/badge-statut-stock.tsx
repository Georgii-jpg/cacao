// Badge visuel pour le statut workflow d'une fiche de stock.
import { Badge } from "@/components/ui/badge";
import type { StatutStock } from "@/app/generated/prisma/enums";
import { cn } from "@/lib/utils";

const LIBELLE: Record<StatutStock, string> = {
  BROUILLON: "Brouillon",
  SOUMIS: "À valider",
  VALIDE: "Validé",
  REJETE: "Rejeté",
};

const STYLE: Record<StatutStock, string> = {
  BROUILLON: "bg-muted text-muted-foreground border-border",
  SOUMIS: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  VALIDE: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  REJETE: "bg-destructive/10 text-destructive border-destructive/30",
};

export function BadgeStatutStock({ statut }: { statut: StatutStock }) {
  return (
    <Badge variant="outline" className={cn("border", STYLE[statut])}>
      {LIBELLE[statut]}
    </Badge>
  );
}
