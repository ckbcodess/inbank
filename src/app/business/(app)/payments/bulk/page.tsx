"use client";

/**
 * Bulk Upload → Bulk Validation / Review — section 3, state model 13.8. STUB.
 *
 * A dedicated surface because file-based entry is materially different. Review
 * is merged into validation, not a separate screen. The core state is "mixed":
 * valid and invalid counts shown together, with inline correction and no forced
 * re-upload.
 */

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, FileSpreadsheet, Upload } from "@/components/ui/icons";
import PageHeader from "@/components/layout/PageHeader";
import { cn } from "@/lib/utils";
import { LIST_CARD_CLASS } from "@/components/ui/list-card";
import StubNotice from "@/components/StubNotice";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SummaryCard } from "@/components/SummaryCard";
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

const RECORDS = [
  { row: 35, name: "Ama Darko", account: "0119 2234 7712", amount: 3800, valid: true },
  { row: 36, name: "Yaw Mensah", account: "0119 2234 7745", amount: 4100, valid: true },
  { row: 37, name: "Kwesi Amoah", account: "0119 2234 7781", amount: 4200, valid: false, error: "Beneficiary account closed" },
  { row: 38, name: "Akua Boakye", account: "0119 2234 7799", amount: 3950, valid: true },
  { row: 39, name: "Kofi Nyarko", account: "011-BAD-FORMAT", amount: 4400, valid: false, error: "Account number format invalid" },
];

export default function BulkUploadPage() {
  const [state, setState] = useState<BulkUploadState>("mixed");
  const validCount = 138;
  const invalidCount = 2;

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Bulk Payments"
        backTo={{ href: "/business/payments", label: "Send & Pay" }}
      />

      <StateSwitcher section="13.8" states={BULK_STATES} value={state} onChange={setState} />

      <StubNotice section="section 3" states="13.8" />

      <section className={cn(LIST_CARD_CLASS, "p-4")}>
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <FileSpreadsheet size={17} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] text-foreground">payroll-august-2026.csv</p>
            <p className="mt-0.5 text-[12px] text-muted-foreground tabular">140 records · 48 KB</p>
          </div>
          <Button variant="outline" size="sm">
            <Upload size={14} aria-hidden="true" />
            Replace file
          </Button>
        </div>

        {/* 13.8 core "mixed" state — both counts shown prominently */}
        <div className="grid grid-cols-1 gap-2 pt-3 sm:grid-cols-3">
          <SummaryCard
            label="Valid records"
            value={String(validCount)}
            hint={formatMoney(282200)}
            icon={<CheckCircle2 size={15} />}
          />
          <SummaryCard
            label="Invalid records"
            value={String(invalidCount)}
            hint="Correct or remove below"
            icon={<AlertCircle size={15} />}
            tone="destructive"
          />
          <SummaryCard label="Batch total" value={formatMoney(286400)} hint="If all records are sent" />
        </div>
      </section>

      <section className={cn(LIST_CARD_CLASS)}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-[15px] text-foreground">Records</h2>
          <span className="text-[12px] text-muted-foreground">
            Showing rows 35–39 of 140
          </span>
        </div>
        <ul className="flex flex-col gap-0.5">
          {RECORDS.map((r) => (
            <li
              key={r.row}
              className={`flex items-center gap-3 px-4 py-3 ${r.valid ? "" : "bg-destructive/5"}`}
            >
              <span className="w-7 shrink-0 text-[12.5px] text-muted-foreground tabular">{r.row}</span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[13px] text-foreground">{r.name}</span>
                <span className="truncate text-[12px] text-muted-foreground tabular">{r.account}</span>
                {!r.valid && (
                  <span className="mt-0.5 text-[12px] text-destructive">{r.error}</span>
                )}
              </span>
              <span className="shrink-0 text-[13px] text-foreground tabular">{formatMoney(r.amount)}</span>
              {r.valid ? (
                <Badge variant="success">Valid</Badge>
              ) : (
                <div className="flex shrink-0 gap-2">
                  <Button variant="outline" size="xs" disabled>
                    Correct
                  </Button>
                  <Button variant="ghost" size="xs" disabled>
                    Remove
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
        <p className="border-t border-border px-4 py-2 text-[12.5px] text-muted-foreground">
          Records are corrected inline and revalidated individually — the full batch is never
          re-uploaded (13.8).
        </p>
      </section>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" nativeButton={false} render={<Link href="/business/payments" />}>
          Cancel
        </Button>
        <Button disabled>Submit {validCount} valid records</Button>
      </div>
    </div>
  );
}
