"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Check, Plus, Landmark, Smartphone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const [defaultAmount, setDefaultAmount] = useState("200");
  const [splitType, setSplitType] = useState<"equal" | "custom">("equal");
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [search, setSearch] = useState("");

  // New beneficiary inline addition
  const [showNewBeneficiary, setShowNewBeneficiary] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customDest, setCustomDest] = useState("");
  const [customType, setCustomType] = useState<"wallet" | "bank">("wallet");

  // Map beneficiaries to available group contacts
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
      setDefaultAmount(String(groupToEdit.defaultPerMemberAmount || 200));
      setSplitType(groupToEdit.splitType);
      setMembers(groupToEdit.members);
    } else {
      setName("");
      setDescription("");
      setDefaultAmount("200");
      setSplitType("equal");
      setMembers([]);
    }
    setShowNewBeneficiary(false);
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

  const updateMemberAmount = (identifier: string, amtStr: string) => {
    const val = Number(amtStr.replace(/[^0-9.]/g, "")) || 0;
    setMembers((prev) =>
      prev.map((m) => ((m.id === identifier || m.destination === identifier) ? { ...m, defaultAmount: val } : m))
    );
  };

  const handleAddNewBeneficiary = () => {
    if (!customName.trim() || !customDest.trim()) return;
    const amt = Number(defaultAmount) || 0;
    const newMember: GroupMember = {
      id: `m-custom-${Date.now()}`,
      name: customName.trim(),
      destination: customDest.trim(),
      type: customType,
      networkOrBank: customType === "wallet" ? "Mobile Wallet" : "Bank Account",
      defaultAmount: amt,
    };
    setMembers((prev) => [...prev, newMember]);
    setCustomName("");
    setCustomDest("");
    setShowNewBeneficiary(false);
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
        className="sm:max-w-[640px] p-0 gap-0 overflow-hidden rounded-[16px] border border-border/80 bg-card shadow-2xl"
        showCloseButton={false}
      >
        {/* Figma Header: Add Beneficiary + Circular Close Button */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border/60">
          <DialogTitle className="text-[18px] font-medium leading-[26px] text-foreground tracking-[0.18px]">
            {groupToEdit ? "Edit Beneficiary" : "Add Beneficiary"}
          </DialogTitle>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 active:scale-95 transition-all cursor-pointer"
            aria-label="Close"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Figma Content Wrapper */}
        <div className="flex flex-col gap-6 px-6 py-6 max-h-[75vh] overflow-y-auto">
          {/* Section 1: Group Details */}
          <div className="flex flex-col gap-4">
            <label className="text-[14px] font-medium leading-[20px] text-foreground tracking-[-0.028px]">
              Group Details
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name e.g. Family Susu"
              autoFocus
              className="h-12 w-full rounded-[8px] border border-border/80 bg-muted/40 px-5 text-[15px] text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-border transition-colors"
            />
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
              className="h-12 w-full rounded-[8px] border border-border/80 bg-muted/40 px-5 text-[15px] text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-border transition-colors"
            />
          </div>

          {/* Section 2: Amount per Person */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-medium leading-[20px] text-foreground">
                Amount per Person
              </span>

              {/* Figma Tabs: Equal / Custom */}
              <div className="h-[41px] p-[3.5px] rounded-[12px] bg-muted/40 border border-border/50 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSplitType("equal")}
                  className={cn(
                    "px-3.5 py-1.5 text-[12px] rounded-[8.75px] transition-all cursor-pointer",
                    splitType === "equal"
                      ? "bg-card text-foreground font-medium shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Equal
                </button>
                <button
                  type="button"
                  onClick={() => setSplitType("custom")}
                  className={cn(
                    "px-3.5 py-1.5 text-[12px] rounded-[8.75px] transition-all cursor-pointer",
                    splitType === "custom"
                      ? "bg-card text-foreground font-medium shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Custom
                </button>
              </div>
            </div>

            {/* Figma Big Amount Box (74px height) */}
            <div className="h-[74px] rounded-[12px] border border-border/80 bg-muted/40 flex items-center justify-center px-6">
              <div className="flex items-baseline justify-center gap-2 w-full">
                <span className="text-[16px] font-medium text-muted-foreground select-none">
                  GHS
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={defaultAmount}
                  onChange={(e) => setDefaultAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder="200"
                  className="numorainput bg-transparent text-[26px] font-medium leading-[32px] tracking-tight text-foreground text-center outline-none tabular-nums max-w-[240px]"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Members */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[14px] font-medium text-foreground">
                <span>Members</span>
                <span>{members.length}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowNewBeneficiary(!showNewBeneficiary)}
                className="flex items-center gap-1 text-[14px] font-medium text-foreground hover:opacity-80 transition-opacity cursor-pointer"
              >
                <Plus size={15} strokeWidth={2.2} />
                <span>New beneficiary</span>
              </button>
            </div>

            {/* Inline Add New Beneficiary Form */}
            {showNewBeneficiary && (
              <div className="flex flex-col gap-3 p-3.5 rounded-[12px] border border-border/80 bg-muted/30 animate-in fade-in duration-100">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-foreground">Add New Beneficiary</span>
                  <button
                    type="button"
                    onClick={() => setShowNewBeneficiary(false)}
                    className="text-[12px] text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Full name"
                    className="sm:col-span-5 h-9 rounded-[8px] border border-border/80 bg-background px-3 text-[13px] outline-none focus:border-border"
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    value={customDest}
                    onChange={(e) => setCustomDest(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="Phone or account number"
                    className="numorainput sm:col-span-5 h-9 rounded-[8px] border border-border/80 bg-background px-3 text-[13px] outline-none focus:border-border tabular-nums"
                  />
                  <div className="sm:col-span-2 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={handleAddNewBeneficiary}
                      disabled={!customName.trim() || !customDest.trim()}
                      className="h-9 w-full rounded-[8px] bg-[#f9c632] hover:bg-[#eab308] text-[#451a03] font-medium text-[12.5px] disabled:opacity-50 cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-0.5">
                  <span className="text-[12px] text-muted-foreground">Type:</span>
                  <div className="flex items-center rounded-[6px] bg-muted p-0.5 border border-border/50 text-[11.5px]">
                    <button
                      type="button"
                      onClick={() => setCustomType("wallet")}
                      className={cn(
                        "px-2.5 py-0.5 rounded-[4px] font-medium cursor-pointer transition-colors",
                        customType === "wallet" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"
                      )}
                    >
                      Mobile Wallet
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomType("bank")}
                      className={cn(
                        "px-2.5 py-0.5 rounded-[4px] font-medium cursor-pointer transition-colors",
                        customType === "bank" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"
                      )}
                    >
                      Bank
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Search Beneficiaries Input */}
            <div className="relative w-full">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search beneficiaries..."
                className="h-12 w-full rounded-[8px] border border-border/80 bg-muted/40 px-5 text-[15px] text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-border transition-colors"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground active:scale-95 transition-transform"
                >
                  <X size={14} strokeWidth={2} />
                </button>
              )}
            </div>

            {/* Beneficiaries Grid: 2 Columns Matching Figma */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[7px] max-h-[260px] overflow-y-auto pr-0.5">
              {filteredContacts.map((c) => {
                const isSelected = members.some((m) => (m.id && c.id ? m.id === c.id : m.destination === c.destination));
                const selectedMember = members.find((m) => (m.id && c.id ? m.id === c.id : m.destination === c.destination));

                return (
                  <div
                    key={c.id || c.destination}
                    onClick={() => toggleMember(c)}
                    className={cn(
                      "min-h-[55px] rounded-[12px] border border-border/80 bg-card p-[8.75px] flex items-center justify-between gap-2.5 cursor-pointer hover:bg-muted/40 transition-colors select-none",
                      isSelected && "border-primary/60 bg-primary/[0.06]"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-[8px] text-muted-foreground">
                        {c.type === "wallet" ? (
                          <Smartphone size={15} strokeWidth={1.75} />
                        ) : (
                          <Landmark size={15} strokeWidth={1.75} />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-medium leading-[20px] text-foreground truncate">
                          {c.name}
                        </p>
                        <p className="text-[12px] text-muted-foreground leading-[17px] truncate tabular-nums">
                          {c.networkOrBank} · {c.destination}
                        </p>
                      </div>
                    </div>

                    {/* Right Checkbox / Amount Input */}
                    {splitType === "custom" && isSelected ? (
                      <div
                        className="relative w-20 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="text"
                          inputMode="decimal"
                          value={String(selectedMember?.defaultAmount ?? defaultAmount)}
                          onChange={(e) => updateMemberAmount(c.id || c.destination, e.target.value)}
                          className="numorainput h-7 w-full rounded-[6px] border border-border/80 bg-background px-2 text-right text-[12px] font-medium tabular-nums outline-none focus:border-ring"
                        />
                      </div>
                    ) : (
                      <span className={cn(
                        "size-[18px] rounded-full border border-border/80 flex items-center justify-center shrink-0 transition-all",
                        isSelected
                          ? "bg-[#f9c632] border-[#f9c632] text-[#451a03]"
                          : "bg-transparent text-transparent"
                      )}>
                        {isSelected && <Check size={11} strokeWidth={3} />}
                      </span>
                    )}
                  </div>
                );
              })}

              {filteredContacts.length === 0 && (
                <div className="col-span-2 py-12 text-center text-[13px] text-muted-foreground">
                  No beneficiaries found matching &ldquo;{search}&rdquo;
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Figma CTA Bar: Total on left, Cancel & Create Group on right */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border/60 bg-card">
          <div className="flex items-baseline gap-2">
            <span className="text-[12px] text-muted-foreground">Total:</span>
            <span className="text-[28px] sm:text-[32px] font-normal leading-[24px] tracking-[-0.16px] text-foreground tabular-nums">
              {totalAmount > 0 ? formatMoney(totalAmount, "GHS", true) : "GHS 0.00"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-9 px-4 rounded-[8px] border border-border/80 bg-card hover:bg-muted/50 text-[14px] font-medium text-foreground cursor-pointer active:scale-95 transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="h-9 px-4 rounded-[8px] bg-[#f9c632] hover:bg-[#eab308] text-[#451a03] text-[14px] font-medium shadow-sm cursor-pointer active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {groupToEdit ? "Save Changes" : "Create Group"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


