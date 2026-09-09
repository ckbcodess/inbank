"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Search, Check, Plus } from "lucide-react";
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

function getInitials(name: string): string {
  const clean = name.trim();
  if (!clean) return "??";
  const parts = clean.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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
  const [defaultAmount, setDefaultAmount] = useState("200");
  const [splitType, setSplitType] = useState<"equal" | "custom">("equal");
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [search, setSearch] = useState("");

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
      setDefaultAmount(String(groupToEdit.defaultPerMemberAmount || 200));
      setSplitType(groupToEdit.splitType);
      setMembers(groupToEdit.members);
    } else {
      setName("");
      setDefaultAmount("200");
      setSplitType("equal");
      setMembers([]);
    }
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

  const updateMemberAmount = (identifier: string, amtStr: string) => {
    const val = Number(amtStr.replace(/[^0-9.]/g, "")) || 0;
    setMembers((prev) =>
      prev.map((m) => ((m.id === identifier || m.destination === identifier) ? { ...m, defaultAmount: val } : m))
    );
  };

  // 1-Tap Add Unlisted Recipient from Search
  const addUnlistedMember = () => {
    const q = search.trim();
    if (!q) return;
    const isPhoneOrNumber = /^[0-9+\s()-]+$/.test(q);
    const amt = Number(defaultAmount) || 0;
    const newMember: GroupMember = {
      id: `m-custom-${Date.now()}`,
      name: isPhoneOrNumber ? `Contact ${q}` : q,
      destination: isPhoneOrNumber ? q.replace(/\s+/g, "") : "Direct Transfer",
      type: "wallet",
      networkOrBank: isPhoneOrNumber ? "Mobile Wallet" : "Custom",
      defaultAmount: amt,
    };
    setMembers((prev) => [...prev, newMember]);
    setSearch("");
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

  const hasDirectMatch = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return availableContacts.some(
      (c) => c.name.toLowerCase() === q || c.destination.toLowerCase() === q
    );
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
        description: groupToEdit.description || "",
        defaultPerMemberAmount: defAmtNum,
        splitType,
        members: normalizedMembers,
      });
      onSuccess?.({
        ...groupToEdit,
        name: name.trim(),
        description: groupToEdit.description || "",
        defaultPerMemberAmount: defAmtNum,
        splitType,
        members: normalizedMembers,
      });
    } else {
      const created = addGroup({
        name: name.trim(),
        description: "",
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
        className="sm:max-w-[540px] p-0 gap-0 overflow-hidden rounded-[24px] border border-border/50 bg-card shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)]"
        showCloseButton={false}
      >
        {/* Apple-style Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border/40">
          <div>
            <DialogTitle className="text-[17px] font-semibold text-foreground tracking-[-0.01em]">
              {groupToEdit ? "Edit Group" : "New Group"}
            </DialogTitle>
            <p className="text-[12.5px] text-muted-foreground mt-0.5">
              Send money to multiple people at once.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex size-7.5 items-center justify-center rounded-full bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted active:scale-[0.95] transition-transform duration-100 ease-out cursor-pointer"
            aria-label="Close"
          >
            <X size={15} strokeWidth={2} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex flex-col gap-5 px-6 py-5 max-h-[72vh] overflow-y-auto">
          {/* Apple Inset Group 1: Group Details */}
          <div className="rounded-[16px] bg-muted/30 border border-border/40 divide-y divide-border/30 overflow-hidden">
            {/* Row 1: Name */}
            <div className="flex items-center justify-between px-4 py-3 gap-3">
              <span className="text-[13px] font-medium text-foreground whitespace-nowrap">
                Group Name
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Family, Lunch, Rent"
                autoFocus
                className="w-full max-w-[260px] text-right text-[13.5px] font-medium bg-transparent text-foreground placeholder:text-muted-foreground/45 outline-none"
              />
            </div>

            {/* Row 2: Default Amount */}
            <div className="flex items-center justify-between px-4 py-3 gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium text-foreground">
                  Amount per Person
                </span>
                <button
                  type="button"
                  onClick={() => setSplitType(splitType === "equal" ? "custom" : "equal")}
                  className="text-[11px] font-medium text-primary hover:underline cursor-pointer active:scale-[0.96] transition-transform"
                >
                  {splitType === "equal" ? "Custom splits" : "Equal split"}
                </button>
              </div>
              <div className="flex items-center gap-1.5 justify-end">
                <span className="text-[12px] font-semibold text-muted-foreground select-none">
                  GHS
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={defaultAmount}
                  onChange={(e) => setDefaultAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder="200.00"
                  className="numorainput w-24 text-right text-[13.5px] font-semibold bg-transparent text-foreground placeholder:text-muted-foreground/45 outline-none tabular-nums"
                />
              </div>
            </div>
          </div>

          {/* Members Section */}
          <div className="flex flex-col gap-2.5">
            {/* Section Bar */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-foreground tracking-[-0.01em]">
                  Members
                </span>
                {members.length > 0 && (
                  <span className="text-[11.5px] font-medium text-muted-foreground tabular-nums">
                    ({members.length})
                  </span>
                )}
              </div>
              {members.length > 0 && (
                <button
                  type="button"
                  onClick={() => setMembers([])}
                  className="text-[11.5px] font-medium text-muted-foreground hover:text-destructive active:scale-[0.96] transition-transform cursor-pointer"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Apple Search Input */}
            <div className="relative w-full">
              <Search
                size={14}
                strokeWidth={1.75}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search or type a number to add..."
                className="h-9.5 w-full rounded-[12px] bg-muted/30 border border-border/40 pl-9 pr-8 text-[12.5px] text-foreground placeholder:text-muted-foreground/50 outline-none focus:bg-background focus:border-border/80 transition-colors"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground active:scale-[0.96] transition-transform"
                >
                  <X size={13} strokeWidth={2} />
                </button>
              )}
            </div>

            {/* Selected Member Tokens (Apple Style) */}
            {members.length > 0 && (
              <div className="flex flex-wrap gap-1.5 py-1">
                {members.map((m) => (
                  <span
                    key={m.id || m.destination}
                    className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 border border-border/40 pl-2.5 pr-1.5 py-1 text-[11.5px] font-medium text-foreground active:scale-[0.97] transition-transform animate-in fade-in zoom-in-95 duration-100"
                  >
                    <span className="truncate max-w-[120px]">{m.name}</span>
                    {splitType === "custom" && (
                      <span className="text-[10.5px] text-muted-foreground tabular-nums font-mono">
                        GHS {m.defaultAmount ?? defaultAmount}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeMember(m.id || m.destination)}
                      className="size-4 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-background/80 active:scale-[0.92] transition-transform cursor-pointer"
                      aria-label={`Remove ${m.name}`}
                    >
                      <X size={10} strokeWidth={2.5} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Clean Contact Rows (Apple Inset Style) */}
            <div className="rounded-[16px] border border-border/40 bg-muted/20 divide-y divide-border/25 overflow-hidden max-h-[250px] overflow-y-auto">
              {/* If user typed an unlisted contact/number, offer 1-tap instant add */}
              {search.trim().length > 0 && !hasDirectMatch && (
                <div
                  onClick={addUnlistedMember}
                  className="flex items-center justify-between px-3.5 py-2.5 hover:bg-muted/40 cursor-pointer active:scale-[0.99] transition-transform duration-75"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                      <Plus size={15} strokeWidth={2.2} />
                    </span>
                    <div>
                      <div className="text-[12.5px] font-medium text-foreground">
                        Add &ldquo;{search.trim()}&rdquo;
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Tap to add as recipient
                      </div>
                    </div>
                  </div>
                  <span className="text-[11.5px] font-semibold text-primary">
                    Add
                  </span>
                </div>
              )}

              {/* Beneficiary Contacts */}
              {filteredContacts.map((c) => {
                const isSelected = members.some((m) => (m.id && c.id ? m.id === c.id : m.destination === c.destination));
                const selectedMember = members.find((m) => (m.id && c.id ? m.id === c.id : m.destination === c.destination));

                return (
                  <div
                    key={c.id || c.destination}
                    onClick={() => toggleMember(c)}
                    className={cn(
                      "flex items-center justify-between px-3.5 py-2.5 cursor-pointer transition-colors select-none active:bg-muted/50",
                      isSelected && "bg-primary/[0.04]"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Apple Initials Avatar */}
                      <span className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-full text-[11.5px] font-medium transition-colors",
                        isSelected
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "bg-muted/70 text-muted-foreground"
                      )}>
                        {getInitials(c.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[12.5px] font-medium text-foreground truncate">
                          {c.name}
                        </div>
                        <div className="text-[11px] text-muted-foreground tabular-nums truncate">
                          {c.networkOrBank} · {c.destination}
                        </div>
                      </div>
                    </div>

                    {/* Right Control */}
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
                          className="numorainput h-6.5 w-full rounded-[6px] border border-border/70 bg-background px-2 text-right text-[11.5px] font-medium tabular-nums outline-none focus:border-ring"
                        />
                      </div>
                    ) : (
                      <span className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full border transition-all duration-100",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border/60 hover:border-border"
                      )}>
                        {isSelected && <Check size={11} strokeWidth={2.5} />}
                      </span>
                    )}
                  </div>
                );
              })}

              {filteredContacts.length === 0 && search.trim().length === 0 && (
                <div className="py-10 text-center text-[12px] text-muted-foreground">
                  No contacts found
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Apple-style Bottom Action Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border/40 bg-muted/15">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[12px] text-muted-foreground">Total:</span>
            <span className="text-[15px] font-semibold text-foreground tabular-nums">
              {formatMoney(totalAmount, "GHS", true)}
            </span>
            <span className="text-[11.5px] text-muted-foreground tabular-nums">
              · {members.length} {members.length === 1 ? "person" : "people"}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-9 px-3.5 text-[12.5px] font-medium rounded-full active:scale-[0.96] transition-transform duration-100"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!canSave}
              className="h-9 px-5 text-[12.5px] font-medium rounded-full active:scale-[0.96] transition-transform duration-100 shadow-xs"
            >
              {groupToEdit ? "Save" : "Create"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


