"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type BlockReason = "misplaced" | "lost_stolen" | "fraud" | "other";

const BLOCK_REASONS: { id: BlockReason; title: string }[] = [
  { id: "misplaced", title: "Misplaced temporarily" },
  { id: "lost_stolen", title: "Lost or stolen" },
  { id: "fraud", title: "Suspected fraud" },
  { id: "other", title: "Other reason" },
];

/** Asked once a card is blocked: why. Skipping is fine; the card is already blocked. Shared by the card page and the dashboard. */
export function BlockReasonDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [reason, setReason] = useState<BlockReason>("misplaced");
  const [otherDetails, setOtherDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      onOpenChange(false);
      toast.success("Card blocked · Reason recorded", {
        description: "Your security preferences have been saved. Unblocking will require your PIN.",
      });
    }, 400);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle className="text-base font-medium text-foreground">Why did you block this card?</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-2">
            <div role="radiogroup" aria-label="Reason for blocking card" className="flex flex-col">
              {BLOCK_REASONS.map((item) => {
                const isSelected = reason === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setReason(item.id)}
                    className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-2 py-2 text-left transition-colors duration-hover outline-none hover:bg-muted/50 focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <span className="text-[13.5px] text-foreground">{item.title}</span>
                    <span
                      className={cn(
                        "flex size-3.5 shrink-0 items-center justify-center rounded-full border transition-colors",
                        isSelected ? "border-primary bg-primary" : "border-muted-foreground/40",
                      )}
                    >
                      {isSelected && <span className="size-1.5 rounded-full bg-primary-foreground" />}
                    </span>
                  </button>
                );
              })}
            </div>


            {reason === "other" && (
              <div className="px-2 animate-in fade-in duration-150">
                <Field label="Tell us why" optional>
                  <Input
                    autoFocus
                    value={otherDetails}
                    onChange={(e) => setOtherDetails(e.target.value)}
                    placeholder="e.g. Damaged chip, replacing soon"
                  />
                </Field>
              </div>
            )}
          </DialogBody>

          <DialogFooter className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                onOpenChange(false);
                toast.success("Card blocked", { description: "Unblocking it will ask for your PIN." });
              }}
            >
              Skip
            </Button>
            <Button type="submit" loading={submitting}>
              Done
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
