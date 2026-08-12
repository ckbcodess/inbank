"use client";

/**
 * Batch correction view — section 3 failure recovery for bulk payments. STUB.
 *
 * This is the destination Transaction Details sends a `failed-bulk` record to:
 * a batch record is corrected here, alongside its siblings, rather than being
 * fixed standalone on the transaction screen.
 */

import { useState, use } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import StubNotice from "@/components/StubNotice";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import type { BulkUploadState } from "@/lib/states";
import { formatMoney } from "@/lib/mock-data";

const BULK_STATES: readonly BulkUploadState[] = [
  "uploading",
  "upload-failed",
  "validating",
  "mixed",
  "revalidating",
] as const;

const FAILED_RECORDS = [
  { row: 37, name: "Kwesi Amoah", account: "0119 2234 7781", amount: 4200, error: "Beneficiary account closed" },
];

export default function BatchCorrectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [state, setState] = useState<BulkUploadState>("mixed");

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Batch correction"
        description={`Batch ${id} · payroll-august-2026.csv`}
        backTo={{ href: "/transactions", label: "Transactions" }}
      />

      <StateSwitcher section="13.8" states={BULK_STATES} value={state} onChange={setState} />

      <StubNotice section="section 3 failure recovery" states="13.8" />

      <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/40 p-4">
        <AlertCircle size={16} strokeWidth={1.8} aria-hidden="true" className="mt-px shrink-0 text-muted-foreground" />
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          139 of 140 records in this batch settled successfully. Only the failed record below needs
          attention — correcting it revalidates that record alone.
        </p>
      </div>

      <section className="rounded-2xl border border-border bg-card">
        <h2 className="border-b border-border px-5 py-4 text-[15px] text-foreground">
          Records needing correction
        </h2>
        <ul className="divide-y divide-border">
          {FAILED_RECORDS.map((r) => (
            <li key={r.row} className="flex items-center gap-4 bg-destructive/5 px-5 py-3.5">
              <span className="w-8 shrink-0 text-[12.5px] text-muted-foreground tabular">{r.row}</span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[13px] text-foreground">{r.name}</span>
                <span className="truncate text-[12px] text-muted-foreground tabular">{r.account}</span>
                <span className="mt-0.5 text-[12px] text-destructive">{r.error}</span>
              </span>
              <span className="shrink-0 text-[13px] text-foreground tabular">{formatMoney(r.amount)}</span>
              <Badge variant="destructive">Failed</Badge>
              <div className="flex shrink-0 gap-1.5">
                <Button variant="outline" size="xs" disabled>
                  Correct
                </Button>
                <Button variant="ghost" size="xs" disabled>
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-wrap gap-2">
        <Button disabled>Resubmit corrected records</Button>
        <Button variant="outline" nativeButton={false} render={<Link href="/payments" />}>
          Back to Payments
        </Button>
      </div>
    </div>
  );
}
