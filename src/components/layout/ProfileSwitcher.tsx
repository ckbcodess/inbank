"use client";

/**
 * Global Profile Switcher (S04) — section 12.2.
 *
 * Scoped exclusively to ONE customer identity moving between the banking
 * relationships it holds. It is not a way to change identity or role, it has no
 * "Admin" option, and internal staff never render it (see AdminShell, which
 * does not import this component at all).
 */

import { Check, ChevronsUpDown, Building2, User } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Profile } from "@/lib/roles";

interface ProfileSwitcherProps {
  profiles: Profile[];
  active: Profile;
  onSelect: (p: Profile) => void;
}

export default function ProfileSwitcher({ profiles, active, onSelect }: ProfileSwitcherProps) {
  const ActiveIcon = active.kind === "CORPORATE" ? Building2 : User;

  const handleSelect = (p: Profile) => {
    if (p.id !== active.id) {
      toast.success(`Switched to ${p.name}`, {
        description: `Active context: ${p.kind === "CORPORATE" ? "Corporate Relationship" : "Personal Retail Profile"} (${p.reference})`,
      });
      onSelect(p);
    }
  };

  if (profiles.length < 2) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5">
        <ActiveIcon size={14} strokeWidth={1.9} className="text-muted-foreground" />
        <span className="text-[13px] leading-none text-foreground">{active.name}</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] leading-none text-muted-foreground">
          {active.kind === "CORPORATE" ? "Corporate" : "Personal"}
        </span>
        <span className="text-[12px] leading-none text-muted-foreground tabular">{active.reference}</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="hover-surface flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5 outline-none transition-colors"
        aria-label="Switch banking relationship"
      >
        <ActiveIcon size={14} strokeWidth={1.9} className="text-muted-foreground" />
        <span className="text-[13px] leading-none font-medium text-foreground">{active.name}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] leading-none font-medium ${
            active.kind === "CORPORATE"
              ? "bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300"
              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300"
          }`}
        >
          {active.kind === "CORPORATE" ? "Corporate" : "Personal"}
        </span>
        <span className="hidden text-[12px] leading-none text-muted-foreground tabular sm:inline">
          {active.reference}
        </span>
        <ChevronsUpDown size={13} strokeWidth={1.8} className="text-muted-foreground" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Banking relationship</DropdownMenuLabel>
        {profiles.map((p) => {
          const Icon = p.kind === "CORPORATE" ? Building2 : User;
          const isActive = p.id === active.id;
          return (
            <DropdownMenuItem key={p.id} onClick={() => handleSelect(p)} className="gap-2.5">
              <Icon size={15} strokeWidth={1.8} className="text-muted-foreground" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-[13px] text-foreground">{p.name}</span>
                  <span className="rounded-full bg-muted px-1.5 py-0.2 text-[9px] text-muted-foreground">
                    {p.kind === "CORPORATE" ? "Corporate" : "Personal"}
                  </span>
                </span>
                <span className="text-[12px] text-muted-foreground tabular">{p.reference}</span>
              </span>
              {isActive && <Check size={14} strokeWidth={2} className="text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
