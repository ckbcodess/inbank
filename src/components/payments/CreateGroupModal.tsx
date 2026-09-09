"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Search, Check, Smartphone, Landmark, Plus, Trash2 } from "lucide-react";
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
        className="sm:max-w-[720px] p-0 overflow-hidden rounded-2xl border-none bg-card shadow-2xl"
        showCloseButton={false}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-7 py-4.5 border-b border-border/60">
          <div>
            <DialogTitle className="text-[18px] font-semibold text-foreground tracking-[-0.01em]">
              {groupToEdit ? "Edit Payment Group" : "Create Payment Group"}
            </DialogTitle>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              Combine multiple recipients for fast 1-click batch transfers and contributions.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={16} strokeWidth={1.8} />
          </button>
        </div>

        {/* Modal Body: Spacious & Airy */}
        <div className="flex flex-col gap-6 px-7 py-6 max-h-[76vh] overflow-y-auto">
          {/* Section 1: Group Name & Default Amount (2-Column Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            {/* Left: Group Name (7 cols) */}
            <div className="sm:col-span-7 flex flex-col gap-1.5">
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
                  className="self-start text-[11.5px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  + Add description (optional)
                </button>
              ) : (
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional purpose, frequency, or notes"
                  className="h-8.5 w-full rounded-lg border border-border/70 bg-background/50 px-3 text-[12.5px] text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-ring transition-all mt-0.5"
                />
              )}
            </div>

            {/* Right: Amount per Member (5 cols) */}
            <div className="sm:col-span-5 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-medium text-foreground">
                  {splitType === "equal" ? "Amount per Member" : "Default Amount"}
                </label>
                <button
                  type="button"
                  onClick={() => setSplitType(splitType === "equal" ? "custom" : "equal")}
                  className="text-[11.5px] font-medium text-primary hover:underline cursor-pointer transition-colors"
                >
                  {splitType === "equal" ? "Custom splits" : "Equal split"}
                </button>
              </div>
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
                  className="numorainput h-11 w-full rounded-xl border border-border/80 bg-background pl-12 pr-3.5 text-[14px] font-semibold text-foreground outline-none focus:border-ring tabular shadow-xs"
                />
              </div>
              <span className="text-[11.5px] text-muted-foreground tabular">
                Total Outflow: <span className="font-semibold text-foreground">{formatMoney(totalAmount, "GHS", true)}</span>
              </span>
            </div>
          </div>

          {/* Section 2: Recipients Selection */}
          <div className="flex flex-col gap-3">
            {/* Toolbar: Counter on left, Search input on right */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <span className="text-[13.5px] font-semibold text-foreground">
                  Recipients
                </span>
                <span className={cn(
                  "text-[11.5px] font-medium px-2 py-0.5 rounded-full transition-colors",
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
                    className="text-[11.5px] text-muted-foreground hover:text-destructive transition-colors ml-1 cursor-pointer"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-72">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search beneficiaries..."
                  className="h-9.5 w-full rounded-xl border border-border/70 bg-background pl-8.5 pr-8 text-[12.5px] text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-ring transition-colors"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Selected Chips Strip (Scrollable row) */}
            {members.length > 0 && (
              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-muted/25 border border-border/60 overflow-x-auto">
                {members.map((m) => (
                  <span
                    key={m.id || m.destination}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-background border border-border/80 px-2.5 py-1 text-[12px] font-medium text-foreground shadow-xs animate-in fade-in zoom-in-95 duration-100"
                  >
                    <span className="truncate max-w-[130px]">{m.name}</span>
                    {splitType === "custom" && (
                      <span className="text-[11px] text-muted-foreground font-mono">
                        · GHS {m.defaultAmount ?? defaultAmount}
                      </span>
                    )}
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

            {/* 2-Column Beneficiaries Grid (Taking Advantage of Real Estate) */}
            <div className="rounded-xl border border-border/70 bg-muted/10 p-2.5 max-h-[260px] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredContacts.map((c) => {
                  const isSelected = members.some((m) => (m.id && c.id ? m.id === c.id : m.destination === c.destination));
                  const selectedMember = members.find((m) => (m.id && c.id ? m.id === c.id : m.destination === c.destination));

                  return (
                    <div
                      key={c.id || c.destination}
                      onClick={() => toggleMember(c)}
                      className={cn(
                        "flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-all cursor-pointer select-none",
                        isSelected
                          ? "border-primary/50 bg-primary/10 shadow-xs"
                          : "border-border/60 bg-card hover:bg-muted/40 hover:border-border/90"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-lg text-[12px] transition-colors",
                          isSelected
                            ? "bg-primary text-primary-foreground font-semibold"
                            : "bg-muted text-muted-foreground"
                        )}>
                          {c.type === "wallet" ? <Smartphone size={14} /> : <Landmark size={14} />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-medium text-foreground truncate">{c.name}</div>
                          <div className="text-[11px] text-muted-foreground tabular truncate">
                            {c.networkOrBank} · {c.destination}
                          </div>
                        </div>
                      </div>

                      {/* Right: Check indicator or custom amount input */}
                      {splitType === "custom" && isSelected ? (
                        <div
                          className="relative w-24 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-muted-foreground">
                            GHS
                          </span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={String(selectedMember?.defaultAmount ?? defaultAmount)}
                            onChange={(e) => updateMemberAmount(c.id || c.destination, e.target.value)}
                            className="numorainput h-7 w-full rounded-md border border-border/80 bg-background pl-8 pr-1.5 text-right text-[11.5px] font-medium tabular outline-none focus:border-ring"
                          />
                        </div>
                      ) : (
                        <span className={cn(
                          "flex size-5 shrink-0 items-center justify-center rounded-full border transition-all",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border/80 text-transparent"
                        )}>
                          {isSelected && <Check size={11} strokeWidth={3} />}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {filteredContacts.length === 0 && (
                <div className="py-10 text-center text-[12.5px] text-muted-foreground">
                  No beneficiaries found matching &ldquo;{search}&rdquo;
                </div>
              )}
            </div>

            {/* Unlisted recipient progressive disclosure */}
            {!showManualAdd ? (
              <button
                type="button"
                onClick={() => setShowManualAdd(true)}
                className="self-start text-[12px] text-muted-foreground hover:text-foreground font-medium flex items-center gap-1.5 cursor-pointer transition-colors py-0.5"
              >
                <Plus size={13} strokeWidth={2.2} />
                <span>Add recipient not in saved beneficiaries</span>
              </button>
            ) : (
              <div className="flex flex-col gap-2.5 p-3.5 rounded-xl border border-border/70 bg-muted/20 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] font-semibold text-foreground">Add Unlisted Recipient</span>
                  <button
                    type="button"
                    onClick={() => setShowManualAdd(false)}
                    className="text-[11.5px] text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Recipient full name"
                    className="sm:col-span-5 h-9 rounded-lg border border-border/80 bg-background px-3 text-[12.5px] outline-none focus:border-ring"
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    value={customDest}
                    onChange={(e) => setCustomDest(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="Phone or account number"
                    className="numorainput sm:col-span-5 h-9 rounded-lg border border-border/80 bg-background px-3 text-[12.5px] outline-none focus:border-ring tabular"
                  />
                  <div className="sm:col-span-2 flex items-center justify-end">
                    <Button
                      size="sm"
                      onClick={addManualMember}
                      disabled={!customName.trim() || !customDest.trim()}
                      className="h-9 w-full text-[12px] font-medium"
                    >
                      Add
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11.5px] text-muted-foreground">Type:</span>
                  <div className="flex items-center rounded-lg bg-muted p-0.5 border border-border/50 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setCustomType("wallet")}
                      className={cn(
                        "px-2.5 py-0.5 rounded-md font-medium transition-colors cursor-pointer",
                        customType === "wallet" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
                      )}
                    >
                      Mobile Wallet
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomType("bank")}
                      className={cn(
                        "px-2.5 py-0.5 rounded-md font-medium transition-colors cursor-pointer",
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

        {/* Modal Action Bar (Spacious & Clean) */}
        <div className="flex items-center justify-between px-7 py-4 border-t border-border/60 bg-muted/15">
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-muted-foreground">Total Payout:</span>
            <span className="text-[16px] font-semibold text-foreground tabular">
              {formatMoney(totalAmount, "GHS", true)}
            </span>
            <span className="text-[12px] text-muted-foreground">
              ({members.length} {members.length === 1 ? "recipient" : "recipients"})
            </span>
          </div>

          <div className="flex items-center gap-2.5">
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
              className="h-10 px-6 text-[13px] font-semibold rounded-xl shadow-xs"
            >
              {groupToEdit ? "Save Changes" : `Create Group ${members.length > 0 ? `(${members.length})` : ""}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
