"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Landmark, Smartphone, X, Check, Trash2, Plus } from "lucide-react";
import { useGroupsStore, type PaymentGroup, type GroupMember } from "@/lib/groups-store";
import { useBeneficiariesStore } from "@/lib/beneficiaries-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CreateGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupToEdit?: PaymentGroup | null;
  onSuccess?: (group: PaymentGroup) => void;
  onDeleted?: (groupId: string) => void;
}

export default function CreateGroupModal({
  open,
  onOpenChange,
  groupToEdit,
  onSuccess,
  onDeleted,
}: CreateGroupModalProps) {
  const { addGroup, updateGroup, deleteGroup } = useGroupsStore();
  const beneficiaries = useBeneficiariesStore((s) => s.beneficiaries);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [amountPerPerson, setAmountPerPerson] = useState("200.00");
  const [splitType, setSplitType] = useState<"equal" | "custom">("equal");
  const [selectedMembers, setSelectedMembers] = useState<GroupMember[]>([]);
  const [search, setSearch] = useState("");

  // Inline "+ New beneficiary" form toggle
  const [showNewBeneficiary, setShowNewBeneficiary] = useState(false);
  const [newBenName, setNewBenName] = useState("");
  const [newBenDest, setNewBenDest] = useState("");
  const [newBenType, setNewBenType] = useState<"bank" | "wallet">("bank");
  const [newBenBankOrNet, setNewBenBankOrNet] = useState("GCB Bank");

  // Error validation
  const [errors, setErrors] = useState<{
    name?: string;
    amount?: string;
    members?: string;
  }>({});

  // Reset or initialize state when modal opens or groupToEdit changes
  useEffect(() => {
    if (open) {
      if (groupToEdit) {
        setName(groupToEdit.name || "");
        setDescription(groupToEdit.description || "");
        setAmountPerPerson(
          groupToEdit.defaultPerMemberAmount
            ? groupToEdit.defaultPerMemberAmount.toFixed(2)
            : "200.00"
        );
        setSplitType(groupToEdit.splitType || "equal");
        setSelectedMembers(groupToEdit.members ? [...groupToEdit.members] : []);
      } else {
        setName("");
        setDescription("");
        setAmountPerPerson("200.00");
        setSplitType("equal");
        setSelectedMembers([]);
      }
      setSearch("");
      setShowNewBeneficiary(false);
      setNewBenName("");
      setNewBenDest("");
      setErrors({});
    }
  }, [open, groupToEdit]);

  // Map beneficiaries to contact list
  const availableBeneficiaries: GroupMember[] = useMemo(() => {
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

  // Filtered contacts based on search query
  const filteredBeneficiaries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return availableBeneficiaries;
    return availableBeneficiaries.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.destination.toLowerCase().includes(q) ||
        (b.networkOrBank && b.networkOrBank.toLowerCase().includes(q))
    );
  }, [availableBeneficiaries, search]);

  // Toggle selection for a member
  const toggleMemberSelection = (contact: GroupMember) => {
    setSelectedMembers((prev) => {
      const exists = prev.some((m) =>
        m.id && contact.id ? m.id === contact.id : m.destination === contact.destination
      );
      if (exists) {
        return prev.filter((m) =>
          m.id && contact.id ? m.id !== contact.id : m.destination !== contact.destination
        );
      } else {
        const amt = parseFloat(amountPerPerson) || 0;
        return [...prev, { ...contact, defaultAmount: amt }];
      }
    });
    if (errors.members) {
      setErrors((prev) => ({ ...prev, members: undefined }));
    }
  };

  // Update specific member custom amount
  const handleCustomAmountChange = (identifier: string, val: string) => {
    const cleanStr = val.replace(/[^0-9.]/g, "");
    const num = parseFloat(cleanStr) || 0;
    setSelectedMembers((prev) =>
      prev.map((m) =>
        m.id === identifier || m.destination === identifier
          ? { ...m, defaultAmount: num }
          : m
      )
    );
  };

  // Add a new beneficiary inline
  const handleAddNewBeneficiary = () => {
    if (!newBenName.trim() || !newBenDest.trim()) return;
    const amt = parseFloat(amountPerPerson) || 0;
    const newMember: GroupMember = {
      id: `m-inline-${Date.now()}`,
      name: newBenName.trim(),
      destination: newBenDest.trim(),
      type: newBenType,
      networkOrBank: newBenType === "wallet" ? "Mobile Wallet" : newBenBankOrNet,
      defaultAmount: amt,
    };
    setSelectedMembers((prev) => [...prev, newMember]);
    setNewBenName("");
    setNewBenDest("");
    setShowNewBeneficiary(false);
    toast.success(`Added ${newMember.name} to group.`);
  };

  // Dynamic Total Calculation
  const totalAmount = useMemo(() => {
    const baseAmt = parseFloat(amountPerPerson) || 0;
    if (splitType === "equal") {
      return selectedMembers.length * baseAmt;
    }
    return selectedMembers.reduce(
      (sum, m) => sum + (m.defaultAmount !== undefined ? m.defaultAmount : baseAmt),
      0
    );
  }, [selectedMembers, amountPerPerson, splitType]);

  // Handle Save / Create
  const handleSaveGroup = () => {
    const nextErrors: { name?: string; amount?: string; members?: string } = {};

    if (!name.trim()) {
      nextErrors.name = "Please enter a group name";
    }

    const amtNum = parseFloat(amountPerPerson);
    if (isNaN(amtNum) || amtNum <= 0) {
      nextErrors.amount = "Please enter a valid amount";
    }

    if (selectedMembers.length === 0) {
      nextErrors.members = "Please select at least 1 member";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const normalizedMembers = selectedMembers.map((m) => ({
      ...m,
      defaultAmount: splitType === "equal" ? amtNum : (m.defaultAmount ?? amtNum),
    }));

    if (groupToEdit) {
      const updatedGroup: PaymentGroup = {
        ...groupToEdit,
        name: name.trim(),
        description: description.trim(),
        defaultPerMemberAmount: amtNum,
        splitType,
        members: normalizedMembers,
      };
      updateGroup(groupToEdit.id, updatedGroup);
      toast.success(`Group "${name.trim()}" updated successfully.`);
      onSuccess?.(updatedGroup);
    } else {
      const created = addGroup({
        name: name.trim(),
        description: description.trim(),
        defaultPerMemberAmount: amtNum,
        splitType,
        members: normalizedMembers,
      });
      toast.success(`Group "${name.trim()}" created successfully.`);
      onSuccess?.(created);
    }

    onOpenChange(false);
  };

  // Handle Delete Group
  const handleDeleteGroup = () => {
    if (!groupToEdit) return;
    deleteGroup(groupToEdit.id);
    toast.info(`Group "${groupToEdit.name}" deleted.`);
    onDeleted?.(groupToEdit.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[560px] w-[95vw] p-0 overflow-hidden rounded-2xl border border-border bg-card text-foreground shadow-2xl flex flex-col max-h-[92vh] gap-0"
        showCloseButton={false}
      >
        {/* Header matching Figma */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2 shrink-0">
          <DialogTitle className="text-[19px] sm:text-[20px] font-medium text-foreground tracking-[-0.01em]">
            Create Group
          </DialogTitle>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="size-8 rounded-full bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 flex flex-col gap-4 overscroll-contain custom-scrollbar">
          {/* Row 1: Group Name & Description Side-by-Side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Group Name */}
            <div className="flex flex-col gap-2">
              <label className="text-[13.5px] font-medium text-foreground">
                Group Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                }}
                placeholder="Name e.g. Family Susu"
                className={cn(
                  "h-12 w-full rounded-xl border border-border/80 bg-muted/40 dark:bg-white/[0.07] dark:border-white/[0.12] px-3.5 text-[14px] text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all",
                  errors.name && "border-destructive focus:border-destructive focus:ring-destructive/30"
                )}
              />
              {errors.name && (
                <p className="text-[11.5px] text-destructive">{errors.name}</p>
              )}
            </div>

            {/* Description */}
            <div className="flex flex-col gap-2">
              <label className="text-[13.5px] font-medium text-foreground">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Name e.g. Family Susu"
                className="h-12 w-full rounded-xl border border-border/80 bg-muted/40 dark:bg-white/[0.07] dark:border-white/[0.12] px-3.5 text-[14px] text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all"
              />
            </div>
          </div>

          {/* Row 2: Amount per person & Equal/Custom split toggle */}
          <div className="flex flex-col gap-2">
            <label className="text-[13.5px] font-medium text-foreground">
              Amount per person
            </label>
            <div className="flex items-center gap-3">
              {/* Amount Input with GHS prefix */}
              <div
                className={cn(
                  "flex-1 h-12 rounded-xl border border-border/80 bg-muted/40 dark:bg-white/[0.07] dark:border-white/[0.12] px-3.5 flex items-center gap-1.5 focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/30 transition-all",
                  errors.amount && "border-destructive focus-within:border-destructive focus-within:ring-destructive/30"
                )}
              >
                <span className="text-[14px] font-medium text-muted-foreground select-none">
                  GHS
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amountPerPerson}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/[^0-9.]/g, "");
                    setAmountPerPerson(clean);
                    if (errors.amount) setErrors((prev) => ({ ...prev, amount: undefined }));
                  }}
                  placeholder="200.00"
                  className="w-full bg-transparent text-[14px] font-medium text-foreground placeholder:text-muted-foreground/60 outline-none tabular-nums"
                />
              </div>

              {/* Segmented Pill Toggle: Equal / Custom */}
              <div className="flex items-center rounded-xl bg-muted/50 dark:bg-white/[0.05] p-1 border border-border/60 dark:border-white/[0.1] gap-1 shrink-0 h-12">
                <button
                  type="button"
                  onClick={() => setSplitType("equal")}
                  className={cn(
                    "px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-all cursor-pointer",
                    splitType === "equal"
                      ? "bg-card dark:bg-white/[0.14] text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Equal
                </button>
                <button
                  type="button"
                  onClick={() => setSplitType("custom")}
                  className={cn(
                    "px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-all cursor-pointer",
                    splitType === "custom"
                      ? "bg-card dark:bg-white/[0.14] text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Custom
                </button>
              </div>
            </div>
            {errors.amount && (
              <p className="text-[11.5px] text-destructive">{errors.amount}</p>
            )}
          </div>

          {/* Row 3: Members count & + New beneficiary header */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[14px] font-medium text-foreground">
              Members {selectedMembers.length}
            </span>
            <button
              type="button"
              onClick={() => setShowNewBeneficiary((prev) => !prev)}
              className="text-[13px] font-medium text-foreground hover:text-foreground/80 cursor-pointer flex items-center gap-1 transition-colors hover:underline"
            >
              <Plus size={14} strokeWidth={2} />
              <span>New beneficiary</span>
            </button>
          </div>

          {/* Inline Add Beneficiary Form (expands if toggled) */}
          {showNewBeneficiary && (
            <div className="p-3.5 rounded-xl border border-border/80 dark:border-white/[0.12] bg-muted/30 dark:bg-white/[0.04] flex flex-col gap-3 animate-in fade-in duration-150">
              <span className="text-[12.5px] font-medium text-foreground">Add New Beneficiary to Group</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={newBenName}
                  onChange={(e) => setNewBenName(e.target.value)}
                  className="h-10 rounded-lg border border-border/80 dark:border-white/[0.12] bg-muted/40 dark:bg-white/[0.07] px-3 text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring/30"
                />
                <input
                  type="text"
                  placeholder={newBenType === "wallet" ? "Mobile Number" : "Account Number"}
                  value={newBenDest}
                  onChange={(e) => setNewBenDest(e.target.value)}
                  className="h-10 rounded-lg border border-border/80 dark:border-white/[0.12] bg-muted/40 dark:bg-white/[0.07] px-3 text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 tabular-nums"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="flex items-center rounded-lg bg-muted/50 dark:bg-white/[0.05] border border-border/80 dark:border-white/[0.1] p-0.5 text-[12px]">
                  <button
                    type="button"
                    onClick={() => setNewBenType("bank")}
                    className={cn(
                      "px-2.5 py-1 rounded-md transition-colors cursor-pointer",
                      newBenType === "bank" ? "bg-card dark:bg-white/[0.14] text-foreground font-medium" : "text-muted-foreground"
                    )}
                  >
                    Bank Account
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewBenType("wallet")}
                    className={cn(
                      "px-2.5 py-1 rounded-md transition-colors cursor-pointer",
                      newBenType === "wallet" ? "bg-card dark:bg-white/[0.14] text-foreground font-medium" : "text-muted-foreground"
                    )}
                  >
                    Mobile Wallet
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleAddNewBeneficiary}
                  disabled={!newBenName.trim() || !newBenDest.trim()}
                  className="h-8 px-3.5 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-40 text-primary-foreground text-[12px] font-medium transition-colors cursor-pointer shadow-xs"
                >
                  Add to list
                </button>
              </div>
            </div>
          )}

          {/* Row 4: Search input matching Figma */}
          <div className="relative w-full">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search beneficiaries..."
              className="h-11 w-full rounded-xl border border-border/80 dark:border-white/[0.12] bg-muted/40 dark:bg-white/[0.07] px-3.5 text-[13.5px] text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all"
            />
          </div>

          {/* Row 5: Beneficiary List matching Figma */}
          <div className="flex flex-col divide-y divide-border/60 dark:divide-white/[0.06] max-h-[260px] overflow-y-auto custom-scrollbar pr-1">
            {filteredBeneficiaries.map((contact) => {
              const isSelected = selectedMembers.some((m) =>
                m.id && contact.id ? m.id === contact.id : m.destination === contact.destination
              );
              const currentMemberObj = selectedMembers.find((m) =>
                m.id && contact.id ? m.id === contact.id : m.destination === contact.destination
              );

              return (
                <div
                  key={contact.id || contact.destination}
                  onClick={() => toggleMemberSelection(contact)}
                  className="group flex items-center justify-between py-2.5 px-2 hover:bg-muted/40 dark:hover:bg-white/[0.04] rounded-lg transition-colors cursor-pointer select-none"
                >
                  {/* Left: Icon and Name + Subtitle */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className="text-muted-foreground shrink-0 flex items-center justify-center">
                      {contact.type === "wallet" ? (
                        <Smartphone size={17} strokeWidth={1.6} />
                      ) : (
                        <Landmark size={17} strokeWidth={1.6} />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium text-foreground truncate leading-tight">
                        {contact.name}
                      </p>
                      <p className="text-[12px] text-muted-foreground truncate mt-0.5 tabular-nums">
                        {contact.networkOrBank} · {contact.destination}
                      </p>
                    </div>
                  </div>

                  {/* Right: Custom Amount Input (if custom split) + Circular Selection Indicator */}
                  <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {isSelected && splitType === "custom" && (
                      <div className="flex items-center gap-1 bg-muted/40 dark:bg-white/[0.08] border border-border/80 dark:border-white/[0.12] rounded-lg px-2 py-1">
                        <span className="text-[11px] text-muted-foreground">GHS</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={currentMemberObj?.defaultAmount ?? amountPerPerson}
                          onChange={(e) =>
                            handleCustomAmountChange(
                              contact.id || contact.destination,
                              e.target.value
                            )
                          }
                          className="w-16 text-right text-[12px] font-medium text-foreground bg-transparent outline-none tabular-nums"
                        />
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => toggleMemberSelection(contact)}
                      className={cn(
                        "size-5 rounded-full flex items-center justify-center transition-all cursor-pointer",
                        isSelected
                          ? "border border-primary bg-primary text-primary-foreground"
                          : "border border-border/90 dark:border-white/20 bg-muted/30 dark:bg-white/[0.05] group-hover:border-foreground/50"
                      )}
                      aria-label={`Select ${contact.name}`}
                    >
                      {isSelected && <Check size={11} strokeWidth={3} />}
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredBeneficiaries.length === 0 && (
              <div className="py-8 text-center text-muted-foreground text-[13px]">
                No beneficiaries found matching “{search}”.
              </div>
            )}
          </div>

          {errors.members && (
            <p className="text-[11.5px] text-destructive text-center">{errors.members}</p>
          )}

          {/* Row 6: Centered Total matching Figma */}
          <div className="text-center py-3 select-none">
            <span className="text-[15px] font-normal text-muted-foreground">
              Total:{" "}
            </span>
            <span className="text-[20px] sm:text-[22px] font-semibold text-foreground tracking-[-0.01em] tabular-nums ml-1">
              GHS {totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Row 7: Modal Footer Actions matching Figma */}
        <div className="px-6 py-4 border-t border-border/60 bg-muted/20 flex items-center justify-end gap-2.5 shrink-0">
          {/* Cancel Button */}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-9 px-4 rounded-lg border border-border/80 dark:border-white/[0.12] bg-muted/40 dark:bg-white/[0.07] text-foreground hover:bg-muted/70 dark:hover:bg-white/[0.12] text-[13px] font-medium transition-colors cursor-pointer"
          >
            Cancel
          </button>

          {/* Create Group Button (Golden Amber / Brand Primary) */}
          <button
            type="button"
            onClick={handleSaveGroup}
            className="h-9 px-5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-[13px] transition-all shadow-xs active:scale-[0.98] cursor-pointer"
          >
            Create Group
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

