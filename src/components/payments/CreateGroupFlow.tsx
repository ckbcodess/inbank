"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Search,
  Check,
  Plus,
  Landmark,
  Smartphone,
  CheckCircle2,
  Users,
  CreditCard,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Building,
} from "lucide-react";
import { useGroupsStore, type PaymentGroup, type GroupMember } from "@/lib/groups-store";
import { useBeneficiariesStore } from "@/lib/beneficiaries-store";
import { formatMoney } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import TransactionPinModal from "@/components/payments/TransactionPinModal";
import { cn } from "@/lib/utils";

interface CreateGroupFlowProps {
  groupToEdit?: PaymentGroup | null;
  onCancel?: () => void;
  onSuccess?: (group: PaymentGroup) => void;
}

type FlowStage = "form" | "review" | "success";

const QUICK_AMOUNTS = [50, 100, 200, 500, 1000];

export default function CreateGroupFlow({
  groupToEdit,
  onCancel,
  onSuccess,
}: CreateGroupFlowProps) {
  const router = useRouter();
  const { addGroup, updateGroup } = useGroupsStore();
  const beneficiaries = useBeneficiariesStore((s) => s.beneficiaries);

  // Flow stage
  const [stage, setStage] = useState<FlowStage>("form");

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [defaultAmount, setDefaultAmount] = useState("200");
  const [splitType, setSplitType] = useState<"equal" | "custom">("equal");
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [search, setSearch] = useState("");

  // Errors
  const [errors, setErrors] = useState<{
    name?: string;
    amount?: string;
    members?: string;
  }>({});

  // Inline "+ New Beneficiary" Drawer
  const [showNewBeneficiary, setShowNewBeneficiary] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customDest, setCustomDest] = useState("");
  const [customType, setCustomType] = useState<"wallet" | "bank">("wallet");
  const [customBankOrNetwork, setCustomBankOrNetwork] = useState("MTN Mobile Money");

  // PIN Modal & Receipt State
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<{
    referenceId: string;
    group: PaymentGroup;
    totalAmount: number;
    createdAt: string;
  } | null>(null);

  // Available contacts mapped from stored beneficiaries
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

  // Pre-fill if editing
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
    setErrors({});
  }, [groupToEdit]);

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
        const amt = Number(defaultAmount) || 0;
        return [...prev, { ...contact, defaultAmount: amt }];
      }
    });
    if (errors.members) {
      setErrors((prev) => ({ ...prev, members: undefined }));
    }
  };

  // Update individual member custom amount
  const updateMemberAmount = (identifier: string, amtStr: string) => {
    const cleanStr = amtStr.replace(/[^0-9.]/g, "");
    const val = Number(cleanStr) || 0;
    setMembers((prev) =>
      prev.map((m) =>
        m.id === identifier || m.destination === identifier ? { ...m, defaultAmount: val } : m
      )
    );
  };

  // Add custom beneficiary inline
  const handleAddNewBeneficiary = () => {
    if (!customName.trim() || !customDest.trim()) return;
    const amt = Number(defaultAmount) || 0;
    const newMember: GroupMember = {
      id: `m-custom-${Date.now()}`,
      name: customName.trim(),
      destination: customDest.trim(),
      type: customType,
      networkOrBank:
        customBankOrNetwork || (customType === "wallet" ? "MTN Mobile Money" : "GCB Bank"),
      defaultAmount: amt,
    };
    setMembers((prev) => [...prev, newMember]);
    setCustomName("");
    setCustomDest("");
    setShowNewBeneficiary(false);
    if (errors.members) {
      setErrors((prev) => ({ ...prev, members: undefined }));
    }
  };

  // Filtered contacts
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

  // Total Outflow
  const totalAmount = useMemo(() => {
    const def = Number(defaultAmount) || 0;
    if (splitType === "equal") return members.length * def;
    return members.reduce((sum, m) => sum + (m.defaultAmount ?? def), 0);
  }, [members, defaultAmount, splitType]);

  // Validate form before proceeding to Review
  const handleProceedToReview = () => {
    const nextErrors: { name?: string; amount?: string; members?: string } = {};

    if (!name.trim()) {
      nextErrors.name = "Please enter a group name";
    } else if (name.trim().length < 2) {
      nextErrors.name = "Group name must be at least 2 characters";
    }

    const amtNum = Number(defaultAmount);
    if (isNaN(amtNum) || amtNum <= 0) {
      nextErrors.amount = "Please enter a valid amount per person";
    }

    if (members.length < 2) {
      nextErrors.members = "Select at least 2 members to form a payment group";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setStage("review");
  };

  // Trigger PIN Modal
  const handleAuthorizeClick = () => {
    setPinModalOpen(true);
  };

  // On PIN verified success
  const handlePinSuccess = () => {
    const defAmtNum = Number(defaultAmount) || 0;
    const normalizedMembers = members.map((m) => ({
      ...m,
      defaultAmount: splitType === "equal" ? defAmtNum : m.defaultAmount || defAmtNum,
    }));

    let savedGroup: PaymentGroup;

    if (groupToEdit) {
      updateGroup(groupToEdit.id, {
        name: name.trim(),
        description: description.trim(),
        defaultPerMemberAmount: defAmtNum,
        splitType,
        members: normalizedMembers,
      });
      savedGroup = {
        ...groupToEdit,
        name: name.trim(),
        description: description.trim(),
        defaultPerMemberAmount: defAmtNum,
        splitType,
        members: normalizedMembers,
      };
    } else {
      savedGroup = addGroup({
        name: name.trim(),
        description: description.trim(),
        defaultPerMemberAmount: defAmtNum,
        splitType,
        members: normalizedMembers,
      });
    }

    const refId = `GRP-${Math.floor(100000 + Math.random() * 900000)}`;
    setReceiptData({
      referenceId: refId,
      group: savedGroup,
      totalAmount,
      createdAt: new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    });

    onSuccess?.(savedGroup);
    setStage("success");
  };

  // Reset to form
  const handleResetFlow = () => {
    setName("");
    setDescription("");
    setDefaultAmount("200");
    setSplitType("equal");
    setMembers([]);
    setSearch("");
    setErrors({});
    setStage("form");
    setReceiptData(null);
  };

  // Header Back Button logic
  const handleHeaderBack = () => {
    if (stage === "review") {
      setStage("form");
    } else {
      if (onCancel) {
        onCancel();
      } else {
        router.back();
      }
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // STAGE 3: SUCCESS RECEIPT SCREEN
  // ──────────────────────────────────────────────────────────────────────────
  if (stage === "success" && receiptData) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-4 animate-in fade-in duration-200">
        <div className="flex flex-col items-center text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mb-3 shadow-xs">
            <CheckCircle2 size={32} strokeWidth={2.2} />
          </span>
          <h1 className="text-[24px] font-medium text-foreground tracking-[-0.01em]">
            {groupToEdit ? "Group Updated Successfully" : "Group Created Successfully"}
          </h1>
          <p className="mt-1 text-[14px] text-muted-foreground">
            Group “{receiptData.group.name}” is active and ready for group payments.
          </p>
        </div>

        {/* Structured Receipt Card */}
        <div className="flex flex-col divide-y divide-border/70 rounded-2xl border border-border bg-card p-5 text-[13.5px] shadow-xs">
          <div className="flex items-center justify-between py-2.5">
            <span className="text-muted-foreground">Reference ID</span>
            <span className="font-semibold text-foreground tabular-nums tracking-wide">
              {receiptData.referenceId}
            </span>
          </div>

          <div className="flex items-center justify-between py-2.5">
            <span className="text-muted-foreground">Group Name</span>
            <span className="font-medium text-foreground">{receiptData.group.name}</span>
          </div>

          {receiptData.group.description && (
            <div className="flex items-center justify-between py-2.5">
              <span className="text-muted-foreground">Description</span>
              <span className="font-normal text-muted-foreground text-right max-w-[280px] truncate">
                {receiptData.group.description}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between py-2.5">
            <span className="text-muted-foreground">Split Type</span>
            <span className="font-medium text-foreground capitalize">
              {receiptData.group.splitType === "equal" ? "Equal Split" : "Custom Split"}
            </span>
          </div>

          <div className="flex items-center justify-between py-2.5">
            <span className="text-muted-foreground">Total Members</span>
            <span className="font-medium text-foreground tabular-nums">
              {receiptData.group.members.length} members
            </span>
          </div>

          <div className="flex items-center justify-between py-2.5">
            <span className="text-muted-foreground">Amount per Member</span>
            <span className="font-medium text-foreground tabular-nums">
              {receiptData.group.splitType === "equal"
                ? formatMoney(receiptData.group.defaultPerMemberAmount, "GHS", true)
                : "Variable / Custom"}
            </span>
          </div>

          <div className="flex items-center justify-between py-2.5">
            <span className="text-muted-foreground">Total Outflow</span>
            <span className="text-[18px] font-semibold text-foreground tabular-nums">
              {formatMoney(receiptData.totalAmount, "GHS", true)}
            </span>
          </div>

          <div className="flex items-center justify-between py-2.5">
            <span className="text-muted-foreground">Status</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[12px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Active
            </span>
          </div>

          <div className="flex items-center justify-between py-2.5">
            <span className="text-muted-foreground">Date & Time</span>
            <span className="font-normal text-muted-foreground tabular-nums">
              {receiptData.createdAt}
            </span>
          </div>
        </div>

        {/* Member Preview Strip */}
        <div className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-card p-4">
          <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
            Group Members ({receiptData.group.members.length})
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
            {receiptData.group.members.map((m) => (
              <div
                key={m.id || m.destination}
                className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/50"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                    {m.type === "bank" ? <Landmark size={13} /> : <Smartphone size={13} />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-foreground truncate">{m.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{m.destination}</p>
                  </div>
                </div>
                <span className="text-[13px] font-medium text-foreground tabular-nums shrink-0 ml-2">
                  {formatMoney(m.defaultAmount ?? receiptData.group.defaultPerMemberAmount, "GHS", true)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <Button
            variant="outline"
            className="w-full sm:flex-1 h-12 rounded-xl text-[14.5px] font-medium"
            onClick={handleResetFlow}
          >
            Create Another Group
          </Button>

          <Button
            className="w-full sm:flex-1 h-12 rounded-xl text-[14.5px] font-medium bg-[#f2b200] hover:bg-[#e0a500] text-black font-semibold shadow-xs"
            onClick={() => {
              router.push(
                `/payments/send?rail=group&group=${encodeURIComponent(receiptData.group.name)}`
              );
            }}
          >
            Send Payment to Group
            <ArrowRight size={16} className="ml-1.5" />
          </Button>

          <Button
            variant="secondary"
            className="w-full sm:w-auto px-6 h-12 rounded-xl text-[14.5px] font-medium"
            onClick={() => {
              if (onCancel) onCancel();
              else router.push("/beneficiaries");
            }}
          >
            Done
          </Button>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // STAGE 2: DEDICATED REVIEW SCREEN
  // ──────────────────────────────────────────────────────────────────────────
  if (stage === "review") {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-4 animate-in fade-in slide-in-from-top-2 duration-200 ease-out">
        {/* Header */}
        <div className="relative flex items-center justify-between">
          <div className="relative flex items-center">
            <button
              type="button"
              onClick={handleHeaderBack}
              className="absolute -left-11 md:-left-12 top-1/2 -translate-y-1/2 flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
              aria-label="Back to edit group"
            >
              <ChevronLeft size={22} strokeWidth={1.8} />
            </button>
            <h1 className="text-[26px] font-medium leading-[32px] tracking-[-0.02em] text-foreground">
              Review Group Details
            </h1>
          </div>
          <span className="text-[12.5px] font-medium text-muted-foreground bg-muted/60 px-3 py-1 rounded-full">
            Step 2 of 2
          </span>
        </div>

        {/* Card 1: Group Specifications */}
        <div className="flex flex-col w-full rounded-[15.75px] border border-border bg-card overflow-hidden divide-y divide-border/60 shadow-xs">
          <div className="flex items-center justify-between px-5 py-3.5 w-full">
            <span className="text-[13.5px] text-muted-foreground">Group Name</span>
            <span className="text-[14px] font-medium text-foreground">{name.trim()}</span>
          </div>

          {description.trim() && (
            <div className="flex items-center justify-between px-5 py-3.5 w-full">
              <span className="text-[13.5px] text-muted-foreground">Description</span>
              <span className="text-[13.5px] font-normal text-muted-foreground text-right max-w-[320px]">
                {description.trim()}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between px-5 py-3.5 w-full">
            <span className="text-[13.5px] text-muted-foreground">Split Type</span>
            <span className="text-[13.5px] font-medium text-foreground capitalize">
              {splitType === "equal" ? "Equal Split" : "Custom Split"}
            </span>
          </div>

          <div className="flex items-center justify-between px-5 py-3.5 w-full">
            <span className="text-[13.5px] text-muted-foreground">Group Size</span>
            <span className="text-[13.5px] font-normal text-foreground tabular-nums">
              {members.length} members
            </span>
          </div>

          <div className="flex items-center justify-between px-5 py-3.5 w-full">
            <span className="text-[13.5px] text-muted-foreground">Per-Member Amount</span>
            <span className="text-[13.5px] font-normal text-foreground tabular-nums">
              {splitType === "equal"
                ? formatMoney(Number(defaultAmount) || 0, "GHS", true)
                : "Custom breakdown per member"}
            </span>
          </div>

          {/* Prominent Total Row */}
          <div className="flex items-center justify-between px-5 py-4 w-full bg-muted/30 border-t border-border/80">
            <div className="flex flex-col">
              <span className="text-[13.5px] text-foreground font-medium">Estimated Total Outflow</span>
              <span className="text-[11.5px] text-muted-foreground">Total disbursement if paying all members</span>
            </div>
            <span className="text-[26px] font-semibold text-foreground tracking-[-0.03em] tabular-nums">
              {formatMoney(totalAmount, "GHS", true)}
            </span>
          </div>
        </div>

        {/* Card 2: Member Allocation Breakdown */}
        <div className="flex flex-col w-full rounded-[15.75px] border border-border bg-card overflow-hidden shadow-xs">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60 bg-muted/20">
            <span className="text-[13.5px] font-medium text-foreground">
              Selected Members ({members.length})
            </span>
            <span className="text-[12px] text-muted-foreground">Allocated Share</span>
          </div>

          <div className="divide-y divide-border/60 max-h-[300px] overflow-y-auto">
            {members.map((m) => {
              const share = m.defaultAmount ?? Number(defaultAmount) ?? 0;
              return (
                <div
                  key={m.id || m.destination}
                  className="flex items-center justify-between px-5 py-3 hover:bg-muted/10 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                      {m.type === "bank" ? <Landmark size={15} /> : <Smartphone size={15} />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-medium text-foreground truncate">{m.name}</p>
                      <p className="text-[12px] text-muted-foreground truncate">
                        {m.networkOrBank || (m.type === "bank" ? "Bank" : "Mobile Money")} · {m.destination}
                      </p>
                    </div>
                  </div>
                  <span className="text-[14px] font-semibold text-foreground tabular-nums shrink-0 ml-3">
                    {formatMoney(share, "GHS", true)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Security & Authorization Notice */}
        <div className="flex items-center gap-2.5 rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-[12.5px] text-muted-foreground">
          <ShieldCheck size={18} className="text-primary shrink-0" />
          <span>
            Clicking “Authorize & Create” verifies your 4-digit PIN and securely saves your payment group.
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1 h-12 rounded-xl text-[15px] font-medium"
            onClick={() => setStage("form")}
          >
            Back to Edit
          </Button>

          <Button
            type="button"
            className="flex-1 h-12 rounded-xl text-[15px] font-semibold bg-[#f2b200] hover:bg-[#e0a500] text-black shadow-xs active:scale-[0.99] transition-all cursor-pointer"
            onClick={handleAuthorizeClick}
          >
            Authorize & Create
          </Button>
        </div>

        {/* Universal Transaction PIN Modal */}
        <TransactionPinModal
          open={pinModalOpen}
          onOpenChange={setPinModalOpen}
          onSuccess={handlePinSuccess}
          title="Authorise Group Creation"
        />
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // STAGE 1: FORM SCREEN (Figma Node 1380:53689)
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-4 animate-in fade-in duration-200 ease-out">
      {/* Top Header */}
      <div className="relative flex items-center justify-between">
        <div className="relative flex items-center">
          <button
            type="button"
            onClick={handleHeaderBack}
            className="absolute -left-11 md:-left-12 top-1/2 -translate-y-1/2 flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
            aria-label="Back"
          >
            <ChevronLeft size={22} strokeWidth={1.8} />
          </button>
          <h1 className="text-[26px] font-medium leading-[32px] tracking-[-0.02em] text-foreground">
            {groupToEdit ? "Edit Payment Group" : "Create Payment Group"}
          </h1>
        </div>
        <span className="text-[12.5px] font-medium text-muted-foreground bg-muted/60 px-3 py-1 rounded-full">
          Step 1 of 2
        </span>
      </div>

      <div className="flex flex-col gap-6">
        {/* Section 1: Group Information */}
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-primary" />
            <h2 className="text-[15px] font-medium text-foreground">Group Details</h2>
          </div>

          {/* Group Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-foreground">
              Group Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
              }}
              placeholder="e.g. Family Contribution Circle"
              className={cn(
                "h-11 w-full rounded-xl border bg-background px-3.5 text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors",
                errors.name ? "border-destructive focus:border-destructive" : "border-border focus:border-primary"
              )}
            />
            {errors.name && (
              <p className="text-[12px] text-destructive font-medium mt-0.5">{errors.name}</p>
            )}
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-muted-foreground">
              Description <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Monthly family support and household maintenance pool"
              className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-[14px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
            />
          </div>
        </div>

        {/* Section 2: Amount per Person & Split Mechanism (Figma Node 1380:53689) */}
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex flex-col">
              <span className="text-[15px] font-medium text-foreground">Amount per Person</span>
              <span className="text-[12.5px] text-muted-foreground">
                Set how much each member contributes or receives
              </span>
            </div>

            {/* Segmented Control: Equal vs Custom Split */}
            <div className="flex items-center rounded-xl bg-muted/60 p-1 border border-border/50 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setSplitType("equal")}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-all cursor-pointer",
                  splitType === "equal"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Equal Split
              </button>
              <button
                type="button"
                onClick={() => setSplitType("custom")}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-all cursor-pointer",
                  splitType === "custom"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Custom Split
              </button>
            </div>
          </div>

          {/* Hero Big Amount Box matching Figma */}
          <div className="flex flex-col gap-1.5">
            <div
              className={cn(
                "flex h-[74px] items-center justify-between rounded-[14px] border bg-muted/20 px-5 transition-colors focus-within:ring-2 focus-within:ring-primary/20",
                errors.amount ? "border-destructive" : "border-border focus-within:border-primary"
              )}
            >
              <span className="text-[16px] font-medium text-muted-foreground select-none">
                GH₵
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={defaultAmount}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.]/g, "");
                  setDefaultAmount(val);
                  if (errors.amount) setErrors((prev) => ({ ...prev, amount: undefined }));
                }}
                placeholder="0.00"
                className="numorainput tabular-nums w-full bg-transparent text-right text-[32px] font-semibold text-foreground tracking-[-0.02em] placeholder:text-muted-foreground/30 focus:outline-none"
              />
            </div>
            {errors.amount && (
              <p className="text-[12px] text-destructive font-medium mt-0.5">{errors.amount}</p>
            )}
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[12px] text-muted-foreground mr-1">Quick presets:</span>
            {QUICK_AMOUNTS.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => {
                  setDefaultAmount(String(amt));
                  if (errors.amount) setErrors((prev) => ({ ...prev, amount: undefined }));
                }}
                className={cn(
                  "px-3 py-1 rounded-lg text-[12.5px] font-medium border transition-colors cursor-pointer tabular-nums",
                  defaultAmount === String(amt)
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                GH₵{amt}
              </button>
            ))}
          </div>
        </div>

        {/* Section 3: Select Members (Figma Node 1380:53689 2-Column Grid) */}
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-medium text-foreground">Select Members</h2>
              <span className="text-[12px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full tabular-nums">
                {members.length} selected
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowNewBeneficiary((prev) => !prev)}
              className="text-[13px] font-medium text-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus size={15} />
              <span>{showNewBeneficiary ? "Close" : "New beneficiary"}</span>
            </button>
          </div>

          {errors.members && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-[12.5px] font-medium">
              {errors.members}
            </div>
          )}

          {/* Inline Add Beneficiary Form */}
          {showNewBeneficiary && (
            <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 flex flex-col gap-3 animate-in fade-in duration-150">
              <span className="text-[13px] font-medium text-foreground">Add Member Manually</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="h-10 rounded-lg border border-border bg-background px-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                />
                <input
                  type="text"
                  placeholder={customType === "wallet" ? "Mobile Number (e.g. 0244123456)" : "Account Number"}
                  value={customDest}
                  onChange={(e) => setCustomDest(e.target.value)}
                  className="numorainput tabular-nums h-10 rounded-lg border border-border bg-background px-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomType("wallet");
                      setCustomBankOrNetwork("MTN Mobile Money");
                    }}
                    className={cn(
                      "px-3 py-1 rounded-md text-[12px] font-medium border cursor-pointer",
                      customType === "wallet"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground"
                    )}
                  >
                    Mobile Wallet
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomType("bank");
                      setCustomBankOrNetwork("GCB Bank");
                    }}
                    className={cn(
                      "px-3 py-1 rounded-md text-[12px] font-medium border cursor-pointer",
                      customType === "bank"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground"
                    )}
                  >
                    Bank Account
                  </button>
                </div>

                <Button
                  size="sm"
                  onClick={handleAddNewBeneficiary}
                  disabled={!customName.trim() || !customDest.trim()}
                  className="h-9 px-4 text-[12.5px]"
                >
                  Add to Group
                </Button>
              </div>
            </div>
          )}

          {/* Search Input */}
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search beneficiaries by name or number..."
              className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-4 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>

          {/* 2-Column Beneficiary Grid Matching Figma */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
            {filteredContacts.map((contact) => {
              const isSelected = members.some((m) =>
                m.id && contact.id ? m.id === contact.id : m.destination === contact.destination
              );
              const currentMemberObj = members.find((m) =>
                m.id && contact.id ? m.id === contact.id : m.destination === contact.destination
              );

              return (
                <div
                  key={contact.id || contact.destination}
                  onClick={() => toggleMember(contact)}
                  className={cn(
                    "group relative flex flex-col p-3 rounded-xl border transition-all cursor-pointer select-none",
                    isSelected
                      ? "border-[#f2b200] bg-[#f2b200]/5 dark:bg-[#f2b200]/10"
                      : "border-border hover:border-border/80 hover:bg-muted/30 bg-card"
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          "flex size-9 items-center justify-center rounded-full transition-colors shrink-0",
                          isSelected
                            ? "bg-[#f2b200]/20 text-[#a37900] dark:text-[#f2b200]"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {contact.type === "bank" ? (
                          <Landmark size={16} />
                        ) : (
                          <Smartphone size={16} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13.5px] font-medium text-foreground truncate">
                          {contact.name}
                        </p>
                        <p className="text-[11.5px] text-muted-foreground truncate">
                          {contact.networkOrBank || (contact.type === "bank" ? "Bank" : "Mobile Wallet")} · {contact.destination}
                        </p>
                      </div>
                    </div>

                    {/* Circular Amber Indicator (Figma Node 1380:53689) */}
                    <div
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full border transition-all",
                        isSelected
                          ? "border-[#f2b200] bg-[#f2b200] text-black"
                          : "border-muted-foreground/40 bg-transparent group-hover:border-foreground/60"
                      )}
                    >
                      {isSelected && <Check size={12} strokeWidth={3} />}
                    </div>
                  </div>

                  {/* Custom Split Individual Amount Override */}
                  {isSelected && splitType === "custom" && (
                    <div
                      className="mt-3 pt-2.5 border-t border-[#f2b200]/30 flex items-center justify-between gap-2 animate-in fade-in duration-150"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-[11.5px] font-medium text-muted-foreground">Member Share:</span>
                      <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-2 py-1">
                        <span className="text-[11.5px] text-muted-foreground font-medium">GH₵</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={currentMemberObj?.defaultAmount ?? defaultAmount}
                          onChange={(e) =>
                            updateMemberAmount(contact.id || contact.destination, e.target.value)
                          }
                          className="numorainput tabular-nums w-20 text-right text-[12.5px] font-semibold text-foreground focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredContacts.length === 0 && (
              <div className="col-span-full py-8 text-center text-muted-foreground text-[13px]">
                No beneficiaries found matching “{search}”.
              </div>
            )}
          </div>
        </div>

        {/* Outflow Summary Bar & Proceed Button */}
        <div className="flex flex-col gap-3 pt-2">
          <div className="flex items-center justify-between rounded-xl bg-muted/40 border border-border/80 px-5 py-3.5">
            <div className="flex flex-col">
              <span className="text-[12px] text-muted-foreground uppercase tracking-wider font-medium">
                Total Group Outflow
              </span>
              <span className="text-[13px] text-foreground font-normal">
                {members.length} {members.length === 1 ? "member" : "members"} selected
              </span>
            </div>
            <span className="text-[22px] font-semibold text-foreground tabular-nums tracking-tight">
              {formatMoney(totalAmount, "GHS", true)}
            </span>
          </div>

          <Button
            type="button"
            className="w-full h-13 rounded-2xl text-[16px] font-medium bg-[#f2b200] hover:bg-[#e0a500] text-black font-semibold drop-shadow-sm active:scale-[0.98] transition-all cursor-pointer"
            onClick={handleProceedToReview}
          >
            Continue to Review
            <ArrowRight size={18} className="ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
