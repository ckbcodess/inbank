"use client";

/**
 * Send & Pay — one standing order. What it is, where it comes from, and the two things you can do
 * about it (pause / resume, cancel). Nothing runs without the customer being able to see it here.
 */

import { toast } from "sonner";
import { useEffect, useReducer, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, Pause, Play, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import PageHeader from "@/components/layout/PageHeader";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  STANDING_INSTRUCTIONS,
  cancelStandingInstruction,
  findAccount,
  formatDate,
  formatMoney,
  setStandingStatus,
} from "@/lib/mock-data";
import { cadencePhrase, orderPayee, orderTitle, orderType } from "@/lib/standing-display";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";
import { cn } from "@/lib/utils";

export default function StandingOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { showAmounts } = useAmountVisibility();
  const [, force] = useReducer((x: number) => x + 1, 0);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelled, setCancelled] = useState<string | null>(null);
  // Orders are stored in this browser, so read them after mount (the server render has only the seed).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const si = STANDING_INSTRUCTIONS.find((s) => s.id === id);
  const back = { href: "/payments/standing", label: "Standing Orders" };

  if (!mounted) return null;

  if (cancelled) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title="Standing Order" backTo={back} />
        <div className="mx-auto flex w-full max-w-[560px] flex-col items-start gap-4 px-1">
          <CheckCircle2 size={22} strokeWidth={1.8} className="text-emerald-500" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <span className="text-[18px] text-foreground">Cancelled</span>
            <span className="text-[13.5px] text-muted-foreground">{cancelled} won&apos;t be paid again. You can set it up again anytime.</span>
          </div>
          <Link href={back.href} className={buttonVariants({ variant: "outline", size: "sm" })}>
            Back to Standing Orders
          </Link>
        </div>
      </div>
    );
  }

  if (!si) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title="Standing Order" backTo={back} />
        <div className="mx-auto flex w-full max-w-[560px] flex-col items-start gap-3 px-1">
          <span className="text-[18px] text-foreground">We couldn&apos;t find this standing order</span>
          <span className="text-[13.5px] text-muted-foreground">It may have been cancelled.</span>
          <Link href={back.href} className={buttonVariants({ variant: "outline", size: "sm" })}>
            Back to Standing Orders
          </Link>
        </div>
      </div>
    );
  }

  const paused = si.status === "Paused";
  const title = orderTitle(si);
  const source = findAccount(si.accountId);

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
    <div className="flex flex-col gap-8">
      <PageHeader title={title} backTo={back} />

      <div className="mx-auto flex w-full max-w-[760px] flex-col gap-8">
        <section className="flex flex-col gap-1.5 px-1">
          <span className={cn("tabular text-[40px] leading-none tracking-[-0.02em]", paused ? "text-muted-foreground" : "text-foreground")}>
            {formatMoney(si.amount, si.currency, showAmounts)}
          </span>
          <span className="text-[14px] text-muted-foreground">
            {paused ? "Paused. Nothing will be paid until you resume." : cadencePhrase(si)}
          </span>
        </section>

        <section className="flex flex-col rounded-2xl border border-border bg-card p-2">
          {facts.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-6 rounded-xl px-3 py-4 text-[14px]">
              <span className="shrink-0 text-muted-foreground">{label}</span>
              <span className="tabular min-w-0 truncate text-right text-foreground">{value}</span>
            </div>
          ))}
        </section>

        <section className="flex flex-col gap-4">
          <p className="text-center text-[13px] text-muted-foreground">This pays automatically, and you can pause or cancel it anytime.</p>
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={togglePause}>
              {paused ? (
                <>
                  <Play size={14} strokeWidth={2} aria-hidden="true" /> Resume
                </>
              ) : (
                <>
                  <Pause size={14} strokeWidth={2} aria-hidden="true" /> Pause
                </>
              )}
            </Button>
            <Button variant="destructive" onClick={() => setConfirmCancel(true)}>
              <Trash2 size={14} strokeWidth={1.8} aria-hidden="true" /> Cancel Order
            </Button>
          </div>
        </section>
      </div>

      <Dialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Cancel this standing order?</DialogTitle>
          </DialogHeader>
          <DialogBody className="gap-3.5">
            <p className="text-[13.5px] leading-relaxed text-muted-foreground">
              &quot;{si.beneficiary}&quot; will stop running. You can set it up again anytime.
            </p>
            <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-3 text-[12.5px] text-muted-foreground">
              <AlertTriangle size={15} strokeWidth={1.8} className="mt-0.5 shrink-0 text-amber-500" aria-hidden="true" />
              <span>If you just want to pause it temporarily, use Pause instead.</span>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setConfirmCancel(false)}>
              Keep it
            </Button>
            <Button variant="destructive" size="sm" onClick={handleCancel}>
              <Trash2 size={14} strokeWidth={1.8} aria-hidden="true" className="mr-1.5" />
              Cancel order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
