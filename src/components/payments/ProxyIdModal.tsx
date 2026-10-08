"use client";

import { useEffect, useState } from "react";
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

import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
interface ProxyIdModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "create" when no proxy exists yet; "edit" to change the current one. */
  mode: "create" | "edit";
  accounts: Account[];
  onSaved?: () => void;
}

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
            {mode === "edit" ? "Update Your Proxy ID" : "Create a Proxy ID"}
          </DialogTitle>
        </DialogHeader>

        <DialogBody>
          {/* Proxy type */}
          <Field label="Proxy Type">
            <Select value={type} onValueChange={(v) => setType(v as ProxyType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="phone">Phone Number</SelectItem>
                <SelectItem value="ghana-card">Ghana Card</SelectItem>
              </SelectContent>
            </Select>
</Field>

          {/* Value */}
          <Field label={type === "phone" ? "Phone Number" : "Ghana Card Number"}>
            {type === "phone" ? (
              <PhoneInput
                value={value}
                onValueChange={setValue}
                aria-label="Phone number"
                className="h-11 rounded-xl border-field-border bg-field focus-within:border-field-border-focus focus-within:ring-0"
                autoFocus
              />
            ) : (
              <Input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="e.g. GHA-0123456789-0"
                className="tabular"
                autoFocus
              />
            )}
</Field>

          {/* Linked account */}
          <Field label="Receives Into">
            <Select value={linkedAccountId} onValueChange={(v) => v && setLinkedAccountId(v)}>
              <SelectTrigger>
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
</Field>
        </DialogBody>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
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
