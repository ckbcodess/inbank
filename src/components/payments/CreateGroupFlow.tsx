"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Check,
  Plus,
  X,
} from "@/components/ui/icons";
import { useGroupsStore, type PaymentGroup, type GroupMember } from "@/lib/groups-store";
import { useBeneficiariesStore } from "@/lib/beneficiaries-store";
import { Button } from "@/components/ui/button";
import { AmountInput, OTHER_BANKS } from "@/components/payments/flows/shared";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Modal,
} from "@/components/ui/dialog";
import { PayeeAvatar } from "@/components/ui/payee-avatar";
import { cn } from "@/lib/utils";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field } from "@/components/ui/field";
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

const SPLIT_OPTIONS = [
  { value: "equal", label: "Equal Split" },
  { value: "custom", label: "Custom Amounts" },
] as const;
const WALLET_NETWORKS = ["MTN Mobile Money", "Telecel Cash", "AT Money", "GhanaPay", "G-Money"];

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
  const [pickerOpen, setPickerOpen] = useState(false);

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
  const [customCategory, setCustomCategory] = useState<"gcb" | "other_bank" | "wallet">("gcb");
  const [customBank, setCustomBank] = useState("Ecobank Ghana Ltd");
  const [customWalletNetwork, setCustomWalletNetwork] = useState(WALLET_NETWORKS[0]);

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
      // Only people with a bank account or a wallet can be in a group; services and merchants can't
      .filter((b) => !["bill", "airtime", "broadband", "card", "qr", "insurance"].includes(b.transactionType))
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
      toast.error("Please enter both contact name and account/phone number");
      return;
    }
    const amt = parseFloat(defaultAmount) || 0;
    const networkOrBank =
      customCategory === "gcb"
        ? "GCB Bank"
        : customCategory === "other_bank"
        ? customBank
        : customWalletNetwork;

    const newMember: GroupMember = {
      id: `m-custom-${Date.now()}`,
      name: customName.trim(),
      destination: customDest.trim(),
      type: customCategory === "wallet" ? "wallet" : "bank",
      networkOrBank,
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
    <div className="mx-auto flex w-full max-w-[580px] flex-col gap-5 py-5 sm:py-6 animate-in fade-in duration-200 ease-out">
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* HEADER: Inline Back Chevron + Screen Title matching Figma mockups          */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div data-page-header className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleBack}
          className="flex size-7 items-center justify-center rounded-lg text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
          aria-label="Back"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="type-page-title font-medium leading-[24px] sm:leading-[28px] tracking-[var(--ls-heading)] text-foreground">
          {step === 1 ? "Select group members" : "Select the amount per person"}
        </h1>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* STEP 1: SELECT GROUP MEMBERS (Design Mockup 1)                            */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="flex flex-col gap-4">
          {/* Group Name * */}
          <div className="flex flex-col gap-2">
            <Label>
              Group Name <span className="text-destructive">*</span>
            </Label>
            <Input
              ref={nameInputRef}
              type="text"
              value={name}
              maxLength={50}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter narration"
              
            />
          </div>

          {/* Description (Optional) */}
          <Field label="Description" optional>
            <Input
              type="text"
              value={description}
              maxLength={120}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter narration"
            />
          </Field>

          {/* Select Members Section */}
          <div className="flex flex-col gap-2">
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
                className="text-[13px] text-foreground hover:underline cursor-pointer flex items-center gap-1 font-medium transition-colors"
              >
                <Plus size={14} /> New contact
              </button>
            </div>

            {/* Inline Add Custom Contact Form */}
            {showNewContact && (
              <div className="rounded-2xl border border-border/80 bg-card p-3 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-150 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-foreground font-medium">Add Unsaved Counterparty</span>
                  <button
                    type="button"
                    onClick={() => setShowNewContact(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Full name"
                    
                  />
                  <Input
                    type="text"
                    value={customDest}
                    onChange={(e) => setCustomDest(e.target.value)}
                    placeholder="Phone or Account Number"
                    
                  />
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCustomCategory("gcb")}
                      className={cn(
                        "px-2 py-2 rounded-lg text-[12px] font-medium transition-colors cursor-pointer",
                        customCategory === "gcb" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}
                    >
                      GCB Account
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomCategory("other_bank")}
                      className={cn(
                        "px-2 py-2 rounded-lg text-[12px] font-medium transition-colors cursor-pointer",
                        customCategory === "other_bank" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}
                    >
                      Other Local Bank
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomCategory("wallet")}
                      className={cn(
                        "px-2 py-2 rounded-lg text-[12px] font-medium transition-colors cursor-pointer",
                        customCategory === "wallet" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}
                    >
                      Mobile Wallet
                    </button>
                  </div>

                  {customCategory === "other_bank" && (
                    <select
                      value={customBank}
                      onChange={(e) => setCustomBank(e.target.value)}
                      className="h-9 w-full rounded-xl border border-input bg-background px-2 text-[13px] text-foreground outline-none"
                    >
                      {OTHER_BANKS.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  )}

                  {customCategory === "wallet" && (
                    <select
                      value={customWalletNetwork}
                      onChange={(e) => setCustomWalletNetwork(e.target.value)}
                      className="h-9 w-full rounded-xl border border-input bg-background px-2 text-[13px] text-foreground outline-none"
                    >
                      {WALLET_NETWORKS.map((w) => (
                        <option key={w} value={w}>{w}</option>
                      ))}
                    </select>
                  )}

                  <div className="flex justify-end pt-1">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddCustomContact}
                      className="h-8 px-3 text-[13px] bg-primary text-primary-foreground font-normal cursor-pointer"
                    >
                      Add Member
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Who is in the group: the people picked, then a button that opens the saved recipients */}
            {members.length > 0 && (
              <div className="flex flex-col gap-0.5">
                {members.map((m) => (
                  <div key={m.id || m.destination} className="flex items-center justify-between gap-3 rounded-xl p-2">
                    <div className="flex min-w-0 items-center gap-3">
                      <PayeeAvatar name={m.name} initials={initials(m.name)} size="md" />
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-[14px] text-foreground">{m.name}</span>
                        <span className="truncate text-[12px] text-muted-foreground">
                          {m.networkOrBank} <span className="tabular">· {m.destination}</span>
                        </span>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleMember(m)}
                      aria-label={`Remove ${m.name}`}
                      className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors duration-hover hover:bg-muted hover:text-foreground"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <Button type="button" variant="outline" onClick={() => setPickerOpen(true)} className="w-full">
              <Plus size={14} /> {members.length > 0 ? "Add more members" : "Add members"}
            </Button>

            <Modal
              open={pickerOpen}
              onOpenChange={(o) => {
                setPickerOpen(o);
                if (!o) setSearch("");
              }}
              title="Select a Beneficiary"
              size="md"
              footer={
                <Button type="button" onClick={() => setPickerOpen(false)} className="w-full">
                  Done{members.length > 0 ? ` (${members.length})` : ""}
                </Button>
              }
            >
              <div className="flex flex-col gap-3">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, bank or number"
                  aria-label="Search recipients"
                />
                {filteredContacts.length === 0 ? (
                  <p className="py-8 text-center text-[13px] text-muted-foreground">
                    Nobody saved matches that. Clear the search to see everyone.
                  </p>
                ) : (
                  <div className="custom-scrollbar scroll-fade -mx-1 flex max-h-[50vh] flex-col gap-0.5 overflow-y-auto overscroll-contain px-1">
                    {filteredContacts.map((contact) => {
                      const isSelected = members.some((m) =>
                        m.id && contact.id ? m.id === contact.id : m.destination === contact.destination
                      );
                      return (
                        <button
                          key={contact.id || contact.destination}
                          type="button"
                          onClick={() => toggleMember(contact)}
                          aria-pressed={isSelected}
                          className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl p-2 text-left transition-colors duration-hover hover:bg-muted/50"
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <PayeeAvatar name={contact.name} initials={initials(contact.name)} size="md" />
                            <span className="flex min-w-0 flex-col">
                              <span className="truncate text-[14px] text-foreground">{contact.name}</span>
                              <span className="truncate text-[12px] text-muted-foreground">
                                {contact.networkOrBank} <span className="tabular">· {contact.destination}</span>
                              </span>
                            </span>
                          </span>
                          <span
                            className={cn(
                              "flex size-4 shrink-0 items-center justify-center rounded-full border transition",
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-muted-foreground/30 bg-transparent"
                            )}
                          >
                            {isSelected && <Check size={11} className="shrink-0" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </Modal>
          </div>

          {/* Primary CTA */}
          <Button
            type="button"
            disabled={!name.trim() || members.length === 0}
            onClick={() => setStep(2)}
            className="w-full h-10 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-[14px] font-normal cursor-pointer shadow-xs disabled:opacity-50 mt-1"
          >
            Proceed to Amount
          </Button>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* STEP 2: SELECT THE AMOUNT PER PERSON (Design Mockup 2)                     */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="flex flex-col gap-5">
          <SegmentedControl
            aria-label="How to split"
            fullWidth
            options={SPLIT_OPTIONS}
            value={splitType}
            onChange={setSplitType}
          />

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
            <div className="flex flex-col gap-2">
              <Label>
                Individual Contribution Amounts
              </Label>
              <div className="rounded-2xl border border-border/80 bg-card overflow-hidden divide-y divide-border/50 max-h-[320px] overflow-y-auto scroll-fade">
                {members.map((member) => (
                  <div
                    key={member.id || member.destination}
                    className="flex items-center justify-between px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted/70 text-foreground text-[11px]">
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
                    <div className="flex items-center gap-2 shrink-0 bg-field border border-field-border rounded-xl px-2 py-2 focus-within:border-field-border-focus focus-within:ring-0 transition">
                      <span className="text-[12px] font-medium text-muted-foreground select-none">GHS</span>
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
                        className="w-21 bg-transparent text-right text-[14px] font-normal tabular-nums outline-none border-none text-foreground"
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
          <div className="flex items-center gap-2 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(1)}
              className="flex-1 h-10 rounded-xl border border-border/80 bg-background hover:bg-muted/40 text-foreground font-normal text-[14px] cursor-pointer"
            >
              Back
            </Button>
            <Button
              type="button"
              disabled={totalAmount <= 0}
              onClick={handleCreateGroup}
              className="flex-1 h-10 bg-primary hover:bg-primary-hover text-primary-foreground font-normal text-[14.5px] cursor-pointer shadow-xs disabled:opacity-50"
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
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Discard unsaved changes?</DialogTitle>
          </DialogHeader>
          <div className="px-4 sm:px-5 py-4 text-[13px] text-muted-foreground leading-relaxed">
            You have unsaved changes in this group. Leaving now will discard your entered data.
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowExitConfirm(false)}
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
            >
              Discard & Exit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
