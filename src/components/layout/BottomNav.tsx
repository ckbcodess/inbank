"useclient";

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
  path: string;
  icon: React.ElementType;
}

const TABS: TabItem[] = [
  { key: "overview", label: "Home", path: "/overview", icon: Home },
  { key: "accounts", label: "Accounts", path: "/accounts", icon: Wallet },
  { key: "payments", label: "Send & Pay", path: "/payments", icon: Send },
  { key: "cards", label: "Cards", path: "/cards", icon: CreditCard },
];

export function BottomNav({ onOpenDrawer }: BottomNavProps) {
  const pathname = usePathname();

  // Helper to determine active tab based on longest prefix match
  const getIsActive = (path: string) => {
    if (pathname === path) return true;
    if (path !== "/overview" && pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="fixed inset-x-0 bottom-0 z-40 pointer-events-none flex justify-between items-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 md:hidden"
    >
      {/* Left Capsule: Navigation Tabs with Origin-style expanding active pill */}
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-border/60 bg-background/85 p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-[#121212]/85 dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = getIsActive(tab.path);

          return (
            <Link
              key={tab.key}
              href={tab.path}
              className={cn(
                "relative flex h-10 items-center justify-center rounded-full transition-all duration-200 ease-out cursor-pointer select-none",
                isActive
                  ? "bg-foreground/10 text-foreground px-3.5 gap-2 font-medium dark:bg-white/10 dark:text-white"
                  : "w-10 text-muted-foreground hover:text-foreground hover:bg-muted/50 dark:text-white/60 dark:hover:text-white dark:hover:bg-white/5",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} className="shrink-0" />
              {isActive && (
                <span className="text-[13px] leading-none whitespace-nowrap animate-in fade-in duration-150">
                  {tab.label}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Right Capsule: More / Services Drawer Action */}
      <button
        type="button"
        onClick={onOpenDrawer}
        aria-label="Open all services menu"
        className="pointer-events-auto flex size-[52px] shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/85 text-muted-foreground shadow-[0_8px_32px_rgba(0,0,0,0.12)] backdrop-blur-xl transition-all duration-200 hover:bg-muted hover:text-foreground active:scale-95 cursor-pointer dark:border-white/10 dark:bg-[#121212]/85 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
      >
        <LayoutGrid size={20} strokeWidth={1.8} />
      </button>
    </nav>
  );
}
