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
  Modal,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Plus, Trash2, X } from "@/components/ui/icons";
import { useGroupsStore, type PaymentGroup, type GroupMember } from "@/lib/groups-store";
import { useBeneficiariesStore, type BeneficiaryRecord } from "@/lib/beneficiaries-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PayeeAvatar } from "@/components/ui/payee-avatar";
import { SearchField } from "@/components/ui/search-field";
import { AmountInput } from "@/components/payments/flows/shared";
import { MemberAmountInput } from "@/components/payments/MemberAmountInput";
import { SegmentedControl } from "@/components/ui/segmented-control";

/** A long group gets a search box above its members. */
const SEARCH_FROM_MEMBERS = 8;
/** Same two splits as Create group, so a group reads the same on both screens. */
const SPLIT_OPTIONS = [
  { value: "equal", label: "Equal Split" },
  { value: "custom", label: "Custom Amounts" },
] as const;

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

const WALLET_NETWORKS = ["MTN Mobile Money", "Telecel Cash", "AT Money", "GhanaPay", "G-Money"];

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

  // Add Member: the same two entry points as Create group (saved picker, new contact)
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showNewContact, setShowNewContact] = useState(false);
  const [savedSearch, setSavedSearch] = useState("");
  const [pickedIds, setPickedIds] = useState<string[]>([]);

  // New contact states
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
      setPickerOpen(false);
      setShowNewContact(false);
      setPickedIds([]);
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
        if (b.category === "biller" || ["bill", "airtime", "broadband", "card", "qr", "insurance"].includes(b.transactionType)) {
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

  // Turns a saved beneficiary into a group member at the group's current amount
  const memberFromBeneficiary = (b: BeneficiaryRecord): GroupMember => ({
    id: b.id.startsWith("m-") ? b.id : `m-${b.id}`,
    name: b.name,
    destination: b.accountNumber || b.phoneNumber || b.proxyId || b.detail || b.id,
    type: b.transactionType === "bank" ? "bank" : "wallet",
    networkOrBank: b.bankName || b.network || "GCB Bank",
    defaultAmount: parseFloat(amountPerPerson) || 0,
  });

  // Done in the saved picker: every ticked beneficiary joins the group
  const handleAddPicked = () => {
    const picked = availableSavedBeneficiaries.filter((b) => pickedIds.includes(b.id));
    if (picked.length > 0) {
      setMembers((prev) => [...prev, ...picked.map(memberFromBeneficiary)]);
      if (errors.members) setErrors((prev) => ({ ...prev, members: undefined }));
      toast.success(`Added ${picked.length} ${picked.length === 1 ? "member" : "members"} to ${name || "group"}.`);
    }
    setPickedIds([]);
    setSavedSearch("");
    setPickerOpen(false);
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
    setShowNewContact(false);
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
          className="p-0 flex flex-col gap-0 overflow-hidden sm:max-w-lg md:max-w-xl"
          showCloseButton={false}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 shrink-0">
            <SheetTitle className="truncate max-w-[380px]">
              Edit {group.name}
            </SheetTitle>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer shrink-0"
              aria-label="Close"
            >
              <X size={17} />
            </button>
          </div>

          {/* Scrollable Sheet Content Body */}
          <div className="scroll-fade flex-1 min-h-0 overflow-y-auto px-5 py-5 flex flex-col gap-4 overscroll-contain custom-scrollbar">
            {/* Name and the amount: the only two things most edits touch */}
            <div className="flex flex-col gap-3">
              <Field label="Group Name" error={errors.name}>
                <Input
                  type="text"
                  value={name}
                  maxLength={50}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  placeholder="e.g. Family Susu"
                  aria-invalid={Boolean(errors.name)}
                />
              </Field>

              <SegmentedControl
                aria-label="How to split"
                fullWidth
                options={SPLIT_OPTIONS}
                value={splitType}
                onChange={setSplitType}
              />
              <AmountInput
                value={amountPerPerson}
                onChange={(val) => {
                  setAmountPerPerson(val);
                  if (errors.amount) setErrors((prev) => ({ ...prev, amount: undefined }));
                }}
                label={splitType === "equal" ? "Amount per Person" : "Starting Amount"}
                error={errors.amount}
                enterKeyHint="done"
              />
            </div>

            {/* Members Section Header + Add Button */}
            <div className="flex flex-col gap-3 pt-2">
              <div className="flex min-h-6 items-center justify-between">
                <span className="text-[16px] font-medium text-foreground">Members ({members.length})</span>

              </div>

              {/* Member search bar */}
              {members.length > SEARCH_FROM_MEMBERS && (
                <SearchField value={searchMember} onChange={setSearchMember} placeholder="Search members" />
              )}

              {/* Member rows: no box around the list. The amount sits on the right, as it does in the payment flow. */}
              <div className="custom-scrollbar scroll-fade -mx-1 flex max-h-[288px] flex-col gap-0.5 overflow-y-auto overscroll-contain px-1">
                {filteredMembers.map((m) => (
                  <div key={m.id || m.destination} className="flex items-center justify-between gap-3 rounded-xl p-2">
                    <div className="flex min-w-0 items-center gap-3">
                      <PayeeAvatar name={m.name} size="md" />
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-[14px] text-foreground">{m.name}</span>
                        <span className="truncate text-[12px] text-muted-foreground">
                          {m.networkOrBank || "GCB Bank"} • {m.destination}
                        </span>
                      </span>
                    </div>

                    <div className="flex shrink-0 items-center">
                      {splitType === "custom" && (
                        <MemberAmountInput
                          name={m.name}
                          value={m.defaultAmount !== undefined ? String(m.defaultAmount) : amountPerPerson}
                          amount={Number(m.defaultAmount ?? amountPerPerson) || 0}
                          onChange={(val) => handleUpdateMemberAmount(m.id || m.destination, val)}
                        />
                      )}

                      <button
                        type="button"
                        onClick={() => setMemberToDelete(m)}
                        className="flex size-10 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        title="Remove member"
                        aria-label={`Remove ${m.name}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}

                {filteredMembers.length === 0 && (
                  <p className="p-2 text-[13px] text-muted-foreground">{`No members found matching “${searchMember.trim()}”.`}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button type="button" size="md" variant="outline" onClick={() => setPickerOpen(true)} className="flex-1">
                  <Plus size={14} /> Add from beneficiaries
                </Button>
                <Button type="button" size="md" variant="outline" onClick={() => setShowNewContact(true)} className="flex-1">
                  <Plus size={14} /> New contact
                </Button>
              </div>

              {errors.members && (
                <p className="text-[12px] text-destructive">{errors.members}</p>
              )}
            </div>

            {/* Total */}
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-muted-foreground">
                Total for {members.length} {members.length === 1 ? "member" : "members"}
              </span>
              <span className="text-[18px] font-normal text-foreground tracking-[var(--ls-tight)] tabular-nums numorainput">
                GHS {totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Save is the one main action; deleting is a quiet link, no harder to reach than creating was */}
          <div className="px-5 py-3 border-t border-border/60 flex items-center justify-between gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowDeleteGroupConfirm(true)}
              className="text-[13px] text-destructive-text underline underline-offset-4 decoration-transparent hover:decoration-current transition-colors cursor-pointer"
            >
              Delete group
            </button>
            <Button
              type="button"
              onClick={handleSaveChanges}
              disabled={!name.trim() || members.length === 0}
              className="h-10 px-5 text-[13.5px]"
            >
              Save changes
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Add from beneficiaries: tick people, then Done (same as Create group) ── */}
      <Modal
        open={pickerOpen}
        onOpenChange={(o) => {
          setPickerOpen(o);
          if (!o) {
            setPickedIds([]);
            setSavedSearch("");
          }
        }}
        title="Select a Beneficiary"
        size="md"
        footer={
          <Button type="button" onClick={handleAddPicked} className="w-full">
            Done{pickedIds.length > 0 ? ` (${pickedIds.length})` : ""}
          </Button>
        }
      >
        <div className="flex flex-col gap-3">
          <Input
            value={savedSearch}
            onChange={(e) => setSavedSearch(e.target.value)}
            placeholder="Search by name, bank or number"
            aria-label="Search recipients"
          />
          {availableSavedBeneficiaries.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-muted-foreground">
              {savedSearch
                ? "Nobody saved matches that. Clear the search to see everyone."
                : "Everyone you have saved is already in this group."}
            </p>
          ) : (
            <div className="custom-scrollbar scroll-fade -mx-1 flex max-h-[50vh] flex-col gap-0.5 overflow-y-auto overscroll-contain px-1">
              {availableSavedBeneficiaries.map((b) => {
                const isPicked = pickedIds.includes(b.id);
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() =>
                      setPickedIds((prev) => (prev.includes(b.id) ? prev.filter((id) => id !== b.id) : [...prev, b.id]))
                    }
                    aria-pressed={isPicked}
                    className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl p-2 text-left transition-colors duration-hover hover:bg-muted/50"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <PayeeAvatar name={b.name} size="md" />
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-[14px] text-foreground">{b.name}</span>
                        <span className="truncate text-[12px] text-muted-foreground">
                          {b.bankName || b.network} <span className="tabular">· {b.accountNumber || b.phoneNumber || b.proxyId}</span>
                        </span>
                      </span>
                    </span>
                    <span
                      className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded-full border transition",
                        isPicked ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30 bg-transparent"
                      )}
                    >
                      {isPicked && <Check size={11} className="shrink-0" />}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </Modal>

      {/* ── New contact: same fields as Create group ── */}
      <Modal
        open={showNewContact}
        onOpenChange={(o) => {
          setShowNewContact(o);
          if (!o) {
            setCustomName("");
            setCustomDest("");
          }
        }}
        title="Add new contact"
        size="md"
        footer={
          <Button
            type="button"
            onClick={handleAddCustomMember}
            disabled={!customName.trim() || !customDest.trim()}
            className="w-full"
          >
            Add Member
          </Button>
        }
      >
        <div className="flex flex-col gap-5">
          <Field label="Name">
            <Input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Full name" />
          </Field>

          <Field label="Type">
            <Select
              value={customType}
              onValueChange={(v) => {
                if (!v) return;
                const t = v as "wallet" | "bank";
                setCustomType(t);
                setCustomBankOrNet(t === "wallet" ? WALLET_NETWORKS[0] : GHANA_BANKS[0]);
              }}
            >
              <SelectTrigger aria-label="Account type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="wallet" label="Mobile Wallet">Mobile Wallet</SelectItem>
                <SelectItem value="bank" label="Bank Account">Bank Account</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label={customType === "wallet" ? "Mobile Wallet" : "Bank"}>
            <Select value={customBankOrNet} onValueChange={(v) => v && setCustomBankOrNet(v)}>
              <SelectTrigger aria-label={customType === "wallet" ? "Mobile wallet" : "Bank"}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(customType === "wallet" ? WALLET_NETWORKS : GHANA_BANKS).map((opt) => (
                  <SelectItem key={opt} value={opt} label={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label={customType === "wallet" ? "Mobile number" : "Account number"}>
            <Input
              value={customDest}
              onChange={(e) => setCustomDest(e.target.value)}
              placeholder={customType === "wallet" ? "024 000 0000" : "Account number"}
              inputMode="numeric"
            />
          </Field>
        </div>
      </Modal>

      {/* ── MODAL 1: Confirm Remove Member Dialog ─────────────────────── */}
      <Dialog open={Boolean(memberToDelete)} onOpenChange={(isOpen) => !isOpen && setMemberToDelete(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
          </DialogHeader>

          <div className="px-4 sm:px-5 py-4 text-[13px] text-muted-foreground leading-relaxed">
            Are you sure you want to remove <span className="text-foreground font-medium">{memberToDelete?.name}</span> from <span className="text-foreground font-medium">{name || group.name}</span>? They will no longer receive disbursements when you send to this group.
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setMemberToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
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

          <div className="px-4 sm:px-5 py-4 text-[13px] text-muted-foreground leading-relaxed">
            Are you sure you want to delete <span className="text-foreground font-medium">{group.name}</span>? This action cannot be undone. All member contact details will remain safely saved in your individual beneficiaries directory.
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowDeleteGroupConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
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
