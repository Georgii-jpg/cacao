"use client";
// Liens de navigation avec mise en surbrillance de la route active.
// Utilisé dans la sidebar (desktop) ET dans le menu mobile (Sheet).
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { ItemNavigation } from "@/lib/navigation";
import { IconeNav } from "./nav-icones";

type Props = {
  items: ItemNavigation[];
  /** Callback déclenché à chaque clic — utile pour fermer un Sheet mobile */
  onClick?: () => void;
};

export function NavLinks({ items, onClick }: Props) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const actif =
          pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClick}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              actif &&
                "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 hover:text-sidebar-primary-foreground",
            )}
          >
            <IconeNav id={item.icone} className="h-4 w-4 shrink-0" />
            <span>{item.libelle}</span>
          </Link>
        );
      })}
    </nav>
  );
}
