"use client";

/**
 * Statement Configuration — section 2, reached from Account Details.
 * Flow: Account Details → Statement Configuration → Preview → Download.
 *
 * 13.9 classifies this as a static/reference screen → baseline states only.
 */

import { use, useState } from "react";
import { Download, FileText } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import { FilteredEmptyState, ListErrorState, ListSkeleton, TrueEmptyState } from "@/components/states/ListStates";
import type { BaselineState } from "@/lib/states";
import { findAccount, formatMoney, transactionsForAccount, formatDate } from "@/lib/mock-data";

import { Field } from "@/components/ui/field";
const BASELINE_STATES: readonly BaselineState[] = ["loading", "empty", "populated", "error"] as const;

export default function StatementConfigurationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const account = findAccount(id);
  const [showPreview, setShowPreview] = useState(false);
  const [pageState, setPageState] = useState<BaselineState>("populated");

  const [from, setFrom] = useState("2026-08-01");
  const [to, setTo] = useState("2026-08-11");
  const [counterparty, setCounterparty] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");

  if (!account) {
    return <PageHeader title="Account Not Found" backTo={{ href: "/accounts", label: "My Accounts" }} />;
  }

  const rows = transactionsForAccount(account.id).filter((t) => {
    if (counterparty && !t.counterparty.toLowerCase().includes(counterparty.toLowerCase())) return false;
    if (minAmount && t.amount < Number(minAmount)) return false;
    if (maxAmount && t.amount > Number(maxAmount)) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Statement"
        description={`${account.name} · ${account.number}`}
        backTo={{ href: `/accounts/${account.id}`, label: "Account Details" }}
      />

      <StateSwitcher section="13.9" states={BASELINE_STATES} value={pageState} onChange={setPageState} />

      {pageState === "loading" && <ListSkeleton rows={5} />}

      {pageState === "error" && (
        <ListErrorState
          onRetry={() => setPageState("populated")}
          description="Couldn't generate statement configuration. Your account has not changed — try again."
        />
      )}

      {pageState === "empty" && (
        <TrueEmptyState illustration="empty-statements"
          title="No statements available"
          description="Statements will be available once transactions are posted to this account."
        />
      )}

      {pageState === "populated" && (
        <>
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-[15px] text-foreground">Configure</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Choose a date range, then narrow by counterparty or amount before previewing.
            </p>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="From" htmlFor="from">
                <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
</Field>
              <Field label="To" htmlFor="to">
                <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
</Field>
              <Field label="Counterparty or Beneficiary" optional htmlFor="cp" className="sm:col-span-2">
                <Input
                  id="cp"
                  value={counterparty}
                  onChange={(e) => setCounterparty(e.target.value)}
                  placeholder="Any counterparty"
                />
              </Field>
              <Field label="Minimum Amount" optional htmlFor="min">
                <Input
                  id="min"
                  inputMode="decimal"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  placeholder="No minimum"
                />
              </Field>
              <Field label="Maximum Amount" optional htmlFor="max">
                <Input
                  id="max"
                  inputMode="decimal"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  placeholder="No maximum"
                />
              </Field>
            </div>

            <div className="mt-5 flex items-center gap-2">
              <Button onClick={() => setShowPreview(true)}>
                <FileText size={15} strokeWidth={1.9} aria-hidden="true" />
                Preview Statement
              </Button>
              {showPreview && (
                <Button variant="outline" onClick={() => setShowPreview(false)}>
                  Change Filters
                </Button>
              )}
            </div>
          </section>

          {/* Preview precedes download, per the section 2 statement flow */}
          {showPreview && (
            <section className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3 px-1">
                <div>
                  <h2 className="text-[15px] font-medium text-foreground">Preview</h2>
                  <p className="mt-0.5 text-[12px] text-muted-foreground tabular">
                    {formatDate(from)} – {formatDate(to)} · {rows.length} transaction
                    {rows.length === 1 ? "" : "s"}
                  </p>
                </div>
                <Button size="sm" disabled={rows.length === 0}>
                  <Download size={14} strokeWidth={1.9} aria-hidden="true" />
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
                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                  <ul className="divide-y divide-border">
                    {rows.map((t) => (
                      <li key={t.id} className="flex items-center gap-4 px-5 py-3">
                        <span className="w-24 shrink-0 text-[12.5px] text-muted-foreground tabular">
                          {formatDate(t.date)}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">{t.description}</span>
                        <span className="shrink-0 text-[13px] text-foreground tabular">
                          {t.direction === "debit" ? "−" : "+"}
                          {formatMoney(t.amount, t.currency)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
