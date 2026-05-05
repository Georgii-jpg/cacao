"use client";
// Menu utilisateur (avatar + dropdown avec profil + déconnexion).
// Implémentation manuelle (useState + click outside) pour éviter
// les bugs d'interaction render-prop entre Base UI Menu et Button.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { LogOut, User, UserCircle } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LIBELLE_ROLE } from "@/lib/navigation";
import type { RoleApp } from "@/lib/auth/permissions";

type Props = {
  nom?: string | null;
  email?: string | null;
  role?: RoleApp;
};

export function UserMenu({ nom, email, role }: Props) {
  const initiales = (nom || email || "U")
    .split(/[ @.]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");

  const [ouvert, setOuvert] = useState(false);
  const conteneurRef = useRef<HTMLDivElement>(null);

  // Click hors menu → on ferme
  useEffect(() => {
    if (!ouvert) return;
    function onPointerDown(e: PointerEvent) {
      if (
        conteneurRef.current &&
        !conteneurRef.current.contains(e.target as Node)
      ) {
        setOuvert(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOuvert(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [ouvert]);

  return (
    <div ref={conteneurRef} className="relative">
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={ouvert}
        className="inline-flex h-9 items-center gap-2 rounded-lg px-2 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <Avatar className="h-7 w-7">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
            {initiales || <User className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>
        <div className="hidden sm:flex flex-col items-start leading-tight">
          <span className="text-xs font-medium">{nom ?? email}</span>
          {role && (
            <span className="text-[10px] text-muted-foreground">
              {LIBELLE_ROLE[role]}
            </span>
          )}
        </div>
      </button>

      {ouvert && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10"
        >
          <div className="px-1.5 py-1">
            <p className="text-sm font-medium">{nom ?? "Compte"}</p>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          </div>
          <div className="my-1 h-px bg-border" />
          <Link
            href="/profil"
            role="menuitem"
            onClick={() => setOuvert(false)}
            className="flex w-full cursor-pointer items-center rounded-md px-1.5 py-1.5 text-sm hover:bg-muted focus:bg-muted focus:outline-none"
          >
            <UserCircle className="mr-2 h-4 w-4" />
            Mon profil
          </Link>
          <div className="my-1 h-px bg-border" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOuvert(false);
              signOut({ callbackUrl: "/connexion" });
            }}
            className="flex w-full cursor-pointer items-center rounded-md px-1.5 py-1.5 text-sm text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:outline-none"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Déconnexion
          </button>
        </div>
      )}
    </div>
  );
}
