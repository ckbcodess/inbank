"use client";

/**
 * Customer / Corporate application shell — section 12.4.
 *
 * Floating-card layout carried over from the Halepulse dashboard. Renders the
 * customer navigation only — Personal and Business are chosen before sign-in,
 * so there's no in-session profile switcher. It shares no navigation chrome
 * with the Admin Portal shell (section 12.1).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import TopHeader from "./TopHeader";
import { AppSplash } from "./AppSplash";
import {
  SPLASH_MAX_MS,
  SPLASH_MIN_MS,
  isAppBooted,
  markAppBooted,
  splashWorkSettled,
} from "@/lib/app-splash";
import { SurfaceProvider } from "@/lib/surface-context";
import { useSession, useSessionHydrated } from "@/lib/session-store";
import { getNavigation } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { FxQuickModal } from "@/components/fx/FxQuickModal";

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
  const ready = hydrated && !!actor && mfaVerified && !!activeProfile && actor.shell !== "admin";

  // First-load splash (see lib/app-splash): up from the first paint until the
  // session is ready and the screen's fonts and key images have settled —
  // within SPLASH_MIN_MS..SPLASH_MAX_MS — then it fades out over the app.
  const [splash, setSplash] = useState<"on" | "leaving" | "off">(() => (isAppBooted() ? "off" : "on"));
  const splashStart = useRef(0);
  useEffect(() => {
    splashStart.current = performance.now();
  }, []);
  useEffect(() => {
    if (splash !== "on" || !ready) return;
    let done = false;
    const elapsed = () => performance.now() - splashStart.current;
    const reveal = () => {
      if (done) return;
      done = true;
      markAppBooted();
      setSplash("leaving");
    };
    const cap = window.setTimeout(reveal, Math.max(0, SPLASH_MAX_MS - elapsed()));
    splashWorkSettled().then(() => window.setTimeout(reveal, Math.max(0, SPLASH_MIN_MS - elapsed())));
    return () => {
      done = true;
      window.clearTimeout(cap);
    };
  }, [splash, ready]);
  useEffect(() => {
    if (splash !== "leaving") return;
    const t = window.setTimeout(() => setSplash("off"), 320);
    return () => window.clearTimeout(t);
  }, [splash]);

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
    else if (!activeProfile) {
      if (actor.profiles.length > 0) selectProfile(actor.profiles[0]);
      else router.replace("/login");
    }
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
  }, [hydrated, actor, mfaVerified, activeProfile, pathname, router, selectProfile]);

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

  // `ready` covers these; restated so TypeScript narrows them below.
  if (!ready || !actor || !activeProfile) {
    return splash === "off" ? null : <AppSplash leaving={false} />;
  }

  const navItems = getNavigation(actor, activeProfile);

  return (
    <SurfaceProvider value={1}>
      <div className="flex h-dvh overflow-hidden bg-[var(--surface)]">
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

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[var(--surface)] p-0 sm:p-3 lg:p-3.5">
          <div className="shell-card flex min-h-0 flex-1 flex-col overflow-hidden rounded-none border-0 shadow-none sm:rounded-2xl sm:border sm:border-border sm:shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
            <TopHeader
              actor={actor}
              onMenuToggle={() => setSidebarOpen((p) => !p)}
              onSignOut={handleSignOut}
            />

            <main
              key={activeProfile.id}
              className="custom-scrollbar animate-in fade-in flex-1 overflow-y-auto duration-200"
              style={{ scrollbarGutter: "stable" }}
            >
              <div
                key={pathname}
                className={cn(
                  "@container page-stagger mx-auto w-full px-4 pt-6 pb-12 sm:px-8 sm:pt-10 sm:pb-14 lg:px-10 lg:pt-12 lg:pb-16 xl:px-10",
                  pathname === "/overview" ? "max-w-[1440px]" : "max-w-[960px]",
                )}
              >
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>
      <FxQuickModal />
      {splash !== "off" && <AppSplash leaving={splash === "leaving"} />}
    </SurfaceProvider>
  );
}
