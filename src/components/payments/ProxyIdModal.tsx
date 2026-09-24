"use client";

import { useEffect, useState } from "react";
import { Fingerprint } from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { Account } from "@/lib/mock-data";
import { useProxyStore, type ProxyType } from "@/lib/proxy-store";
import { PhoneInput } from "@/components/ui/phone-input";
import { isCompleteGhanaMobile } from "@/lib/phone";

interface ProxyIdModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "create" when no proxy exists yet; "edit" to change the current one. */
  mode: "create" | "edit";
  accounts: Account[];
  onSaved?: () => void;
}

const inputCls =
  "h-11 w-full rounded-xl border border-border/80 dark:border-white/[0.12] bg-muted/40 dark:bg-white/[0.07] px-3.5 text-[14px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all";
const selectCls =
  "h-11 w-full rounded-xl border border-border/80 dark:border-white/[0.12] bg-muted/40 dark:bg-white/[0.07] pl-3.5 pr-10 text-[14px] text-foreground";
const labelCls = "text-[12.5px] text-muted-foreground";

export default function ProxyIdModal({
  open,
  onOpenChange,
  mode,
  accounts,
  onSaved,
}: ProxyIdModalProps) {
  const { myProxy, registerProxy, updateProxy } = useProxyStore();

  const [type, setType] = useState<ProxyType>("phone");
  const [value, setValue] = useState("");
  const [linkedAccountId, setLinkedAccountId] = useState("");

  // Seed the form each time it opens: from the current proxy in edit mode,
  // fresh defaults in create mode.
  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && myProxy) {
      setType(myProxy.type);
      setValue(myProxy.value);
      setLinkedAccountId(myProxy.linkedAccountId || accounts[0]?.id || "");
    } else {
      setType("phone");
      setValue("");
      setLinkedAccountId(accounts[0]?.id || "");
    }
  }, [open, mode, myProxy, accounts]);

  const valueValid =
    type === "phone"
      ? isCompleteGhanaMobile(value)
      : value.trim().replace(/\s/g, "").length >= 10;
  const canSave = valueValid && Boolean(linkedAccountId);

  function handleSave() {
    if (!canSave) return;
    if (mode === "edit" && myProxy) {
      updateProxy({ type, value: value.trim(), linkedAccountId });
    } else {
      registerProxy({ type, value: value.trim(), linkedAccountId });
    }
    onSaved?.();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Update your proxy ID" : "Create a proxy ID"}
          </DialogTitle>
        </DialogHeader>

        <DialogBody>
          {/* Proxy type */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Proxy type</label>
            <Select value={type} onValueChange={(v) => setType(v as ProxyType)}>
              <SelectTrigger className={selectCls}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="phone">Phone number</SelectItem>
                <SelectItem value="ghana-card">Ghana Card</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Value */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>
              {type === "phone" ? "Phone number" : "Ghana Card number"}
            </label>
            {type === "phone" ? (
              <PhoneInput
                value={value}
                onValueChange={setValue}
                aria-label="Phone number"
                className="h-11 rounded-xl border-border/80 bg-muted/40 focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/30"
                autoFocus
              />
            ) : (
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="e.g. GHA-0123456789-0"
                className={`${inputCls} tabular`}
                autoFocus
              />
            )}
          </div>

          {/* Linked account */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Receives into</label>
            <Select value={linkedAccountId} onValueChange={(v) => v && setLinkedAccountId(v)}>
              <SelectTrigger className={selectCls}>
                <SelectValue placeholder="Select an account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} · {a.number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={!canSave}
          >
            {mode === "edit" ? "Save changes" : "Create proxy ID"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
