"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Search, Check, CheckCircle2, Users, Bell, Receipt } from "lucide-react";
import { useGroupsStore, type PaymentGroup, type GroupMember } from "@/lib/groups-store";
import { useBeneficiariesStore } from "@/lib/beneficiaries-store";
import { formatMoney, recordTransaction } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { ProceedButton } from "@/components/payments/flows/shared";
import TransactionPinModal from "@/components/payments/TransactionPinModal";
import { PaymentSuccessScreen } from "@/components/payments/PaymentSuccessScreen";
import { cn } from "@/lib/utils";

interface CreateGroupFlowProps {
  groupToEdit?: PaymentGroup | null;
  onCancel?: () => void;
  onDone?: (group: PaymentGroup) => void;
  onSuccess?: (group: PaymentGroup) => void;
}

type FlowStage = "form" | "review" | "success";

const QUICK_AMOUNTS = [50, 100, 200, 500, 1000];

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

export default function CreateGroupFlow({
  groupToEdit,
  onCancel,
  onDone,
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

  // Inline "+ New Beneficiary" toggle
  const [showNewBeneficiary, setShowNewBeneficiary] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customDest, setCustomDest] = useState("");
  const [customType, setCustomType] = useState<"wallet" | "bank">("wallet");

  // PIN Modal & Receipt State
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<{
    referenceId: string;
    group: PaymentGroup;
    totalAmount: number;
    createdAt: string;
  } | null>(null);

  // Map beneficiaries to contacts
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
      networkOrBank: customType === "wallet" ? "Mobile Wallet" : "GCB Bank",
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
    recordTransaction({
      id: refId,
      reference: refId,
      date: new Date().toISOString().slice(0, 10),
      valueDate: new Date().toISOString().slice(0, 10),
      description: `Group Creation — ${savedGroup.name}`,
      counterparty: savedGroup.name,
      counterpartyAccount: `${savedGroup.members.length} members`,
      accountId: "acc-ret-001",
      currency: "GHS",
      amount: totalAmount,
      fee: 0,
      direction: "debit",
      kind: "bulk",
      state: "completed",
      paymentMethod: "gip",
      channel: "Internet Banking",
      profileKind: "RETAIL",
      category: "Bills",
    });

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
  // STAGE 3: SUCCESS RECEIPT SCREEN (1:1 Figma Node 1367:33535)
  // ──────────────────────────────────────────────────────────────────────────
  if (stage === "success" && receiptData) {
    const receiptRows: Array<[string, React.ReactNode]> = [
      ["Reference ID", receiptData.referenceId],
      ["Group Name", receiptData.group.name],
      ...(receiptData.group.description ? [["Description", receiptData.group.description] as [string, React.ReactNode]] : []),
      ["Split Type", receiptData.group.splitType === "equal" ? "Equal Split" : "Custom Split"],
      ["Total Members", `${receiptData.group.members.length} members`],
      [
        "Amount per Member",
        receiptData.group.splitType === "equal"
          ? formatMoney(receiptData.group.defaultPerMemberAmount, "GHS", true)
          : "Custom per member",
      ],
      ["Total Outflow", formatMoney(receiptData.totalAmount, "GHS", true)],
      ["Status", "Active"],
      ["Date & Time", receiptData.createdAt],
    ];

    return (
      <PaymentSuccessScreen
        title={groupToEdit ? "Group updated" : "Group created"}
        message={`“${receiptData.group.name}” is all set up with ${receiptData.group.members.length} members and ready for group payments.`}
        transactionId={receiptData.referenceId}
        receiptRows={receiptRows}
        onViewReceipt={() => router.push(`/transactions/${receiptData.referenceId}`)}
        onSecondaryAction={handleResetFlow}
        secondaryActionLabel="Create another"
        onPrimaryAction={() => {
          if (onDone) onDone(receiptData.group);
          else if (onSuccess) onSuccess(receiptData.group);
          else if (onCancel) onCancel();
          else router.push("/beneficiaries");
        }}
        primaryActionLabel="Back to Overview"
        showSaveBeneficiary={true}
        saveBeneficiaryLabel="Save as favourite group?"
        initialSaveBeneficiary={true}
        customActionCards={[
          {
            id: "feedback",
            label: "Share Feedback",
            icon: Bell,
          },
          {
            id: "pay",
            label: "Pay Group",
            icon: Users,
            onClick: () => {
              router.push(
                `/payments/send?rail=group&group=${encodeURIComponent(receiptData.group.name)}`
              );
            },
          },
          {
            id: "receipt",
            label: "View Receipt",
            icon: Receipt,
            onClick: () => {
              router.push(`/transactions/${receiptData.referenceId}`);
            },
          },
        ]}
      />
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // STAGE 2: DEDICATED REVIEW SCREEN (Normalized to PaymentFlow.tsx)
  // ──────────────────────────────────────────────────────────────────────────
  if (stage === "review") {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-4 animate-in fade-in slide-in-from-top-2 duration-200 ease-out">
        {/* Header without step indicator */}
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

        {/* Card 1: Group Specifications */}
        <div className="flex flex-col w-full rounded-[15.75px] border border-border bg-card overflow-hidden divide-y divide-border/60 shadow-xs">
          <div className="flex items-center justify-between px-4 py-3 w-full">
            <span className="text-[13.5px] text-muted-foreground">Group Name</span>
            <span className="text-[13.5px] font-medium text-foreground">{name.trim()}</span>
          </div>

          {description.trim() && (
            <div className="flex items-center justify-between px-4 py-3 w-full">
              <span className="text-[13.5px] text-muted-foreground">Description</span>
              <span className="text-[13.5px] font-normal text-muted-foreground text-right max-w-[280px] truncate">
                {description.trim()}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between px-4 py-3 w-full">
            <span className="text-[13.5px] text-muted-foreground">Split Type</span>
            <span className="text-[13.5px] font-medium text-foreground capitalize">
              {splitType === "equal" ? "Equal Split" : "Custom Split"}
            </span>
          </div>

          <div className="flex items-center justify-between px-4 py-3 w-full">
            <span className="text-[13.5px] text-muted-foreground">Total Members</span>
            <span className="text-[13.5px] font-normal text-foreground tabular">
              {members.length} members
            </span>
          </div>

          <div className="flex items-center justify-between px-4 py-3 w-full">
            <span className="text-[13.5px] text-muted-foreground">Amount per Member</span>
            <span className="text-[13.5px] font-normal text-foreground tabular">
              {splitType === "equal"
                ? formatMoney(Number(defaultAmount) || 0, "GHS", true)
                : "Custom per member"}
            </span>
          </div>

          {/* Prominent Total Row matching PaymentFlow.tsx line 3246 */}
          <div className="flex items-center justify-between px-4 py-3.5 w-full bg-muted/40 dark:bg-muted/20 border-t border-border/70">
            <span className="text-[13.5px] text-foreground font-normal">Total Estimated Outflow</span>
            <span className="text-[26px] sm:text-[28px] font-semibold text-foreground tracking-[-0.03em] tabular">
              {formatMoney(totalAmount, "GHS", true)}
            </span>
          </div>
        </div>

        {/* Card 2: Member Allocation Breakdown */}
        <div className="flex flex-col w-full rounded-[15.75px] border border-border bg-card overflow-hidden shadow-xs">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/30">
            <span className="text-[13.5px] font-medium text-foreground">
              Group Members ({members.length})
            </span>
            <span className="text-[12px] text-muted-foreground">Share</span>
          </div>

          <div className="custom-scrollbar divide-y divide-border/60 max-h-[280px] overflow-y-auto">
            {members.map((m) => {
              const share = m.defaultAmount ?? Number(defaultAmount) ?? 0;
              return (
                <div
                  key={m.id || m.destination}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/20 transition-colors text-[13.5px]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex size-7 items-center justify-center rounded-full bg-muted font-medium text-[11px] text-foreground shrink-0">
                      {initials(m.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{m.name}</p>
                      <p className="text-[11.5px] text-muted-foreground truncate">
                        {m.networkOrBank || (m.type === "bank" ? "Bank" : "Wallet")} · {m.destination}
                      </p>
                    </div>
                  </div>
                  <span className="font-semibold text-foreground tabular shrink-0 ml-3">
                    {formatMoney(share, "GHS", true)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Plain Clean Disclaimer matching PaymentFlow.tsx line 3256 */}
        <p className="text-[12px] text-muted-foreground text-center px-4 -mt-1">
          Clicking “Authorize & Create” authorizes GCB Bank PLC to create the payment group.
        </p>

        {/* Action Buttons matching PaymentFlow.tsx line 3263 */}
        <div className="flex gap-4 items-center w-full pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStage("form")}
            className="flex-1 h-11 rounded-lg text-[14px] font-medium border-border"
          >
            Back
          </Button>

          <Button
            type="button"
            onClick={handleAuthorizeClick}
            className="flex-1 h-11 rounded-lg text-[14px] font-medium bg-primary text-primary-foreground drop-shadow-sm active:scale-[0.98] cursor-pointer"
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
  // STAGE 1: FORM SCREEN (Normalized to PaymentFlow.tsx)
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-4 animate-in fade-in duration-200 ease-out">
      {/* Top Header without step indicator */}
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

      <div className="flex flex-col gap-6">
        {/* Field 1: Group Name */}
        <div className="flex flex-col gap-2">
          <label className="text-[14px] font-medium text-foreground">Group Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
            }}
            placeholder="e.g. Family Contribution Circle"
            className={cn(
              "h-13 w-full rounded-2xl border bg-card px-4 text-[15px] text-foreground placeholder:text-muted-foreground/60 outline-none transition-all",
              errors.name
                ? "border-destructive/70 focus:border-destructive focus:ring-1 focus:ring-destructive/30"
                : "border-border/80 focus:border-ring focus:ring-1 focus:ring-ring/30"
            )}
          />
          {errors.name && (
            <p className="text-[12px] text-destructive font-medium">{errors.name}</p>
          )}
        </div>

        {/* Field 2: Description */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-[14px] font-medium text-foreground">Description</label>
            <span className="text-[12px] text-muted-foreground">Optional</span>
          </div>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Monthly family support pool"
            className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all"
          />
        </div>

        {/* Field 3: Amount per Person & Split Selection */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-[14px] font-medium text-foreground">Amount per Person</label>
            <div className="flex items-center rounded-xl bg-muted/60 p-0.5 border border-border/50 text-[12px]">
              <button
                type="button"
                onClick={() => setSplitType("equal")}
                className={cn(
                  "px-3 py-1 rounded-[10px] font-medium transition-all cursor-pointer",
                  splitType === "equal"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Equal split
              </button>
              <button
                type="button"
                onClick={() => setSplitType("custom")}
                className={cn(
                  "px-3 py-1 rounded-[10px] font-medium transition-all cursor-pointer",
                  splitType === "custom"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Custom split
              </button>
            </div>
          </div>

          {/* Amount Box matching PaymentFlow AmountInput */}
          <div
            className={cn(
              "relative flex h-[68px] min-h-[68px] w-full items-center justify-center rounded-2xl border bg-card px-4 transition-all",
              errors.amount
                ? "border-destructive/70 focus-within:border-destructive focus-within:ring-1 focus-within:ring-destructive/30"
                : "border-border/80 focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/30"
            )}
          >
            <div className="inline-flex items-center justify-center gap-2.5">
              <span className="text-[17px] font-medium select-none text-muted-foreground">
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
                className="numorainput tabular-nums bg-transparent text-[32px] sm:text-[36px] font-semibold text-foreground tracking-[-0.02em] outline-none text-center max-w-[260px] placeholder:text-muted-foreground/30"
              />
            </div>
          </div>
          {errors.amount && (
            <p className="text-[12px] text-destructive font-medium">{errors.amount}</p>
          )}

          {/* Quick Presets */}
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            {QUICK_AMOUNTS.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => {
                  setDefaultAmount(String(amt));
                  if (errors.amount) setErrors((prev) => ({ ...prev, amount: undefined }));
                }}
                className={cn(
                  "h-8 px-3 rounded-xl text-[12.5px] font-medium border transition-colors cursor-pointer tabular",
                  defaultAmount === String(amt)
                    ? "border-primary bg-primary/10 text-primary font-semibold"
                    : "border-border/80 bg-card text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )}
              >
                GH₵{amt}
              </button>
            ))}
          </div>
        </div>

        {/* Field 4: Select Members */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-[14px] font-medium text-foreground">Select Members</label>
              <span className="text-[12px] text-muted-foreground font-normal tabular">
                ({members.length} selected)
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowNewBeneficiary((prev) => !prev)}
              className="text-[13px] font-medium text-foreground hover:underline cursor-pointer"
            >
              {showNewBeneficiary ? "Close" : "+ New beneficiary"}
            </button>
          </div>

          {errors.members && (
            <p className="text-[12px] text-destructive font-medium">{errors.members}</p>
          )}

          {/* Inline Add Beneficiary Form */}
          {showNewBeneficiary && (
            <div className="p-4 rounded-2xl border border-border/80 bg-muted/20 flex flex-col gap-3 animate-in fade-in duration-150">
              <span className="text-[13px] font-medium text-foreground">Add New Beneficiary</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="h-11 rounded-xl border border-border/80 bg-card px-3.5 text-[13.5px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring"
                />
                <input
                  type="text"
                  placeholder={customType === "wallet" ? "Mobile Number" : "Account Number"}
                  value={customDest}
                  onChange={(e) => setCustomDest(e.target.value)}
                  className="numorainput tabular-nums h-11 rounded-xl border border-border/80 bg-card px-3.5 text-[13.5px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring"
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="flex items-center rounded-xl bg-muted/60 p-0.5 border border-border/50 text-[12px]">
                  <button
                    type="button"
                    onClick={() => setCustomType("wallet")}
                    className={cn(
                      "px-3 py-1 rounded-[10px] font-medium cursor-pointer transition-colors",
                      customType === "wallet" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"
                    )}
                  >
                    Mobile Wallet
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomType("bank")}
                    className={cn(
                      "px-3 py-1 rounded-[10px] font-medium cursor-pointer transition-colors",
                      customType === "bank" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"
                    )}
                  >
                    Bank Account
                  </button>
                </div>

                <Button
                  size="sm"
                  onClick={handleAddNewBeneficiary}
                  disabled={!customName.trim() || !customDest.trim()}
                  className="h-9 px-4 text-[13px] font-medium"
                >
                  Add to Group
                </Button>
              </div>
            </div>
          )}

          {/* Search Input */}
          <div className="relative w-full">
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search beneficiaries..."
              className="h-12 w-full rounded-2xl border border-border/80 bg-card pl-11 pr-4 text-[14px] text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all"
            />
          </div>

          {/* Beneficiary Grid: 2 Columns */}
          <div
            className="custom-scrollbar grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[340px] overflow-y-auto pr-1"
            style={{ scrollbarGutter: "stable" }}
          >
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
                    "group relative flex flex-col p-3 rounded-2xl border transition-all cursor-pointer select-none",
                    isSelected
                      ? "border-primary/80 bg-primary/5"
                      : "border-border/80 hover:border-border hover:bg-muted/20 bg-card"
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted font-medium text-[12px] text-foreground">
                        {initials(contact.name)}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[13.5px] font-medium text-foreground truncate">
                          {contact.name}
                        </p>
                        <p className="text-[11.5px] text-muted-foreground truncate tabular">
                          {contact.networkOrBank} · {contact.destination}
                        </p>
                      </div>
                    </div>

                    {/* Circular Selection Checkmark */}
                    <div
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full border transition-all",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/40 bg-transparent group-hover:border-foreground/60"
                      )}
                    >
                      {isSelected && <Check size={12} strokeWidth={2.5} />}
                    </div>
                  </div>

                  {/* Custom Split Individual Amount Override */}
                  {isSelected && splitType === "custom" && (
                    <div
                      className="mt-2.5 pt-2 border-t border-border/60 flex items-center justify-between gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-[11.5px] text-muted-foreground">Amount:</span>
                      <div className="flex items-center gap-1 bg-card border border-border/80 rounded-lg px-2 py-0.5">
                        <span className="text-[11.5px] text-muted-foreground">GH₵</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={currentMemberObj?.defaultAmount ?? defaultAmount}
                          onChange={(e) =>
                            updateMemberAmount(contact.id || contact.destination, e.target.value)
                          }
                          className="numorainput tabular-nums w-20 text-right text-[12.5px] font-medium text-foreground focus:outline-none bg-transparent"
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

        {/* Outflow Summary info */}
        {members.length > 0 && (
          <div className="flex items-center justify-between px-2 text-[13.5px] text-muted-foreground">
            <span>Total Group Debit ({members.length} members):</span>
            <span className="font-semibold text-foreground tabular">
              {formatMoney(totalAmount, "GHS", true)}
            </span>
          </div>
        )}

        {/* Proceed CTA */}
        <ProceedButton
          disabled={false}
          onClick={handleProceedToReview}
          label="Continue to Review"
        />
      </div>
    </div>
  );
}
