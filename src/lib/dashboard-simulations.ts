/**
 * Dashboard Usage Simulation Scenarios
 *
 * Provides realistic, ledger-compliant mock states for demo and testing purposes.
 * Keeps page components thin, decoupled, and production-ready for live API swapping.
 */

import {
  accountsForProfile,
  transactionsForProfile,
  cardsForProfile,
  type Account,
  type PaymentCard,
  type Transaction,
} from "@/lib/mock-data";
import {
  spendByRangeForProfile,
  cashFlowFor,
  upcomingPayments,
  scheduledOutflow,
  type SpendRange,
  type SpendBreakdown,
  type AttentionItem,
} from "@/lib/dashboard-insights";
import { resolveDefaultAccountId } from "@/lib/accounts-store";
import type { DashData } from "@/components/dashboard/v2/parts";
import type { Actor, Profile } from "@/lib/roles";

export type DashboardUsageType =
  | "active"
  | "attention"
  | "new_customer"
  | "salary_surge"
  | "wealth"
  | "empty"
  | "loading"
  | "error";

export const DASHBOARD_USAGE_STATES: readonly DashboardUsageType[] = [
  "active",
  "attention",
  "new_customer",
  "salary_surge",
  "wealth",
  "empty",
  "loading",
  "error",
] as const;

/**
 * Presentations of the same data, each leaning on a different strength. The
 * `hero` layouts are the Figma dashboard (node 1945:5108) and a split take on it.
 */
export type DashboardLayout =
  | "overview"
  | "focus"
  | "timeline"
  | "insights"
  | "actions"
  | "hero"
  | "hero-split";

/** What the dashboard opens on (Dev Mode can switch it per browser). */
export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayout = "hero-split";

export const DASHBOARD_LAYOUTS: readonly DashboardLayout[] = [
  "overview",
  "focus",
  "timeline",
  "insights",
  "actions",
  "hero",
  "hero-split",
] as const;

export const DASHBOARD_LAYOUT_LABELS: Record<DashboardLayout, string> = {
  overview: "Overview — everything at a glance",
  focus: "Focus — calm, balance first",
  timeline: "Timeline — past and upcoming in one feed",
  insights: "Insights — where the money goes",
  actions: "Actions — get things done fast",
  hero: "Hero — Figma, actions by the greeting",
  "hero-split": "Hero split — balance left, actions right",
};

export const DASHBOARD_STATE_LABELS: Record<DashboardUsageType, string> = {
  active: "Active (Clean Default)",
  attention: "Needs Attention / Alerts",
  new_customer: "New Customer (Fresh)",
  salary_surge: "Salary Day / Inflow",
  wealth: "High Net Worth / Wealth",
  empty: "Empty State (Zero Balance)",
  loading: "Loading",
  error: "Refresh failed",
};

const EMPTY_SPEND_BREAKDOWN: Record<SpendRange, SpendBreakdown> = {
  "1w": { total: 0, count: 0, slices: [] },
  "1m": { total: 0, count: 0, slices: [] },
  "3m": { total: 0, count: 0, slices: [] },
  "6m": { total: 0, count: 0, slices: [] },
  "1y": { total: 0, count: 0, slices: [] },
};

const DEMO_ATTENTION_ITEMS: AttentionItem[] = [
  {
    id: "fail-demo-1",
    tone: "warning",
    title: "Payment didn't go through",
    detail: "ECG Prepaid Electricity · GHS 150.00 · see why and retry",
    href: "/payments/bills",
  },
  {
    id: "card-blocked-demo",
    tone: "destructive",
    title: "Card blocked",
    detail: "Visa Debit · •••• 4012",
    href: "/cards",
  },
  {
    id: "card-expsoon-demo",
    tone: "warning",
    title: "Card expiring soon",
    detail: "Mastercard Virtual · expires next month",
    href: "/cards",
  },
];

interface GetSimulatedDashboardDataOptions {
  actor: Actor;
  activeProfile: Profile;
  usageType: DashboardUsageType;
  /** The account picked in the switcher (`?account=`), if any. */
  accountId: string | null;
  /** The customer's stored default account. */
  defaultAccountId: string | null;
}

/**
 * Everything below the balance — activity, cards, spend — belongs to one
 * account: the picked one when it's valid, else the default.
 */
export function getSimulatedDashboardData({
  actor,
  activeProfile,
  usageType,
  accountId: pickedId,
  defaultAccountId,
}: GetSimulatedDashboardDataOptions): DashData {
  const kind = activeProfile.kind ?? "RETAIL";
  const baseAccounts = accountsForProfile(kind);
  const baseTxns = transactionsForProfile(kind)
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date));
  const baseCards = cardsForProfile(kind);

  let accounts: Account[] = baseAccounts;
  let cards: PaymentCard[] = baseCards;
  let latestTxns: Transaction[] = baseTxns;
  /** null = derive from the ledger for the selected account. */
  let spendByRange: Record<SpendRange, SpendBreakdown> | null = null;
  let attention: AttentionItem[] = [];

  switch (usageType) {
    case "active":
      // Clean default: active user, healthy balances, ZERO attention alerts
      accounts = baseAccounts.map((a) =>
        a.status === "Dormant" ? { ...a, status: "Active" as const } : a,
      );
      cards = baseCards.filter((c) => c.status === "Active");
      attention = [];
      break;

    case "attention":
      // Demonstrates the Needs Attention band with 1-click remedies
      // Pinned to the default account, so switching away shows them leave.
      attention = DEMO_ATTENTION_ITEMS.map((i) => ({
        ...i,
        accountId: resolveDefaultAccountId(baseAccounts, defaultAccountId) ?? undefined,
      }));
      break;

    case "new_customer":
      // Freshly onboarded customer with initial deposit
      accounts = [
        {
          id: "acc-new-1",
          name: "Personal Savings",
          number: "1011 8920 1920",
          currency: "GHS",
          balance: 500,
          available: 500,
          type: "Savings",
          status: "Active",
          profileKind: "RETAIL",
        },
      ];
      cards = [
        {
          id: "card-new-1",
          name: "Visa Virtual Debit",
          maskedNumber: "•••• 8920",
          scheme: "Visa",
          type: "Virtual",
          balance: 500,
          currency: "GHS",
          status: "Active",
          expiry: "12/28",
          spendLimit: 2000,
          linkedAccountId: "acc-new-1",
          holder: actor.name,
          fundable: true,
          isVirtual: true,
        },
      ];
      latestTxns = [
        {
          id: "txn-new-1",
          reference: "NIB-2026-000101",
          date: new Date().toISOString().slice(0, 10),
          valueDate: new Date().toISOString().slice(0, 10),
          description: "Opening Deposit",
          counterparty: "GCB Instant Transfer",
          counterpartyAccount: "0100 8821 9912",
          accountId: "acc-new-1",
          amount: 500,
          currency: "GHS",
          direction: "credit",
          kind: "single",
          channel: "Internet Banking",
          state: "completed",
        },
      ];
      spendByRange = EMPTY_SPEND_BREAKDOWN;
      attention = [];
      break;

    case "salary_surge":
      // Payday / salary inflow spike
      latestTxns = [
        {
          id: "txn-salary-surge",
          reference: "NIB-2026-992810",
          date: new Date().toISOString().slice(0, 10),
          valueDate: new Date().toISOString().slice(0, 10),
          description: "Monthly Payroll Credit",
          counterparty: "Consolidated Shipping Ltd",
          counterpartyAccount: "0100 4481 2291",
          accountId: baseAccounts[0]?.id ?? "acc-personal",
          amount: 28450.0,
          currency: "GHS",
          direction: "credit",
          kind: "single",
          channel: "ACH Direct Credit",
          state: "completed",
        },
        ...baseTxns,
      ];
      accounts = baseAccounts.map((a, idx) =>
        idx === 0
          ? { ...a, balance: (a.balance ?? 0) + 28450, available: (a.available ?? 0) + 28450 }
          : a,
      );
      attention = [];
      break;

    case "wealth":
      // High Net Worth multi-currency balances
      accounts = [
        {
          id: "acc-w-1",
          name: "Premier Current Account",
          number: "1018 9024 5100",
          currency: "GHS",
          balance: 285400.0,
          available: 285400.0,
          type: "Current",
          status: "Active",
          profileKind: "RETAIL",
        },
        {
          id: "acc-w-2",
          name: "Platinum High-Yield Savings",
          number: "1028 9045 1200",
          currency: "GHS",
          balance: 450000.0,
          available: 450000.0,
          type: "Savings",
          status: "Active",
          profileKind: "RETAIL",
        },
        {
          id: "acc-w-3",
          name: "USD Global Reserve",
          number: "2019 9041 2300",
          currency: "USD",
          balance: 65000.0,
          available: 65000.0,
          type: "Foreign Currency",
          status: "Active",
          profileKind: "RETAIL",
        },
      ];
      attention = [];
      break;

    case "empty":
      // Clean zero-balance state
      accounts = [
        {
          id: "acc-emp-1",
          name: "Personal Savings",
          number: "1011 8920 1920",
          currency: "GHS",
          balance: 0,
          available: 0,
          type: "Savings",
          status: "Active",
          profileKind: "RETAIL",
        },
      ];
      cards = [];
      latestTxns = [];
      spendByRange = EMPTY_SPEND_BREAKDOWN;
      attention = [];
      break;
  }

  const defaultId = resolveDefaultAccountId(accounts, defaultAccountId);
  const selectedId = accounts.some((a) => a.id === pickedId) ? (pickedId as string) : defaultId;

  const today = new Date().toISOString().slice(0, 10);

  return {
    firstName: actor.name.split(" ")[0],
    accounts,
    defaultAccountId: defaultId,
    selectedAccountId: selectedId,
    spendByRange: spendByRange ?? spendByRangeForProfile(kind, selectedId ?? undefined),
    cashFlow: cashFlowFor(latestTxns, selectedId ?? "", 30),
    latestTxns: latestTxns.filter((t) => t.accountId === selectedId),
    cards: cards.filter((c) => c.linkedAccountId === selectedId),
    upcoming: selectedId ? upcomingPayments(selectedId, today, 4) : [],
    scheduledNext30: selectedId ? scheduledOutflow(selectedId, today, 30) : 0,
    // Items about another account belong on that account's view.
    attention: attention.filter((i) => !i.accountId || i.accountId === selectedId),
  };
}
