"use client";

/**
 * One scheduled payment, as a sheet over the list: what it is, where it comes from, and the two things you can do
 * about it (pause or resume, cancel). Nothing runs without the customer being able to see it here.
 */

import { useReducer, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Pause, Play, Trash2 } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import {
  STANDING_INSTRUCTIONS,
  cancelStandingInstruction,
  findAccount,
  formatDate,
  formatMoney,
  setStandingStatus,
  type StandingInstruction,
} from "@/lib/mock-data";
import { cadencePhrase, orderPayee, orderTitle, orderType } from "@/lib/standing-display";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";
import { cn } from "@/lib/utils";

const DASHED =
  "relative before:absolute before:inset-x-0 before:top-0 before:h-px before:content-[''] before:bg-[repeating-linear-gradient(to_right,var(--border)_0_6px,transparent_6px_16px)]";

function Facts({ rows, divided }: { rows: Array<[string, string]>; divided?: boolean }) {
  return (
    <div className={cn("flex flex-col gap-3 py-5", divided && DASHED)}>
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-center justify-between gap-3 text-[13.5px]">
          <span className="text-muted-foreground">{label}</span>
          <span className="tabular min-w-0 truncate text-right font-medium text-foreground">{value}</span>
        </div>
      ))}
    </div>
  );
}

export function ScheduledPaymentSheet({
  id,
  onOpenChange,
  onChanged,
}: {
  /** The scheduled payment to show, or null for none (the sheet is closed). */
  id: string | null;
  onOpenChange: (open: boolean) => void;
  /** Called after a pause, resume or cancel, so the list behind the sheet can redraw. */
  onChanged: () => void;
}) {
  const { showAmounts } = useAmountVisibility();
  const [, force] = useReducer((x: number) => x + 1, 0);
  const [confirmCancel, setConfirmCancel] = useState(false);
  // Keep showing the last one while the sheet slides out after a cancel.
  const [shown, setShown] = useState<StandingInstruction | null>(null);

  const found = id ? STANDING_INSTRUCTIONS.find((s) => s.id === id) : undefined;
  if (found && found !== shown) setShown(found);
  const si = found ?? shown;

  if (!si) return null;

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
    onChanged();
  }

  function handleCancel() {
    if (!si) return;
    cancelStandingInstruction(si.id);
    setConfirmCancel(false);
    onOpenChange(false);
    onChanged();
    toast.success(`Cancelled. ${title} won't be paid again. You can set it up again anytime.`);
  }

  const who: Array<[string, string]> = [
    ["To", orderPayee(si)],
    ["From", source?.name ?? "Your account"],
  ];
  const when: Array<[string, string]> = [
    ["Start date", formatDate(si.startDate ?? si.nextRun)],
    [paused ? "Was due" : "Next payment", formatDate(si.nextRun)],
    ...(si.frequency === "Once" ? [] : ([["End date", si.endDate ? formatDate(si.endDate) : "Until cancelled"]] as Array<[string, string]>)),
  ];

  return (
    <>
      <Sheet open={Boolean(id)} onOpenChange={onOpenChange}>
        <SheetContent side="center" className="flex flex-col overflow-hidden bg-modal p-0 select-text" showCloseButton>
          <div className="custom-scrollbar relative z-10 flex flex-1 flex-col overflow-y-auto px-5 pb-5 pt-12 sm:px-8">
            <div className="my-auto">
              <div className="flex flex-col items-center pb-5 text-center">
                <SheetTitle className="text-[13px] font-normal text-muted-foreground">{title}</SheetTitle>
                <span
                  className={cn(
                    "tabular mt-4 text-[32px] font-normal leading-none tracking-[var(--ls-display)] sm:text-[40px]",
                    paused ? "text-muted-foreground" : "text-foreground",
                  )}
                >
                  {formatMoney(si.amount, si.currency, showAmounts)}
                </span>
                <SheetDescription className="mt-4 text-[12.5px] text-muted-foreground/80">
                  {paused ? "Paused. Nothing will be paid until you resume." : cadencePhrase(si)}
                </SheetDescription>
              </div>

              <Facts rows={[["Payment type", orderType(si)], ...who]} />
              <Facts rows={when} divided />
              {si.narration && <Facts rows={[["Narration", si.narration]]} divided />}
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-center gap-3 px-5 pb-6 pt-2 sm:px-8">
            <div className="flex items-center justify-center gap-8">
              <button
                type="button"
                onClick={togglePause}
                className="group flex cursor-pointer flex-col items-center gap-2 rounded-xl p-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs transition-transform duration-fast group-hover:brightness-95 group-active:scale-95">
                  {paused ? <Play size={20} aria-hidden="true" /> : <Pause size={20} aria-hidden="true" />}
                </span>
                <span className="text-[12.5px] text-foreground">{paused ? "Resume" : "Pause"}</span>
              </button>
              <button
                type="button"
                onClick={() => setConfirmCancel(true)}
                className="group flex cursor-pointer flex-col items-center gap-2 rounded-xl p-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex size-11 items-center justify-center rounded-full bg-destructive text-white shadow-xs transition-transform duration-fast group-hover:brightness-95 group-active:scale-95">
                  <Trash2 size={20} aria-hidden="true" />
                </span>
                <span className="text-[12.5px] text-foreground">Cancel</span>
              </button>
            </div>
            <p className="text-center text-[12px] text-muted-foreground">This pays automatically, and you can pause or cancel it anytime.</p>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Cancel this scheduled payment?</DialogTitle>
          </DialogHeader>
          <DialogBody className="gap-3">
            <p className="text-[13.5px] leading-relaxed text-muted-foreground">
              &quot;{si.beneficiary}&quot; will stop running. You can set it up again anytime.
            </p>
            <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-2 text-[12.5px] text-muted-foreground">
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
              Cancel Scheduled Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
