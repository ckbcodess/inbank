/**
 * The Demo hub ("Jump to a step"): the onboarding, sign-in and migration flows. It opens from the Dev Mode panel,
 * and the panel offers it on the screens listed here.
 */

import { create } from "zustand";

/** Screens that belong to the onboarding and sign-in flows, plus the two dashboards that show the post-onboarding cards. */
export const DEMO_HUB_PATHS = [
  "/",
  "/signup",
  "/business/signup",
  "/business/activate",
  "/activate",
  "/get-started",
  "/select-banking",
  "/login",
  "/mfa",
  "/forgot-password",
  "/migrate",
  "/overview",
  "/business/overview",
];

/** The two dashboards are the signed-in shell, which has its own Dev Mode button in the header. */
const SHELL_DASHBOARDS = ["/overview", "/business/overview"];

function matches(pathname: string | null, paths: string[]) {
  return paths.some((p) => (p === "/" ? pathname === "/" : !!pathname?.startsWith(p)));
}

export function isDemoHubPath(pathname: string | null): boolean {
  return matches(pathname, DEMO_HUB_PATHS);
}

/** A screen with no app header, so the Dev Mode button can't sit in one: the floating pill stands in for it. */
export function isPreAuthPath(pathname: string | null): boolean {
  return isDemoHubPath(pathname) && !matches(pathname, SHELL_DASHBOARDS);
}

interface DemoHubState {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const useDemoHub = create<DemoHubState>()((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
