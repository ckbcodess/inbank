"use client";

import { useEffect, useState } from "react";
import { Fingerprint } from "lucide-react";
import {
  Dialog,
  DialogContent,
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

interface ProxyIdModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "create" when no proxy exists yet; "edit" to change the current one. */
  mode: "create" | "edit";
  accounts: Account[];
  onSaved?: () => void;
}

const inputCls =
  "h-11 w-full rounded-xl border border-border bg-background px-3.5 text-[14px] text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/30 transition-all";
const selectCls =
  "h-11 w-full rounded-xl border border-border bg-background pl-3.5 pr-10 text-[14px] text-foreground";
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
      ? value.replace(/\D/g, "").length >= 9
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
      <DialogContent
        className="sm:max-w-md max-h-[92vh] overflow-y-auto p-5 sm:p-6 rounded-[20px] border border-border/80 bg-card shadow-2xl"
        showCloseButton
      >
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#FEF3D6] text-[#B27B00] dark:bg-[#F2B200]/20 dark:text-[#F2B200]">
            <Fingerprint size={20} strokeWidth={1.8} />
          </span>
          <div>
            <DialogTitle className="text-[16px] text-foreground tracking-[-0.01em]">
              {mode === "edit" ? "Update your proxy ID" : "Create a proxy ID"}
            </DialogTitle>
            <p className="text-[12.5px] text-muted-foreground">
              Let people pay you with a number they already know.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-4">
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
            <input
              type="text"
              inputMode={type === "phone" ? "numeric" : "text"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={type === "phone" ? "e.g. 0244 123 821" : "e.g. GHA-0123456789-0"}
              className={`${inputCls} tabular`}
              autoFocus
            />
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
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-10 rounded-xl px-4 text-[13.5px] cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="h-10 rounded-xl bg-[#F2B200] px-4 text-[13.5px] font-semibold text-black hover:bg-[#E0A300] cursor-pointer"
          >
            {mode === "edit" ? "Save changes" : "Create proxy ID"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
