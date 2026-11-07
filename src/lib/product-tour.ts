"use client";

/**
 * The customer's product tour of the dashboard.
 *
 * Not the QA tours in `tour-store.ts` (those coach a tester through onboarding flows). This one is for the
 * customer: a few tooltips, each anchored to a real control through a `data-product-tour` attribute. The
 * page stays live under it, nothing is dimmed, and Skip is on every step.
 *
 * A step is skipped, never faked, when its control isn't on screen (the sidebar is off-canvas on a tablet,
 * the Pay again panel is absent in a layout that has none). The tour's own state is not persisted; only
 * "has this person seen it" is, so the automatic start happens once.
 */

import { create } from "zustand";
import { useSession } from "@/lib/session-store";

export type TourTargetId =
  | "account"
  | "qr"
  | "send-pay"
  | "glance"
  | "more"
  | "profile";

/** What the customer actually has, so a step never describes something that isn't there. */
export interface TourContext {
  multiAccount: boolean;
}

type Side = "top" | "bottom" | "left" | "right";

export interface TourStep {
  id: TourTargetId;
  title: string;
  body: (ctx: TourContext) => string;
  /** Where the tooltip sits from `sm` up. */
  side: Side;
  /** Where it sits on a phone, where there is rarely room beside a control. */
  sideNarrow: Side;
  /** The control that decides whether the step can run, when it isn't the target itself. */
  probe?: TourTargetId;
}

/**
 * In the order a customer's eye moves: the account and what it can do, getting paid, paying, the panels
 * under the balance (one step for all six), the rest of the services, then who they are and their settings.
 */
export const PRODUCT_TOUR_STEPS: TourStep[] = [
  {
    id: "account",
    title: "Account and options",
    body: ({ multiAccount }) =>
      multiAccount
        ? "Switch between your accounts here, and the menu beside it copies your account number, shares your details or downloads a statement."
        : "Open your account details here, and the menu beside it copies your account number, shares your details or downloads a statement.",
    side: "right",
    sideNarrow: "bottom",
  },
  {
    id: "qr",
    title: "Your QR code",
    body: () => "Show it and someone can scan it to pay you.",
    side: "left",
    sideNarrow: "bottom",
  },
  {
    id: "send-pay",
    title: "Send and pay",
    body: () =>
      "Send money, pay bills or top up from here. You review every payment before it goes, and confirm it with a one-time code.",
    side: "bottom",
    sideNarrow: "bottom",
  },
  {
    id: "glance",
    title: "Your account at a glance",
    body: () =>
      "Under your balance: your recent activity, the people and bills you pay again, your spending, your cards, what is coming up and picks for you.",
    side: "left",
    sideNarrow: "bottom",
  },
  {
    id: "more",
    title: "More services",
    body: () => "Lifestyle, FX Rates, EagleSave and your other services are in here.",
    side: "right",
    sideNarrow: "top",
  },
  {
    id: "profile",
    title: "Your profile",
    body: () =>
      "Your name and email are in this menu, with Settings for your profile, security and alerts, and your theme and language. You can log out from here too.",
    side: "bottom",
    sideNarrow: "bottom",
  },
];

/* ── Running state ───────────────────────────────────────────────────────── */

interface ProductTourState {
  active: boolean;
  start: () => void;
  stop: () => void;
}

export const useProductTour = create<ProductTourState>((set) => ({
  active: false,
  start: () => set({ active: true }),
  stop: () => set({ active: false }),
}));

/* ── Has this person seen it ─────────────────────────────────────────────── */

const SEEN_KEY = "nibs-product-tour-seen";

function readSeen(): string[] {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

/** Kept per customer, so the demo personas each get their own first time. */
export function hasSeenTour(actorId: string): boolean {
  return readSeen().includes(actorId);
}

export function markTourSeen(actorId: string) {
  if (!actorId || hasSeenTour(actorId)) return;
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...readSeen(), actorId]));
  } catch {
    // Storage blocked: the tour may offer itself again, which costs nothing.
  }
}

/** Long enough for the welcome dialog to finish closing and the dashboard to settle under it. */
const AUTO_START_DELAY_MS = 600;

/**
 * The automatic start, asked for when a customer reaches their dashboard for the first time (after the
 * welcome, or straight away for someone moving over from the old internet banking). Once per customer.
 * Replaying it on purpose is `useProductTour.getState().start()`.
 */
export function requestProductTour() {
  const actorId = useSession.getState().actor?.id;
  if (!actorId || hasSeenTour(actorId)) return;
  window.setTimeout(() => useProductTour.getState().start(), AUTO_START_DELAY_MS);
}

/* ── Finding a step's control ────────────────────────────────────────────── */

function isShown(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;
  // Off to the side (the sidebar below `lg` is parked off-canvas) counts as not there.
  if (rect.right <= 0 || rect.left >= window.innerWidth) return false;
  if (isFixed(el) && (rect.bottom <= 0 || rect.top >= window.innerHeight)) return false;
  return getComputedStyle(el).visibility !== "hidden";
}

/** Pinned to the viewport (the phone tab bar), so scrolling the page can't bring it into view. */
export function isFixed(el: HTMLElement): boolean {
  for (let node: HTMLElement | null = el; node && node !== document.body; node = node.parentElement) {
    if (getComputedStyle(node).position === "fixed") return true;
  }
  return false;
}

/** The first matching control that is actually on screen. The same step can have a desktop and a phone control. */
export function findTourTarget(id: TourTargetId): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const nodes = document.querySelectorAll<HTMLElement>(`[data-product-tour="${id}"]`);
  for (const el of nodes) {
    if (isShown(el)) return el;
  }
  return null;
}
