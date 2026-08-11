"use client";

/**
 * S11 Payments Hub — section 3.
 *
 * "Payment Type Selection" was ELIMINATED in v2: there is no intermediate
 * selection screen. Selection happens inline here, and each choice leads
 * straight into its own flow:
 *
 *   Payments Hub -> Single   -> Payment Form -> Payment Review
 *   Payments Hub -> Bulk     -> Bulk Upload  -> Bulk Validation / Review
 *   Payments Hub -> Bill     -> Payment Form (bill variant)
 *   Payments Hub -> Standing -> Payment Form (standing variant)
 *
 * Bill payments and standing instructions come from BRD FR-05, which requires
 * transfers, bill payments AND standing instructions. They are added as inline
 * modes of this hub rather than new screens, because the eliminated
 * "Payment Type Selection" decision is exactly what a new screen would
 * reintroduce. Each mode reuses the Payment Form, whose 13.3 model is already
 * "progressive disclosure based on payment type".
 */

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  FileSpreadsheet,
  Receipt,
  Send,
  Upload,
  User,
} from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TransactionStatusBadge } from "@/components/StatusBadge";
import {
  BENEFICIARIES,
  BILLERS,
  STANDING_INSTRUCTIONS,
  findAccount,
  formatDate,
  formatMoney,
  transactionsForProfile,
} from "@/lib/mock-data";
import { useSession } from "@/lib/session-store";

type Mode = "single" | "bulk" | "bill" | "standing";

const MODES: { key: Mode; label: string; icon: React.ElementType }[] = [
  { key: "single", label: "Single payment", icon: User },
  { key: "bulk", label: "Bulk payment", icon: FileSpreadsheet },
  { key: "bill", label: "Pay a bill", icon: Receipt },
  { key: "standing", label: "Standing instructions", icon: CalendarClock },
];

export default function PaymentsHubPage() {
  const activeProfile = useSession((s) => s.activeProfile);

  // Inline mode selection — not a screen of its own.
  const [mode, setMode] = useState<Mode>("single");

  const transactions = transactionsForProfile(activeProfile?.kind);
  const recentPayments = transactions.filter((t) => t.direction === "debit").slice(0, 4);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Payments"
        description="Send a single payment, upload a batch, pay a bill, or manage a recurring instruction."
      />

      {/* Inline mode selection */}
      <div className="inline-flex w-fit flex-wrap rounded-xl bg-muted p-1">
        {MODES.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setMode(key)}
            aria-pressed={mode === key}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] transition-all ${
              mode === key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon size={15} strokeWidth={1.9} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {mode === "single" && (
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-[16px] text-foreground">Pay one beneficiary</h2>
          <p className="mt-1.5 max-w-lg text-[13px] leading-relaxed text-muted-foreground">
            Choose a saved beneficiary to prefill the form, or start blank and enter the details
            yourself.
          </p>

          <div className="mt-5">
            <Button nativeButton={false} render={<Link href="/payments/new" />}>
              <Send size={15} strokeWidth={1.9} aria-hidden="true" />
              New payment
            </Button>
          </div>

          {/* Beneficiary selection is inline (section 3: Reusable / no extra screen) */}
          <div className="mt-6">
            <p className="mb-2.5 text-[11px] uppercase tracking-wider text-muted-foreground">
              Saved beneficiaries
            </p>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {BENEFICIARIES.slice(0, 4).map((b) => (
                <li key={b.id}>
                  <Link
                    href={`/payments/new?beneficiary=${b.id}`}
                    className="flex items-center gap-3 rounded-xl border border-border bg-background px-3.5 py-3 transition-colors hover:border-primary/40 hover:bg-muted/40 active:scale-[0.99] transition-transform"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <User size={15} strokeWidth={1.8} aria-hidden="true" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[13px] text-foreground">{b.name}</span>
                      <span className="truncate text-[12px] text-muted-foreground tabular">
                        {b.bank} · {b.accountNumber}
                      </span>
                    </span>
                    <ArrowRight size={15} strokeWidth={1.8} aria-hidden="true" className="shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {mode === "bulk" && (
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-[16px] text-foreground">Pay many at once</h2>
          <p className="mt-1.5 max-w-lg text-[13px] leading-relaxed text-muted-foreground">
            Upload a payment file. Records are validated individually, so you can correct or remove
            the ones that fail without re-uploading the whole batch.
          </p>

          <div className="mt-5">
            <Button nativeButton={false} render={<Link href="/payments/bulk" />}>
              <Upload size={15} strokeWidth={1.9} aria-hidden="true" />
              Upload payment file
            </Button>
          </div>
        </section>
      )}

      {/* FR-05 — bill payments. Biller selection is inline, same principle as
          beneficiary selection: no intermediate screen. */}
      {mode === "bill" && (
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-[16px] text-foreground">Pay a bill</h2>
          <p className="mt-1.5 max-w-lg text-[13px] leading-relaxed text-muted-foreground">
            Choose a biller to prefill the payment form. Each biller asks for its own reference, so
            the form adapts once you pick one.
          </p>

          <ul className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {BILLERS.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/payments/new?biller=${b.id}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-background px-3.5 py-3 transition-colors hover:border-primary/40 hover:bg-muted/40 active:scale-[0.99] transition-transform"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Receipt size={15} strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[13px] text-foreground">{b.name}</span>
                    {/* Reference labels include acronyms (TIN), so they are shown
                        as written rather than case-folded into the sentence. */}
                    <span className="truncate text-[12px] text-muted-foreground">
                      {b.category} · needs {b.reference}
                    </span>
                  </span>
                  <ArrowRight size={15} strokeWidth={1.8} aria-hidden="true" className="shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* FR-05 — standing instructions. Recurring payments are listed with the
          next run date so a paused instruction is never mistaken for an active
          one. */}
      {mode === "standing" && (
        <section className="rounded-2xl border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-5">
            <div>
              <h2 className="text-[16px] text-foreground">Standing instructions</h2>
              <p className="mt-1.5 max-w-lg text-[13px] leading-relaxed text-muted-foreground">
                Recurring payments that run automatically until you pause or cancel them.
              </p>
            </div>
            <Button nativeButton={false} render={<Link href="/payments/new?type=standing" />} size="sm">
              <CalendarClock size={14} strokeWidth={1.9} aria-hidden="true" />
              New instruction
            </Button>
          </div>

          <ul className="divide-y divide-border">
            {STANDING_INSTRUCTIONS.map((si) => {
              const account = findAccount(si.accountId);
              return (
                <li key={si.id} className="flex flex-wrap items-center gap-4 px-6 py-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <CalendarClock size={16} strokeWidth={1.8} aria-hidden="true" />
                  </span>

                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-[13px] text-foreground">{si.beneficiary}</span>
                      {si.status === "Paused" && <Badge variant="warning">Paused</Badge>}
                    </span>
                    <span className="mt-0.5 text-[12px] text-muted-foreground tabular">
                      {si.frequency} · from {account?.name ?? "—"}
                    </span>
                  </span>

                  <span className="flex shrink-0 flex-col items-end">
                    <span className="text-[13px] text-foreground tabular">
                      {formatMoney(si.amount, si.currency)}
                    </span>
                    <span className="mt-0.5 text-[12px] text-muted-foreground tabular">
                      {si.status === "Paused" ? "Not scheduled" : `Next ${formatDate(si.nextRun)}`}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Recent payments — rows lead to Transaction Details */}
      <section className="rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-[15px] text-foreground">Recent payments</h2>
          <Link href="/transactions" className="text-[12px] text-primary underline-offset-4 hover:underline">
            View all payments
          </Link>
        </div>
        <ul className="divide-y divide-border">
          {recentPayments.map((t) => (
            <li key={t.id}>
              <Link
                href={`/transactions/${t.id}`}
                className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-muted/50"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[13px] text-foreground">{t.description}</span>
                  <span className="mt-0.5 text-[12px] text-muted-foreground tabular">
                    {t.reference} · {formatDate(t.date)}
                  </span>
                </span>
                <span className="shrink-0 text-[13px] text-foreground tabular">
                  {formatMoney(t.amount, t.currency)}
                </span>
                <TransactionStatusBadge state={t.state} />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
