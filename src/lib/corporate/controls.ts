/**
 * The company's control model (BRD v2 BRL-03 to BRL-10, UAR-03 to UAR-05): who may do what, up to how much,
 * on which accounts, and which approval steps a payment passes before it leaves.
 *
 * Who changes it (designer decision 2026-10-22, option C): the bank sets the ceilings at setup (which accounts are
 * enabled, the highest limit one person may hold, the approval matrix, the daily limit). Inside them the company's
 * administrator looks after users. Anything that widens access (a new user, a new role, a higher limit, another
 * account, reactivating someone) waits for a second person, an Authoriser or another administrator, who approves it
 * with a one-time code; nobody approves their own change. Anything that narrows access applies at once, because
 * stopping is never harder than starting. Reviewers and authorisers must be on the mandate (BRL-03), and the mandate
 * itself only changes at the bank.
 *
 * One table per company so every screen reads the same facts: the payment form checks the inputter's limit, the
 * queue shows each person only what they may act on, and the account lists show only the accounts a person may see.
 */

import { useSyncExternalStore } from "react";
import { findAccount } from "../mock-data";
import { roundMoney, sumMoney } from "../money";
import type { Actor } from "../roles";
import type { ApprovalStepKind } from "./roles";

export type CompanyRole = "Inputter" | "Reviewer" | "Authoriser" | "Viewer" | "Administrator";

/** Payment roles carry a limit; Viewers and Administrators don't take part in payments. */
export function roleHasLimit(role: CompanyRole): boolean {
  return role === "Inputter" || role === "Reviewer" || role === "Authoriser";
}

/** Reviewers and authorisers must be named on the mandate (BRL-03). */
export function roleNeedsMandate(role: CompanyRole): boolean {
  return role === "Reviewer" || role === "Authoriser";
}

export interface CompanyUser {
  id: string;
  /** The demo persona this person signs in as, where there is one. */
  actorId?: string;
  name: string;
  email: string;
  designation: string;
  role: CompanyRole;
  /** Named on the account mandate. Reviewers and authorisers must be (BRL-03). */
  onMandate: boolean;
  /**
   * The most this person may act on in one payment, in GHS: initiate (Inputter), pass on (Reviewer) or release
   * (Authoriser). An Administrator holds no payment limit.
   */
  limit: number;
  /** The accounts this person can see and act on (UAR-05). */
  accountIds: string[];
  status: "Active" | "Suspended";
}

/** What the limit means for each role, in the words the screens use. */
export const LIMIT_MEANING: Record<CompanyRole, string> = {
  Inputter: "Most they can prepare in one payment",
  Reviewer: "Most they can pass on in one payment",
  Authoriser: "Most they can release in one payment",
  Viewer: "No payment limit: viewers only see balances and history",
  Administrator: "No payment limit: administrators don't take part in payments",
};

export const ROLE_LINE: Record<CompanyRole, string> = {
  Inputter: "Prepares payments. Someone else reviews and authorises them.",
  Reviewer: "Checks payments and passes them on, or sends them back with a comment.",
  Authoriser: "Gives the final approval that sends a payment.",
  Viewer: "Sees balances, statements and history.",
  Administrator: "Looks after the company's users.",
};

/** Adinkra Textiles, the demo company. */
export const COMPANY_USERS: CompanyUser[] = [
  {
    id: "cu-ransford",
    actorId: "u-dual",
    name: "Ransford Gyasi",
    email: "ransford.gyasi@adinkratextiles.com",
    designation: "Executive Director",
    role: "Inputter",
    onMandate: true,
    limit: 1_000_000,
    accountIds: ["acc-001", "acc-002"],
    status: "Active",
  },
  {
    id: "cu-justice",
    actorId: "u-reviewer",
    name: "Justice Oduro",
    email: "justice.oduro@adinkratextiles.com",
    designation: "Financial Controller",
    role: "Reviewer",
    onMandate: true,
    limit: 1_000_000,
    accountIds: ["acc-001", "acc-002", "acc-003"],
    status: "Active",
  },
  {
    id: "cu-esther",
    actorId: "u-approver",
    name: "Esther Appiah",
    email: "esther.appiah@adinkratextiles.com",
    designation: "Finance Director",
    role: "Authoriser",
    onMandate: true,
    limit: 500_000,
    accountIds: ["acc-001", "acc-002", "acc-003"],
    status: "Active",
  },
  {
    id: "cu-samuel",
    actorId: "u-corpadmin",
    name: "Samuel Quartey",
    email: "samuel.quartey@adinkratextiles.com",
    designation: "Head of Operations",
    role: "Administrator",
    onMandate: false,
    limit: 0,
    accountIds: ["acc-001", "acc-002", "acc-003"],
    status: "Active",
  },
  {
    id: "cu-adjoa",
    name: "Adjoa Frimpong",
    email: "adjoa.frimpong@adinkratextiles.com",
    designation: "Accounts Officer",
    role: "Inputter",
    onMandate: false,
    limit: 50_000,
    accountIds: ["acc-002"],
    status: "Suspended",
  },
];

/**
 * The approval matrix (FR-ADM-04), by amount. Every company payment is authorised; above the review threshold it
 * is reviewed first. The bank sets the thresholds per company; these are placeholders.
 */
export const APPROVAL_MATRIX = {
  /** Payments above this go to a Reviewer before an Authoriser. */
  reviewAbove: 50_000,
};

/** The most the company can release in one day across all its accounts (BRL-08). A placeholder. */
export const COMPANY_DAILY_LIMIT = 2_000_000;

/**
 * What the bank set at corporate setup (FR-ADM-01 to FR-ADM-03). The administrator works inside these and never
 * above them. Placeholders until the bank's setup screens exist.
 */
export const BANK_SETUP = {
  /** The accounts enabled for internet banking. */
  enabledAccountIds: ["acc-001", "acc-002", "acc-003"],
  /** The highest limit for one payment that any one person may hold. */
  maxUserLimit: 1_000_000,
  /** The account whose mandate names the signatories. */
  mandateAccountId: "acc-001",
};

/** The signatories on the company's mandate, from the bank's records. */
export function mandateSignatories(): { name: string; role: string; email: string; mobile: string }[] {
  return findAccount(BANK_SETUP.mandateAccountId)?.signatories ?? [];
}

export function findCompanyUser(id: string): CompanyUser | undefined {
  return COMPANY_USERS.find((u) => u.id === id);
}

export function companyUserFor(actor: Pick<Actor, "id"> | null | undefined): CompanyUser | undefined {
  if (!actor) return undefined;
  return COMPANY_USERS.find((u) => u.actorId === actor.id);
}

/** The steps a payment of this amount passes, in order. */
export function approvalPath(amount: number): ApprovalStepKind[] {
  return amount > APPROVAL_MATRIX.reviewAbove ? ["review", "authorise"] : ["authorise"];
}

/** "a Reviewer, then an Authoriser" */
export function describePath(steps: ApprovalStepKind[]): string {
  const words = steps.map((s) => (s === "review" ? "a Reviewer" : "an Authoriser"));
  return words.join(", then ");
}

/**
 * Whether this person may see an account. People without a company record (a sole proprietor, the bank's staff)
 * see every account of the business they are in.
 */
export function canSeeAccount(actor: Pick<Actor, "id"> | null | undefined, accountId: string): boolean {
  const user = companyUserFor(actor);
  return !user || user.accountIds.includes(accountId);
}

/* ── Released today (the company daily limit) ──────────────────────────────── */

const released: number[] = [];

/** What the company has released today, from authorised payments in this session. */
export function releasedToday(): number {
  return sumMoney(released);
}

export function recordRelease(amount: number): void {
  released.push(roundMoney(amount));
}

export function dailyRoomLeft(): number {
  return roundMoney(COMPANY_DAILY_LIMIT - releasedToday());
}

/* ── User changes (option C) ───────────────────────────────────────────────── */

/** The parts of a user an administrator can set. */
export interface UserDraft {
  name: string;
  email: string;
  mobile?: string;
  designation: string;
  role: CompanyRole;
  onMandate: boolean;
  limit: number;
  accountIds: string[];
}

export interface UserChange {
  id: string;
  kind: "add" | "update" | "reactivate";
  /** The user it changes; set for a new user once it's approved. */
  userId?: string;
  before?: UserDraft;
  after: UserDraft;
  proposedBy: string;
  proposedAt: string;
  status: "pending" | "approved" | "declined";
  decidedBy?: string;
  decidedAt?: string;
  /** Why it was declined. */
  reason?: string;
}

export function draftOf(user: CompanyUser): UserDraft {
  return {
    name: user.name,
    email: user.email,
    designation: user.designation,
    role: user.role,
    onMandate: user.onMandate,
    limit: user.limit,
    accountIds: [...user.accountIds],
  };
}

/** A new user, a different role, a higher limit or another account widens access. */
export function widens(before: UserDraft | undefined, after: UserDraft): boolean {
  if (!before) return true;
  if (before.role !== after.role) return true;
  if (after.limit > before.limit) return true;
  return after.accountIds.some((id) => !before.accountIds.includes(id));
}

/** Why a draft can't be saved, if it can't: the mandate rule and the bank's ceilings. */
export function draftProblem(draft: UserDraft): string {
  if (roleNeedsMandate(draft.role) && !draft.onMandate) {
    return `A ${draft.role} must be a signatory on your mandate. Your bank changes the mandate.`;
  }
  if (roleHasLimit(draft.role) && draft.limit <= 0) return "Set a limit for one payment.";
  if (roleHasLimit(draft.role) && draft.limit > BANK_SETUP.maxUserLimit) {
    return "This is above the highest limit your bank allows for one person.";
  }
  if (draft.accountIds.length === 0) return "Choose at least one account.";
  if (draft.accountIds.some((id) => !BANK_SETUP.enabledAccountIds.includes(id))) {
    return "Only accounts your bank enabled for internet banking can be given.";
  }
  return "";
}

export const USER_CHANGES: UserChange[] = [
  {
    id: "uc-001",
    kind: "add",
    after: {
      name: "Kojo Asamoah",
      email: "kojo.asamoah@adinkratextiles.com",
      mobile: "0244300418",
      designation: "Accounts Officer",
      role: "Inputter",
      onMandate: false,
      limit: 100_000,
      accountIds: ["acc-002"],
    },
    proposedBy: "Samuel Quartey",
    proposedAt: "2026-10-21 15:40",
    status: "pending",
  },
];

/* A small change feed, so the admin and approval screens re-render when the table changes. */
let version = 0;
let changeSeq = 0;
const listeners = new Set<() => void>();

function changed() {
  version += 1;
  listeners.forEach((l) => l());
}

/** Re-renders the caller whenever users or user changes change. */
export function useControlsVersion(): number {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    () => version,
    () => version,
  );
}

function stampNow(): string {
  const d = new Date().toISOString();
  return `${d.slice(0, 10)} ${d.slice(11, 16)}`;
}

function apply(change: UserChange) {
  if (change.kind === "add") {
    const user: CompanyUser = { id: `cu-${Date.now().toString(36)}`, ...change.after, status: "Active" };
    COMPANY_USERS.push(user);
    change.userId = user.id;
    return;
  }
  const user = change.userId ? findCompanyUser(change.userId) : undefined;
  if (!user) return;
  Object.assign(user, change.after);
  if (change.kind === "reactivate") user.status = "Active";
}

/**
 * Propose a change. One that only narrows access applies now; one that widens it waits for a second person.
 * Returns the change and whether it already applies.
 */
export function proposeUserChange(input: {
  kind: UserChange["kind"];
  userId?: string;
  after: UserDraft;
  proposedBy: string;
}): { change: UserChange; applied: boolean } {
  const user = input.userId ? findCompanyUser(input.userId) : undefined;
  const before = user ? draftOf(user) : undefined;
  changeSeq += 1;
  const change: UserChange = {
    id: `uc-${Date.now().toString(36)}${changeSeq}`,
    kind: input.kind,
    userId: input.userId,
    before,
    after: input.after,
    proposedBy: input.proposedBy,
    proposedAt: stampNow(),
    status: "pending",
  };
  const applied = input.kind === "update" && !widens(before, input.after);
  if (applied) {
    change.status = "approved";
    change.decidedBy = input.proposedBy;
    change.decidedAt = change.proposedAt;
    apply(change);
  }
  USER_CHANGES.unshift(change);
  changed();
  return { change, applied };
}

export function findUserChange(id: string): UserChange | undefined {
  return USER_CHANGES.find((c) => c.id === id);
}

export function pendingChangeFor(userId: string): UserChange | undefined {
  return USER_CHANGES.find((c) => c.userId === userId && c.status === "pending");
}

export function pendingUserChanges(): UserChange[] {
  return USER_CHANGES.filter((c) => c.status === "pending");
}

/** Who may approve a user change: an Authoriser or an administrator, never the person who proposed it. */
export function canApproveUserChange(actor: Pick<Actor, "id" | "name"> | null | undefined, change: UserChange): boolean {
  const user = companyUserFor(actor);
  if (!actor || !user || change.status !== "pending" || change.proposedBy === actor.name) return false;
  return user.role === "Authoriser" || user.role === "Administrator";
}

export function userChangesToApprove(actor: Pick<Actor, "id" | "name"> | null | undefined): UserChange[] {
  return USER_CHANGES.filter((c) => canApproveUserChange(actor, c));
}

export function approveUserChange(id: string, by: string): void {
  const change = findUserChange(id);
  if (!change || change.status !== "pending") return;
  change.status = "approved";
  change.decidedBy = by;
  change.decidedAt = stampNow();
  apply(change);
  changed();
}

export function declineUserChange(id: string, by: string, reason: string): void {
  const change = findUserChange(id);
  if (!change || change.status !== "pending") return;
  change.status = "declined";
  change.decidedBy = by;
  change.decidedAt = stampNow();
  change.reason = reason.trim();
  changed();
}

/** Suspending narrows access, so it applies at once. */
export function suspendUser(id: string): void {
  const user = findCompanyUser(id);
  if (!user) return;
  user.status = "Suspended";
  changed();
}
