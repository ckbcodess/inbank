"use client";

/**
 * Trade Hub — section 6. STUB.
 *
 * Sitemap position per 12.4: Trade → Trade Hub → My Trades (list) → Trade
 * Details, and New Trade → Trade Type Selection → Trade Request → Trade Review.
 * Nav entry is hidden entirely when the actor isn't trade-eligible.
 */

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, FileText, Plus, Ship } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import StubNotice from "@/components/StubNotice";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import { LIST_STATE_LABEL, type ListState } from "@/lib/states";
import { formatMoney } from "@/lib/mock-data";

const LIST_STATES: readonly ListState[] = [
  "loading",
  "empty",
  "filtered-empty",
  "populated",
  "partial-load",
  "error",
] as const;

const TRADES = [
  { id: "trade-0417", ref: "TRD-2026-00417", desc: "Documentary collection — cotton import", cp: "Shenzhen Textile Group", amount: 128000, ccy: "USD", status: "Returned for correction", tone: "warning" as const },
  { id: "trade-0421", ref: "TRD-2026-00421", desc: "Letter of credit — cotton import Q3", cp: "Shenzhen Textile Group", amount: 210000, ccy: "USD", status: "Submitted / in review", tone: "secondary" as const },
  { id: "trade-0423", ref: "TRD-2026-00423", desc: "Documentary collection — machinery parts", cp: "Hamburg Werke GmbH", amount: 74500, ccy: "USD", status: "Under bank review", tone: "secondary" as const },
  { id: "trade-0402", ref: "TRD-2026-00402", desc: "Letter of credit — dye materials", cp: "Mumbai Chemicals Ltd", amount: 56200, ccy: "USD", status: "Approved / active", tone: "success" as const },
];

export default function TradeHubPage() {
  const [state, setState] = useState<ListState>("populated");
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Trade"
        description="Trade finance requests and their lifecycle."
        actions={
          <Button nativeButton={false} render={<Link href="/trade/new" />}>
            <Plus size={15} strokeWidth={1.9} aria-hidden="true" />
            New trade request
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

      <StubNotice section="section 6 / sitemap 12.4" states="13.6 Trade Details" />

      <section className="rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-[15px] text-foreground">My trades</h2>
          <span className="text-[12px] text-muted-foreground">{TRADES.length} active</span>
        </div>
        <ul className="divide-y divide-border">
          {TRADES.map((t) => (
            <li key={t.id}>
              <Link
                href={`/trade/${t.id}`}
                className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/50 active:scale-[0.99] transition-transform"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Ship size={16} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[13.5px] text-foreground">{t.desc}</span>
                  <span className="mt-0.5 truncate text-[12px] text-muted-foreground tabular">
                    {t.ref} · {t.cp}
                  </span>
                </span>
                <span className="shrink-0 text-[13.5px] text-foreground tabular">
                  {formatMoney(t.amount, t.ccy)}
                </span>
                <Badge variant={t.tone}>{t.status}</Badge>
                <ChevronRight size={16} strokeWidth={1.8} aria-hidden="true" className="shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <FileText size={17} strokeWidth={1.8} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] text-foreground">Start a new trade request</p>
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">
              Trade Type Selection → Trade Request → Documents → Trade Review
            </p>
          </div>
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/trade/new" />}>
            Begin
          </Button>
        </div>
      </section>
    </div>
  );
}
