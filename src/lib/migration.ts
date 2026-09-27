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
import type { Actor } from "./roles";

/** Old internet-banking user IDs the login screen recognises (case-insensitive). */
const LEGACY_USER_IDS: Record<string, string> = {
  EQUAYE01: "u-legacy",
};

export const LEGACY_DEMO_USER_ID = "EQUAYE01";

export function findLegacyUser(userId: string): Actor | undefined {
  const actorId = LEGACY_USER_IDS[userId.trim().toUpperCase()];
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
  payees: [
    { name: "Kwabena Asante", detail: "MTN MoMo · 024 •••• 118" },
    { name: "ECG Prepaid", detail: "Meter •••• 2231" },
    { name: "Ama Owusu", detail: "Ecobank · •••• 7702" },
    { name: "Ghana Water", detail: "Account •••• 5510" },
    { name: "Kojo Mensah", detail: "GCB Bank · •••• 3381" },
    { name: "DStv", detail: "Smartcard •••• 0917" },
  ],
  standingOrders: [
    { name: "Rent — Adjei Properties", detail: "GHS 2,500.00 · monthly, 1st" },
    { name: "Mum — MTN MoMo", detail: "GHS 400.00 · monthly, 25th" },
  ],
} as const;
