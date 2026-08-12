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
import { Label } from "@/components/ui/label";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import type { BaselineState } from "@/lib/states";
import { findAccount, formatMoney, transactionsForAccount, formatDate } from "@/lib/mock-data";

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
    return <PageHeader title="Account not found" backTo={{ href: "/accounts", label: "Accounts" }} />;
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
        backTo={{ href: `/accounts/${account.id}`, label: "Account details" }}
      />

      <StateSwitcher section="13.9" states={BASELINE_STATES} value={pageState} onChange={setPageState} />

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-[15px] text-foreground">Configure</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Choose a date range, then narrow by counterparty or amount before previewing.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="from">From</Label>
            <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="to">To</Label>
            <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="cp">Counterparty or beneficiary</Label>
            <Input
              id="cp"
              value={counterparty}
              onChange={(e) => setCounterparty(e.target.value)}
              placeholder="Any counterparty"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="min">Minimum amount</Label>
            <Input
              id="min"
              inputMode="decimal"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              placeholder="No minimum"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="max">Maximum amount</Label>
            <Input
              id="max"
              inputMode="decimal"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              placeholder="No maximum"
            />
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2">
          <Button onClick={() => setShowPreview(true)}>
            <FileText size={15} strokeWidth={1.9} aria-hidden="true" />
            Preview statement
          </Button>
          {showPreview && (
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Change filters
            </Button>
          )}
        </div>
      </section>

      {/* Preview precedes download, per the section 2 statement flow */}
      {showPreview && (
        <section className="rounded-2xl border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h2 className="text-[15px] text-foreground">Preview</h2>
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
            <div className="px-6 py-12 text-center">
              <p className="text-[14px] text-foreground">Nothing matches these filters</p>
              <p className="mt-1.5 text-[13px] text-muted-foreground">
                Widen the date range or clear the counterparty and amount filters.
              </p>
            </div>
          ) : (
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
          )}
        </section>
      )}
    </div>
  );
}
