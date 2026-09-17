"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Landmark,
  Smartphone,
  X,
  Trash2,
  Plus,
  Search,
  AlertTriangle,
  UserPlus,
  Check,
} from "lucide-react";
import { useGroupsStore, type PaymentGroup, type GroupMember } from "@/lib/groups-store";
import { useBeneficiariesStore, type BeneficiaryRecord } from "@/lib/beneficiaries-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface EditGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: PaymentGroup | null;
  onSuccess?: (group: PaymentGroup) => void;
  onDeleted?: (groupId: string) => void;
}

const GHANA_BANKS = [
  "GCB Bank",
  "Standard Bank Ghana",
  "Ecobank Ghana",
  "Absa Ghana",
  "Fidelity Bank",
  "Stanbic Bank Ghana",
  "CalBank",
  "CBG",
  "Access Bank",
  "Zenith Bank Ghana",
];

const WALLET_NETWORKS = ["MTN Mobile Money", "Telecel Cash", "AT Money"];

export default function EditGroupModal({
  open,
  onOpenChange,
  group,
  onSuccess,
  onDeleted,
}: EditGroupModalProps) {
  const { updateGroup, deleteGroup } = useGroupsStore();
  const beneficiaries = useBeneficiariesStore((s) => s.beneficiaries);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [amountPerPerson, setAmountPerPerson] = useState("200.00");
  const [splitType, setSplitType] = useState<"equal" | "custom">("equal");
  const [members, setMembers] = useState<GroupMember[]>([]);

  // Search strictly within this group's members
  const [searchMember, setSearchMember] = useState("");

  // Add Member section states
  const [showAddMember, setShowAddMember] = useState(false);
  const [addMode, setAddMode] = useState<"saved" | "custom">("saved");
  const [savedSearch, setSavedSearch] = useState("");

  // Custom new contact states
  const [customName, setCustomName] = useState("");
  const [customDest, setCustomDest] = useState("");
  const [customType, setCustomType] = useState<"wallet" | "bank">("wallet");
  const [customBankOrNet, setCustomBankOrNet] = useState("MTN Mobile Money");

  // Deletion Confirmation Dialog States
  const [memberToDelete, setMemberToDelete] = useState<GroupMember | null>(null);
  const [showDeleteGroupConfirm, setShowDeleteGroupConfirm] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState<{
    name?: string;
    amount?: string;
    members?: string;
  }>({});

  // Populate state when sheet opens or group changes
  useEffect(() => {
    if (open && group) {
      setName(group.name || "");
      setDescription(group.description || "");
      setAmountPerPerson(
        group.defaultPerMemberAmount
          ? group.defaultPerMemberAmount.toFixed(2)
          : "200.00"
      );
      setSplitType(group.splitType || "equal");
      setMembers(group.members ? [...group.members] : []);
      setSearchMember("");
      setShowAddMember(false);
      setSavedSearch("");
      setCustomName("");
      setCustomDest("");
      setMemberToDelete(null);
      setShowDeleteGroupConfirm(false);
      setErrors({});
    }
  }, [open, group]);

  // Filter current group members based on the search query
  const filteredMembers = useMemo(() => {
    const q = searchMember.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.destination.toLowerCase().includes(q) ||
        (m.networkOrBank && m.networkOrBank.toLowerCase().includes(q))
    );
  }, [members, searchMember]);

  // Beneficiaries that are NOT already in this group (for the Add Member panel)
  const availableSavedBeneficiaries = useMemo(() => {
    const existingDestinations = new Set(
      members.map((m) => m.destination.replace(/\s+/g, "").toLowerCase())
    );
    const existingNames = new Set(members.map((m) => m.name.trim().toLowerCase()));

    const q = savedSearch.trim().toLowerCase();

    return beneficiaries
      .filter((b) => {
        if (b.category === "biller" || b.transactionType === "bill" || b.transactionType === "airtime") {
          return false;
        }
        const dest = (b.accountNumber || b.phoneNumber || b.proxyId || "").replace(/\s+/g, "").toLowerCase();
        const bName = b.name.trim().toLowerCase();
        if (dest && existingDestinations.has(dest)) return false;
        if (existingNames.has(bName)) return false;
        if (!q) return true;
        return (
          b.name.toLowerCase().includes(q) ||
          (b.detail && b.detail.toLowerCase().includes(q)) ||
          dest.includes(q)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [beneficiaries, members, savedSearch]);

  // Calculate dynamic total
  const totalAmount = useMemo(() => {
    if (splitType === "equal") {
      const perPerson = parseFloat(amountPerPerson) || 0;
      return members.length * perPerson;
    }
    return members.reduce((sum, m) => {
      const amt = m.defaultAmount !== undefined ? m.defaultAmount : parseFloat(amountPerPerson) || 0;
      return sum + amt;
    }, 0);
  }, [members, amountPerPerson, splitType]);

  // Update member custom amount in custom split mode
  const handleUpdateMemberAmount = (identifier: string, valStr: string) => {
    const clean = valStr.replace(/[^0-9.]/g, "");
    const val = parseFloat(clean);
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id === identifier || m.destination === identifier) {
          return { ...m, defaultAmount: isNaN(val) ? 0 : val };
        }
        return m;
      })
    );
  };

  // Add an existing saved beneficiary into this group
  const handleAddSavedBeneficiary = (b: BeneficiaryRecord) => {
    const amt = parseFloat(amountPerPerson) || 0;
    const newMember: GroupMember = {
      id: b.id.startsWith("m-") ? b.id : `m-${b.id}`,
      name: b.name,
      destination: b.accountNumber || b.phoneNumber || b.proxyId || b.detail || b.id,
      type: b.transactionType === "bank" ? "bank" : "wallet",
      networkOrBank: b.bankName || b.network || "GCB Bank",
      defaultAmount: amt,
    };

    setMembers((prev) => [...prev, newMember]);
    setSavedSearch("");
    setShowAddMember(false);
    if (errors.members) setErrors((prev) => ({ ...prev, members: undefined }));
    toast.success(`Added ${newMember.name} to ${name || "group"}.`);
  };

  // Add a brand-new custom contact
  const handleAddCustomMember = () => {
    if (!customName.trim()) {
      toast.error("Please enter a contact name.");
      return;
    }
    if (!customDest.trim()) {
      toast.error("Please enter an account or phone number.");
      return;
    }

    const amt = parseFloat(amountPerPerson) || 0;
    const newMember: GroupMember = {
      id: `m-custom-${Date.now()}`,
      name: customName.trim(),
      destination: customDest.trim(),
      type: customType,
      networkOrBank: customBankOrNet,
      defaultAmount: amt,
    };

    setMembers((prev) => [...prev, newMember]);
    setCustomName("");
    setCustomDest("");
    setShowAddMember(false);
    if (errors.members) setErrors((prev) => ({ ...prev, members: undefined }));
    toast.success(`Added ${newMember.name} to ${name || "group"}.`);
  };

  // Confirm removal of member
  const handleConfirmRemoveMember = () => {
    if (!memberToDelete) return;
    const target = memberToDelete;
    setMembers((prev) =>
      prev.filter((m) =>
        m.id && target.id ? m.id !== target.id : m.destination !== target.destination
      )
    );
    setMemberToDelete(null);
    toast.info(`Removed ${target.name} from group.`);
  };

  // Save changes
  const handleSaveChanges = () => {
    const errs: typeof errors = {};
    if (!name.trim()) {
      errs.name = "Please enter a group name";
    }
    const amt = parseFloat(amountPerPerson);
    if (isNaN(amt) || amt <= 0) {
      errs.amount = "Please enter a valid amount greater than 0";
    }
    if (members.length === 0) {
      errs.members = "Group must have at least 1 member";
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    if (!group) return;

    const updatedGroup: PaymentGroup = {
      ...group,
      name: name.trim(),
      description: description.trim(),
      defaultPerMemberAmount: parseFloat(amountPerPerson) || 0,
      splitType,
      members: members.map((m) => ({
        ...m,
        defaultAmount:
          splitType === "custom" && m.defaultAmount !== undefined
            ? m.defaultAmount
            : parseFloat(amountPerPerson) || 0,
      })),
    };

    updateGroup(group.id, updatedGroup);
    toast.success(`Group "${updatedGroup.name}" updated successfully.`);
    onSuccess?.(updatedGroup);
    onOpenChange(false);
  };

  // Confirm delete group
  const handleConfirmDeleteGroup = () => {
    if (!group) return;
    deleteGroup(group.id);
    toast.info(`Group "${group.name}" deleted.`);
    onDeleted?.(group.id);
    setShowDeleteGroupConfirm(false);
    onOpenChange(false);
  };

  if (!group) return null;

  return (
    <>
      {/* ── Slide-up / Slide-over Side Sheet from the Right ────────── */}
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg md:max-w-xl p-0 flex flex-col gap-0 h-full overflow-hidden bg-card border-l border-border/80 text-foreground"
          showCloseButton={false}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4.5 border-b border-border/60 shrink-0">
            <SheetTitle className="text-[18px] font-medium text-foreground tracking-[-0.01em] truncate max-w-[380px]">
              Edit {group.name}
            </SheetTitle>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer shrink-0"
              aria-label="Close"
            >
              <X size={17} strokeWidth={1.8} />
            </button>
          </div>

          {/* Scrollable Sheet Content Body */}
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6 flex flex-col gap-5 overscroll-contain custom-scrollbar">
            {/* Group Name & Description */}
            <div className="flex flex-col gap-4">
              {/* Group Name */}
              <div className="flex flex-col gap-2">
                <label className="text-[14px] font-medium text-foreground">
                  Group Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  maxLength={50}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  placeholder="e.g. Family Susu"
                  className={cn(
                    "h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all",
                    errors.name && "border-destructive focus:border-destructive focus:ring-destructive/30"
                  )}
                />
                {errors.name && (
                  <p className="text-[12px] text-destructive">{errors.name}</p>
                )}
              </div>

              {/* Description */}
              <div className="flex flex-col gap-2">
                <label className="text-[14px] font-medium text-foreground">
                  Description <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={description}
                  maxLength={120}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description or circle purpose"
                  className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all"
                />
              </div>
            </div>

            {/* Split Type & Amount Configuration */}
            <div className="flex flex-col gap-3 pt-2">
              <label className="text-[14px] font-medium text-foreground">
                Contribution Rule
              </label>

              {/* Segmented Pill Toggle: Equal / Custom */}
              <div className="rounded-2xl bg-muted/40 p-1 border border-border/80 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSplitType("equal")}
                  className={cn(
                    "flex-1 py-2.5 px-4 text-center rounded-xl text-[13.5px] font-medium transition-all cursor-pointer",
                    splitType === "equal"
                      ? "bg-card text-foreground shadow-xs border border-border/60"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Equal Split
                </button>
                <button
                  type="button"
                  onClick={() => setSplitType("custom")}
                  className={cn(
                    "flex-1 py-2.5 px-4 text-center rounded-xl text-[13.5px] font-medium transition-all cursor-pointer",
                    splitType === "custom"
                      ? "bg-card text-foreground shadow-xs border border-border/60"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Custom Amounts
                </button>
              </div>

              {/* Amount per person */}
              <div className="flex flex-col gap-2 mt-1">
                <label className="text-[13.5px] font-medium text-foreground">
                  {splitType === "equal" ? "Amount per Person" : "Baseline Amount"}
                </label>
                <div
                  className={cn(
                    "h-13 w-full rounded-2xl border border-border/80 bg-card px-4 flex items-center gap-2 focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/30 transition-all",
                    errors.amount && "border-destructive focus-within:border-destructive"
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
                    placeholder="0.00"
                    className="w-full bg-transparent text-[15px] font-normal text-foreground placeholder:text-muted-foreground/60 outline-none tabular-nums"
                  />
                </div>
                {errors.amount && (
                  <p className="text-[12px] text-destructive">{errors.amount}</p>
                )}
              </div>
            </div>

            {/* Members Section Header + Add Button */}
            <div className="flex flex-col gap-3 pt-3 border-t border-border/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-medium text-foreground">
                    Members ({members.length})
                  </span>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddMember((prev) => !prev)}
                  className="h-8.5 gap-1.5 px-3 text-[12.5px] rounded-xl border-border/80 font-normal cursor-pointer"
                >
                  <UserPlus size={14} />
                  <span>{showAddMember ? "Close" : "+ Add Member"}</span>
                </Button>
              </div>

              {/* Expandable Add Member Drawer */}
              {showAddMember && (
                <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 flex flex-col gap-3.5 animate-in fade-in slide-in-from-top-2 duration-150 shadow-xs">
                  {/* Mode switcher: Saved Beneficiary vs Custom Contact */}
                  <div className="flex items-center gap-2 p-1 bg-card rounded-xl border border-border/70">
                    <button
                      type="button"
                      onClick={() => setAddMode("saved")}
                      className={cn(
                        "flex-1 py-1.5 rounded-lg text-[12px] font-medium transition-all cursor-pointer",
                        addMode === "saved"
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      From Saved Beneficiaries
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddMode("custom")}
                      className={cn(
                        "flex-1 py-1.5 rounded-lg text-[12px] font-medium transition-all cursor-pointer",
                        addMode === "custom"
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      New Contact
                    </button>
                  </div>

                  {/* Mode A: Pick from Saved Beneficiaries */}
                  {addMode === "saved" ? (
                    <div className="flex flex-col gap-2">
                      <div className="relative w-full">
                        <Search
                          size={15}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                        />
                        <input
                          type="text"
                          value={savedSearch}
                          onChange={(e) => setSavedSearch(e.target.value)}
                          placeholder="Search saved contacts to add..."
                          className="h-10 w-full pl-9 pr-7 rounded-xl border border-border/80 bg-card text-[13px] text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all"
                        />
                        {savedSearch && (
                          <button
                            type="button"
                            onClick={() => setSavedSearch("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                            aria-label="Clear search"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>

                      <div className="max-h-[180px] overflow-y-auto rounded-xl border border-border/70 bg-card divide-y divide-border/50">
                        {availableSavedBeneficiaries.length > 0 ? (
                          availableSavedBeneficiaries.map((b) => (
                            <div
                              key={b.id}
                              className="flex items-center justify-between px-3.5 py-2.5 hover:bg-muted/30 transition-colors"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
                                  {b.transactionType === "bank" ? (
                                    <Landmark size={13} />
                                  ) : (
                                    <Smartphone size={13} />
                                  )}
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="text-[13px] text-foreground font-normal truncate">
                                    {b.name}
                                  </span>
                                  <span className="text-[11.5px] text-muted-foreground font-normal truncate tabular-nums numorainput">
                                    {b.bankName || b.network} • {b.accountNumber || b.phoneNumber || b.proxyId}
                                  </span>
                                </div>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleAddSavedBeneficiary(b)}
                                className="h-7 px-2.5 rounded-lg text-[11.5px] border-border/80 font-normal shrink-0"
                              >
                                <Plus size={12} className="mr-1" /> Add
                              </Button>
                            </div>
                          ))
                        ) : (
                          <div className="py-6 text-center text-muted-foreground text-[12.5px]">
                            {savedSearch
                              ? "No saved beneficiaries match your search."
                              : "All saved beneficiaries are already in this group."}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Mode B: Add Custom Contact Inline */
                    <div className="flex flex-col gap-2.5">
                      <input
                        type="text"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        placeholder="Recipient full name"
                        className="h-10 w-full rounded-xl border border-border/80 bg-card px-3 text-[13px] text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all"
                      />

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={customDest}
                          onChange={(e) => setCustomDest(e.target.value)}
                          placeholder="Account or Phone number"
                          className="h-10 flex-1 rounded-xl border border-border/80 bg-card px-3 text-[13px] text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all"
                        />

                        <select
                          value={customType}
                          onChange={(e) => {
                            const t = e.target.value as "wallet" | "bank";
                            setCustomType(t);
                            setCustomBankOrNet(t === "wallet" ? WALLET_NETWORKS[0] : GHANA_BANKS[0]);
                          }}
                          className="h-10 rounded-xl border border-border/80 bg-card px-2 text-[12px] text-foreground outline-none cursor-pointer"
                        >
                          <option value="wallet">Mobile Wallet</option>
                          <option value="bank">Bank Account</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <select
                          value={customBankOrNet}
                          onChange={(e) => setCustomBankOrNet(e.target.value)}
                          className="h-9 flex-1 rounded-xl border border-border/80 bg-card px-2.5 text-[12px] text-foreground outline-none cursor-pointer"
                        >
                          {(customType === "wallet" ? WALLET_NETWORKS : GHANA_BANKS).map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>

                        <Button
                          type="button"
                          size="sm"
                          onClick={handleAddCustomMember}
                          className="h-9 px-4 rounded-xl text-[12.5px] bg-primary text-primary-foreground font-normal shrink-0 cursor-pointer"
                        >
                          Add to Group
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Member search bar */}
              {members.length > 3 && (
                <div className="relative w-full">
                  <Search
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none"
                  />
                  <input
                    type="text"
                    value={searchMember}
                    onChange={(e) => setSearchMember(e.target.value)}
                    placeholder="Search members in this group..."
                    className="h-11 w-full pl-9.5 pr-8 rounded-xl border border-border/80 bg-card text-[13.5px] text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all"
                  />
                  {searchMember && (
                    <button
                      type="button"
                      onClick={() => setSearchMember("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground cursor-pointer"
                      aria-label="Clear search"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              )}

              {/* Members List Container */}
              <div className="rounded-2xl border border-border/80 bg-card overflow-hidden divide-y divide-border/50 max-h-[360px] overflow-y-auto">
                {filteredMembers.map((m) => (
                  <div
                    key={m.id || m.destination}
                    className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
                        {m.type === "wallet" ? (
                          <Smartphone size={16} strokeWidth={1.8} />
                        ) : (
                          <Landmark size={16} strokeWidth={1.8} />
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[14px] text-foreground font-normal truncate">
                          {m.name}
                        </span>
                        <span className="text-[12px] text-muted-foreground font-normal truncate tabular-nums numorainput">
                          {m.networkOrBank || "GCB Bank"} • {m.destination}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {splitType === "custom" && (
                        <div className="flex items-center gap-1 shrink-0 bg-card border border-border/80 rounded-lg px-2 py-1 focus-within:border-ring">
                          <span className="text-[11px] text-muted-foreground select-none">GHS</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={
                              m.defaultAmount !== undefined
                                ? String(m.defaultAmount)
                                : amountPerPerson
                            }
                            onChange={(e) =>
                              handleUpdateMemberAmount(m.id || m.destination, e.target.value)
                            }
                            className="w-20 bg-transparent text-right text-[13px] font-normal tabular-nums outline-none border-none text-foreground"
                          />
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => setMemberToDelete(m)}
                        className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                        title="Remove member"
                        aria-label={`Remove ${m.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}

                {filteredMembers.length === 0 && (
                  <div className="py-8 text-center text-muted-foreground text-[13px]">
                    No members found matching “{searchMember}”.
                  </div>
                )}
              </div>

              {errors.members && (
                <p className="text-[12px] text-destructive">{errors.members}</p>
              )}
            </div>

            {/* Total Amount Summary Row */}
            <div className="flex items-center justify-between pt-3 border-t border-border/60">
              <span className="text-[14px] font-medium text-muted-foreground">
                Total ({members.length} {members.length === 1 ? "member" : "members"}):
              </span>
              <span className="text-[18px] font-normal text-foreground tracking-[-0.01em] tabular-nums numorainput">
                GHS {totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Danger Zone: Pinned at bottom */}
            <div className="mt-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-[13.5px] font-medium text-foreground">Delete this group</span>
                <span className="text-[12px] text-muted-foreground">
                  Permanently remove this circle. Counterparties remain saved.
                </span>
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteGroupConfirm(true)}
                className="h-9 px-3.5 text-[12.5px] shrink-0 font-normal cursor-pointer"
              >
                Delete Group
              </Button>
            </div>
          </div>

          {/* Sticky Sheet Footer Actions */}
          <div className="px-6 py-4 border-t border-border/60 bg-muted/20 flex items-center justify-end gap-3 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-11 px-5 rounded-xl border-border/80 text-[13.5px] font-normal cursor-pointer"
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={handleSaveChanges}
              disabled={!name.trim() || members.length === 0}
              className="h-11 px-6 rounded-xl text-[13.5px] bg-primary hover:bg-primary-hover text-primary-foreground font-normal cursor-pointer shadow-xs disabled:opacity-50"
            >
              Save Changes
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── MODAL 1: Confirm Remove Member Dialog ─────────────────────── */}
      <Dialog open={Boolean(memberToDelete)} onOpenChange={(isOpen) => !isOpen && setMemberToDelete(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
          </DialogHeader>

          <div className="px-5 sm:px-6 py-5 text-[13.5px] text-muted-foreground leading-relaxed">
            Are you sure you want to remove <span className="text-foreground font-medium">{memberToDelete?.name}</span> from <span className="text-foreground font-medium">{name || group.name}</span>? They will no longer receive disbursements when you send to this group.
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMemberToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmRemoveMember}
            >
              Remove Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 2: Confirm Delete Group Dialog ──────────────────────── */}
      <Dialog open={showDeleteGroupConfirm} onOpenChange={setShowDeleteGroupConfirm}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Delete Payment Group</DialogTitle>
          </DialogHeader>

          <div className="px-5 sm:px-6 py-5 text-[13.5px] text-muted-foreground leading-relaxed">
            Are you sure you want to delete <span className="text-foreground font-medium">{group.name}</span>? This action cannot be undone. All member contact details will remain safely saved in your individual beneficiaries directory.
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteGroupConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmDeleteGroup}
            >
              Delete Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
