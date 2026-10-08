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
import { AnimatePresence, motion } from "framer-motion";
import Sidebar from "./Sidebar";
import TopHeader from "./TopHeader";
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
    <>
      <div className="flex h-dvh overflow-hidden bg-[var(--surface)]">
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-md lg:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
          )}
        </AnimatePresence>

        <Sidebar
          items={navItems}
          shell="admin"
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapse}
        />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[var(--surface)] p-0 sm:p-3 lg:p-3.5">
          <div className="shell-card relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-none border-0 shadow-none sm:rounded-2xl sm:border sm:border-border sm:shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
            <TopHeader
              actor={actor}
              onMenuToggle={() => setSidebarOpen((p) => !p)}
              onSignOut={handleSignOut}
            />

            <main
              className="custom-scrollbar flex-1 overflow-y-auto pt-14"
              style={{ scrollbarGutter: "stable" }}
            >
              <div key={pathname} className="page-stagger mx-auto w-full max-w-[960px] px-4 pt-10 pb-12 sm:px-8 sm:pt-10 sm:pb-14 lg:px-10 lg:pt-12 lg:pb-16 xl:px-10">{children}</div>
            </main>
          </div>
        </div>
      </div>
    </>
  );
}
