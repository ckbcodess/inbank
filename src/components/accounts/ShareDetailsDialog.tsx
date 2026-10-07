"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Account } from "@/lib/mock-data";

export const SWIFT_CODE = "GHCBGHAC";

/** "1243 5456 6233" — easier to read out and to check against a payslip. */
export function groupDigits(number: string): string {
  const digits = number.replace(/\s+/g, "");
  return /^\d+$/.test(digits) ? digits.replace(/(\d{4})(?=\d)/g, "$1 ") : number;
}

export function ShareDetailsDialog({
  open,
  onOpenChange,
  account,
  holderName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: Account;
  holderName: string;
}) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const rows: { key: string; label: string; value: string; copy?: string }[] = [
    { key: "holder", label: "Account holder", value: holderName },
    { key: "number", label: "Account number", value: groupDigits(account.number), copy: account.number.replace(/\s+/g, "") },
    { key: "bank", label: "Bank", value: "GCB Bank PLC" },
    { key: "swift", label: "SWIFT code", value: SWIFT_CODE },
  ];

  const copy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 2000);
  };

  const copyAll = () => {
    navigator.clipboard.writeText(rows.map((r) => `${r.label}: ${r.value}`).join("\n"));
    toast.success("Account details copied", { description: "Paste them into a message to get paid." });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Share Account Details</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <p className="mb-3 text-[13px] text-muted-foreground">Give these to anyone sending money to this account.</p>
          <dl className="flex flex-col divide-y divide-border/50">
            {rows.map((r) => (
              <div key={r.key} className="flex items-center justify-between gap-3 py-3">
                <dt className="text-[13px] text-muted-foreground">{r.label}</dt>
                <dd className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-[14px] text-foreground tabular">{r.value}</span>
                  <button
                    type="button"
                    onClick={() => copy(r.key, r.copy ?? r.value)}
                    className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
                    aria-label={`Copy ${r.label.toLowerCase()}`}
                  >
                    {copiedKey === r.key ? (
                      <Check size={14} strokeWidth={1.9} className="text-success" />
                    ) : (
                      <Copy size={14} strokeWidth={1.8} />
                    )}
                  </button>
                </dd>
              </div>
            ))}
          </dl>
        </DialogBody>
        <DialogFooter>
          <Button onClick={copyAll} className="h-10 w-full gap-1.5 rounded-lg text-[13.5px]">
            <Copy size={15} strokeWidth={1.8} />
            Copy all
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
