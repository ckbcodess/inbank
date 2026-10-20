/**
 * The business ledger's spending profile for the Insights charts: what a company's year of activity
 * looks like. Personal banking's profile stays in `insights.ts`, which assembles both.
 */

import type { ProfileModel } from "../insights";

export const CORPORATE_INSIGHTS_MODEL: ProfileModel = {
    seed: 0x1b_a5e1,
    categories: [
      { category: "Payroll", perMonth: 1, min: 268_000, max: 302_000, dayOfMonth: 25, channels: ["Bank transfers"] },
      { category: "Suppliers", perMonth: 16, min: 4_200, max: 46_000, channels: ["Bank transfers", "Bank transfers", "Mobile money"] },
      { category: "Trade & Imports", perMonth: 2, min: 42_000, max: 128_000, channels: ["Cross-border"] },
      { category: "Rent & Facilities", perMonth: 1, min: 17_800, max: 18_900, dayOfMonth: 1, channels: ["Bank transfers"] },
      { category: "Utilities", perMonth: 4, min: 900, max: 4_800, channels: ["Bills & airtime"] },
      { category: "Travel", perMonth: 6, min: 1_100, max: 9_600, channels: ["Card payments"] },
      { category: "Taxes & Levies", perMonth: 1, min: 22_000, max: 46_000, dayOfMonth: 15, channels: ["Bank transfers"] },
      { category: "Bank Charges", perMonth: 10, min: 25, max: 480, channels: ["Bank fees"] },
    ],
    // Spread across more, smaller receipts than a handful of large ones, so the
    // daily view is not mostly empty bars.
    income: [{ perMonth: 10, min: 30_000, max: 280_000 }],
    primaryAccount: "acc-001",
    // Salaries are disbursed from the dedicated payroll account, so scoping
    // insights to it shows payroll alone — which is the point of scoping.
    categoryAccounts: { Payroll: "acc-002" },
    // …and that account is funded from the current account the day before, so
    // scoping to it shows a funded account rather than one paying out of
    // nowhere.
    transfers: [
      { from: "acc-001", to: "acc-002", perMonth: 1, min: 272_000, max: 304_000, dayOfMonth: 24 },
    ],
  };
