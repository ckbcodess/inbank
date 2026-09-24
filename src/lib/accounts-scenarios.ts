/**
 * Dev Mode customer configurations for `/accounts`.
 *
 * Each one is a customer the accounts model has to serve (see the "Wallets as
 * Plumbing" proposal): GCB account holders never see a wallet — it's a hidden
 * pass-through when they link a source — while customers who onboarded with
 * MoMo or a card see the wallet as their one account.
 */

import { create } from "zustand";
import { DEFAULT_LINKED_SOURCES, type LinkedSource } from "./accounts-store";
import { GHANA_CARD_ACCOUNT_IDS } from "./mock-data";

export type AccountsScenarioId =
  | "gcb"
  | "gcb-no-sources"
  | "gcb-joint-dormant"
  | "gcb-pending"
  | "wallet-momo"
  | "wallet-card"
  | "migrated";

export interface AccountsScenario {
  id: AccountsScenarioId;
  label: string;
  /** Wallet customers have no GCB account; their wallet is the account. */
  customer: "gcb" | "wallet";
  accountIds: string[];
  /**
   * Every GCB account held under this customer's Ghana Card — what "Add
   * Account" lists after the selfie. Wallet customers usually hold none.
   */
  ghanaCardAccountIds: readonly string[];
  sources: LinkedSource[];
  /** A top-up whose onward move to the default account hasn't landed yet. */
  pending?: { amount: number; from: string };
  /** Just added a GCB account; the wallet balance moved over. */
  migrated?: { amount: number };
}

const MTN = DEFAULT_LINKED_SOURCES[0];
const ONBOARDING_CARD: LinkedSource = {
  id: "src-card-onboarding",
  type: "card",
  title: "Stanbic Visa Debit",
  subtitle: "•••• 4410 · Exp 03/29",
  maskedNumber: "•••• 4410",
};

export const ACCOUNTS_SCENARIOS: AccountsScenario[] = [
  {
    id: "gcb",
    label: "GCB customer · sources linked",
    customer: "gcb",
    accountIds: ["acc-ret-001", "acc-ret-002"],
    ghanaCardAccountIds: GHANA_CARD_ACCOUNT_IDS,
    sources: DEFAULT_LINKED_SOURCES,
  },
  {
    id: "gcb-no-sources",
    label: "GCB customer · nothing linked",
    customer: "gcb",
    accountIds: ["acc-ret-001", "acc-ret-002"],
    ghanaCardAccountIds: GHANA_CARD_ACCOUNT_IDS,
    sources: [],
  },
  {
    id: "gcb-joint-dormant",
    label: "GCB customer · joint & dormant",
    customer: "gcb",
    accountIds: ["acc-ret-001", "acc-joint", "acc-ret-dormant"],
    ghanaCardAccountIds: ["acc-ret-001", "acc-joint", "acc-ret-dormant", "acc-ret-home"],
    sources: [MTN],
  },
  {
    id: "gcb-pending",
    label: "GCB customer · top-up on its way",
    customer: "gcb",
    accountIds: ["acc-ret-001", "acc-ret-002"],
    ghanaCardAccountIds: GHANA_CARD_ACCOUNT_IDS,
    sources: DEFAULT_LINKED_SOURCES,
    pending: { amount: 200, from: "MTN Mobile Money" },
  },
  {
    id: "wallet-momo",
    label: "Wallet customer · MoMo · holds a GCB account",
    customer: "wallet",
    accountIds: ["acc-wallet"],
    // Opened an account at a branch after signing up with MoMo.
    ghanaCardAccountIds: ["acc-ret-salary"],
    sources: [MTN],
  },
  {
    id: "wallet-card",
    label: "Wallet customer · card · no GCB account",
    customer: "wallet",
    accountIds: ["acc-wallet"],
    ghanaCardAccountIds: [],
    sources: [ONBOARDING_CARD],
  },
  {
    id: "migrated",
    label: "Wallet → just added GCB account",
    customer: "gcb",
    accountIds: ["acc-ret-new"],
    ghanaCardAccountIds: ["acc-ret-new"],
    sources: [MTN],
    migrated: { amount: 340 },
  },
];

export function findScenario(id: AccountsScenarioId): AccountsScenario {
  return ACCOUNTS_SCENARIOS.find((s) => s.id === id) ?? ACCOUNTS_SCENARIOS[0];
}

/* Which configuration Dev Mode is showing — survives client navigation, not reloads. */

interface AccountsScenarioState {
  scenarioId: AccountsScenarioId;
  setScenarioId: (id: AccountsScenarioId) => void;
}

export const useAccountsScenario = create<AccountsScenarioState>()((set) => ({
  scenarioId: "gcb",
  setScenarioId: (scenarioId) => set({ scenarioId }),
}));
