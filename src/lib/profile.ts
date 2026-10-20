/**
 * The neutral way for any screen or lib to ask "which relationship is this?".
 *
 * Personal and business banking are separate surfaces, but a few screens are still shared between them
 * (accounts, cards, payments, beneficiaries...) and read the active profile to pick their data. They ask
 * through these helpers and never compare against a relationship name themselves, so the day a shared
 * screen gets a business version there is one place to change, and the retail lint firewall can stay strict.
 */

import type { Profile, ProfileKind } from "./roles";

export type { ProfileKind } from "./roles";

/**
 * What a row or a session with no stated relationship counts as. It is the prototype's original default
 * (unmarked data was the business ledger); every seeded row now carries an explicit kind, so it only
 * decides the unlikely cases: a standing order whose account is missing, a signed-out read.
 */
export const DEFAULT_PROFILE_KIND: ProfileKind = "CORPORATE";

/** The relationship a ledger row (account, transaction, card) belongs to. */
export function rowKind(row: { profileKind?: ProfileKind } | null | undefined): ProfileKind {
  return row?.profileKind ?? DEFAULT_PROFILE_KIND;
}

export function isBusinessKind(kind: ProfileKind | null | undefined): boolean {
  return kind === "CORPORATE";
}

/** True when the session is acting for a business. False for personal banking and for no profile. */
export function isBusinessProfile(profile: Pick<Profile, "kind"> | null | undefined): boolean {
  return isBusinessKind(profile?.kind);
}
