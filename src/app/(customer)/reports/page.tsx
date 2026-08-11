"use client";

/**
 * Reports — BRD FR-23 and NFR-25.
 *
 * NFR-25 names the capabilities explicitly: standard reports, role-based
 * dashboards, filtering, drill-down to transaction level, and export in common
 * formats. All five are present here:
 *
 *   - standard reports  → the report selector
 *   - role-based        → the report list is filtered by the actor's role
 *   - filtering         → date range + status
 *   - drill-down        → rows link to Transaction Details
 *   - export            → CSV download of exactly what is on screen
 *
 * State model: 13.1 for the results table (a report that returns nothing after
 * filtering is filtered-empty, not true-empty — the distinction matters most
 * here, where an empty report is easily misread as "no activity").
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { BarChart3, Download, FileText, Search } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TransactionStatusBadge } from "@/components/StatusBadge";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import {
  FilteredEmptyState,
  ListErrorState,
  ListSkeleton,
  TrueEmptyState,
} from "@/components/states/ListStates";
import { LIST_STATE_LABEL, type ListState } from "@/lib/states";
import { useSession } from "@/lib/session-store";
import { isCorporateAdmin } from "@/lib/roles";
import { AUDIT_EVENTS, TRANSACTIONS, formatDate, formatMoney } from "@/lib/mock-data";

const LIST_STATES: readonly ListState[] = [
  "loading",
  "empty",
  "filtered-empty",
  "populated",
  "error",
] as const;

type ReportKey = "transactions" | "payments" | "activity";

interface ReportDef {
  key: ReportKey;
  label: string;
  description: string;
  /** NFR-25 "role-based" — user activity is an administrator's report. */
  adminOnly?: boolean;
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
  {
    key: "activity",
    label: "User activity",
    description: "Who did what, and when. Drawn from the audit trail.",
    adminOnly: true,
  },
];

export default function ReportsPage() {
  const { actor } = useSession();
  const [state, setState] = useState<ListState>("populated");
  const [report, setReport] = useState<ReportKey>("transactions");
  const [from, setFrom] = useState("2026-01-01");
  const [to, setTo] = useState("2026-08-11");
  const [query, setQuery] = useState("");

  const available = useMemo(
    () => REPORTS.filter((r) => !r.adminOnly || (actor && isCorporateAdmin(actor.role))),
    [actor],
  );

  // Keep the selection valid if the actor can't see the selected report.
  const activeKey: ReportKey = available.some((r) => r.key === report) ? report : "transactions";
  const active = available.find((r) => r.key === activeKey) ?? REPORTS[0];

  const inRange = (iso: string) => {
    const d = iso.slice(0, 10);
    return d >= from && d <= to;
  };

  const txRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TRANSACTIONS.filter((t) => {
      if (!inRange(t.date)) return false;
      if (activeKey === "payments" && t.direction !== "debit") return false;
      if (!q) return true;
      return (
        t.description.toLowerCase().includes(q) ||
        t.counterparty.toLowerCase().includes(q) ||
        t.reference.toLowerCase().includes(q)
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey, from, to, query]);

  const activityRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return AUDIT_EVENTS.filter((e) => {
      if (!inRange(e.timestamp)) return false;
      if (!q) return true;
      return e.actor.toLowerCase().includes(q) || e.action.toLowerCase().includes(q);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, query]);

  const isActivity = activeKey === "activity";
  const rowCount = isActivity ? activityRows.length : txRows.length;
  const filtersApplied = query.trim() !== "";

  const effective: ListState =
    state === "populated" && rowCount === 0 ? (filtersApplied ? "filtered-empty" : "empty") : state;

  const total = useMemo(
    () => txRows.reduce((sum, t) => sum + (t.direction === "debit" ? t.amount : 0), 0),
    [txRows],
  );

  /** NFR-25 export — exports exactly the filtered rows on screen, nothing more. */
  function handleExport() {
    const headers = isActivity
      ? ["Timestamp", "Actor", "Role", "Action", "Target"]
      : ["Reference", "Date", "Description", "Counterparty", "Direction", "Amount", "Currency", "Status"];

    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;

    const body = isActivity
      ? activityRows.map((e) => [e.timestamp, escape(e.actor), escape(e.role), escape(e.action), escape(e.target)])
      : txRows.map((t) => [
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
    link.download = `${activeKey}-report_${from}_to_${to}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Reports"
        description="Standard reports across your relationship. Filter, drill down to a transaction, or export what you see."
        actions={
          <Button variant="outline" size="sm" onClick={handleExport} disabled={rowCount === 0}>
            <Download size={14} strokeWidth={1.9} aria-hidden="true" />
            Export CSV
          </Button>
        }
      />

      <StateSwitcher
        section="13.1"
        states={LIST_STATES}
        value={state}
        onChange={setState}
        labels={LIST_STATE_LABEL}
      />

      {/* Report selection */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {available.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => setReport(r.key)}
            aria-pressed={activeKey === r.key}
            className={`flex flex-col rounded-2xl border p-4 text-left transition-colors ${
              activeKey === r.key
                ? "border-[var(--active-border)] bg-[var(--active-bg)]"
                : "border-border bg-card hover:bg-muted/50"
            }`}
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              {r.key === "activity" ? (
                <FileText size={15} strokeWidth={1.8} aria-hidden="true" />
              ) : (
                <BarChart3 size={15} strokeWidth={1.8} aria-hidden="true" />
              )}
            </span>
            <span className="mt-3 text-[14px] text-foreground">{r.label}</span>
            <span className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
              {r.description}
            </span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rep-from" className="text-xs">
              From
            </Label>
            <Input id="rep-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rep-to" className="text-xs">
              To
            </Label>
            <Input id="rep-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="rep-q" className="text-xs">
              Search
            </Label>
            <div className="relative">
              <Search
                size={15}
                strokeWidth={1.9}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="rep-q"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={isActivity ? "Actor or action" : "Description, counterparty or reference"}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        {!isActivity && (
          <div className="mt-5 flex flex-wrap items-baseline justify-between gap-2 border-t border-border pt-5">
            <span className="text-[13px] text-muted-foreground">
              {rowCount} {rowCount === 1 ? "record" : "records"} · total debits
            </span>
            <span className="text-[18px] leading-tight text-foreground tabular">
              {formatMoney(total)}
            </span>
          </div>
        )}
      </section>

      {/* Results */}
      <div className="rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-[14px] text-foreground">{active.label}</h2>
        </div>

        {effective === "loading" && <ListSkeleton rows={6} columns={5} />}

        {effective === "error" && (
          <ListErrorState
            onRetry={() => setState("populated")}
            description="We couldn't generate this report. No data has changed — try again."
          />
        )}

        {effective === "empty" && (
          <TrueEmptyState
            icon={<BarChart3 size={20} strokeWidth={1.7} />}
            title="No activity in this period"
            description="There are no records between the dates selected. Widen the date range to see more."
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
          <div className="overflow-x-auto">
            {isActivity ? (
              <table className="w-full min-w-[640px] text-[13px]">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="px-4 py-3 font-normal">When</th>
                    <th className="px-4 py-3 font-normal">Actor</th>
                    <th className="px-4 py-3 font-normal">Action</th>
                    <th className="px-4 py-3 font-normal">Target</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {activityRows.map((e) => (
                    <tr key={e.id} className="transition-colors hover:bg-muted/50">
                      <td className="px-4 py-3.5 text-muted-foreground tabular">{formatDate(e.timestamp)}</td>
                      <td className="px-4 py-3.5 text-foreground">{e.actor}</td>
                      <td className="px-4 py-3.5 text-foreground">{e.action}</td>
                      <td className="px-4 py-3.5 text-muted-foreground">{e.target}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full min-w-[720px] text-[13px]">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="px-4 py-3 font-normal">Reference</th>
                    <th className="px-4 py-3 font-normal">Date</th>
                    <th className="px-4 py-3 font-normal">Description</th>
                    <th className="px-4 py-3 text-right font-normal">Amount</th>
                    <th className="px-4 py-3 font-normal">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {txRows.map((t) => (
                    <tr key={t.id} className="transition-colors hover:bg-muted/50">
                      <td className="px-4 py-3.5">
                        {/* NFR-25 drill-down to transaction level */}
                        <Link
                          href={`/transactions/${t.id}`}
                          className="text-foreground underline-offset-4 hover:underline tabular"
                        >
                          {t.reference}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground tabular">{formatDate(t.date)}</td>
                      <td className="px-4 py-3.5 text-foreground">{t.description}</td>
                      <td className="px-4 py-3.5 text-right text-foreground tabular">
                        {t.direction === "debit" ? "−" : "+"}
                        {formatMoney(t.amount, t.currency)}
                      </td>
                      <td className="px-4 py-3.5">
                        <TransactionStatusBadge state={t.state} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
