"use client";

/**
 * Trade Officer Workstation — section 6, sitemap 12.5. STUB.
 *
 * A separate internal tool, NOT the customer's Trade Details screen. Section 6
 * contrasts the two directly:
 *
 *   Customer Trade Details      Trade Officer Workstation
 *   Status                      Audit trail
 *   Lifecycle                   Exception flags
 *   Timeline                    Version history
 *   Documents                   Document audit
 *   Read-only transparency      Assist / view-only indicators
 */

import { useState, use } from "react";
import { AlertTriangle, Eye, FileSearch, History, ScrollText } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import StubNotice from "@/components/StubNotice";
import { Badge } from "@/components/ui/badge";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import type { TradeApprovalState } from "@/lib/states";
import { TRADE_DOCUMENTS, TRADE_VERSIONS, formatMoney } from "@/lib/mock-data";

const TRADE_APPROVAL_STATES: readonly TradeApprovalState[] = [
  "awaiting-decision",
  "documents-incomplete",
  "version-comparison",
  "returned-for-clarification",
  "decision-submitted",
] as const;

const AUDIT = [
  { at: "2026-08-04 11:20", actor: "Kwame Boateng", event: "v1 submitted" },
  { at: "2026-08-06 14:03", actor: "N. Addo (Trade Officer)", event: "Returned — invoice quantity mismatch" },
  { at: "2026-08-08 09:55", actor: "Kwame Boateng", event: "v2 submitted with corrected quantity" },
  { at: "2026-08-09 10:31", actor: "System", event: "Document audit flagged missing certificate of origin" },
  { at: "2026-08-10 16:41", actor: "Kwame Boateng", event: "v3 submitted — incoterms revised" },
];

export default function TradeOfficerWorkstationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [state, setState] = useState<TradeApprovalState>("documents-incomplete");

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Trade Officer Workstation"
        description={`${id.toUpperCase()} · Adinkra Textiles Ltd`}
        backTo={{ href: "/admin/trade", label: "Trade monitoring" }}
      />

      <StateSwitcher section="13.5" states={TRADE_APPROVAL_STATES} value={state} onChange={setState} />

      <StubNotice section="section 6 / sitemap 12.5" />

      {/* Assist / view-only indicator (section 6) */}
      <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/40 p-4">
        <Eye size={16} strokeWidth={1.8} className="mt-px shrink-0 text-muted-foreground" />
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Assist mode — you can audit documents, review versions and record findings. Execution stays
          with the customer and their approvers.
        </p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="text-[12px] text-muted-foreground">Trade value</span>
            <p className="mt-1.5 text-[28px] leading-none tracking-[-0.02em] text-foreground tabular">
              {formatMoney(128000, "USD")}
            </p>
          </div>
          <Badge variant="warning">Exception flagged</Badge>
        </div>
      </section>

      {/* Exception flags */}
      <section className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle
            size={17}
            strokeWidth={1.8}
            className="mt-px shrink-0 text-amber-600 dark:text-amber-400"
          />
          <div>
            <p className="text-[14px] text-amber-700 dark:text-amber-400">Exception flags</p>
            <ul className="mt-2 flex flex-col gap-1.5 text-[13px] text-foreground/90">
              <li>Commercial invoice quantity does not match bill of lading</li>
              <li>Certificate of origin not provided</li>
            </ul>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Document audit */}
        <section className="rounded-2xl border border-border bg-card">
          <h2 className="flex items-center gap-2 border-b border-border px-5 py-4 text-[15px] text-foreground">
            <FileSearch size={16} strokeWidth={1.8} className="text-muted-foreground" />
            Document audit
          </h2>
          <ul className="divide-y divide-border">
            {TRADE_DOCUMENTS.map((d) => (
              <li key={d.id} className="flex items-center gap-3 px-5 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] text-foreground">{d.name}</span>
                  <span className="block text-[12px] text-muted-foreground tabular">{d.uploadedAt}</span>
                </span>
                {d.status === "missing" ? (
                  <Badge variant="warning">Missing</Badge>
                ) : (
                  <Badge variant="success">Verified</Badge>
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* Version history */}
        <section className="rounded-2xl border border-border bg-card">
          <h2 className="flex items-center gap-2 border-b border-border px-5 py-4 text-[15px] text-foreground">
            <History size={16} strokeWidth={1.8} className="text-muted-foreground" />
            Version history
          </h2>
          <ul className="divide-y divide-border">
            {TRADE_VERSIONS.map((v) => (
              <li key={v.version} className="flex items-start gap-3 px-5 py-3">
                <span className="w-7 shrink-0 text-[12.5px] text-muted-foreground tabular">v{v.version}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] text-foreground">{v.summary}</span>
                  <span className="block text-[12px] text-muted-foreground tabular">
                    {v.submittedAt} · {v.submittedBy}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Audit trail */}
      <section className="rounded-2xl border border-border bg-card">
        <h2 className="flex items-center gap-2 border-b border-border px-5 py-4 text-[15px] text-foreground">
          <ScrollText size={16} strokeWidth={1.8} className="text-muted-foreground" />
          Audit trail
        </h2>
        <ul className="divide-y divide-border">
          {AUDIT.map((e, i) => (
            <li key={i} className="flex gap-4 px-5 py-3">
              <span className="w-32 shrink-0 text-[12px] text-muted-foreground tabular">{e.at}</span>
              <span className="min-w-0 flex-1 text-[13px] text-foreground">{e.event}</span>
              <span className="hidden shrink-0 text-[12px] text-muted-foreground sm:block">{e.actor}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
