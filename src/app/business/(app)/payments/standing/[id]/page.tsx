"use client";

/**
 * Business standing order — what it is, where it comes from, and the two things a company can do about it
 * (pause or resume, cancel). Nothing runs without the company being able to see it here.
 */

import { toast } from "sonner";
import { useEffect, useReducer, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, Pause, Play, Trash2 } from "@/components/ui/icons";
import { Button, buttonVariants } from "@/components/ui/button";
import PageHeader from "@/components/layout/PageHeader";
import { LIST_CARD_CLASS } from "@/components/ui/list-card";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";
import { findBusinessAccount } from "@/lib/corporate/accounts";
import {
  STANDING_INSTRUCTIONS,
  cancelStandingInstruction,
  formatDate,
  formatMoney,
  setStandingStatus,
} from "@/lib/mock-data";
import { cadencePhrase, orderPayee, orderTitle, orderType } from "@/lib/standing-display";
import { cn } from "@/lib/utils";

export default function BusinessStandingOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { showAmounts } = useAmountVisibility();
  const [, force] = useReducer((x: number) => x + 1, 0);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelled, setCancelled] = useState<string | null>(null);
  // Orders are kept in this browser, so read them after mount (the server render has only the seed).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const si = STANDING_INSTRUCTIONS.find((s) => s.id === id);
  const back = { href: "/business/payments/standing", label: "Standing Orders" };

  if (!mounted) return null;

  if (cancelled) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Standing Order" backTo={back} />
        <div className="mx-auto flex w-full max-w-[560px] flex-col items-start gap-3 px-1">
          <CheckCircle2 size={22} className="text-success-text" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <span className="text-[18px] text-foreground">Cancelled</span>
            <span className="text-[13px] text-muted-foreground">{cancelled} won&apos;t be paid again. You can set it up again anytime.</span>
          </div>
          <Link href={back.href} className={buttonVariants({ variant: "outline", size: "sm" })}>
            Back to Standing Orders
          </Link>
        </div>
      </div>
    );
  }

  if (!si || !findBusinessAccount(si.accountId)) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Standing Order" backTo={back} />
        <div className="mx-auto flex w-full max-w-[560px] flex-col items-start gap-2 px-1">
          <span className="text-[18px] text-foreground">We couldn&apos;t find this standing order</span>
          <span className="text-[13px] text-muted-foreground">It may have been cancelled.</span>
          <Link href={back.href} className={buttonVariants({ variant: "outline", size: "sm" })}>
            Back to Standing Orders
          </Link>
        </div>
      </div>
    );
  }

  const paused = si.status === "Paused";
  const title = orderTitle(si);
  const source = findBusinessAccount(si.accountId);

  function togglePause() {
    if (!si) return;
    const next = paused ? "Active" : "Paused";
    setStandingStatus(si.id, next);
    toast.success(
      next === "Paused"
        ? `Paused. ${orderPayee(si)} won't be paid on schedule until you resume.`
        : `Resumed. ${orderPayee(si)} is back on schedule.`,
    );
    force();
  }

  function handleCancel() {
    if (!si) return;
    cancelStandingInstruction(si.id);
    setConfirmCancel(false);
    setCancelled(title);
  }

  const facts: Array<[string, string]> = [
    ["Payment type", orderType(si)],
    ["To", orderPayee(si)],
    ["From", source?.name ?? "Your account"],
    ["Start date", formatDate(si.startDate ?? si.nextRun)],
    [paused ? "Was due" : "Next payment", formatDate(si.nextRun)],
    ...(si.frequency === "Once" ? [] : ([["End date", si.endDate ? formatDate(si.endDate) : "Until cancelled"]] as Array<[string, string]>)),
    ...(si.narration ? ([["Transaction narration", si.narration]] as Array<[string, string]>) : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title} backTo={back} />

      <div className="mx-auto flex w-full max-w-[760px] flex-col gap-6">
        <section className="flex flex-col gap-2 px-1">
          <span className={cn("tabular text-[40px] leading-none tracking-[var(--ls-heading)]", paused ? "text-muted-foreground" : "text-foreground")}>
            {formatMoney(si.amount, si.currency, showAmounts)}
          </span>
          <span className="text-[14px] text-muted-foreground">
            {paused ? "Paused. Nothing will be paid until you resume." : cadencePhrase(si)}
          </span>
        </section>

        <section className={LIST_CARD_CLASS}>
          {facts.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-5 rounded-xl px-2 py-3 text-[14px]">
              <span className="shrink-0 text-muted-foreground">{label}</span>
              <span className="tabular min-w-0 truncate text-right text-foreground">{value}</span>
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-3">
          <p className="text-center text-[13px] text-muted-foreground">This pays automatically, and you can pause or cancel it anytime.</p>
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={togglePause}>
              {paused ? (
                <>
                  <Play size={14} aria-hidden="true" /> Resume
                </>
              ) : (
                <>
                  <Pause size={14} aria-hidden="true" /> Pause
                </>
              )}
            </Button>
            <Button variant="destructive" onClick={() => setConfirmCancel(true)}>
              <Trash2 size={14} aria-hidden="true" /> Cancel Order
            </Button>
          </div>
        </section>
      </div>

      <Dialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Cancel this standing order?</DialogTitle>
          </DialogHeader>
          <DialogBody className="gap-3">
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              &quot;{si.beneficiary}&quot; will stop running. You can set it up again anytime.
            </p>
            <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-2 text-[12px] text-muted-foreground">
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-warning-text" aria-hidden="true" />
              <span>If you just want to pause it temporarily, use Pause instead.</span>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmCancel(false)}>
              Keep It
            </Button>
            <Button variant="destructive" onClick={handleCancel}>
              <Trash2 size={14} aria-hidden="true" className="mr-2" />
              Cancel Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
