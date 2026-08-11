"use client";

import Link from "next/link";
import { Bell, Eye, EyeOff, LogOut, Menu, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";
import { NOTIFICATIONS } from "@/lib/mock-data";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ProfileSwitcher from "./ProfileSwitcher";
import { ROLE_LABEL, type Actor, type Profile } from "@/lib/roles";

interface TopHeaderProps {
  actor: Actor;
  /** Omitted entirely for the Admin Portal — internal staff never see it (12.2). */
  activeProfile?: Profile | null;
  onSelectProfile?: (p: Profile) => void;
  onMenuToggle: () => void;
  onSignOut: () => void;
}

export default function TopHeader({
  actor,
  activeProfile,
  onSelectProfile,
  onMenuToggle,
  onSignOut,
}: TopHeaderProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const { showAmounts, toggleAmountVisibility } = useAmountVisibility();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const initials = actor.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");

  const unreadCount = NOTIFICATIONS.filter((n) => !n.read).length;

  return (
    <header className="flex h-14 flex-shrink-0 items-center justify-between gap-3 border-b border-border px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={onMenuToggle} className="lg:hidden" aria-label="Open menu">
          <Menu size={17} strokeWidth={1.9} />
        </Button>

        {/* Profile Switcher renders only in the customer shell */}
        {activeProfile && onSelectProfile && (
          <ProfileSwitcher profiles={actor.profiles} active={activeProfile} onSelect={onSelectProfile} />
        )}
      </div>

      <div className="flex items-center gap-1.5">
        {/* FR-22 — notifications. Customer shell only: internal staff work from
            the Admin Portal's own queues, not a customer notification feed. */}
        {actor.shell === "customer" && (
          <Button
            nativeButton={false}
            render={<Link href="/notifications" />}
            variant="ghost"
            size="icon-sm"
            className="relative"
            aria-label={
              unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"
            }
          >
            <Bell size={16} strokeWidth={1.9} />
            {unreadCount > 0 && (
              <span
                className="absolute right-1 top-1 size-2 rounded-full bg-destructive ring-2 ring-card"
                aria-hidden
              />
            )}
          </Button>
        )}

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleAmountVisibility}
          aria-label={showAmounts ? "Hide cash amounts" : "Show cash amounts"}
          title={showAmounts ? "Hide cash amounts" : "Show cash amounts"}
          className="relative text-muted-foreground hover:text-foreground"
        >
          {mounted && showAmounts ? (
            <Eye size={16} strokeWidth={1.9} />
          ) : (
            <EyeOff size={16} strokeWidth={1.9} className="text-amber-600 dark:text-amber-400" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          {mounted && resolvedTheme === "dark" ? (
            <Sun size={16} strokeWidth={1.9} />
          ) : (
            <Moon size={16} strokeWidth={1.9} />
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            className="hover-surface flex items-center gap-2 rounded-lg px-1.5 py-1 outline-none"
            aria-label="Account menu"
          >
            <span className="flex size-7 items-center justify-center rounded-full bg-primary text-[11px] text-primary-foreground">
              {initials}
            </span>
            <span className="hidden text-left leading-tight sm:block">
              <span className="block text-[13px] text-foreground">{actor.name}</span>
              <span className="block text-[11px] text-muted-foreground">{ROLE_LABEL[actor.role]}</span>
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <span className="block text-[13px] text-foreground">{actor.name}</span>
              <span className="block text-[12px] font-normal text-muted-foreground">{actor.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSignOut} className="gap-2.5">
              <LogOut size={15} strokeWidth={1.8} />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
