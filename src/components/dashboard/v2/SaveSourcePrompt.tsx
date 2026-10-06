"use client";

/**
 * "Save this wallet?" — asked once, right after a top-up, about the wallet or
 * card that was just used. Shared by the first-run sequence and by any later
 * top-up from the dashboard, so both ask the same way and save the same record.
 */

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLinkedSources, type NetworkOperator } from "@/lib/accounts-store";
import type { PendingFundingSource } from "@/lib/device-trust";
import { SourceMark } from "@/components/ui/source-mark";
import { operatorFromName } from "@/lib/operators";

export function sourceFromFunding(
  method: "momo" | "card",
  details: { operator?: string; phone?: string; cardLast4?: string },
): PendingFundingSource {
  return method === "momo"
    ? { type: "momo", operator: details.operator, momoNumber: details.phone }
    : { type: "card", cardNumber: details.cardLast4 };
}

function describe(source: PendingFundingSource) {
  const last4 = source.cardNumber?.replace(/\s/g, "").slice(-4) || "4444";
  return source.type === "momo"
    ? {
        title: `${source.operator || "Mobile Money"} Wallet`,
        subtitle: source.momoNumber || "",
        masked: source.momoNumber || "",
      }
    : { title: "Visa Debit Card", subtitle: `•••• ${last4}`, masked: `•••• ${last4}` };
}

/** True when this wallet or card is already one of the customer's linked sources. */
export function useIsLinked(source: PendingFundingSource | null): boolean {
  const sources = useLinkedSources((s) => s.sources);
  if (!source) return false;
  const { masked } = describe(source);
  return !!masked && sources.some((s) => s.maskedNumber === masked);
}

/** Saves the source as one of the customer's linked sources, tells them, then calls onDone. */
export function useSaveSource(source: PendingFundingSource, onDone: () => void) {
  const addSource = useLinkedSources((s) => s.addSource);
  const { title, subtitle, masked } = describe(source);
  const isMomo = source.type === "momo";

  const save = () => {
    addSource({
      id: `src-${Date.now()}`,
      type: source.type,
      title,
      subtitle,
      operator: isMomo ? (source.operator as NetworkOperator) : undefined,
      maskedNumber: masked,
    });
    toast.success(isMomo ? "Wallet saved" : "Card saved", {
      description: "It's now one of your sources of funds for future top-ups.",
    });
    onDone();
  };

  return { isMomo, save, heading: isMomo ? "Save this wallet?" : "Save this card?", saveLabel: isMomo ? "Save wallet" : "Save card" };
}

/** The wallet or card just used, and what saving it does. */
export function SourceSummary({ source }: { source: PendingFundingSource }) {
  const { title, subtitle } = describe(source);
  return (
    <div className="flex flex-col gap-4 text-left">
      <div className="flex items-center gap-3.5 rounded-xl border border-border/80 bg-muted/30 p-3.5 text-left">
        <SourceMark type={source.type} operator={operatorFromName(source.operator)} title={title} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] tracking-[-0.01em] text-foreground">{title}</p>
          <p className="tabular truncate text-[12.5px] text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <p className="text-[13px] leading-relaxed text-muted-foreground">
        Top up in one tap next time. Remove it anytime in Accounts.
      </p>
    </div>
  );
}

export function SaveSourcePrompt({
  source,
  onDone,
}: {
  source: PendingFundingSource;
  onDone: () => void;
}) {
  const { save, heading, saveLabel } = useSaveSource(source, onDone);

  return (
    <Dialog open onOpenChange={(open) => !open && onDone()}>
      <DialogContent size="sm">
        <DialogHeader onClose={onDone}>
          <DialogTitle>{heading}</DialogTitle>
        </DialogHeader>
        <DialogBody className="gap-4 text-left">
          <SourceSummary source={source} />
        </DialogBody>
        <DialogFooter className="flex-row gap-2.5 sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={onDone}
            className="h-10.5 flex-1 px-4 text-[13.5px] text-muted-foreground hover:text-foreground active:scale-[0.96] transition-transform duration-150 sm:flex-none"
          >
            Not now
          </Button>
          <Button
            type="button"
            variant="default"
            onClick={save}
            className="h-10.5 flex-1 px-5 text-[13.5px] active:scale-[0.96] transition-transform duration-150 sm:flex-none"
          >
            {saveLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
