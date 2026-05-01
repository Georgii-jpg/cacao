"use client";
// Menu utilisateur (avatar + dropdown avec profil + déconnexion).
import Link from "next/link";
import { LogOut, User, UserCircle } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deconnecter } from "@/lib/auth/actions";
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" className="gap-2 h-9 px-2">
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
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{nom ?? "Compte"}</span>
            <span className="text-xs text-muted-foreground">{email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={
            <Link href="/profil" className="w-full cursor-pointer">
              <UserCircle className="mr-2 h-4 w-4" />
              Mon profil
            </Link>
          }
        />
        <DropdownMenuSeparator />
        <form action={deconnecter}>
          <DropdownMenuItem
            render={
              <button type="submit" className="w-full cursor-pointer text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Déconnexion
              </button>
            }
          />
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
