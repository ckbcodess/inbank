"use client";

/**
 * Business Send & Pay — the three ways a company pays: one supplier at a time, many at once from a file, or on a
 * schedule. No wallets, airtime, bills or QR: those are personal banking's, and none of them is a company's.
 */

import { Building2, FileSpreadsheet, Repeat } from "@/components/ui/icons";
import PageHeader from "@/components/layout/PageHeader";
import { ActionTile } from "@/components/ui/action-tile";
import { paysWithoutApproval } from "@/lib/corporate/roles";
import { useSession } from "@/lib/session-store";

export default function BusinessPaymentsPage() {
  const actor = useSession((s) => s.actor);
  const direct = actor ? paysWithoutApproval(actor.role) : false;

  return (
    <div className="flex flex-col gap-10">
      <PageHeader title="Send & Pay" />

      <nav aria-label="Ways to pay" className="flex flex-col gap-3">
        <ActionTile
          href="/business/payments/supplier"
          icon={Building2}
          title="Pay a Supplier"
          description={direct ? "One bank transfer to a supplier" : "One bank transfer, sent for approval"}
        />
        <ActionTile
          href="/business/payments/bulk"
          icon={FileSpreadsheet}
          title="Pay in Bulk"
          description="Salaries or suppliers from a file"
        />
        <ActionTile
          href="/business/payments/standing"
          icon={Repeat}
          title="Standing Orders"
          description="Rent and regular payments that run on a schedule"
        />
      </nav>
    </div>
  );
}
