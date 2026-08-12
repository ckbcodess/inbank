"use client";

/**
 * Trade Details — section 6, state model 13.6. STUB.
 *
 * Customer-facing, read-only transparency surface. Lifecycle/tracking is a
 * section inside this object, not a separate screen. Reached from the Trade Hub
 * list, never from nav (12.4).
 */

import { useState, use } from "react";
import { Check, Circle, FileText, History } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import StubNotice from "@/components/StubNotice";
import { Badge } from "@/components/ui/badge";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import type { TradeState } from "@/lib/states";
import { TRADE_DOCUMENTS, TRADE_VERSIONS, formatMoney } from "@/lib/mock-data";

const TRADE_STATES: readonly TradeState[] = [
  "draft",
  "submitted-in-review",
  "under-bank-review",
  "approved-active",
  "returned-for-correction",
  "completed-closed",
] as const;

const LIFECYCLE = [
  { label: "Draft", done: true },
  { label: "Submitted / in review", done: true },
  { label: "Under bank operations review", done: true },
  { label: "Approved / active", done: false },
  { label: "Completed / closed", done: false },
];

export default function TradeDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [state, setState] = useState<TradeState>("under-bank-review");

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Documentary collection — cotton import"
        description={`${id.toUpperCase()} · Shenzhen Textile Group`}
        backTo={{ href: "/trade", label: "Trade" }}
      />

      <StateSwitcher section="13.6" states={TRADE_STATES} value={state} onChange={setState} />

      <StubNotice section="section 6" states="13.6" />

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
          <div>
            <span className="text-[12px] text-muted-foreground">Trade value</span>
            <p className="mt-1.5 text-[28px] leading-none tracking-[-0.02em] text-foreground tabular">
              {formatMoney(128000, "USD")}
            </p>
          </div>
          <Badge variant="secondary">Under bank operations review</Badge>
        </div>
        <p className="pt-4 text-[12.5px] text-muted-foreground">
          Read-only for the customer — general status only, never internal operations notes (13.6).
        </p>
      </section>

      {/* Lifecycle — a section inside Trade Details, not its own screen */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-[15px] text-foreground">Lifecycle</h2>
        <ol className="mt-4 flex flex-col gap-0">
          {LIFECYCLE.map((step, i) => (
            <li key={step.label} className="flex gap-3">
              <span className="flex flex-col items-center">
                <span
                  className={`flex size-6 items-center justify-center rounded-full ${
                    step.done ? "bg-primary text-primary-foreground" : "border border-border bg-background"
                  }`}
                >
                  {step.done ? (
                    <Check size={13} strokeWidth={2.4} aria-hidden="true" />
                  ) : (
                    <Circle size={7} strokeWidth={2} aria-hidden="true" className="text-muted-foreground" />
                  )}
                </span>
                {i < LIFECYCLE.length - 1 && (
                  <span className={`w-px flex-1 ${step.done ? "bg-primary/40" : "bg-border"}`} />
                )}
              </span>
              <span className={`pb-5 text-[13px] ${step.done ? "text-foreground" : "text-muted-foreground"}`}>
                {step.label}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card">
          <h2 className="flex items-center gap-2 border-b border-border px-5 py-4 text-[15px] text-foreground">
            <FileText size={16} strokeWidth={1.8} aria-hidden="true" className="text-muted-foreground" />
            Documents
          </h2>
          <ul className="divide-y divide-border">
            {TRADE_DOCUMENTS.map((d) => (
              <li key={d.id} className="flex items-center gap-3 px-5 py-3">
                <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">{d.name}</span>
                {d.status === "missing" ? (
                  <Badge variant="warning">Missing</Badge>
                ) : (
                  <span className="text-[12px] text-muted-foreground">{d.pages} pages</span>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-border bg-card">
          <h2 className="flex items-center gap-2 border-b border-border px-5 py-4 text-[15px] text-foreground">
            <History size={16} strokeWidth={1.8} aria-hidden="true" className="text-muted-foreground" />
            Version history
          </h2>
          <ul className="divide-y divide-border">
            {TRADE_VERSIONS.map((v) => (
              <li key={v.version} className="flex items-start gap-3 px-5 py-3">
                <span className="w-7 shrink-0 text-[12.5px] text-muted-foreground tabular">v{v.version}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] text-foreground">{v.summary}</span>
                  <span className="block text-[12px] text-muted-foreground tabular">{v.submittedAt}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
