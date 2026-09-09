"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Search, Check, Smartphone, Landmark, Plus, ChevronDown, ChevronUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useGroupsStore, type PaymentGroup, type GroupMember } from "@/lib/groups-store";
import { useBeneficiariesStore } from "@/lib/beneficiaries-store";
import { formatMoney } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

interface CreateGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupToEdit?: PaymentGroup | null;
  onSuccess?: (group: PaymentGroup) => void;
}

export default function CreateGroupModal({
  open,
  onOpenChange,
  groupToEdit,
  onSuccess,
}: CreateGroupModalProps) {
  const { addGroup, updateGroup } = useGroupsStore();
  const beneficiaries = useBeneficiariesStore((s) => s.beneficiaries);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [showDescription, setShowDescription] = useState(false);
  const [defaultAmount, setDefaultAmount] = useState("200");
  const [splitType, setSplitType] = useState<"equal" | "custom">("equal");
  const [members, setMembers] = useState<GroupMember[]>([]);

  // Search & custom recipient progressive disclosure
  const [search, setSearch] = useState("");
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customDest, setCustomDest] = useState("");
  const [customType, setCustomType] = useState<"wallet" | "bank">("wallet");

  // Filter available contacts (people & phone numbers, excluding utility billers)
  const availableContacts: GroupMember[] = useMemo(() => {
    return beneficiaries
      .filter((b) => b.category === "person" || b.category === "number" || b.transactionType !== "bill")
      .map((b) => ({
        id: b.id.startsWith("b-") ? b.id : `b-${b.id}`,
        name: b.name,
        destination: b.accountNumber || b.phoneNumber || b.proxyId || b.detail || b.id,
        type: b.transactionType === "bank" ? ("bank" as const) : ("wallet" as const),
        networkOrBank: b.bankName || b.network || "GCB Bank",
      }));
  }, [beneficiaries]);

  useEffect(() => {
    if (groupToEdit) {
      setName(groupToEdit.name);
      setDescription(groupToEdit.description || "");
      setShowDescription(Boolean(groupToEdit.description));
      setDefaultAmount(String(groupToEdit.defaultPerMemberAmount || 200));
      setSplitType(groupToEdit.splitType);
      setMembers(groupToEdit.members);
    } else {
      setName("");
      setDescription("");
      setShowDescription(false);
      setDefaultAmount("200");
      setSplitType("equal");
      setMembers([]);
    }
    setShowManualAdd(false);
    setSearch("");
  }, [groupToEdit, open]);

  const toggleMember = (contact: GroupMember) => {
    setMembers((prev) => {
      const exists = prev.some((m) => (m.id && contact.id ? m.id === contact.id : m.destination === contact.destination));
      if (exists) {
        return prev.filter((m) => (m.id && contact.id ? m.id !== contact.id : m.destination !== contact.destination));
      } else {
        const amt = Number(defaultAmount) || 0;
        return [...prev, { ...contact, defaultAmount: amt }];
      }
    });
  };

  const removeMember = (identifier: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== identifier && m.destination !== identifier));
  };

  const addManualMember = () => {
    if (!customName.trim() || !customDest.trim()) return;
    const amt = Number(defaultAmount) || 0;
    const newMember: GroupMember = {
      id: `m-manual-${Date.now()}`,
      name: customName.trim(),
      destination: customDest.trim(),
      type: customType,
      networkOrBank: customType === "wallet" ? "Mobile Wallet" : "Bank Account",
      defaultAmount: amt,
    };
    setMembers((prev) => [...prev, newMember]);
    setCustomName("");
    setCustomDest("");
    setShowManualAdd(false);
  };

  const updateMemberAmount = (identifier: string, amtStr: string) => {
    const val = Number(amtStr.replace(/[^0-9.]/g, "")) || 0;
    setMembers((prev) =>
      prev.map((m) => ((m.id === identifier || m.destination === identifier) ? { ...m, defaultAmount: val } : m))
    );
  };

  const filteredContacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return availableContacts.filter((c) => {
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.destination.toLowerCase().includes(q) ||
        (c.networkOrBank && c.networkOrBank.toLowerCase().includes(q))
      );
    });
  }, [availableContacts, search]);

  const canSave = name.trim().length >= 2 && members.length >= 2;

  const totalAmount = useMemo(() => {
    const def = Number(defaultAmount) || 0;
    if (splitType === "equal") return members.length * def;
    return members.reduce((sum, m) => sum + (m.defaultAmount ?? def), 0);
  }, [members, defaultAmount, splitType]);

  const handleSave = () => {
    if (!canSave) return;
    const defAmtNum = Number(defaultAmount) || 0;
    const normalizedMembers = members.map((m) => ({
      ...m,
      defaultAmount: splitType === "equal" ? defAmtNum : m.defaultAmount || defAmtNum,
    }));

    if (groupToEdit) {
      updateGroup(groupToEdit.id, {
        name: name.trim(),
        description: description.trim(),
        defaultPerMemberAmount: defAmtNum,
        splitType,
        members: normalizedMembers,
      });
      onSuccess?.({
        ...groupToEdit,
        name: name.trim(),
        description: description.trim(),
        defaultPerMemberAmount: defAmtNum,
        splitType,
        members: normalizedMembers,
      });
    } else {
      const created = addGroup({
        name: name.trim(),
        description: description.trim(),
        defaultPerMemberAmount: defAmtNum,
        splitType,
        members: normalizedMembers,
      });
      onSuccess?.(created);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[480px] p-0 overflow-hidden rounded-2xl border-none bg-card shadow-2xl"
        showCloseButton={false}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
          <div>
            <DialogTitle className="text-[17px] font-semibold text-foreground tracking-[-0.01em]">
              {groupToEdit ? "Edit Payment Group" : "Create Payment Group"}
            </DialogTitle>
            <p className="text-[12.5px] text-muted-foreground mt-0.5">
              Group recipients for fast, single-click batch payouts.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex size-7.5 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={15} strokeWidth={1.8} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex flex-col gap-5 px-6 py-5 max-h-[72vh] overflow-y-auto">
          {/* 1. Group Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-foreground">
              Group Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Family Susu, Office Lunch, Rent Pool"
              autoFocus
              className="h-11 w-full rounded-xl border border-border/80 bg-background px-3.5 text-[14px] text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all shadow-xs"
            />
            {!showDescription ? (
              <button
                type="button"
                onClick={() => setShowDescription(true)}
                className="self-start text-[11.5px] text-muted-foreground hover:text-foreground transition-colors mt-0.5 cursor-pointer"
              >
                + Add description (optional)
              </button>
            ) : (
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional group description or notes"
                className="h-8.5 w-full rounded-lg border border-border/70 bg-background/50 px-3 text-[12.5px] text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-ring transition-all mt-1"
              />
            )}
          </div>

          {/* 2. Select Members */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-[13px] font-medium text-foreground">
                Recipients
              </label>
              <span className={cn(
                "text-[11.5px] font-medium px-2 py-0.5 rounded-full transition-colors",
                members.length >= 2
                  ? "bg-primary/15 text-foreground font-semibold"
                  : "bg-muted text-muted-foreground"
              )}>
                {members.length} {members.length === 1 ? "selected" : "selected"} (min. 2)
              </span>
            </div>

            {/* Selected Chips (Horizontal wrap) */}
            {members.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-muted/20 border border-border/60 max-h-[85px] overflow-y-auto">
                {members.map((m) => (
                  <span
                    key={m.id || m.destination}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-background border border-border/80 px-2.5 py-1 text-[12px] font-medium text-foreground shadow-xs animate-in fade-in zoom-in-95 duration-100"
                  >
                    <span className="truncate max-w-[120px]">{m.name}</span>
                    <button
                      type="button"
                      onClick={() => removeMember(m.id || m.destination)}
                      className="size-3.5 flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      aria-label={`Remove ${m.name}`}
                    >
                      <X size={10} strokeWidth={2.5} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Contact Search Input */}
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search beneficiaries by name or number..."
                className="h-10 w-full rounded-xl border border-border/70 bg-background pl-9 pr-3 text-[13px] text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-ring transition-colors"
              />
            </div>

            {/* Contact Multi-Select List */}
            <div className="rounded-xl border border-border/70 bg-card max-h-[170px] overflow-y-auto divide-y divide-border/40">
              {filteredContacts.map((c) => {
                const isSelected = members.some((m) => (m.id && c.id ? m.id === c.id : m.destination === c.destination));
                return (
                  <div
                    key={c.id || c.destination}
                    onClick={() => toggleMember(c)}
                    className={cn(
                      "flex items-center justify-between gap-3 px-3 py-2 text-[12.5px] cursor-pointer select-none transition-colors",
                      isSelected ? "bg-primary/10 text-foreground font-medium" : "hover:bg-muted/40 text-foreground/80"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-lg text-[11px] transition-colors",
                        isSelected ? "bg-primary text-primary-foreground font-semibold" : "bg-muted text-muted-foreground"
                      )}>
                        {c.type === "wallet" ? <Smartphone size={13} /> : <Landmark size={13} />}
                      </span>
                      <div className="min-w-0">
                        <div className="font-medium text-foreground truncate">{c.name}</div>
                        <div className="text-[11px] text-muted-foreground tabular truncate">
                          {c.networkOrBank} · {c.destination}
                        </div>
                      </div>
                    </div>

                    <span className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full border transition-all",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border/80 text-transparent"
                    )}>
                      {isSelected && <Check size={11} strokeWidth={3} />}
                    </span>
                  </div>
                );
              })}
              {filteredContacts.length === 0 && (
                <div className="py-6 text-center text-[12px] text-muted-foreground">
                  No contacts found
                </div>
              )}
            </div>

            {/* Unlisted recipient progressive disclosure */}
            {!showManualAdd ? (
              <button
                type="button"
                onClick={() => setShowManualAdd(true)}
                className="self-start text-[12px] text-muted-foreground hover:text-foreground font-medium flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus size={13} strokeWidth={2.2} />
                <span>Add unlisted number</span>
              </button>
            ) : (
              <div className="flex flex-col gap-2 p-3 rounded-xl border border-border/70 bg-muted/20 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-medium text-foreground">Add Unlisted Recipient</span>
                  <button
                    type="button"
                    onClick={() => setShowManualAdd(false)}
                    className="text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Full name"
                    className="h-8.5 rounded-lg border border-border/80 bg-background px-2.5 text-[12.5px] outline-none focus:border-ring"
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    value={customDest}
                    onChange={(e) => setCustomDest(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="Phone or account number"
                    className="numorainput h-8.5 rounded-lg border border-border/80 bg-background px-2.5 text-[12.5px] outline-none focus:border-ring tabular"
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center rounded-lg bg-muted p-0.5 border border-border/50 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setCustomType("wallet")}
                      className={cn(
                        "px-2.5 py-0.5 rounded-md font-medium transition-colors",
                        customType === "wallet" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
                      )}
                    >
                      Mobile Wallet
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomType("bank")}
                      className={cn(
                        "px-2.5 py-0.5 rounded-md font-medium transition-colors",
                        customType === "bank" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
                      )}
                    >
                      Bank
                    </button>
                  </div>
                  <Button
                    size="xs"
                    onClick={addManualMember}
                    disabled={!customName.trim() || !customDest.trim()}
                    className="h-7 text-[11.5px] px-3 font-medium"
                  >
                    Add
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* 3. Payout Amount */}
          <div className="flex flex-col gap-2 p-3.5 rounded-xl border border-border/70 bg-muted/15">
            <div className="flex items-center justify-between">
              <label className="text-[13px] font-medium text-foreground">
                {splitType === "equal" ? "Amount per Member" : "Default Amount"}
              </label>
              <button
                type="button"
                onClick={() => setSplitType(splitType === "equal" ? "custom" : "equal")}
                className="text-[11.5px] font-medium text-primary hover:underline cursor-pointer transition-colors"
              >
                {splitType === "equal" ? "Customize individual amounts" : "Switch to equal split"}
              </button>
            </div>

            {splitType === "equal" ? (
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-muted-foreground">
                  GHS
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={defaultAmount}
                  onChange={(e) => setDefaultAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder="200.00"
                  className="numorainput h-10 w-full rounded-xl border border-border/80 bg-background pl-12 pr-3.5 text-[14px] font-medium text-foreground outline-none focus:border-ring tabular"
                />
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                {members.map((m) => (
                  <div key={m.id || m.destination} className="flex items-center justify-between gap-3 text-[12px]">
                    <span className="truncate flex-1 font-medium text-foreground">{m.name}</span>
                    <div className="relative w-28">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-muted-foreground">
                        GHS
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={String(m.defaultAmount ?? defaultAmount)}
                        onChange={(e) => updateMemberAmount(m.id || m.destination, e.target.value)}
                        className="numorainput h-7.5 w-full rounded-lg border border-border/80 bg-background pl-8 pr-2 text-right text-[12.5px] font-medium tabular outline-none focus:border-ring"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Total Summary */}
            <div className="flex items-center justify-between pt-1 border-t border-border/50 text-[12px] text-muted-foreground">
              <span>Total Outflow ({members.length} {members.length === 1 ? "member" : "members"}):</span>
              <span className="font-semibold text-foreground tabular text-[13px]">
                {formatMoney(totalAmount, "GHS", true)}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Action Bar */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 border-t border-border/60 bg-muted/10">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-10 px-4 text-[13px] font-medium"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!canSave}
            className="h-10 px-5 text-[13px] font-semibold rounded-xl"
          >
            {groupToEdit ? "Save Changes" : `Create Group ${members.length > 0 ? `(${members.length})` : ""}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
