"use client";

/**
 * Trade Monitoring → Trade Officer Workstation — section 6, sitemap 12.5. STUB.
 *
 * The workstation is a separate internal operational tool, deliberately not the
 * customer's Trade Details screen. Per section 6 it surfaces audit trail,
 * exception flags, version history and document audit, with assist/view-only
 * indicators.
 */

import Link from "next/link";
import { ChevronRight, Ship } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import StubNotice from "@/components/StubNotice";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/mock-data";

const QUEUE = [
  { id: "trade-0417", ref: "TRD-2026-00417", customer: "Adinkra Textiles Ltd", desc: "Documentary collection — cotton import", amount: 128000, flag: "Document mismatch", tone: "warning" as const },
  { id: "trade-0421", ref: "TRD-2026-00421", customer: "Adinkra Textiles Ltd", desc: "Letter of credit — cotton import Q3", amount: 210000, flag: "Awaiting review", tone: "secondary" as const },
  { id: "trade-0423", ref: "TRD-2026-00423", customer: "Volta Industries", desc: "Documentary collection — machinery parts", amount: 74500, flag: "Awaiting review", tone: "secondary" as const },
];

export default function TradeMonitoringPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Trade monitoring"
        description="Internal operational queue for trade transactions."
      />

      <StubNotice section="section 6 / sitemap 12.5" />

      <section className="rounded-2xl border border-border bg-card">
        <h2 className="border-b border-border px-5 py-4 text-[15px] text-foreground">
          Awaiting officer action
        </h2>
        <ul className="divide-y divide-border">
          {QUEUE.map((t) => (
            <li key={t.id}>
              <Link
                href={`/admin/trade/${t.id}`}
                className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-muted/50 active:scale-[0.99] transition-transform"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Ship size={16} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[13.5px] text-foreground">{t.desc}</span>
                  <span className="mt-0.5 truncate text-[12px] text-muted-foreground tabular">
                    {t.ref} · {t.customer}
                  </span>
                </span>
                <span className="shrink-0 text-[13.5px] text-foreground tabular">
                  {formatMoney(t.amount, "USD")}
                </span>
                <Badge variant={t.tone}>{t.flag}</Badge>
                <ChevronRight size={16} strokeWidth={1.8} aria-hidden="true" className="shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
