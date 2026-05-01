"use client";
// Menu mobile — déclenche l'ouverture d'un Sheet (drawer) latéral.
// La même liste de NavLinks est utilisée que sur desktop.
import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NavLinks } from "./nav-links";
import type { ItemNavigation } from "@/lib/navigation";

type Props = {
  items: ItemNavigation[];
};

export function MobileNav({ items }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Ouvrir le menu">
            <Menu className="h-5 w-5" />
          </Button>
        }
      />
      <SheetContent side="left" className="w-64 bg-sidebar text-sidebar-foreground p-0">
        <SheetHeader className="border-b border-sidebar-border p-4">
          <SheetTitle className="text-sidebar-foreground">SOCOPAD</SheetTitle>
        </SheetHeader>
        <div className="p-4">
          <NavLinks items={items} onClick={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
