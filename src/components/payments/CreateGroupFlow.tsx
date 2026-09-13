"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Search,
  Check,
  Plus,
  Landmark,
  Smartphone,
  X,
} from "lucide-react";
import { useGroupsStore, type PaymentGroup, type GroupMember } from "@/lib/groups-store";
import { useBeneficiariesStore } from "@/lib/beneficiaries-store";
import { Button } from "@/components/ui/button";
import { AmountInput } from "@/components/payments/flows/shared";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CreateGroupFlowProps {
  groupToEdit?: PaymentGroup | null;
  onCancel?: () => void;
  onDone?: (group: PaymentGroup) => void;
  onSuccess?: (group: PaymentGroup) => void;
}

function initials(name: string) {
  return (
    name
      .replace(/[^a-zA-Z ]/g, "")
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "#"
  );
}

const DEFAULT_FALLBACK_CONTACTS: GroupMember[] = [
  { id: "c-1", name: "Current Account", destination: "2329938293", type: "bank", networkOrBank: "GCB Bank", defaultAmount: 200 },
  { id: "c-2", name: "Current Account", destination: "2329938294", type: "bank", networkOrBank: "GCB Bank", defaultAmount: 200 },
  { id: "c-3", name: "Current Account", destination: "2329938295", type: "bank", networkOrBank: "GCB Bank", defaultAmount: 200 },
  { id: "c-4", name: "Current Account", destination: "2329938296", type: "bank", networkOrBank: "GCB Bank", defaultAmount: 200 },
  { id: "c-5", name: "Current Account", destination: "2329938297", type: "bank", networkOrBank: "GCB Bank", defaultAmount: 200 },
  { id: "c-6", name: "Current Account", destination: "2329938298", type: "bank", networkOrBank: "GCB Bank", defaultAmount: 200 },
  { id: "c-7", name: "Current Account", destination: "2329938299", type: "bank", networkOrBank: "GCB Bank", defaultAmount: 200 },
];

const WALLET_NETWORKS = ["MTN Mobile Money", "Telecel Cash", "AT Money"];

export default function CreateGroupFlow({
  groupToEdit,
  onCancel,
  onDone,
  onSuccess,
}: CreateGroupFlowProps) {
  const router = useRouter();
  const { addGroup, updateGroup } = useGroupsStore();
  const beneficiaries = useBeneficiariesStore((s) => s.beneficiaries);

  // Step 1: Select group members | Step 2: Select the amount per person
  const [step, setStep] = useState<1 | 2>(1);

  // Form State
  const [name, setName] = useState(groupToEdit?.name || "");
  const [description, setDescription] = useState(groupToEdit?.description || "");
  const [defaultAmount, setDefaultAmount] = useState(
    groupToEdit?.defaultPerMemberAmount ? String(groupToEdit.defaultPerMemberAmount) : "4344"
  );
  const [splitType, setSplitType] = useState<"equal" | "custom">(
    groupToEdit?.splitType || "equal"
  );
  const [members, setMembers] = useState<GroupMember[]>(
    groupToEdit?.members ? [...groupToEdit.members] : []
  );
  const [search, setSearch] = useState("");

  // Auto-focus Group Name input
  const nameInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (step === 1) {
      nameInputRef.current?.focus();
    }
  }, [step]);

  // Inline "+ New Contact" toggle
  const [showNewContact, setShowNewContact] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customDest, setCustomDest] = useState("");
  const [customType, setCustomType] = useState<"wallet" | "bank">("wallet");
  const [customNetworkOrBank, setCustomNetworkOrBank] = useState(WALLET_NETWORKS[0]);

  // Unsaved changes confirmation dialog
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Dirty state tracking
  const isDirty = useMemo(() => {
    if (groupToEdit) {
      return (
        name !== groupToEdit.name ||
        description !== (groupToEdit.description || "") ||
        splitType !== groupToEdit.splitType ||
        members.length !== groupToEdit.members.length
      );
    }
    return name.trim().length > 0 || description.trim().length > 0 || members.length > 0;
  }, [name, description, splitType, members, groupToEdit]);

  // Map beneficiaries to contacts (or fallback to mockup seed contacts)
  const availableContacts: GroupMember[] = useMemo(() => {
    const list = beneficiaries
      .filter((b) => b.category === "person" || b.category === "number" || b.transactionType !== "bill")
      .map((b) => ({
        id: b.id.startsWith("b-") ? b.id : `b-${b.id}`,
        name: b.name,
        destination: b.accountNumber || b.phoneNumber || b.proxyId || b.detail || b.id,
        type: b.transactionType === "bank" ? ("bank" as const) : ("wallet" as const),
        networkOrBank: b.bankName || b.network || "GCB Bank",
      }));

    if (list.length === 0) {
      return DEFAULT_FALLBACK_CONTACTS;
    }
    return list;
  }, [beneficiaries]);

  // Filtered contacts based on search query
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

  // Toggle member selection
  const toggleMember = (contact: GroupMember) => {
    setMembers((prev) => {
      const exists = prev.some((m) =>
        m.id && contact.id ? m.id === contact.id : m.destination === contact.destination
      );
      if (exists) {
        return prev.filter((m) =>
          m.id && contact.id ? m.id !== contact.id : m.destination !== contact.destination
        );
      } else {
        const amt = parseFloat(defaultAmount) || 0;
        return [...prev, { ...contact, defaultAmount: amt }];
      }
    });
  };

  // Update individual member custom amount in step 2
  const updateMemberAmount = (identifier: string, amtStr: string) => {
    const cleanStr = amtStr.replace(/[^0-9.]/g, "");
    const val = parseFloat(cleanStr) || 0;
    setMembers((prev) =>
      prev.map((m) =>
        m.id === identifier || m.destination === identifier ? { ...m, defaultAmount: val } : m
      )
    );
  };

  // Add custom contact inline
  const handleAddCustomContact = () => {
    if (!customName.trim() || !customDest.trim()) {
      toast.error("Please enter both contact name and phone/account number");
      return;
    }
    const amt = parseFloat(defaultAmount) || 0;
    const newMember: GroupMember = {
      id: `m-custom-${Date.now()}`,
      name: customName.trim(),
      destination: customDest.trim(),
      type: customType,
      networkOrBank: customNetworkOrBank,
      defaultAmount: amt,
    };
    setMembers((prev) => [...prev, newMember]);
    setCustomName("");
    setCustomDest("");
    setShowNewContact(false);
    toast.success(`Added ${newMember.name} to participants`);
  };

  // Running Total Calculation
  const totalAmount = useMemo(() => {
    const baseAmt = parseFloat(defaultAmount) || 0;
    if (splitType === "equal") return members.length * baseAmt;
    return members.reduce((sum, m) => sum + (m.defaultAmount ?? baseAmt), 0);
  }, [members, defaultAmount, splitType]);

  // Navigation handlers
  const handleExit = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.push("/beneficiaries?tab=groups");
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    } else {
      if (isDirty) {
        setShowExitConfirm(true);
      } else {
        handleExit();
      }
    }
  };

  // Immediate Group Creation
  const handleCreateGroup = () => {
    const baseAmt = parseFloat(defaultAmount) || 0;
    const normalizedMembers = members.map((m) => ({
      ...m,
      defaultAmount: splitType === "equal" ? baseAmt : m.defaultAmount || baseAmt,
    }));

    let savedGroup: PaymentGroup;

    if (groupToEdit) {
      updateGroup(groupToEdit.id, {
        name: name.trim(),
        description: description.trim(),
        defaultPerMemberAmount: baseAmt,
        splitType,
        members: normalizedMembers,
      });
      savedGroup = {
        ...groupToEdit,
        name: name.trim(),
        description: description.trim(),
        defaultPerMemberAmount: baseAmt,
        splitType,
        members: normalizedMembers,
      };
    } else {
      savedGroup = addGroup({
        name: name.trim(),
        description: description.trim(),
        defaultPerMemberAmount: baseAmt,
        splitType,
        members: normalizedMembers,
      });
    }

    toast.success(
      groupToEdit
        ? `Payment group "${savedGroup.name}" updated successfully.`
        : `Payment group "${savedGroup.name}" created successfully.`
    );

    if (onDone) {
      onDone(savedGroup);
    } else if (onSuccess) {
      onSuccess(savedGroup);
    } else {
      router.push("/beneficiaries?tab=groups");
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[580px] flex-col gap-6 py-6 sm:py-8 animate-in fade-in duration-200 ease-out">
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* HEADER: Inline Back Chevron + Screen Title matching Figma mockups          */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={handleBack}
          className="flex size-8 items-center justify-center rounded-lg text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
          aria-label="Back"
        >
          <ChevronLeft size={20} strokeWidth={2} />
        </button>
        <h1 className="text-[22px] sm:text-[24px] font-normal tracking-[-0.02em] text-foreground">
          {step === 1 ? "Select group members" : "Select the amount per person"}
        </h1>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* STEP 1: SELECT GROUP MEMBERS (Design Mockup 1)                            */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="flex flex-col gap-5">
          {/* Group Name * */}
          <div className="flex flex-col gap-2">
            <label className="text-[14px] font-medium text-foreground">
              Group Name <span className="text-destructive">*</span>
            </label>
            <input
              ref={nameInputRef}
              type="text"
              value={name}
              maxLength={50}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter narration"
              className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all"
            />
          </div>

          {/* Description (optional) */}
          <div className="flex flex-col gap-2">
            <label className="text-[14px] font-medium text-foreground">
              Description <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={description}
              maxLength={120}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter narration"
              className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all"
            />
          </div>

          {/* Select Members Section */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-medium text-foreground">
                Select Members{" "}
                <span className="text-muted-foreground font-normal">
                  ({members.length} {members.length === 1 ? "member" : "members"})
                </span>
              </span>

              {/* Inline + New Contact Toggle */}
              <button
                type="button"
                onClick={() => setShowNewContact(!showNewContact)}
                className="text-[13px] text-primary hover:underline cursor-pointer flex items-center gap-1 font-normal transition-colors"
              >
                <Plus size={14} strokeWidth={2} /> New contact
              </button>
            </div>

            {/* Inline Add Custom Contact Form */}
            {showNewContact && (
              <div className="rounded-2xl border border-border/80 bg-card p-4 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-150 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[13.5px] text-foreground font-medium">Add Unsaved Counterparty</span>
                  <button
                    type="button"
                    onClick={() => setShowNewContact(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Full name"
                    className="h-11 w-full rounded-xl border border-border/80 bg-card px-3.5 text-[14px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 placeholder:text-muted-foreground/60 transition-all"
                  />
                  <input
                    type="text"
                    value={customDest}
                    onChange={(e) => setCustomDest(e.target.value)}
                    placeholder="Phone or Account Number"
                    className="h-11 w-full rounded-xl border border-border/80 bg-card px-3.5 text-[14px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 placeholder:text-muted-foreground/60 transition-all"
                  />
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCustomType("wallet")}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors cursor-pointer",
                        customType === "wallet" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}
                    >
                      Mobile Wallet
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomType("bank")}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors cursor-pointer",
                        customType === "bank" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}
                    >
                      Bank Account
                    </button>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddCustomContact}
                    className="h-9 px-4 rounded-xl text-[13px] bg-primary text-primary-foreground font-normal cursor-pointer"
                  >
                    Add Member
                  </Button>
                </div>
              </div>
            )}

            {/* Search contacts input */}
            <div className="relative w-full">
              <Search
                size={17}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search contacts"
                className="h-13 w-full rounded-2xl border border-border/80 bg-card pl-11 pr-10 text-[15px] text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground cursor-pointer"
                  aria-label="Clear search"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Members List Container */}
            <div className="rounded-2xl border border-border/60 bg-card overflow-hidden divide-y divide-border/50 max-h-[360px] overflow-y-auto">
              {filteredContacts.map((contact) => {
                const isSelected = members.some((m) =>
                  m.id && contact.id ? m.id === contact.id : m.destination === contact.destination
                );
                return (
                  <div
                    key={contact.id || contact.destination}
                    onClick={() => toggleMember(contact)}
                    className={cn(
                      "flex items-center justify-between px-4 py-3.5 hover:bg-muted/30 transition-colors cursor-pointer select-none",
                      isSelected && "bg-primary/5 dark:bg-primary/10"
                    )}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted/70 text-foreground">
                        {contact.type === "wallet" ? (
                          <Smartphone size={18} strokeWidth={1.8} />
                        ) : (
                          <Landmark size={18} strokeWidth={1.8} />
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[14px] text-foreground font-normal truncate">
                          {contact.name || "Current Account"}
                        </span>
                        <span className="text-[12px] text-muted-foreground font-normal truncate tabular-nums numorainput">
                          {contact.networkOrBank || "GCB Bank"} • {contact.destination}
                        </span>
                      </div>
                    </div>

                    {/* Selection Indicator */}
                    <div
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full border transition-all",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/30 bg-transparent"
                      )}
                    >
                      {isSelected && <Check size={12} strokeWidth={2.5} />}
                    </div>
                  </div>
                );
              })}

              {filteredContacts.length === 0 && (
                <div className="py-8 text-center text-muted-foreground text-[13px]">
                  No contacts found matching “{search}”.
                </div>
              )}
            </div>
          </div>

          {/* Primary CTA */}
          <Button
            type="button"
            disabled={!name.trim() || members.length === 0}
            onClick={() => setStep(2)}
            className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-[14.5px] font-normal cursor-pointer shadow-xs disabled:opacity-50 mt-1"
          >
            Continue to Distribution
          </Button>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* STEP 2: SELECT THE AMOUNT PER PERSON (Design Mockup 2)                     */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="flex flex-col gap-6">
          {/* Segmented Tab Pill: [ Equal Split | Custom Amounts ] */}
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

          {/* Equal Split Input using the payment flow's AmountInput */}
          {splitType === "equal" ? (
            <AmountInput
              value={defaultAmount}
              onChange={setDefaultAmount}
              label="Amount per Person"
              currency="GHS"
            />
          ) : (
            /* Custom Amounts List */
            <div className="flex flex-col gap-3">
              <label className="text-[14px] font-medium text-foreground">
                Individual Contribution Amounts
              </label>
              <div className="rounded-2xl border border-border/80 bg-card overflow-hidden divide-y divide-border/50 max-h-[320px] overflow-y-auto">
                {members.map((member) => (
                  <div
                    key={member.id || member.destination}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted/70 text-foreground text-[11px]">
                        {initials(member.name)}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[14px] text-foreground font-normal truncate">
                          {member.name}
                        </span>
                        <span className="text-[12px] text-muted-foreground font-normal truncate tabular-nums numorainput">
                          {member.destination}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 bg-card border border-border/80 rounded-xl px-3 py-1.5 focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/30 transition-all">
                      <span className="text-[12.5px] font-medium text-muted-foreground select-none">GHS</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={
                          member.defaultAmount !== undefined
                            ? String(member.defaultAmount)
                            : defaultAmount
                        }
                        onChange={(e) =>
                          updateMemberAmount(member.id || member.destination, e.target.value)
                        }
                        className="w-24 bg-transparent text-right text-[14px] font-normal tabular-nums outline-none border-none text-foreground"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Total Amount Row matching Design Mockup 2 */}
          <div className="flex items-center justify-between pt-2 pb-2">
            <span className="text-[18px] text-muted-foreground font-normal">
              Total Amount:
            </span>
            <span className="text-[20px] sm:text-[22px] text-foreground font-normal tabular-nums numorainput">
              GHS {totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Action Buttons: [ Back | Create Group ] */}
          <div className="flex items-center gap-3 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(1)}
              className="flex-1 h-12 rounded-xl border border-border/80 bg-background hover:bg-muted/40 text-foreground font-normal text-[14.5px] cursor-pointer"
            >
              Back
            </Button>
            <Button
              type="button"
              disabled={totalAmount <= 0}
              onClick={handleCreateGroup}
              className="flex-1 h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-normal text-[14.5px] cursor-pointer shadow-xs disabled:opacity-50"
            >
              Create Group
            </Button>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* UNSAVED CHANGES CONFIRMATION DIALOG                                        */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <Dialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <DialogContent className="max-w-md max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto max-sm:translate-x-0 max-sm:translate-y-0 max-sm:w-full max-sm:max-w-none max-sm:rounded-t-2xl max-sm:rounded-b-none max-sm:border-t p-6">
          <div className="flex flex-col gap-4">
            <DialogTitle className="text-[18px] text-foreground font-normal">
              Discard unsaved changes?
            </DialogTitle>
            <p className="text-[13.5px] text-muted-foreground leading-relaxed font-normal">
              You have unsaved changes in this group. Leaving now will discard your entered data.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 h-11 rounded-xl text-[14px] border-border font-normal"
              >
                Keep Editing
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  setShowExitConfirm(false);
                  handleExit();
                }}
                className="flex-1 h-11 rounded-xl text-[14px] font-normal"
              >
                Discard & Exit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
