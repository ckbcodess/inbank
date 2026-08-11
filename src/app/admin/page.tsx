"use client";

/**
 * Admin Portal Overview — section 12.5. STUB.
 *
 * Work-queue oriented operations dashboard with no children. The tiles shown
 * follow the actor's own nav per 12.3, so a Trade Officer, Operations User and
 * Bank Admin each land on a different overview.
 */

import Link from "next/link";
import { AlertTriangle, ArrowRight, Building2, ArrowLeftRight, Ship } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import StubNotice from "@/components/StubNotice";
import { SummaryCard } from "@/components/SummaryCard";
import { useSession } from "@/lib/session-store";
import { ROLE_LABEL } from "@/lib/roles";

export default function AdminOverviewPage() {
  const actor = useSession((s) => s.actor);
  if (!actor) return null;

  const isOps = actor.role === "OPERATIONS_USER";
  const isTrade = actor.role === "TRADE_OFFICER";
  const isBankAdmin = actor.role === "BANK_ADMIN";

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Operations overview"
        description={`${ROLE_LABEL[actor.role]} · internal staff portal`}
      />

      <StubNotice section="sitemap 12.5" />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {isOps && (
          <>
            <SummaryCard label="Transactions today" value="1,284" hint="Across all customers" />
            <SummaryCard label="Open exceptions" value="17" hint="Requiring investigation" tone="destructive" />
            <SummaryCard label="Pending settlement" value="63" tone="warning" />
            <SummaryCard label="Reversals this week" value="4" />
          </>
        )}
        {isTrade && (
          <>
            <SummaryCard label="Trades in review" value="23" hint="Awaiting officer action" tone="warning" />
            <SummaryCard label="Documents to audit" value="47" />
            <SummaryCard label="Returned this week" value="6" />
            <SummaryCard label="Completed this month" value="112" />
          </>
        )}
        {isBankAdmin && (
          <>
            <SummaryCard label="Corporate customers" value="412" />
            <SummaryCard label="Users pending activation" value="9" tone="warning" />
            <SummaryCard label="Suspended accounts" value="3" tone="destructive" />
            <SummaryCard label="Access reviews due" value="14" />
          </>
        )}
      </section>

      {/* Each internal role gets its own work queue, per the 12.3 matrix */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-[15px] text-foreground">Your work queue</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          The Admin Portal shows only what your internal role covers — customer banking surfaces are
          never visible here.
        </p>

        <div className="mt-4 flex flex-col gap-2">
          {isOps && (
            <>
              <QueueLink href="/admin/transactions" icon={<ArrowLeftRight size={16} strokeWidth={1.8} aria-hidden="true" />} label="Transaction Monitoring" hint="Operational scanning and filtering" />
              <QueueLink href="/admin/exceptions" icon={<AlertTriangle size={16} strokeWidth={1.8} aria-hidden="true" />} label="Exceptions" hint="Filtered view of monitoring" />
            </>
          )}
          {isTrade && (
            <QueueLink href="/admin/trade" icon={<Ship size={16} strokeWidth={1.8} aria-hidden="true" />} label="Trade Monitoring" hint="Opens the Trade Officer Workstation" />
          )}
          {isBankAdmin && (
            <QueueLink href="/admin/customers" icon={<Building2 size={16} strokeWidth={1.8} aria-hidden="true" />} label="Customer Management" hint="Internal customer directory" />
          )}
        </div>
      </section>
    </div>
  );
}

function QueueLink({
  href,
  icon,
  label,
  hint,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 transition-colors hover:border-primary/40 hover:bg-muted/40 active:scale-[0.99] transition-transform"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[13.5px] text-foreground">{label}</span>
        <span className="text-[12px] text-muted-foreground">{hint}</span>
      </span>
      <ArrowRight size={15} strokeWidth={1.8} aria-hidden="true" className="shrink-0 text-muted-foreground" />
    </Link>
  );
}
