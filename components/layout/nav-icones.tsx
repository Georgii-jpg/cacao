// Mapping identifiant → composant Lucide. Vit dans un module client
// (utilisé par NavLinks) pour éviter la sérialisation server→client de
// composants React, interdite par RSC.
"use client";
import {
  Home,
  Package,
  Building2,
  Users,
  FileText,
  Settings,
  ClipboardCheck,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import type { IdIcone } from "@/lib/navigation";

const ICONES: Record<IdIcone, LucideIcon> = {
  home: Home,
  package: Package,
  building: Building2,
  users: Users,
  "file-text": FileText,
  settings: Settings,
  "clipboard-check": ClipboardCheck,
  "bar-chart": BarChart3,
};

export function IconeNav({
  id,
  className,
}: {
  id: IdIcone;
  className?: string;
}) {
  const Composant = ICONES[id];
  return <Composant className={className} aria-hidden="true" />;
}
