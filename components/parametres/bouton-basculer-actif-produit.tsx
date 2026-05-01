"use client";
// Toggle actif/inactif d'un produit (soft-delete).
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Power, PowerOff } from "lucide-react";
import { toast } from "sonner";
import { basculerActifProduit } from "@/lib/parametres/actions";
import { Button } from "@/components/ui/button";

export function BoutonBasculerActifProduit({
  produitId,
  actif,
  nom,
}: {
  produitId: string;
  actif: boolean;
  nom: string;
}) {
  const router = useRouter();
  const [enCours, startTransition] = useTransition();

  function bascule() {
    startTransition(async () => {
      const res = await basculerActifProduit(produitId);
      if (res.ok) {
        toast.success(actif ? `« ${nom} » désactivé.` : `« ${nom} » réactivé.`);
        router.refresh();
      } else {
        toast.error(res.erreur ?? "Échec.");
      }
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={bascule}
      disabled={enCours}
      className={actif ? "text-amber-700 hover:text-amber-800" : "text-emerald-700 hover:text-emerald-800"}
    >
      {enCours ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : actif ? (
        <PowerOff className="h-4 w-4" />
      ) : (
        <Power className="h-4 w-4" />
      )}
      {actif ? "Désactiver" : "Réactiver"}
    </Button>
  );
}
