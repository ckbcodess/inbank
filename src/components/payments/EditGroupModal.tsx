"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
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

  // Populate state when modal opens or group changes
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
  }, [members, splitType, amountPerPerson]);

  // Handle custom amount edit for an individual member
  const handleCustomAmountChange = (memberId: string, val: string) => {
    const num = parseFloat(val.replace(/[^0-9.]/g, "")) || 0;
    setMembers((prev) =>
      prev.map((m) =>
        (m.id && m.id === memberId) || m.destination === memberId
          ? { ...m, defaultAmount: num }
          : m
      )
    );
  };

  // Add saved beneficiary to current group
  const handleAddSavedBeneficiary = (b: BeneficiaryRecord) => {
    const amt = parseFloat(amountPerPerson) || 0;
    const isWallet = b.transactionType === "wallet";
    const newMember: GroupMember = {
      id: `m-saved-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: b.name,
      destination: b.accountNumber || b.phoneNumber || b.proxyId || "",
      type: isWallet ? "wallet" : "bank",
      networkOrBank: b.network || b.bankName || (isWallet ? "Mobile Wallet" : "GCB Bank"),
      defaultAmount: amt,
    };

    setMembers((prev) => [...prev, newMember]);
    if (errors.members) setErrors((prev) => ({ ...prev, members: undefined }));
    toast.success(`Added ${b.name} to ${name || "group"}.`);
  };

  // Add custom contact to current group
  const handleAddCustomContact = () => {
    if (!customName.trim() || !customDest.trim()) return;
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
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="sm:max-w-[500px] w-[95vw] p-0 overflow-hidden rounded-2xl border-none bg-card text-foreground shadow-2xl flex flex-col max-h-[90vh] gap-0"
          showCloseButton={false}
        >
          {/* Header matching Add Beneficiary & Create Group Modal */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 shrink-0">
            <DialogTitle className="text-[17px] font-medium text-foreground tracking-[-0.01em] truncate max-w-[380px]">
              Edit {group.name}
            </DialogTitle>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
              aria-label="Close"
            >
              <X size={15} strokeWidth={1.8} />
            </button>
          </div>

          {/* Modal Scrollable Body */}
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 flex flex-col gap-4 overscroll-contain custom-scrollbar">
            {/* Row 1: Group Name & Description Side-by-Side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Group Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-medium text-muted-foreground">
                  Group Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  placeholder="e.g. Family Susu"
                  className={cn(
                    "h-11 w-full rounded-xl border border-border/80 dark:border-white/[0.12] bg-muted/40 dark:bg-white/[0.07] px-3.5 text-[14px] text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all",
                    errors.name && "border-destructive focus:border-destructive focus:ring-destructive/30"
                  )}
                />
                {errors.name && (
                  <p className="text-[11.5px] text-destructive">{errors.name}</p>
                )}
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-medium text-muted-foreground">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description"
                  className="h-11 w-full rounded-xl border border-border/80 dark:border-white/[0.12] bg-muted/40 dark:bg-white/[0.07] px-3.5 text-[14px] text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all"
                />
              </div>
            </div>

            {/* Row 2: Amount per person & Equal/Custom split toggle */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-medium text-muted-foreground">
                Amount per person
              </label>
              <div className="flex items-center gap-2.5">
                {/* Amount Input with GHS prefix */}
                <div
                  className={cn(
                    "flex-1 h-11 rounded-xl border border-border/80 dark:border-white/[0.12] bg-muted/40 dark:bg-white/[0.07] px-3.5 flex items-center gap-1.5 focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/30 transition-all",
                    errors.amount && "border-destructive focus-within:border-destructive focus-within:ring-destructive/30"
                  )}
                >
                  <span className="text-[13.5px] font-medium text-muted-foreground select-none">
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
                <div className="flex items-center rounded-xl bg-muted/50 dark:bg-white/[0.05] p-1 border border-border/60 dark:border-white/[0.1] gap-1 shrink-0 h-11">
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

            {/* Row 3: Members header with count and "+ Add member" action */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[13px] font-medium text-foreground">
                Group Members ({members.length})
              </span>
              <button
                type="button"
                onClick={() => setShowAddMember((prev) => !prev)}
                className="text-[12.5px] font-medium text-primary hover:text-primary/80 cursor-pointer flex items-center gap-1 transition-colors hover:underline"
              >
                {showAddMember ? (
                  <>
                    <X size={14} strokeWidth={2} />
                    <span>Done adding</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={14} strokeWidth={2} />
                    <span>Add member</span>
                  </>
                )}
              </button>
            </div>

            {/* Collapsible "+ Add Member" Drawer */}
            {showAddMember && (
              <div className="p-3.5 rounded-xl border border-border/80 dark:border-white/[0.12] bg-muted/30 dark:bg-white/[0.04] flex flex-col gap-3 animate-in fade-in duration-150">
                {/* Tabs: From Saved Beneficiaries vs New Contact */}
                <div className="flex items-center justify-between pb-1 border-b border-border/60 dark:border-white/[0.08]">
                  <div className="inline-flex rounded-lg bg-muted/50 dark:bg-white/[0.05] border border-border/80 dark:border-white/[0.1] p-0.5 text-[12px]">
                    <button
                      type="button"
                      onClick={() => setAddMode("saved")}
                      className={cn(
                        "px-3 py-1 rounded-md transition-all cursor-pointer font-medium",
                        addMode === "saved"
                          ? "bg-card dark:bg-white/[0.14] text-foreground font-semibold shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      From Saved Beneficiaries ({availableSavedBeneficiaries.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddMode("custom")}
                      className={cn(
                        "px-3 py-1 rounded-md transition-all cursor-pointer font-medium",
                        addMode === "custom"
                          ? "bg-card dark:bg-white/[0.14] text-foreground font-semibold shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      + New Contact
                    </button>
                  </div>
                </div>

                {/* Tab 1: Saved Beneficiaries */}
                {addMode === "saved" ? (
                  <div className="flex flex-col gap-2">
                    <div className="relative w-full">
                      <Search
                        size={14}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none"
                      />
                      <input
                        type="text"
                        value={savedSearch}
                        onChange={(e) => setSavedSearch(e.target.value)}
                        placeholder="Search saved contacts to add..."
                        className="w-full h-9 pl-8 pr-7 rounded-lg border border-border/80 dark:border-white/[0.12] bg-muted/40 dark:bg-white/[0.07] text-[12.5px] text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-ring"
                      />
                      {savedSearch && (
                        <button
                          type="button"
                          onClick={() => setSavedSearch("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground cursor-pointer"
                          aria-label="Clear search"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>

                    <div className="max-h-[160px] overflow-y-auto divide-y divide-border/60 dark:divide-white/[0.06] rounded-lg border border-border/70 dark:border-white/[0.12] bg-muted/30 dark:bg-white/[0.04]">
                      {availableSavedBeneficiaries.length === 0 ? (
                        <div className="p-3 text-center text-[12px] text-muted-foreground">
                          {savedSearch
                            ? "No saved beneficiaries match your search."
                            : "All saved beneficiaries are already in this group."}
                        </div>
                      ) : (
                        availableSavedBeneficiaries.map((b) => (
                          <div
                            key={b.id}
                            onClick={() => handleAddSavedBeneficiary(b)}
                            className="flex items-center justify-between p-2 hover:bg-muted/50 dark:hover:bg-white/[0.05] cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-[10px]">
                                {b.transactionType === "wallet" ? (
                                  <Smartphone size={12} strokeWidth={1.8} />
                                ) : (
                                  <Landmark size={12} strokeWidth={1.8} />
                                )}
                              </span>
                              <div className="flex flex-col min-w-0">
                                <span className="text-[12.5px] font-medium text-foreground truncate">
                                  {b.name}
                                </span>
                                <span className="text-[11px] text-muted-foreground tabular truncate">
                                  {b.bankName || b.network || "GCB"} · {b.accountNumber || b.phoneNumber}
                                </span>
                              </div>
                            </div>
                            <Button size="xs" variant="ghost" className="h-6.5 px-2 text-[11.5px] text-primary font-medium hover:bg-primary/10">
                              <Plus size={12} className="mr-1" /> Add
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : (
                  /* Tab 2: Custom Contact */
                  <div className="flex flex-col gap-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] text-muted-foreground font-medium">
                          Full Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Kofi Mensah"
                          value={customName}
                          onChange={(e) => setCustomName(e.target.value)}
                          className="h-9 rounded-lg border border-border/80 dark:border-white/[0.12] bg-muted/40 dark:bg-white/[0.07] px-2.5 text-[12.5px] text-foreground outline-none focus:border-ring"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] text-muted-foreground font-medium">
                          Account / Phone Number
                        </label>
                        <input
                          type="text"
                          placeholder="0244 000 000"
                          value={customDest}
                          onChange={(e) => setCustomDest(e.target.value)}
                          className="h-9 rounded-lg border border-border/80 dark:border-white/[0.12] bg-muted/40 dark:bg-white/[0.07] px-2.5 text-[12.5px] text-foreground tabular outline-none focus:border-ring"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] text-muted-foreground font-medium">
                          Type
                        </label>
                        <div className="flex items-center rounded-lg bg-muted/40 dark:bg-white/[0.07] border border-border/80 dark:border-white/[0.12] p-0.5 h-9">
                          <button
                            type="button"
                            onClick={() => {
                              setCustomType("wallet");
                              setCustomBankOrNet("MTN Mobile Money");
                            }}
                            className={cn(
                              "flex-1 h-7.5 rounded-md text-[11.5px] font-medium transition-all cursor-pointer",
                              customType === "wallet"
                                ? "bg-card dark:bg-white/[0.14] text-foreground font-semibold shadow-xs"
                                : "text-muted-foreground"
                            )}
                          >
                            Mobile Wallet
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCustomType("bank");
                              setCustomBankOrNet("GCB Bank");
                            }}
                            className={cn(
                              "flex-1 h-7.5 rounded-md text-[11.5px] font-medium transition-all cursor-pointer",
                              customType === "bank"
                                ? "bg-card dark:bg-white/[0.14] text-foreground font-semibold shadow-xs"
                                : "text-muted-foreground"
                            )}
                          >
                            Bank Account
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] text-muted-foreground font-medium">
                          {customType === "wallet" ? "Network" : "Bank"}
                        </label>
                        <select
                          value={customBankOrNet}
                          onChange={(e) => setCustomBankOrNet(e.target.value)}
                          className="h-9 rounded-lg border border-border/80 dark:border-white/[0.12] bg-muted/40 dark:bg-white/[0.07] px-2 text-[12px] text-foreground outline-none focus:border-ring"
                        >
                          {customType === "wallet"
                            ? WALLET_NETWORKS.map((w) => (
                                <option key={w} value={w}>
                                  {w}
                                </option>
                              ))
                            : GHANA_BANKS.map((b) => (
                                <option key={b} value={b}>
                                  {b}
                                </option>
                              ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <Button
                        size="xs"
                        onClick={handleAddCustomContact}
                        disabled={!customName.trim() || !customDest.trim()}
                        className="h-7.5 px-3 text-[12px] font-medium"
                      >
                        <Plus size={13} className="mr-1" /> Add to Group
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Row 4: Search bar strictly for members in this group */}
            {members.length > 3 && (
              <div className="relative w-full">
                <Search
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none"
                />
                <input
                  type="text"
                  value={searchMember}
                  onChange={(e) => setSearchMember(e.target.value)}
                  placeholder="Search members in this group..."
                  className="h-11 w-full pl-9.5 pr-8 rounded-xl border border-border/80 dark:border-white/[0.12] bg-muted/40 dark:bg-white/[0.07] text-[13.5px] text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all"
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

            {/* Row 5: Current Group Members List (ONLY this group's members!) */}
            <div className="flex flex-col divide-y divide-border/60 dark:divide-white/[0.06] max-h-[260px] overflow-y-auto custom-scrollbar pr-1">
              {filteredMembers.map((m) => (
                <div
                  key={m.id || m.destination}
                  className="group flex items-center justify-between py-2.5 px-2 hover:bg-muted/40 dark:hover:bg-white/[0.04] rounded-lg transition-colors"
                >
                  {/* Left: Icon and Name + Subtitle */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className="text-muted-foreground shrink-0 flex items-center justify-center">
                      {m.type === "wallet" ? (
                        <Smartphone size={17} strokeWidth={1.6} />
                      ) : (
                        <Landmark size={17} strokeWidth={1.6} />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium text-foreground truncate leading-tight">
                        {m.name}
                      </p>
                      <p className="text-[12px] text-muted-foreground truncate mt-0.5 tabular-nums">
                        {m.networkOrBank || (m.type === "wallet" ? "Wallet" : "Bank")} · {m.destination}
                      </p>
                    </div>
                  </div>

                  {/* Right: Custom Amount Input (if custom split) + Delete Member Button */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    {splitType === "custom" && (
                      <div className="flex items-center gap-1 bg-muted/40 dark:bg-white/[0.08] border border-border/80 dark:border-white/[0.12] rounded-lg px-2 py-1">
                        <span className="text-[11px] text-muted-foreground font-medium">GHS</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={m.defaultAmount ?? amountPerPerson}
                          onChange={(e) =>
                            handleCustomAmountChange(m.id || m.destination, e.target.value)
                          }
                          className="w-16 text-right text-[12px] font-medium text-foreground bg-transparent outline-none tabular-nums"
                        />
                      </div>
                    )}

                    {/* Delete Member Button with Trash icon */}
                    <button
                      type="button"
                      onClick={() => setMemberToDelete(m)}
                      className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20 transition-colors cursor-pointer"
                      title={`Remove ${m.name} from group`}
                      aria-label={`Remove ${m.name} from group`}
                    >
                      <Trash2 size={15} strokeWidth={1.8} />
                    </button>
                  </div>
                </div>
              ))}

              {filteredMembers.length === 0 && (
                <div className="py-8 text-center text-muted-foreground text-[13px]">
                  {searchMember
                    ? `No members found matching “${searchMember}”.`
                    : "No members in this group yet. Use '+ Add member' above to add someone."}
                </div>
              )}
            </div>

            {errors.members && (
              <p className="text-[11.5px] text-destructive text-center">{errors.members}</p>
            )}

            {/* Row 6: Summary Row */}
            <div className="flex items-center justify-between pt-2 border-t border-border/50 dark:border-white/[0.06] select-none">
              <span className="text-[13px] font-medium text-muted-foreground">
                Total ({members.length} {members.length === 1 ? "member" : "members"}):
              </span>
              <span className="text-[17px] font-semibold text-foreground tracking-[-0.01em] tabular-nums">
                GHS {totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Row 7: Modal Footer Actions matching Add Beneficiary & Create Group Modal */}
          <div className="px-6 py-3.5 border-t border-border/60 bg-muted/20 flex items-center justify-between gap-2.5 shrink-0">
            {/* Left: Delete Group Button */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteGroupConfirm(true)}
              className="h-9 px-3 text-[13px] text-destructive hover:bg-destructive/10 hover:text-destructive gap-1.5"
            >
              <Trash2 size={14} strokeWidth={1.8} />
              <span>Delete Group</span>
            </Button>

            {/* Right: Cancel & Save Changes */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-9 px-3.5 text-[13px]"
              >
                Cancel
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleSaveChanges}
                disabled={!name.trim() || members.length === 0}
                className="h-9 px-4 text-[13px] font-medium"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 1: Confirm Remove Member Dialog ─────────────────────── */}
      <Dialog open={!!memberToDelete} onOpenChange={(open) => !open && setMemberToDelete(null)}>
        <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden rounded-2xl border-none bg-card text-foreground shadow-2xl flex flex-col gap-0" showCloseButton={false}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
            <div className="flex items-center gap-2.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertTriangle size={15} strokeWidth={2} />
              </span>
              <DialogTitle className="text-[16px] font-medium text-foreground tracking-[-0.01em]">
                Remove Member
              </DialogTitle>
            </div>
            <button
              type="button"
              onClick={() => setMemberToDelete(null)}
              className="flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X size={15} strokeWidth={1.8} />
            </button>
          </div>

          <div className="px-6 py-5 text-[13.5px] text-muted-foreground leading-relaxed">
            Are you sure you want to remove <span className="font-semibold text-foreground">{memberToDelete?.name}</span> from <span className="font-semibold text-foreground">{name || group.name}</span>? They will no longer receive disbursements when you send to this group.
          </div>

          <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 border-t border-border/60 bg-muted/20">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMemberToDelete(null)}
              className="h-9 px-3.5 text-[13px]"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmRemoveMember}
              className="h-9 px-4 text-[13px] font-medium"
            >
              Remove Member
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 2: Confirm Delete Group Dialog ──────────────────────── */}
      <Dialog open={showDeleteGroupConfirm} onOpenChange={setShowDeleteGroupConfirm}>
        <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden rounded-2xl border-none bg-card text-foreground shadow-2xl flex flex-col gap-0" showCloseButton={false}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
            <div className="flex items-center gap-2.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <Trash2 size={15} strokeWidth={2} />
              </span>
              <DialogTitle className="text-[16px] font-medium text-foreground tracking-[-0.01em]">
                Delete Payment Group
              </DialogTitle>
            </div>
            <button
              type="button"
              onClick={() => setShowDeleteGroupConfirm(false)}
              className="flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X size={15} strokeWidth={1.8} />
            </button>
          </div>

          <div className="px-6 py-5 text-[13.5px] text-muted-foreground leading-relaxed">
            Are you sure you want to delete <span className="font-semibold text-foreground">{group.name}</span>? This action cannot be undone. All member contact details will remain safely saved in your individual beneficiaries directory.
          </div>

          <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 border-t border-border/60 bg-muted/20">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteGroupConfirm(false)}
              className="h-9 px-3.5 text-[13px]"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmDeleteGroup}
              className="h-9 px-4 text-[13px] font-medium"
            >
              Delete Group
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
