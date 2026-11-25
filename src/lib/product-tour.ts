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
 * Top of the screen to the bottom, so the tour only ever scrolls down: the top bar (who you are), the account and
 * its QR code, Send & Pay, the panels under the balance (one step for all six), then the services at the foot of
 * the page. Pinned controls (top bar, sidebar, phone tab bar) never move the page.
 */
export const PRODUCT_TOUR_STEPS: TourStep[] = [
  {
    id: "profile",
    title: "Your Profile & Settings",
    body: () =>
      "Manage your personal details, app appearance, security preferences and notifications. You can also log out securely when you're done.",
    side: "bottom",
    sideNarrow: "bottom",
  },
  {
    id: "account",
    title: "Account & Options",
    body: ({ multiAccount }) =>
      multiAccount
        ? "Switch between your accounts and use the options menu to copy your account number, share your account details or download your statement."
        : "Open your account details and use the options menu to copy your account number, share your account details or download your statement.",
    side: "right",
    sideNarrow: "bottom",
  },
  {
    id: "qr",
    title: "Get Paid with Your QR Code",
    body: () => "Share your QR code and let others scan to send money directly to your account.",
    side: "left",
    sideNarrow: "bottom",
  },
  {
    id: "send-pay",
    title: "Send & Pay",
    body: () =>
      "Transfer money, pay bills and top up with ease. Review your transactions and securely confirm each payment with a one-time code.",
    side: "bottom",
    sideNarrow: "bottom",
  },
  {
    id: "glance",
    title: "Your Account Overview",
    body: () =>
      "Get a clear view of your finances, including recent transactions, frequent payments, spending insights, cards, upcoming payments and personalised offers.",
    side: "left",
    sideNarrow: "bottom",
  },
  {
    id: "more",
    title: "Explore More Services",
    body: () =>
      "Access more banking and lifestyle services, check FX rates, explore EagleSave and discover other services available to you.",
    side: "right",
    sideNarrow: "top",
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
