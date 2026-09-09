"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, Users, Search, Smartphone, Landmark, X, ChevronDown, ChevronUp, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useGroupsStore, type PaymentGroup, type GroupMember } from "@/lib/groups-store";
import { useBeneficiariesStore } from "@/lib/beneficiaries-store";
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

  // Progressive disclosure states
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customDest, setCustomDest] = useState("");
  const [customType, setCustomType] = useState<"wallet" | "bank">("wallet");
  const [customProvider, setCustomProvider] = useState("MTN Mobile Money");
  const [search, setSearch] = useState("");

  // Populate preset contacts from real beneficiaries store (people and numbers, excluding billers)
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
    setShowManualAdd(false);
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

  const addManualMember = () => {
    if (!customName.trim() || !customDest.trim()) return;
    const amt = Number(defaultAmount) || 0;
    const newM: GroupMember = {
      id: `m-manual-${Date.now()}`,
      name: customName.trim(),
      destination: customDest.trim(),
      type: customType,
      networkOrBank: customProvider,
      defaultAmount: amt,
    };
    setMembers((prev) => [...prev, newM]);
    setCustomName("");
    setCustomDest("");
    setShowManualAdd(false);
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
        className="sm:max-w-[820px] p-0 overflow-hidden rounded-2xl border-none bg-card shadow-2xl"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-muted/10">
          <div>
            <DialogTitle className="text-[17px] font-semibold text-foreground tracking-[-0.01em]">
              {groupToEdit ? "Edit Payment Group" : "Create Payment Group"}
            </DialogTitle>
            <p className="text-[12.5px] text-muted-foreground mt-0.5">
              Assemble multiple recipients for 1-click batch payouts and Susu contributions.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex size-7.5 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={15} strokeWidth={1.8} />
          </button>
        </div>

        {/* 2-Column Split Workspace */}
        <div className="grid grid-cols-1 md:grid-cols-12 min-h-[460px] max-h-[72vh] overflow-hidden">
          {/* Left Column: Contact Directory (Col 1-5) */}
          <div className="md:col-span-5 flex flex-col border-b md:border-b-0 md:border-r border-border/60 bg-muted/10 overflow-hidden">
            {/* Search and Header */}
            <div className="p-3.5 border-b border-border/60 flex flex-col gap-2.5 bg-card/40">
              <div className="flex items-center justify-between">
                <span className="text-[11.5px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Select Recipients ({availableContacts.length})
                </span>
                <button
                  type="button"
                  onClick={() => setShowManualAdd(!showManualAdd)}
                  className="text-[11.5px] text-foreground font-medium hover:underline cursor-pointer"
                >
                  {showManualAdd ? "Cancel" : "+ New number"}
                </button>
              </div>

              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name or account..."
                  className="h-9 w-full rounded-xl border border-border/70 bg-background pl-8.5 pr-3 text-[12.5px] text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-ring transition-colors"
                />
              </div>
            </div>

            {/* Manual member form (progressive disclosure) */}
            {showManualAdd && (
              <div className="p-3 border-b border-border/60 bg-background flex flex-col gap-2 animate-in fade-in duration-150">
                <div className="text-[11.5px] font-medium text-foreground">Add recipient not in contacts</div>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Recipient full name"
                  className="h-8.5 rounded-lg border border-border/80 bg-background px-3 text-[12.5px] outline-none focus:border-ring"
                />
                <input
                  type="text"
                  inputMode="numeric"
                  value={customDest}
                  onChange={(e) => setCustomDest(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="Phone number or bank account"
                  className="numorainput h-8.5 rounded-lg border border-border/80 bg-background px-3 text-[12.5px] outline-none focus:border-ring tabular"
                />
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center rounded-lg bg-muted p-0.5 border border-border/50">
                    <button
                      type="button"
                      onClick={() => {
                        setCustomType("wallet");
                        setCustomProvider("MTN Mobile Money");
                      }}
                      className={cn(
                        "px-2.5 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer",
                        customType === "wallet"
                          ? "bg-background border-border text-foreground shadow-xs"
                          : "text-muted-foreground"
                      )}
                    >
                      Wallet
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomType("bank");
                        setCustomProvider("GCB Bank");
                      }}
                      className={cn(
                        "px-2.5 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer",
                        customType === "bank"
                          ? "bg-background border-border text-foreground shadow-xs"
                          : "text-muted-foreground"
                      )}
                    >
                      Bank
                    </button>
                  </div>
                  <Button
                    size="xs"
                    onClick={addManualMember}
                    disabled={!customName.trim() || !customDest.trim()}
                    className="h-7 text-[11.5px] px-2.5 font-medium"
                  >
                    Add
                  </Button>
                </div>
              </div>
            )}

            {/* Scrollable Recipient Directory */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredContacts.map((c, idx) => {
                const isSelected = members.some((m) => (m.id && c.id ? m.id === c.id : m.destination === c.destination));
                return (
                  <div
                    key={c.id || c.destination || `cand-${idx}`}
                    onClick={() => toggleMember(c)}
                    className={cn(
                      "flex items-center justify-between gap-2.5 rounded-xl px-3 py-2.5 transition-all cursor-pointer select-none",
                      isSelected
                        ? "bg-foreground/5 dark:bg-muted/70 text-foreground font-medium"
                        : "hover:bg-muted/50 text-foreground/80 hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={cn(
                        "flex size-7.5 shrink-0 items-center justify-center rounded-lg transition-colors",
                        isSelected ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
                      )}>
                        {c.type === "wallet" ? <Smartphone size={13} /> : <Landmark size={13} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium text-foreground truncate">{c.name}</div>
                        <div className="text-[11.5px] text-muted-foreground tabular truncate">
                          {c.networkOrBank} · {c.destination}
                        </div>
                      </div>
                    </div>

                    <span className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full border transition-all",
                      isSelected
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-transparent"
                    )}>
                      {isSelected ? <Check size={11} strokeWidth={3} /> : null}
                    </span>
                  </div>
                );
              })}
              {filteredContacts.length === 0 && (
                <div className="py-12 text-center text-[12.5px] text-muted-foreground">
                  No contacts found matching &ldquo;{search}&rdquo;
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Group Settings & Allocation (Col 6-12) */}
          <div className="md:col-span-7 flex flex-col overflow-y-auto p-6 gap-5 bg-background">
            {/* Group Identity */}
            <div className="flex flex-col gap-2">
              <label className="text-[12.5px] font-semibold text-foreground">
                Group Details
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Group name (e.g. Susu Contribution Circle)"
                autoFocus
                className="h-10 w-full rounded-xl border border-border/80 bg-background px-3.5 text-[13.5px] font-medium text-foreground placeholder:font-normal placeholder:text-muted-foreground/60 outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all shadow-xs"
              />
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Group purpose or schedule notes (optional)"
                className="h-8.5 w-full rounded-lg border border-border/70 bg-background/50 px-3 text-[12.5px] text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-ring transition-all"
              />
            </div>

            {/* Payout & Split Mode */}
            <div className="flex flex-col gap-2.5 rounded-xl border border-border/70 bg-muted/20 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] font-semibold text-foreground">Payout Allocation</span>
                <div className="flex items-center rounded-lg bg-muted/60 p-0.5 border border-border/60">
                  <button
                    type="button"
                    onClick={() => setSplitType("equal")}
                    className={cn(
                      "px-2.5 py-1 rounded-[6px] text-[11.5px] font-medium transition-all cursor-pointer",
                      splitType === "equal" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Equal Split
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitType("custom")}
                    className={cn(
                      "px-2.5 py-1 rounded-[6px] text-[11.5px] font-medium transition-all cursor-pointer",
                      splitType === "custom" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Custom Split
                  </button>
                </div>
              </div>

              {splitType === "equal" ? (
                <div className="flex items-center gap-3 pt-0.5">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-muted-foreground">
                      GHS
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={defaultAmount}
                      onChange={(e) => setDefaultAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                      placeholder="200.00"
                      className="numorainput h-9.5 w-full rounded-lg border border-border/80 bg-background pl-11 pr-3 text-[13.5px] font-medium text-foreground outline-none focus:border-ring tabular"
                    />
                  </div>
                  <span className="text-[12px] text-muted-foreground whitespace-nowrap">
                    per recipient
                  </span>
                </div>
              ) : (
                <p className="text-[11.5px] text-muted-foreground">
                  Specify individual payout amounts for each member below.
                </p>
              )}
            </div>

            {/* Selected Members Section */}
            <div className="flex flex-col gap-2 flex-1 min-h-[140px]">
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] font-semibold text-foreground">
                  Selected Recipients ({members.length})
                </span>
                {members.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setMembers([])}
                    className="text-[11.5px] text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {members.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 rounded-xl border border-dashed border-border/80 text-center bg-muted/10">
                  <Users size={24} strokeWidth={1.5} className="text-muted-foreground/60 mb-1.5" />
                  <span className="text-[13px] font-medium text-foreground">No recipients added yet</span>
                  <span className="text-[12px] text-muted-foreground mt-0.5">
                    Click contacts in the left directory to add them to this group.
                  </span>
                </div>
              ) : (
                <div className="rounded-xl border border-border/70 divide-y divide-border/40 bg-card overflow-hidden max-h-[180px] overflow-y-auto">
                  {members.map((m, idx) => (
                    <div
                      key={m.id || m.destination || `selected-${idx}`}
                      className="flex items-center justify-between gap-3 px-3 py-2 text-[12.5px] hover:bg-muted/20 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-foreground truncate">{m.name}</div>
                        <div className="text-[11px] text-muted-foreground tabular truncate">
                          {m.networkOrBank || (m.type === "wallet" ? "Wallet" : "Bank")} · {m.destination}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {splitType === "custom" ? (
                          <div className="relative w-24">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10.5px] text-muted-foreground font-semibold">
                              GHS
                            </span>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={String(m.defaultAmount ?? defaultAmount)}
                              onChange={(e) => updateMemberAmount(m.id || m.destination, e.target.value.replace(/[^0-9.]/g, ""))}
                              className="numorainput h-7 w-full rounded-md border border-border/80 bg-background pl-8 pr-1.5 text-right text-[12px] tabular outline-none focus:border-ring font-medium"
                            />
                          </div>
                        ) : (
                          <span className="text-[12px] font-medium tabular text-muted-foreground">
                            GHS {(Number(defaultAmount) || 0).toFixed(2)}
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => removeMember(m.id || m.destination)}
                          className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                          aria-label={`Remove ${m.name}`}
                        >
                          <X size={13} strokeWidth={2} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Clean Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-border/60 bg-muted/20">
          <div className="flex flex-col">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Total Outflow
            </span>
            <span className="text-[15.5px] font-semibold text-foreground tabular">
              GHS {totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-[12px] font-normal text-muted-foreground ml-1.5">
                ({members.length} {members.length === 1 ? "recipient" : "recipients"})
              </span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="h-9 px-3.5 text-[13px]">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!canSave}
              className="h-9 px-4 text-[13px] font-medium"
            >
              {groupToEdit ? "Save Changes" : "Create Group"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
