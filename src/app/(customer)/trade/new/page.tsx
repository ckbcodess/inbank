"use client";

/**
 * Trade Type Selection → Trade Request → Trade Review — section 6. STUB.
 *
 * Type selection is a genuine screen in v2 because trade types have materially
 * different requirements; the request form and review are steps in the same
 * flow, not nav destinations (12.4).
 */

import { useState } from "react";
import Link from "next/link";
import { FileCheck, FileText, Landmark, Receipt } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import StubNotice from "@/components/StubNotice";
import { Button } from "@/components/ui/button";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import type { TradeState } from "@/lib/states";

const TRADE_STATES: readonly TradeState[] = [
  "draft",
  "submitted-in-review",
  "under-bank-review",
  "approved-active",
  "returned-for-correction",
  "completed-closed",
] as const;

const TRADE_TYPES = [
  {
    key: "lc",
    icon: Landmark,
    name: "Letter of Credit",
    desc: "Bank-guaranteed payment on presentation of compliant documents.",
    fields: "Beneficiary, incoterms, expiry, tolerance, document set",
  },
  {
    key: "dc",
    icon: Receipt,
    name: "Documentary Collection",
    desc: "Documents released against payment or acceptance, without a bank guarantee.",
    fields: "Drawee, tenor, collection instructions",
  },
  {
    key: "guarantee",
    icon: FileCheck,
    name: "Bank Guarantee",
    desc: "Undertaking to pay if the applicant defaults on an obligation.",
    fields: "Guarantee type, validity, claim conditions",
  },
];

export default function TradeTypeSelectionPage() {
  const [state, setState] = useState<TradeState>("draft");

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="New trade request"
        description="Choose the instrument — the request form changes to match it."
        backTo={{ href: "/trade", label: "Trade" }}
      />

      <StateSwitcher section="13.6" states={TRADE_STATES} value={state} onChange={setState} />

      <StubNotice section="section 6" states="13.3 form pattern" />

      <div className="grid grid-cols-1 gap-3">
        {TRADE_TYPES.map((t) => {
          const Icon = t.icon;
          return (
            <div
              key={t.key}
              className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] text-foreground">{t.name}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{t.desc}</p>
                <p className="mt-2 text-[12px] text-muted-foreground">
                  <span className="text-foreground/70">Type-specific fields:</span> {t.fields}
                </p>
              </div>
              <Button variant="outline" size="sm" disabled>
                Select
              </Button>
            </div>
          );
        })}
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 text-[15px] text-foreground">
          <FileText size={16} strokeWidth={1.8} aria-hidden="true" className="text-muted-foreground" />
          Remaining steps
        </h2>
        <ol className="mt-3 flex flex-col gap-2 text-[13px] text-muted-foreground">
          <li>2. Trade Request — type-specific fields</li>
          <li>3. Documents — attached within the request workflow, not a separate screen</li>
          <li>4. Trade Review — strong confirmation before submission</li>
          <li>5. Trade Details — the submission result becomes the initial trade state</li>
        </ol>
      </section>

      <div>
        <Button variant="outline" nativeButton={false} render={<Link href="/trade" />}>
          Back to Trade
        </Button>
      </div>
    </div>
  );
}
