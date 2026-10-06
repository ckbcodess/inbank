"use client";

/**
 * Paying by card leaves the app. The customer's own bank approves the payment on its page (3-D Secure) and sends
 * them back. This store carries the payment across that round trip, then hands the outcome to the flow that
 * asked for it, so the flow can pick up where it left off (the receipt on approval, the form on a decline).
 *
 * Linking a card for later (no money moving) has its own store in `card-link.ts` and uses the same bank page.
 *
 * Session-scoped on purpose: a half-finished card payment shouldn't survive the browser being closed.
 * Prototype-only: nothing here reaches a real issuer, and only the last four digits ever make the trip.
 */

import { useEffect, useRef } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/** Which flow asked for the payment, so the page it returns to knows who should pick it up. */
export type CardPaymentFlow = "quick-fund" | "welcome-fund" | "linked-source-fund";

export interface PendingCardPayment {
  flow: CardPaymentFlow;
  amount: number;
  currency: string;
  last4: string;
  network: "Visa" | "Mastercard" | "UnionPay" | "Card";
  /** Who is taking the payment, as the bank's page names them. */
  merchant: string;
  /** What it is for, in a few words ("Top up Savings Account"). */
  description: string;
  /** Where to send the customer once their bank is done with them. */
  returnTo: string;
  /** Anything the flow needs to carry on where it left off. Strings only, so it survives the round trip. */
  context?: Record<string, string>;
}

export interface CardPaymentResult {
  status: "approved" | "cancelled";
  payment: PendingCardPayment;
}

interface CardPaymentState {
  pending: PendingCardPayment | null;
  result: CardPaymentResult | null;
  start: (payment: PendingCardPayment) => void;
  /** Called by the bank's page. Records the outcome and returns where to send the customer. */
  complete: (approved: boolean) => string;
  clearResult: () => void;
}

export const useCardPayment = create<CardPaymentState>()(
  persist(
    (set, get) => ({
      pending: null,
      result: null,
      start: (payment) => set({ pending: payment, result: null }),
      complete: (approved) => {
        const payment = get().pending;
        if (!payment) return "/overview";
        set({ pending: null, result: { status: approved ? "approved" : "cancelled", payment } });
        return payment.returnTo;
      },
      clearResult: () => set({ result: null }),
    }),
    { name: "nibs-card-payment", storage: createJSONStorage(() => sessionStorage) },
  ),
);

/** Runs `onResult` once when the customer lands back from their bank, if the payment was this flow's. */
export function useCardPaymentReturn(flow: CardPaymentFlow, onResult: (result: CardPaymentResult) => void) {
  const result = useCardPayment((s) => s.result);
  const clearResult = useCardPayment((s) => s.clearResult);
  const handler = useRef(onResult);
  useEffect(() => {
    handler.current = onResult;
  });

  useEffect(() => {
    if (!result || result.payment.flow !== flow) return;
    clearResult();
    handler.current(result);
  }, [result, flow, clearResult]);
}
