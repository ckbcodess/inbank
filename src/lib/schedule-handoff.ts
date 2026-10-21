"use client";

/**
 * Hands a completed payment to the Schedule Payment form. The details stay in memory rather than the URL (they
 * include account and phone numbers), so the form opens already filled in and the customer only chooses when and how
 * often. It carries what was shown on the receipt, so it works for every kind of payment, not just the ones a
 * scheduled payment has its own form for.
 */

import { create } from "zustand";

export interface ScheduleDraft {
  /** What kind of payment it was, in the words the Scheduled Payments list uses ("Bank transfer", "Airtime", "ECG"). */
  kind: string;
  /** Who it pays: the name where we have one. */
  recipient: string;
  /** The rest of the payment, in the order it reads: account or number, bank or network, bundle, method. */
  details: Array<[label: string, value: string]>;
  amount: number;
  fee: number;
  currency: string;
  /** The account it was paid from. */
  fromId: string;
  /** How that account reads ("Current Account (∗∗4821)"). */
  fromLabel: string;
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
