"use client";

/**
 * Issues a customer has reported to the bank, and where each one stands. One store for every way in: the Help menu's
 * Report an issue, a receipt's Report Issue and a failed payment's Report. The prototype has no case system behind it,
 * so a new report stays at Received: nothing here pretends an agent has picked it up. The demo customer has two older
 * cases so tracking can be seen in more than one state.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type IssueStatus = "received" | "in-review" | "resolved" | "withdrawn";

export const ISSUE_STATUS_LABEL: Record<IssueStatus, string> = {
  received: "Received",
  "in-review": "In review",
  resolved: "Resolved",
  withdrawn: "Withdrawn",
};

export const ISSUE_TOPICS = [
  "A Payment or Transfer",
  "A Card",
  "Logging In",
  "My Account or Statement",
  "The App Isn’t Working",
  "Something Else",
] as const;
export type IssueTopic = (typeof ISSUE_TOPICS)[number];

export const PAYMENT_REASONS = [
  "I Didn’t Make This",
  "The Amount Is Wrong",
  "I Was Charged Twice",
  "It Hasn’t Arrived",
  "Something Else",
] as const;

export interface IssueUpdate {
  at: string;
  status: IssueStatus;
  /** What happened, in the bank's words to the customer. */
  note: string;
}

export interface Issue {
  id: string;
  /** The case reference the customer quotes: "CASE-482193". */
  ref: string;
  actorId: string;
  topic: IssueTopic;
  /** For a payment: what went wrong. */
  reason?: string;
  /** For a payment: the transaction reference. */
  transactionRef?: string;
  details: string;
  createdAt: string;
  status: IssueStatus;
  updates: IssueUpdate[];
}

export const isOpen = (i: Issue) => i.status === "received" || i.status === "in-review";

/** The title a case goes by: the payment's problem, or the topic. */
export function issueTitle(i: Issue): string {
  if (i.reason && i.reason !== "Something Else") return i.reason;
  return i.topic;
}

const RECEIVED_NOTE = "We have your report. You’ll get an SMS and an email when someone picks it up.";

const SEED: Issue[] = [
  {
    id: "iss-seed-1",
    ref: "CASE-318204",
    actorId: "u-retail",
    topic: "A Payment or Transfer",
    reason: "It Hasn’t Arrived",
    transactionRef: "GIP2611080412",
    details: "Sent to my brother at Ecobank on Saturday and he still hasn’t received it.",
    createdAt: "2026-11-15T09:12:00Z",
    status: "in-review",
    updates: [
      { at: "2026-11-15T09:12:00Z", status: "received", note: RECEIVED_NOTE },
      {
        at: "2026-11-16T11:40:00Z",
        status: "in-review",
        note: "We’ve asked Ecobank to confirm the credit. Most transfers are traced within 3 working days.",
      },
    ],
  },
  {
    id: "iss-seed-2",
    ref: "CASE-297715",
    actorId: "u-retail",
    topic: "A Card",
    details: "My virtual card was declined on Jumia even though I had enough money.",
    createdAt: "2026-10-28T16:05:00Z",
    status: "resolved",
    updates: [
      { at: "2026-10-28T16:05:00Z", status: "received", note: RECEIVED_NOTE },
      { at: "2026-10-29T10:20:00Z", status: "in-review", note: "We’re checking the decline with the card network." },
      {
        at: "2026-10-30T14:02:00Z",
        status: "resolved",
        note: "The merchant’s checkout blocked cards from outside Nigeria. Nothing was taken from your account. Your card works on other sites.",
      },
    ],
  },
];

interface IssuesState {
  issues: Issue[];
  report: (input: Pick<Issue, "actorId" | "topic" | "reason" | "transactionRef" | "details">) => Issue;
  withdraw: (id: string) => void;
  /** Undo a withdrawal straight after it, from the toast. */
  reopen: (id: string) => void;
}

export const useIssuesStore = create<IssuesState>()(
  persist(
    (set) => ({
      issues: SEED,
      report: (input) => {
        const now = new Date().toISOString();
        const issue: Issue = {
          ...input,
          id: `iss-${Date.now()}`,
          ref: `CASE-${String(Date.now()).slice(-6)}`,
          createdAt: now,
          status: "received",
          updates: [{ at: now, status: "received", note: RECEIVED_NOTE }],
        };
        set((s) => ({ issues: [issue, ...s.issues] }));
        return issue;
      },
      withdraw: (id) =>
        set((s) => ({
          issues: s.issues.map((i) =>
            i.id === id
              ? {
                  ...i,
                  status: "withdrawn",
                  updates: [...i.updates, { at: new Date().toISOString(), status: "withdrawn", note: "You withdrew this report." }],
                }
              : i,
          ),
        })),
      reopen: (id) =>
        set((s) => ({
          issues: s.issues.map((i) => {
            if (i.id !== id || i.status !== "withdrawn") return i;
            const updates = i.updates.slice(0, -1);
            return { ...i, status: updates[updates.length - 1]?.status ?? "received", updates };
          }),
        })),
    }),
    { name: "nibs-issues" },
  ),
);

/** One customer's cases, newest first. */
export function useMyIssues(actorId: string | undefined): Issue[] {
  const issues = useIssuesStore((s) => s.issues);
  return actorId ? issues.filter((i) => i.actorId === actorId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : [];
}
