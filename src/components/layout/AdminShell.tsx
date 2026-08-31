"use client";

/**
 * Admin Portal shell — section 12.5. Internal staff only.
 *
 * Deliberately does NOT import ProfileSwitcher, and passes no profile to
 * TopHeader: internal staff hold no banking relationships and the switcher must
 * never appear here (section 12.2). Nav comes from the internal branch of the
 * actor matrix, so a Trade Officer, Operations User and Bank Admin each see a
 * different portal.
 */

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import TopHeader from "./TopHeader";
import { SurfaceProvider } from "@/lib/surface-context";
import { useSession, useSessionHydrated } from "@/lib/session-store";
import { getNavigation } from "@/lib/navigation";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";

const COLLAPSE_KEY = "nibs-admin-sidebar-collapsed";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { actor, mfaVerified, signOut } = useSession();
  useAmountVisibility();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const hydrated = useSessionHydrated();

  useEffect(() => {
    if (localStorage.getItem(COLLAPSE_KEY) === "true") setCollapsed(true);
  }, []);

  useEffect(() => setSidebarOpen(false), [pathname]);

  // Customer credentials can never reach the Admin Portal (section 12.1).
  useEffect(() => {
    if (!hydrated) return;
    if (!actor) router.replace("/login");
    else if (!mfaVerified) router.replace("/mfa");
    else if (actor.shell !== "admin") router.replace("/overview");
  }, [hydrated, actor, mfaVerified, router]);

  const toggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_KEY, String(next));
      return next;
    });
  }, []);

  const handleSignOut = useCallback(() => {
    signOut();
    router.replace("/login");
  }, [signOut, router]);

  if (!hydrated || !actor || !mfaVerified || actor.shell !== "admin") return null;

  const navItems = getNavigation(actor);

  return (
    <SurfaceProvider value={1}>
      <div className="flex h-screen overflow-hidden bg-[var(--surface)] dark:bg-[oklch(0.02_0_0)]">
        {sidebarOpen && (
          <div
            className="animate-in fade-in fixed inset-0 z-30 bg-black/30 backdrop-blur-[2px] duration-150 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <Sidebar
          items={navItems}
          shell="admin"
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapse}
        />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[var(--surface)] p-2.5 lg:p-3.5">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:bg-card dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
            {/* No activeProfile passed — the switcher cannot render here. */}
            <TopHeader
              actor={actor}
              onMenuToggle={() => setSidebarOpen((p) => !p)}
              onSignOut={handleSignOut}
            />

            <main
              className="custom-scrollbar shell-fade-bottom flex-1 overflow-y-auto"
              style={{ scrollbarGutter: "stable" }}
            >
              <div className="page-stagger mx-auto w-full max-w-[1200px] px-4 pb-12 pt-6 sm:px-8 sm:pt-8 lg:px-10 lg:pt-9">{children}</div>
            </main>
          </div>
        </div>
      </div>
    </SurfaceProvider>
  );
}
