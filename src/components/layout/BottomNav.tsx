"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, Home, LayoutGrid, Send, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  onOpenDrawer: () => void;
}

interface TabItem {
  key: string;
  label: string;
  path?: string;
  icon: React.ElementType;
  onClick?: () => void;
}

export function BottomNav({ onOpenDrawer }: BottomNavProps) {
  const pathname = usePathname();

  const getIsActive = (path?: string) => {
    if (!path) return false;
    if (pathname === path) return true;
    if (path !== "/overview" && pathname.startsWith(path)) return true;
    return false;
  };

  const tabs: TabItem[] = [
    { key: "overview", label: "Home", path: "/overview", icon: Home },
    { key: "accounts", label: "Accounts", path: "/accounts", icon: Wallet },
    { key: "payments", label: "Send & Pay", path: "/payments", icon: Send },
    { key: "cards", label: "Cards", path: "/cards", icon: CreditCard },
    { key: "more", label: "More", icon: LayoutGrid, onClick: onOpenDrawer },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed inset-x-0 bottom-0 z-40 w-full border-t border-border/70 bg-background/95 backdrop-blur-2xl pt-4 pb-[max(1.5rem,calc(env(safe-area-inset-bottom)+1rem))] px-2 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] md:hidden dark:border-white/10 dark:bg-[#121212]/95 dark:shadow-[0_-4px_24px_rgba(0,0,0,0.3)]"
    >
      <div className="mx-auto flex w-full max-w-lg items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = getIsActive(tab.path);

          const content = (
            <div
              className={cn(
                "group relative flex flex-col items-center justify-center gap-1.5 py-1 px-2.5 rounded-xl transition-all duration-150 active:scale-92 cursor-pointer select-none",
                isActive
                  ? "text-black dark:text-white font-medium"
                  : "text-neutral-400 hover:text-neutral-700 dark:text-white/40 dark:hover:text-white/80",
              )}
            >
              <Icon size={21} strokeWidth={isActive ? 1.85 : 1.5} className="shrink-0 transition-colors" />
              <span className="text-[11px] font-medium tracking-[-0.01em] leading-none whitespace-nowrap">
                {tab.label}
              </span>
            </div>
          );

          if (tab.path) {
            return (
              <Link
                key={tab.key}
                href={tab.path}
                className="flex-1 flex justify-center outline-none"
                aria-current={isActive ? "page" : undefined}
              >
                {content}
              </Link>
            );
          }

          return (
            <button
              key={tab.key}
              type="button"
              onClick={tab.onClick}
              aria-label="Open full services menu"
              className="flex-1 flex justify-center outline-none bg-transparent border-0 p-0"
            >
              {content}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
