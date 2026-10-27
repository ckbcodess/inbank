"use client";

/**
 * Reports — BRD FR-23 and NFR-25, for personal banking: standard reports, filtering, drill-down to transaction
 * level and export, over the customer's own ledger.
 *
 *   - standard reports  → the report selector
 *   - filtering         → date range + search
 *   - drill-down        → rows link to Transaction Details
 *   - export            → CSV download of exactly what is on screen
 *
 * The administrator's "user activity" report is business banking's (a company has users to account for), so it is
 * not here; see WORKING_LOG.
 *
 * State model: 13.1 for the results table (a report that returns nothing after
 * filtering is filtered-empty, not true-empty — the distinction matters most
 * here, where an empty report is easily misread as "no activity").
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { BarChart3, Download, Search } from "@/components/ui/icons";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TransactionStatusBadge } from "@/components/StatusBadge";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import {
  FilteredEmptyState,
  ListErrorState,
  ListSkeleton,
  TrueEmptyState,
} from "@/components/states/ListStates";
import { LIST_STATE_LABEL, type ListState } from "@/lib/states";
import { formatDate, formatMoney, transactionsForProfile } from "@/lib/mock-data";

import { Field } from "@/components/ui/field";
const LIST_STATES: readonly ListState[] = [
  "loading",
  "empty",
  "filtered-empty",
  "populated",
  "error",
] as const;

type ReportKey = "transactions" | "payments";

interface ReportDef {
  key: ReportKey;
  label: string;
  description: string;
}

const REPORTS: ReportDef[] = [
  {
    key: "transactions",
    label: "Transaction report",
    description: "Every transaction on the relationship, with status and value date.",
  },
  {
    key: "payments",
    label: "Outgoing payments",
    description: "Debits only — useful for reconciling what left the account.",
  },
];

export default function ReportsPage() {
  const [state, setState] = useState<ListState>("populated");
  const [report, setReport] = useState<ReportKey>("transactions");
  const [from, setFrom] = useState("2026-01-01");
  const [to, setTo] = useState("2026-08-11");
  const [query, setQuery] = useState("");

  const active = REPORTS.find((r) => r.key === report) ?? REPORTS[0];

  const txRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactionsForProfile("RETAIL").filter((t) => {
      const d = t.date.slice(0, 10);
      if (d < from || d > to) return false;
      if (report === "payments" && t.direction !== "debit") return false;
      if (!q) return true;
      return (
        t.description.toLowerCase().includes(q) ||
        t.counterparty.toLowerCase().includes(q) ||
        t.reference.toLowerCase().includes(q)
      );
    });
  }, [report, from, to, query]);

  const rowCount = txRows.length;
  const filtersApplied = query.trim() !== "";

  const effective: ListState =
    state === "populated" && rowCount === 0 ? (filtersApplied ? "filtered-empty" : "empty") : state;

  const total = useMemo(
    () => txRows.reduce((sum, t) => sum + (t.direction === "debit" ? t.amount : 0), 0),
    [txRows],
  );

  /** NFR-25 export — exports exactly the filtered rows on screen, nothing more. */
  function handleExport() {
    const headers = ["Reference", "Date", "Description", "Counterparty", "Direction", "Amount", "Currency", "Status"];
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const body = txRows.map((t) => [
      t.reference,
      t.date,
      escape(t.description),
      escape(t.counterparty),
      t.direction,
      String(t.amount),
      t.currency,
      t.state,
    ]);

    const csv = [headers.join(","), ...body.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${report}-report_${from}_to_${to}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Reports" />

      <StateSwitcher
        section="13.1"
        states={LIST_STATES}
        value={state}
        onChange={setState}
        labels={LIST_STATE_LABEL}
      />

      {/* Report selection */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => setReport(r.key)}
            aria-pressed={report === r.key}
            className={`flex flex-col rounded-2xl border p-3 text-left transition-colors ${
              report === r.key
                ? "border-[var(--active-border)] bg-[var(--active-bg)]"
                : "border-border bg-card hover:bg-muted/50"
            }`}
          >
            <span className="flex size-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <BarChart3 size={15} aria-hidden="true" />
            </span>
            <span className="mt-2 text-[14px] text-foreground">{r.label}</span>
            <span className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
              {r.description}
            </span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="From" htmlFor="rep-from">
            <Input id="rep-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="To" htmlFor="rep-to">
            <Input id="rep-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
          <Field label="Search" optional htmlFor="rep-q" className="sm:col-span-2">
            <div className="relative">
              <Search
                size={15}
                aria-hidden="true"
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="rep-q"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Description or reference"
                className="pl-8"
              />
            </div>
          </Field>
        </div>

        <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2 border-t border-border pt-4">
          <span className="text-[13px] text-muted-foreground">
            {rowCount} {rowCount === 1 ? "record" : "records"} · total debits
          </span>
          <span className="text-[18px] leading-tight text-foreground tabular">
            {formatMoney(total)}
          </span>
        </div>
      </section>

      {/* Results */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-[14px] font-medium text-foreground">{active.label}</h2>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={rowCount === 0}>
          <Download size={14} aria-hidden="true" />
          Export CSV
        </Button>
      </div>

      {effective === "loading" && <ListSkeleton rows={6} />}

      {effective === "error" && (
        <ListErrorState
          onRetry={() => setState("populated")}
          description="We couldn't generate this report. No data has changed — try again."
        />
      )}

      {effective === "empty" && (
        <TrueEmptyState illustration="empty-chart"
          title="No activity in this period"
          description="No records between these dates. Try a wider range."
        />
      )}

      {effective === "filtered-empty" && (
        <FilteredEmptyState
          onReset={() => {
            setQuery("");
            setState("populated");
          }}
          description="No records match your search within this date range. Clear it to see the full report."
        />
      )}

      {effective === "populated" && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-[13px]">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="px-3 py-2 font-normal">Reference</th>
                  <th className="px-3 py-2 font-normal">Date</th>
                  <th className="px-3 py-2 font-normal">Description</th>
                  <th className="px-3 py-2 text-right font-normal">Amount</th>
                  <th className="px-3 py-2 font-normal">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {txRows.map((t) => (
                  <tr key={t.id} className="transition-colors hover:bg-muted/50">
                    <td className="px-3 py-3">
                      {/* NFR-25 drill-down to transaction level */}
                      <Link
                        href={`/transactions?open=${encodeURIComponent(t.id)}`}
                        className="text-foreground underline-offset-4 hover:underline tabular"
                      >
                        {t.reference}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground tabular">{formatDate(t.date)}</td>
                    <td className="px-3 py-3 text-foreground">{t.description}</td>
                    <td className="px-3 py-3 text-right text-foreground tabular">
                      {t.direction === "debit" ? "−" : "+"}
                      {formatMoney(t.amount, t.currency)}
                    </td>
                    <td className="px-3 py-3">
                      <TransactionStatusBadge state={t.state} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
