"use client";

/**
 * Hands a completed payment to the Schedule Payment form. The details stay in
 * memory rather than the URL (they include account and phone numbers), so the
 * form opens filled in and the customer only chooses how often and when.
 */

import { create } from "zustand";

export interface ScheduleDraft {
  /** The standing order rail the payment schedules as (see StandingOrderFlow). */
  rail: string;
  recipient: string;
  bank: string;
  network: string;
  fromId: string;
  amount: string;
  narration: string;
}

interface ScheduleHandoffState {
  draft: ScheduleDraft | null;
  setDraft: (draft: ScheduleDraft | null) => void;
}

export const useScheduleHandoff = create<ScheduleHandoffState>()((set) => ({
  draft: null,
  setDraft: (draft) => set({ draft }),
}));
