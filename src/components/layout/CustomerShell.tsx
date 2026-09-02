"use client";

/**
 * Customer / Corporate application shell — section 12.4.
 *
 * Floating-card layout carried over from the Halepulse dashboard. Renders the
 * Global Profile Switcher and customer navigation only. It shares no navigation
 * chrome with the Admin Portal shell (section 12.1).
 */

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import TopHeader from "./TopHeader";
import { SurfaceProvider } from "@/lib/surface-context";
import { useSession, useSessionHydrated } from "@/lib/session-store";
import { getNavigation } from "@/lib/navigation";
import type { Profile } from "@/lib/roles";

const COLLAPSE_KEY = "nibs-sidebar-collapsed";

export default function CustomerShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { actor, activeProfile, mfaVerified, selectProfile, signOut } = useSession();
  // NOTE: the shell deliberately does NOT subscribe to amount visibility. It
  // renders no amounts, and subscribing re-rendered the whole shell — sidebar
  // and header included — on every toggle of the hide-amounts button. TopHeader
  // subscribes on its own for the eye icon.
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const hydrated = useSessionHydrated();

  useEffect(() => {
    if (localStorage.getItem(COLLAPSE_KEY) === "true") setCollapsed(true);
  }, []);

  useEffect(() => setSidebarOpen(false), [pathname]);

  // Route guard: an unauthenticated or half-authenticated visitor never sees
  // the shell. Internal staff are bounced to their own shell (section 12.1).
  // Switching to a relationship that lacks permission for the active route redirects to /overview.
  useEffect(() => {
    if (!hydrated) return;
    if (!actor) router.replace("/login");
    else if (!mfaVerified) router.replace("/mfa");
    else if (actor.shell === "admin") router.replace("/admin");
    else if (!activeProfile) router.replace("/profile-selection");
    else if (activeProfile.kind === "RETAIL") {
      const isCorporateRoute =
        pathname.startsWith("/approvals") ||
        pathname.startsWith("/administration") ||
        pathname.startsWith("/trade") ||
        // Bulk payment files are a corporate capability — a personal
        // relationship has no batch to upload.
        pathname.startsWith("/payments/bulk");
      if (isCorporateRoute) {
        router.replace("/overview");
      }
    }
  }, [hydrated, actor, mfaVerified, activeProfile, pathname, router]);

  const toggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_KEY, String(next));
      return next;
    });
  }, []);

  const handleSelectProfile = useCallback(
    (profile: Profile) => {
      selectProfile(profile);
      router.push("/overview");
    },
    [selectProfile, router],
  );

  const handleSignOut = useCallback(() => {
    signOut();
    router.replace("/login");
  }, [signOut, router]);

  if (!hydrated || !actor || !mfaVerified || !activeProfile || actor.shell === "admin") {
    return null;
  }

  const navItems = getNavigation(actor, activeProfile);

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
          shell="customer"
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapse}
        />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[var(--surface)] p-3 sm:p-4 lg:p-5">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:bg-card dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
            <TopHeader
              actor={actor}
              activeProfile={activeProfile}
              onSelectProfile={handleSelectProfile}
              onMenuToggle={() => setSidebarOpen((p) => !p)}
              onSignOut={handleSignOut}
            />

            <main
              key={activeProfile.id}
              className="custom-scrollbar shell-fade-bottom animate-in fade-in flex-1 overflow-y-auto duration-200"
              style={{ scrollbarGutter: "stable" }}
            >
              <div className="page-stagger mx-auto w-full max-w-[1360px] px-6 pb-16 pt-8 sm:px-10 sm:pt-10 sm:pb-20 lg:px-14 lg:pt-12 lg:pb-24 xl:px-16 xl:pt-14">{children}</div>
            </main>
          </div>
        </div>
      </div>
    </SurfaceProvider>
  );
}
