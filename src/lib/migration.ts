/**
 * Moving from the old GCB internet banking to this one.
 *
 * The rollout's first wave: people who already bank online with GCB meet the
 * new system for the first time. They arrive worried about one thing — "where
 * did my stuff go?" — so the flow proves continuity before it asks for
 * anything, and asks for as little as possible:
 *
 *   welcome → verify it's you → what came across → new password → finish
 *
 * Their transaction PIN, accounts, payees and standing orders carry over, so
 * none are re-entered. Only the password is new (old ones can't be carried
 * across safely). Terms and "remember this device" share the last screen.
 */

import { ACTORS } from "./mock-data";
import { toLocalMobile } from "./phone";
import type { Actor } from "./roles";

/** The registered mobile of the demo customer who is still on the old internet banking. */
export const LEGACY_DEMO_MOBILE = "0551234118";

/** Mobile numbers the login screen recognises as old internet-banking customers. */
const LEGACY_MOBILES: Record<string, string> = {
  [LEGACY_DEMO_MOBILE]: "u-legacy",
};

export function findLegacyUser(mobile: string): Actor | undefined {
  const actorId = LEGACY_MOBILES[toLocalMobile(mobile)];
  return actorId ? ACTORS.find((a) => a.id === actorId) : undefined;
}

export const MIGRATION_STEPS = [
  { id: "welcome", label: "Welcome" },
  { id: "verify", label: "Confirm It's You" },
  { id: "carried", label: "Your Details Came With You" },
  { id: "password", label: "Create a New Password" },
  { id: "finish", label: "Finish Up" },
] as const;

export type MigrationStep = (typeof MIGRATION_STEPS)[number]["id"];

export function parseMigrationStep(value: string | null): MigrationStep | null {
  return MIGRATION_STEPS.some((s) => s.id === value) ? (value as MigrationStep) : null;
}

/** What the old system held for the demo customer — shown back so they can see it arrived. */
export const MIGRATED_DATA = {
  lastLegacySignIn: "2026-09-14T19:22:00Z",
  accounts: [
    { name: "Personal Current", number: "•••• 4561" },
    { name: "Savings", number: "•••• 9922" },
  ],
  // `recipient` is what the payment deep link opens with (number, account or reference); `detail` is what's shown.
  payees: [
    { name: "Kwabena Asante", detail: "MTN MoMo · 024 •••• 118", rail: "wallet", recipient: "0244556118" },
    { name: "ECG Prepaid", detail: "Meter •••• 2231", rail: "ecg", recipient: "04122231" },
    { name: "Ama Owusu", detail: "Ecobank · •••• 7702", rail: "bank", recipient: "1441007702", bank: "Ecobank Ghana" },
    { name: "Ghana Water", detail: "Account •••• 5510", rail: "bill", recipient: "GW005510", billerId: "bil-002" },
    { name: "Kojo Mensah", detail: "GCB Bank · •••• 3381", rail: "bank", recipient: "1023003381", bank: "GCB Bank" },
    { name: "KNUST fees", detail: "Student ID •••• 4417", rail: "bill", recipient: "20914417", billerId: "bil-008b" },
  ],
  standingOrders: [
    { name: "Rent — Adjei Properties", detail: "GHS 2,500.00 · monthly, 1st" },
    { name: "Mum — MTN MoMo", detail: "GHS 400.00 · monthly, 25th" },
  ],
} as const;
