"use client";

/**
 * Business Statement — choose a date range, narrow by counterparty or amount, preview, then download. Reached from
 * Account Details. A reference screen, so baseline states only (13.9).
 */

import { use, useState } from "react";
import { Download, FileText } from "@/components/ui/icons";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { ListCard } from "@/components/ui/list-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import { FilteredEmptyState, ListErrorState, ListSkeleton, TrueEmptyState } from "@/components/states/ListStates";
import { findBusinessAccount } from "@/lib/corporate/accounts";
import { formatDate, formatMoney, transactionsForAccount } from "@/lib/mock-data";
import type { BaselineState } from "@/lib/states";

const BASELINE_STATES: readonly BaselineState[] = ["loading", "empty", "populated", "error"] as const;

export default function BusinessStatementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const account = findBusinessAccount(id);
  const [showPreview, setShowPreview] = useState(false);
  const [pageState, setPageState] = useState<BaselineState>("populated");

  const [from, setFrom] = useState("2026-08-01");
  const [to, setTo] = useState("2026-08-11");
  const [counterparty, setCounterparty] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");

  if (!account) {
    return <PageHeader title="Account Not Found" backTo={{ href: "/business/accounts", label: "Accounts" }} />;
  }

  const rows = transactionsForAccount(account.id).filter((t) => {
    if (counterparty && !t.counterparty.toLowerCase().includes(counterparty.toLowerCase())) return false;
    if (minAmount && t.amount < Number(minAmount)) return false;
    if (maxAmount && t.amount > Number(maxAmount)) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-10">
      <PageHeader title="Statement" backTo={{ href: `/business/accounts/${account.id}`, label: account.name }} />

      <StateSwitcher section="13.9" states={BASELINE_STATES} value={pageState} onChange={setPageState} />

      {pageState === "loading" && <ListSkeleton rows={5} />}

      {pageState === "error" && (
        <ListErrorState
          onRetry={() => setPageState("populated")}
          description="Couldn't generate the statement setup. Your account has not changed — try again."
        />
      )}

      {pageState === "empty" && (
        <TrueEmptyState
          illustration="empty-statements"
          title="No statements available"
          description="Statements appear once transactions are posted."
        />
      )}

      {pageState === "populated" && (
        <>
          <section className="flex flex-col gap-3">
            <SectionHeading title="Choose a Period" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="From" htmlFor="from">
                <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </Field>
              <Field label="To" htmlFor="to">
                <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </Field>
              <Field label="Counterparty or Supplier" optional htmlFor="cp" className="sm:col-span-2">
                <Input id="cp" value={counterparty} onChange={(e) => setCounterparty(e.target.value)} placeholder="Any counterparty" />
              </Field>
              <Field label="Minimum Amount" optional htmlFor="min">
                <Input id="min" inputMode="decimal" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} placeholder="No minimum" />
              </Field>
              <Field label="Maximum Amount" optional htmlFor="max">
                <Input id="max" inputMode="decimal" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} placeholder="No maximum" />
              </Field>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button onClick={() => setShowPreview(true)}>
                <FileText size={15} aria-hidden="true" />
                Preview Statement
              </Button>
              {showPreview && (
                <Button variant="outline" onClick={() => setShowPreview(false)}>
                  Change Filters
                </Button>
              )}
            </div>
          </section>

          {/* Preview precedes download, per the statement flow */}
          {showPreview && (
            <section className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-[16px] font-medium text-foreground">Preview</h2>
                  <p className="mt-0.5 text-[12px] text-muted-foreground tabular">
                    {rows.length === 1
                      ? `${formatDate(from)} – ${formatDate(to)} · 1 transaction`
                      : `${formatDate(from)} – ${formatDate(to)} · ${rows.length} transactions`}
                  </p>
                </div>
                <Button size="sm" disabled={rows.length === 0}>
                  <Download size={14} aria-hidden="true" />
                  Download PDF
                </Button>
              </div>

              {rows.length === 0 ? (
                <FilteredEmptyState
                  onReset={() => {
                    setCounterparty("");
                    setMinAmount("");
                    setMaxAmount("");
                  }}
                  description="Nothing matches these filters. Widen the date range or clear the counterparty and amount filters."
                />
              ) : (
                <ListCard>
                    {rows.map((t) => (
                      <li key={t.id} className="flex items-center gap-3 rounded-xl px-2 py-2 sm:px-3">
                        <span className="w-21 shrink-0 text-[12.5px] text-muted-foreground tabular">{formatDate(t.date)}</span>
                        <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">{t.description}</span>
                        <span className="shrink-0 text-[13px] text-foreground tabular">
                          {t.direction === "debit" ? "−" : "+"}
                          {formatMoney(t.amount, t.currency)}
                        </span>
                      </li>
                    ))}
                </ListCard>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
