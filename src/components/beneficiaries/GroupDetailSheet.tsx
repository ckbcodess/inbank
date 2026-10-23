"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil, Send, Trash2 } from "@/components/ui/icons";
import { Sheet, SheetContent, SheetTitle, SheetDescription, SheetCard } from "@/components/ui/sheet";
import { PayeeAvatar } from "@/components/ui/payee-avatar";
import { RoundAction } from "@/components/ui/round-action";
import { type PaymentGroup } from "@/lib/groups-store";
import { sumMoney } from "@/lib/money";

interface GroupDetailSheetProps {
  group: PaymentGroup | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (group: PaymentGroup) => void;
  onDelete: (group: PaymentGroup) => void;
}

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function GroupDetailSheet({ group, open, onOpenChange, onEdit, onDelete }: GroupDetailSheetProps) {
  const router = useRouter();
  if (!group) return null;

  const amountFor = (m: PaymentGroup["members"][number]) =>
    group.splitType === "custom" ? m.defaultAmount ?? 0 : group.defaultPerMemberAmount;
  const total = sumMoney(group.members.map(amountFor));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="center" className="flex flex-col">
        {/* Centred as a block like the beneficiary sheet. When the members are too many to fit, the name stays put and only the list scrolls */}
        <div className="flex min-h-0 flex-1 flex-col justify-center">
          <div className="flex shrink-0 flex-col items-center gap-1 px-5 pt-12 pb-5 text-center sm:px-8">
            <PayeeAvatar name={group.name} size="xl" />
            <SheetTitle className="mt-3">{group.name}</SheetTitle>
            <SheetDescription className="text-[13px] text-muted-foreground tabular">
              {group.members.length} {group.members.length === 1 ? "member" : "members"} · GHS {fmt(total)} in total
            </SheetDescription>
          </div>

          <div className="min-h-0 overflow-y-auto px-5 pb-3 no-scrollbar sm:px-8">
            <SheetCard>
            {group.members.map((m) => (
              <div key={m.id || m.destination} className="flex items-center justify-between gap-3 py-2">
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-[13px] text-foreground">{m.name}</span>
                  {/* The number is what you check, so it never gets cut; the network name gives way instead */}
                  <span className="flex min-w-0 text-[12px] text-muted-foreground tabular">
                    <span className="truncate">{m.networkOrBank || "GCB Bank"}</span>
                    <span className="shrink-0">&nbsp;· {m.destination}</span>
                  </span>
                </div>
                <span className="shrink-0 text-[13px] text-foreground tabular">GHS {fmt(amountFor(m))}</span>
              </div>
            ))}
            </SheetCard>
          </div>
        </div>

        <div className="shrink-0 px-5 pb-6 pt-2 sm:px-8">
          <div className="flex items-center justify-center gap-5">
            <RoundAction
              label="Send"
              icon={Send}
              onClick={() => {
                onOpenChange(false);
                router.push(`/payments/send?rail=group&group=${encodeURIComponent(group.name)}`);
              }}
            />
            <RoundAction
              label="Edit"
              icon={Pencil} chipClassName="bg-muted text-foreground group-hover:bg-muted/70"
              onClick={() => {
                onOpenChange(false);
                onEdit(group);
              }}
            />
            <RoundAction
              label="Delete"
              icon={Trash2} chipClassName="bg-muted text-destructive-text group-hover:bg-muted/70"
              onClick={() => {
                onOpenChange(false);
                onDelete(group);
              }}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
