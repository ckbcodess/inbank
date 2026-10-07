"use client";

/**
 * Linking a card leaves the app: the customer's bank verifies the card on its
 * own page (3-D Secure) and sends them back. This store carries the card across
 * that round trip and hands the outcome to whichever page they return to.
 *
 * Session-scoped on purpose — a half-finished card link shouldn't survive the
 * browser being closed. Prototype-only: nothing here reaches a real issuer.
 */

import { useEffect, useRef } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useLinkedSources, type LinkedSource } from "@/lib/accounts-store";

export interface PendingCard {
  last4: string;
  expiry: string;
  network: "Visa" | "Mastercard" | "UnionPay" | "Card";
  /** Where to send the customer once their bank is done with them. */
  returnTo: string;
  /** Linked from Add money — reopen it with the new card selected. */
  resumeAddMoney: boolean;
  /** Linked straight after sign-up — the Accounts page follows with the fund prompt. */
  onboarding?: boolean;
}

export type CardLinkResult =
  | { status: "linked"; source: LinkedSource; resumeAddMoney: boolean; onboarding?: boolean }
  | { status: "cancelled"; resumeAddMoney: boolean };

interface CardLinkState {
  pending: PendingCard | null;
  result: CardLinkResult | null;
  start: (card: PendingCard) => void;
  /** Called by the bank's page: saves the card and records the outcome. */
  complete: (verified: boolean) => string;
  clearResult: () => void;
}

export function cardNetwork(digits: string): PendingCard["network"] {
  if (/^4/.test(digits)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(digits)) return "Mastercard";
  if (/^62/.test(digits)) return "UnionPay";
  return "Card";
}

/** Card number as typed: digits only, at most 19, grouped in fours. */
export function formatCardNumber(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 ");
}

/** Expiry as typed: digits only, at most four, shown MM/YY. A first digit above 1 becomes 0N. */
export function formatCardExpiry(raw: string): string {
  let d = raw.replace(/\D/g, "").slice(0, 4);
  if (/^[2-9]/.test(d)) d = `0${d}`.slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

/** American Express codes are four digits, every other network's are three. */
export function cardCvvLength(digits: string): number {
  return /^3[47]/.test(digits) ? 4 : 3;
}

export function formatCardCvv(raw: string, digits: string): string {
  return raw.replace(/\D/g, "").slice(0, cardCvvLength(digits));
}

export function isCardReady(number: string, expiry: string, cvv: string): boolean {
  const digits = number.replace(/\D/g, "");
  return (
    digits.length >= 15 &&
    /^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry.trim()) &&
    cvv.replace(/\D/g, "").length === cardCvvLength(digits)
  );
}

export const useCardLink = create<CardLinkState>()(
  persist(
    (set, get) => ({
      pending: null,
      result: null,
      start: (card) => set({ pending: card, result: null }),
      complete: (verified) => {
        const card = get().pending;
        if (!card) return "/accounts";
        if (verified) {
          const source: LinkedSource = {
            id: `src-card-${Date.now()}`,
            type: "card",
            title: card.network === "Card" ? "Debit card" : `${card.network} debit card`,
            subtitle: `•••• ${card.last4} · Exp ${card.expiry}`,
            maskedNumber: `•••• ${card.last4}`,
          };
          useLinkedSources.getState().addSource(source);
          set({
            pending: null,
            result: { status: "linked", source, resumeAddMoney: card.resumeAddMoney, onboarding: card.onboarding },
          });
        } else {
          set({ pending: null, result: { status: "cancelled", resumeAddMoney: card.resumeAddMoney } });
        }
        return card.returnTo;
      },
      clearResult: () => set({ result: null }),
    }),
    { name: "nibs-card-link", storage: createJSONStorage(() => sessionStorage) },
  ),
);

/** Runs `onResult` once when the customer lands back from their bank. */
export function useCardLinkReturn(onResult: (result: CardLinkResult) => void) {
  const result = useCardLink((s) => s.result);
  const clearResult = useCardLink((s) => s.clearResult);
  const handler = useRef(onResult);
  useEffect(() => {
    handler.current = onResult;
  });

  useEffect(() => {
    if (!result) return;
    clearResult();
    handler.current(result);
  }, [result, clearResult]);
}
