"use client";

/**
 * Guided-tour state for the Persona & Flow switcher.
 *
 * A tour is a scripted walk-through of a real onboarding journey: instead of
 * teleporting a tester into the middle of a flow, we spotlight the exact
 * control to click at each step and narrate why. The switcher launches a tour,
 * the pages carry `data-tour` anchors, and `TourOverlay` renders the spotlight.
 *
 * Not persisted — a tour is a live coaching session, not session state. A full
 * page reload ends it (onboarding flows are client-side machines, so the tour
 * survives every in-app navigation without a reload).
 */

import { create } from "zustand";
import { TOURS } from "./tours";

interface TourState {
  activeTourId: string | null;
  stepIndex: number;

  /** Begin a tour at its first step. Idempotent per id. */
  start: (tourId: string) => void;
  /** Advance one step; completing the last step ends the tour. */
  next: () => void;
  /** Step back, never past the first step. */
  prev: () => void;
  /** End the tour immediately. */
  stop: () => void;
}

export const useTour = create<TourState>((set, get) => ({
  activeTourId: null,
  stepIndex: 0,

  start: (tourId) => set({ activeTourId: tourId, stepIndex: 0 }),

  next: () => {
    const { activeTourId, stepIndex } = get();
    if (!activeTourId) return;
    const tour = TOURS.find((t) => t.id === activeTourId);
    if (!tour) return;
    if (stepIndex >= tour.steps.length - 1) {
      set({ activeTourId: null, stepIndex: 0 });
      return;
    }
    set({ stepIndex: stepIndex + 1 });
  },

  prev: () =>
    set((s) => ({ stepIndex: Math.max(0, s.stepIndex - 1) })),

  stop: () => set({ activeTourId: null, stepIndex: 0 }),
}));

/** True while a tour is running — for the last-step "complete" branch in the UI. */
export function isLastStep(tourId: string, stepIndex: number): boolean {
  const tour = TOURS.find((t) => t.id === tourId);
  return !!tour && stepIndex >= tour.steps.length - 1;
}
