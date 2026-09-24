"use client";

/**
 * Accounts vs sources of funds — the two things the customer manages on
 * `/accounts`, kept apart on purpose.
 *
 * - **Accounts** are where money lives (GCB accounts, or the wallet for a
 *   customer who has no GCB account). They come from the bank, never from the
 *   customer, so the only preference stored here is which one is the default.
 * - **Linked sources** (MoMo wallets, cards from other banks) are ways money
 *   gets in. We never hold or show their balance.
 *
 * One store serves the Accounts page and the Add money modal, so a source linked
 * in-flow appears on the page immediately (and vice versa).
 *
 * Prototype-only: persisted per browser like the other client stores.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type NetworkOperator = "MTN" | "Telecel" | "AT";

export interface LinkedSource {
  id: string;
  type: "momo" | "card";
  title: string;
  subtitle: string;
  operator?: NetworkOperator;
  maskedNumber: string;
}

export const DEFAULT_LINKED_SOURCES: LinkedSource[] = [
  {
    id: "src-momo-1",
    type: "momo",
    title: "MTN Mobile Money",
    subtitle: "024 123 4567",
    operator: "MTN",
    maskedNumber: "024 123 4567",
  },
  {
    id: "src-momo-2",
    type: "momo",
    title: "Telecel Cash",
    subtitle: "020 987 6543",
    operator: "Telecel",
    maskedNumber: "020 987 6543",
  },
  {
    id: "src-card-1",
    type: "card",
    title: "Ecobank Visa Debit",
    subtitle: "•••• 9102 · Exp 12/28",
    maskedNumber: "•••• 9102",
  },
];

interface LinkedSourcesState {
  sources: LinkedSource[];
  /** Newest first, so a just-linked source sits at the top of every list. */
  addSource: (source: LinkedSource) => void;
  removeSource: (id: string) => void;
  /** Put a removed source back where it was (undo). */
  restoreSource: (source: LinkedSource, index: number) => void;
  /** Replace the whole list — used by Dev Mode customer configurations. */
  setSources: (sources: LinkedSource[]) => void;
}

export const useLinkedSources = create<LinkedSourcesState>()(
  persist(
    (set) => ({
      sources: DEFAULT_LINKED_SOURCES,
      addSource: (source) => set((s) => ({ sources: [source, ...s.sources] })),
      removeSource: (id) => set((s) => ({ sources: s.sources.filter((x) => x.id !== id) })),
      restoreSource: (source, index) =>
        set((s) => {
          if (s.sources.some((x) => x.id === source.id)) return s;
          const next = [...s.sources];
          next.splice(Math.min(index, next.length), 0, source);
          return { sources: next };
        }),
      setSources: (sources) => set({ sources }),
    }),
    { name: "nibs-linked-sources" },
  ),
);

interface AccountPrefsState {
  /** The account payments and top-ups use unless the customer picks another. */
  defaultAccountId: string | null;
  setDefaultAccount: (id: string) => void;
  /**
   * Accounts the customer added themselves ("Add Account" → selfie → pick one
   * held under their Ghana Card), on top of the ones the profile came with.
   */
  addedAccountIds: string[];
  addAccount: (id: string) => void;
  /**
   * A wallet customer who adds a GCB account: the wallet balance moved there
   * and the wallet went back to being hidden plumbing.
   */
  walletMigration: { toAccountId: string; amount: number; dismissed: boolean } | null;
  migrateWallet: (toAccountId: string, amount: number) => void;
  dismissWalletMigration: () => void;
  /** Dev Mode: switching customer configuration starts from a clean slate. */
  clearAddedAccounts: () => void;
}

export const useAccountPrefs = create<AccountPrefsState>()(
  persist(
    (set) => ({
      defaultAccountId: null,
      setDefaultAccount: (id) => set({ defaultAccountId: id }),
      addedAccountIds: [],
      addAccount: (id) =>
        set((s) => (s.addedAccountIds.includes(id) ? s : { addedAccountIds: [...s.addedAccountIds, id] })),
      clearAddedAccounts: () => set({ addedAccountIds: [], walletMigration: null }),
      walletMigration: null,
      migrateWallet: (toAccountId, amount) =>
        set({ walletMigration: { toAccountId, amount, dismissed: false }, defaultAccountId: toAccountId }),
      // Hides the "Your GCB account is ready" note; the move itself stands.
      dismissWalletMigration: () =>
        set((s) => (s.walletMigration ? { walletMigration: { ...s.walletMigration, dismissed: true } } : s)),
    }),
    { name: "nibs-account-prefs" },
  ),
);

/** The stored default when it's one of `accounts`, else the first active one. */
export function resolveDefaultAccountId(
  accounts: { id: string; status: string }[],
  storedId: string | null,
): string | null {
  if (storedId && accounts.some((a) => a.id === storedId && a.status === "Active")) return storedId;
  return accounts.find((a) => a.status === "Active")?.id ?? null;
}
