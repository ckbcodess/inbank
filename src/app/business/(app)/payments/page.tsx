"use client";

/**
 * Business Send & Pay, laid out like the personal hub (Figma 916:36785): the title with the schedule beside it, then
 * the ways to pay as tiles in a two-column grid, with the same duotone glass icons (in smoke ash here, from the
 * business theme). A company pays one supplier at a time or many at once from a file; standing orders sit with the
 * title, as personal's scheduled payments do. No wallets, airtime, bills or QR: those are personal banking's.
 */

import Link from "next/link";
import { Bank, Repeat, Users } from "reicon-react";
import PageHeader from "@/components/layout/PageHeader";
import { ActionTile } from "@/components/ui/action-tile";
import { Button } from "@/components/ui/button";
import { glassOf, rectRegion } from "@/components/ui/glass-icon";
import { SectionHeading } from "@/components/ui/section-heading";
import { paysWithoutApproval } from "@/lib/corporate/roles";
import { useSession } from "@/lib/session-store";

// Built once, so the icon components stay stable between renders.
const SUPPLIER_ICON = glassOf(Bank as never, "amber", { tone: "slate", region: rectRegion(0, 17.6, 24, 7) });
const BULK_ICON = glassOf(Users as never, "amber", { tone: "slate", region: rectRegion(0, 13, 24, 11) });

export default function BusinessPaymentsPage() {
  const actor = useSession((s) => s.actor);
  const direct = actor ? paysWithoutApproval(actor.role) : false;

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Send & Pay"
        actions={
          <Button nativeButton={false} render={<Link href="/business/payments/standing" />} variant="tile">
            <Repeat size={15} aria-hidden="true" className="size-[15px]" />
            Standing Orders
          </Button>
        }
      />

      <div className="flex flex-col gap-3">
        <SectionHeading title="Pay" />
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <ActionTile
            href="/business/payments/supplier"
            icon={SUPPLIER_ICON}
            title="Pay a Supplier"
            description={direct ? "One bank transfer" : "One transfer, sent for approval"}
            compactOnMobile
            bareIcon
          />
          {!direct && (
            <ActionTile
              href="/business/payments/bulk"
              icon={BULK_ICON}
              title="Pay in Bulk"
              description="Salaries or suppliers from a file"
              compactOnMobile
              bareIcon
            />
          )}
        </div>
      </div>
    </div>
  );
}
