"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Search, Check, Smartphone, Landmark, Plus } from "lucide-react";
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
        className="sm:max-w-[760px] p-0 gap-0 overflow-hidden rounded-[24px] border border-border/60 bg-card shadow-[0_24px_70px_-15px_rgba(0,0,0,0.35)]"
        showCloseButton={false}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-border/60 bg-background/50">
          <div>
            <DialogTitle className="text-[19px] font-semibold text-foreground tracking-[-0.015em]">
              {groupToEdit ? "Edit Payment Group" : "Create Payment Group"}
            </DialogTitle>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              Bundle multiple recipients for 1-click batch transfers, payroll, and shared expenses.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex size-8.5 items-center justify-center rounded-full bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted active:scale-[0.96] transition-transform duration-100 ease-out cursor-pointer"
            aria-label="Close modal"
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        {/* Modal Body: Spacious & Responsive */}
        <div className="flex flex-col gap-6 px-8 py-6 max-h-[75vh] overflow-y-auto">
          {/* Section 1: Group Basics (2-Column Balanced Layout) */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-5">
            {/* Left: Group Name & Description (7 cols) */}
            <div className="sm:col-span-7 flex flex-col gap-2">
              <label htmlFor="group-name-input" className="text-[13px] font-medium text-foreground">
                Group Name
              </label>
              <input
                id="group-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Family Susu, Office Lunch, Rent Pool"
                autoFocus
                className="h-11 w-full rounded-[12px] border border-border/80 bg-background px-3.5 text-[14px] text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-[border-color,box-shadow] shadow-xs"
              />
              {!showDescription ? (
                <button
                  type="button"
                  onClick={() => setShowDescription(true)}
                  className="self-start text-[12px] text-muted-foreground hover:text-foreground font-medium transition-colors cursor-pointer active:scale-[0.96] duration-100"
                >
                  + Add description (optional)
                </button>
              ) : (
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional note, frequency, or purpose"
                  className="h-9 w-full rounded-[10px] border border-border/70 bg-background/50 px-3 text-[12.5px] text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-ring transition-[border-color] mt-0.5"
                />
              )}
            </div>

            {/* Right: Amount & Split Type (5 cols) */}
            <div className="sm:col-span-5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label htmlFor="group-amount-input" className="text-[13px] font-medium text-foreground">
                  {splitType === "equal" ? "Amount per Member" : "Default Amount"}
                </label>
                <button
                  type="button"
                  onClick={() => setSplitType(splitType === "equal" ? "custom" : "equal")}
                  className="text-[12px] font-medium text-primary hover:underline cursor-pointer active:scale-[0.96] transition-transform duration-100"
                >
                  {splitType === "equal" ? "Custom splits" : "Equal split"}
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-muted-foreground pointer-events-none select-none">
                  GHS
                </span>
                <input
                  id="group-amount-input"
                  type="text"
                  inputMode="decimal"
                  value={defaultAmount}
                  onChange={(e) => setDefaultAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder="200.00"
                  className="numorainput h-11 w-full rounded-[12px] border border-border/80 bg-background pl-12 pr-3.5 text-[14px] font-semibold text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 tabular-nums shadow-xs transition-[border-color,box-shadow]"
                />
              </div>
              <div className="flex items-center justify-between text-[11.5px] text-muted-foreground">
                <span>Total Outflow:</span>
                <span className="font-semibold text-foreground tabular-nums">
                  {formatMoney(totalAmount, "GHS", true)}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Recipients Selection */}
          <div className="flex flex-col gap-3">
            {/* Recipients Header & Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2.5">
                <span className="text-[14px] font-semibold text-foreground">
                  Recipients
                </span>
                <span className={cn(
                  "text-[11.5px] font-medium px-2.5 py-0.5 rounded-full transition-colors",
                  members.length >= 2
                    ? "bg-primary/15 text-foreground font-semibold"
                    : "bg-muted text-muted-foreground"
                )}>
                  {members.length} selected (min. 2)
                </span>
                {members.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setMembers([])}
                    className="text-[11.5px] text-muted-foreground hover:text-destructive active:scale-[0.96] transition-transform duration-100 ml-1 cursor-pointer"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {/* Search Bar with Optical Alignment */}
              <div className="relative w-full sm:w-72">
                <Search
                  size={15}
                  strokeWidth={1.5}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search beneficiaries..."
                  className="h-9.5 w-full rounded-[12px] border border-border/70 bg-background pl-9 pr-8 text-[13px] text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-ring transition-[border-color]"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground active:scale-[0.96] transition-transform duration-100"
                    aria-label="Clear search"
                  >
                    <X size={13} strokeWidth={2} />
                  </button>
                )}
              </div>
            </div>

            {/* Selected Chips Strip (Concentric: container 18px, chips 10px, padding 8px) */}
            {members.length > 0 && (
              <div className="flex items-center gap-1.5 p-2 rounded-[18px] bg-muted/20 border border-border/50 overflow-x-auto">
                {members.map((m) => (
                  <span
                    key={m.id || m.destination}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-[10px] bg-card border border-border/70 px-2.5 py-1 text-[12px] font-medium text-foreground shadow-xs animate-in fade-in zoom-in-95 duration-100"
                  >
                    <span className="truncate max-w-[140px]">{m.name}</span>
                    {splitType === "custom" && (
                      <span className="text-[11px] text-muted-foreground tabular-nums font-mono">
                        · GHS {m.defaultAmount ?? defaultAmount}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeMember(m.id || m.destination)}
                      className="size-4 flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:scale-[0.96] transition-transform duration-100 cursor-pointer"
                      aria-label={`Remove ${m.name}`}
                    >
                      <X size={11} strokeWidth={2} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* 2-Column Beneficiaries Grid (Concentric: container 24px, cards 12px, padding 12px) */}
            <div className="rounded-[24px] border border-border/70 bg-muted/10 p-3 max-h-[290px] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {filteredContacts.map((c) => {
                  const isSelected = members.some((m) => (m.id && c.id ? m.id === c.id : m.destination === c.destination));
                  const selectedMember = members.find((m) => (m.id && c.id ? m.id === c.id : m.destination === c.destination));

                  return (
                    <div
                      key={c.id || c.destination}
                      onClick={() => toggleMember(c)}
                      className={cn(
                        "flex items-center justify-between gap-3 p-3 rounded-[12px] border transition-[border-color,background-color] cursor-pointer select-none active:scale-[0.98] duration-100 ease-out",
                        isSelected
                          ? "border-primary/60 bg-primary/[0.08] shadow-xs"
                          : "border-border/50 bg-card hover:bg-muted/40 hover:border-border/80"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-[8px] transition-colors",
                          isSelected
                            ? "bg-primary text-primary-foreground font-semibold"
                            : "bg-muted text-muted-foreground"
                        )}>
                          {c.type === "wallet" ? (
                            <Smartphone size={15} strokeWidth={1.75} />
                          ) : (
                            <Landmark size={15} strokeWidth={1.75} />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-medium text-foreground truncate">{c.name}</div>
                          <div className="text-[11.5px] text-muted-foreground tabular-nums truncate">
                            {c.networkOrBank} · {c.destination}
                          </div>
                        </div>
                      </div>

                      {/* Right Control: Checkmark or Custom Amount Input */}
                      {splitType === "custom" && isSelected ? (
                        <div
                          className="relative w-24 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10.5px] font-semibold text-muted-foreground pointer-events-none">
                            GHS
                          </span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={String(selectedMember?.defaultAmount ?? defaultAmount)}
                            onChange={(e) => updateMemberAmount(c.id || c.destination, e.target.value)}
                            className="numorainput h-7.5 w-full rounded-[8px] border border-border/80 bg-background pl-8 pr-1.5 text-right text-[12px] font-medium tabular-nums outline-none focus:border-ring transition-[border-color]"
                          />
                        </div>
                      ) : (
                        <span className={cn(
                          "flex size-5.5 shrink-0 items-center justify-center rounded-full border transition-[border-color,background-color]",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border/80 text-transparent"
                        )}>
                          {isSelected && <Check size={12} strokeWidth={2.5} />}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {filteredContacts.length === 0 && (
                <div className="py-12 text-center text-[13px] text-muted-foreground">
                  No beneficiaries found matching &ldquo;{search}&rdquo;
                </div>
              )}
            </div>

            {/* Progressive Disclosure: Add Unlisted Recipient */}
            {!showManualAdd ? (
              <button
                type="button"
                onClick={() => setShowManualAdd(true)}
                className="self-start text-[12.5px] text-muted-foreground hover:text-foreground font-medium flex items-center gap-1.5 cursor-pointer active:scale-[0.96] transition-transform duration-100 py-1"
              >
                <Plus size={14} strokeWidth={2} />
                <span>Add recipient not in saved beneficiaries</span>
              </button>
            ) : (
              <div className="flex flex-col gap-3 p-4 rounded-[16px] border border-border/70 bg-muted/20 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-foreground">Add Unlisted Recipient</span>
                  <button
                    type="button"
                    onClick={() => setShowManualAdd(false)}
                    className="text-[12px] text-muted-foreground hover:text-foreground active:scale-[0.96] transition-transform duration-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Recipient full name"
                    className="sm:col-span-5 h-9.5 rounded-[10px] border border-border/80 bg-background px-3 text-[13px] outline-none focus:border-ring transition-[border-color]"
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    value={customDest}
                    onChange={(e) => setCustomDest(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="Phone or account number"
                    className="numorainput sm:col-span-5 h-9.5 rounded-[10px] border border-border/80 bg-background px-3 text-[13px] outline-none focus:border-ring tabular-nums transition-[border-color]"
                  />
                  <div className="sm:col-span-2 flex items-center justify-end">
                    <Button
                      size="sm"
                      onClick={addManualMember}
                      disabled={!customName.trim() || !customDest.trim()}
                      className="h-9.5 w-full rounded-[10px] text-[12.5px] font-medium active:scale-[0.96] transition-transform duration-100"
                    >
                      Add
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-0.5">
                  <span className="text-[12px] text-muted-foreground">Type:</span>
                  <div className="flex items-center rounded-[8px] bg-muted p-0.5 border border-border/50 text-[11.5px]">
                    <button
                      type="button"
                      onClick={() => setCustomType("wallet")}
                      className={cn(
                        "px-3 py-1 rounded-[6px] font-medium active:scale-[0.96] transition-transform duration-100 cursor-pointer",
                        customType === "wallet" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
                      )}
                    >
                      Mobile Wallet
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomType("bank")}
                      className={cn(
                        "px-3 py-1 rounded-[6px] font-medium active:scale-[0.96] transition-transform duration-100 cursor-pointer",
                        customType === "bank" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
                      )}
                    >
                      Bank
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Action Bar (Spacious, Clear & Tactile) */}
        <div className="flex items-center justify-between px-8 py-4.5 border-t border-border/60 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <span className="text-[13px] text-muted-foreground">Total Outflow:</span>
            <span className="text-[17px] font-semibold text-foreground tabular-nums">
              {formatMoney(totalAmount, "GHS", true)}
            </span>
            <span className="text-[12px] text-muted-foreground tabular-nums">
              ({members.length} {members.length === 1 ? "recipient" : "recipients"})
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-10 px-4 text-[13px] font-medium rounded-[10px] active:scale-[0.96] transition-transform duration-100"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!canSave}
              className="h-10 px-6 text-[13px] font-semibold rounded-[12px] shadow-xs active:scale-[0.96] transition-transform duration-100"
            >
              {groupToEdit ? "Save Changes" : `Create Group ${members.length > 0 ? `(${members.length})` : ""}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

