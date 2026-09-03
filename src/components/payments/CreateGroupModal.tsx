"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, Users, Search, Smartphone, Landmark } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGroupsStore, type PaymentGroup, type GroupMember } from "@/lib/groups-store";
import { BENEFICIARIES } from "@/lib/mock-data";

interface CreateGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupToEdit?: PaymentGroup | null;
  onSuccess?: (group: PaymentGroup) => void;
}

const PRESET_CONTACTS: GroupMember[] = [
  { id: "c-ama", name: "Ama Serwaa Mensah", destination: "0244 123 456", type: "wallet", networkOrBank: "MTN Mobile Money" },
  { id: "c-kwame", name: "Kwame Boateng", destination: "0201 987 654", type: "wallet", networkOrBank: "Telecel Cash" },
  { id: "c-yaa", name: "Yaa Asantewaa", destination: "0559 220 118", type: "wallet", networkOrBank: "MTN Mobile Money" },
  { id: "c-kofi", name: "Kofi Osei", destination: "1023 4455 66", type: "bank", networkOrBank: "GCB Bank" },
  { id: "c-efua", name: "Efua Mensah", destination: "0271 445 900", type: "wallet", networkOrBank: "AT Money" },
  { id: "c-kojo", name: "Kojo Appiah", destination: "0244 889 001", type: "wallet", networkOrBank: "MTN Mobile Money" },
  { id: "c-abena", name: "Abena Osei", destination: "0201 440 221", type: "wallet", networkOrBank: "Telecel Cash" },
  { id: "c-yaw", name: "Yaw Mensah", destination: "0554 112 334", type: "wallet", networkOrBank: "MTN Mobile Money" },
  { id: "c-akua", name: "Akua Konadu", destination: "0271 998 440", type: "wallet", networkOrBank: "AT Money" },
  ...BENEFICIARIES.map((b) => ({
    id: `b-${b.id}`,
    name: b.name,
    destination: b.accountNumber,
    type: "bank" as const,
    networkOrBank: b.bank,
  })),
];

export default function CreateGroupModal({
  open,
  onOpenChange,
  groupToEdit,
  onSuccess,
}: CreateGroupModalProps) {
  const { addGroup, updateGroup } = useGroupsStore();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [defaultAmount, setDefaultAmount] = useState("200");
  const [splitType, setSplitType] = useState<"equal" | "custom">("equal");
  const [members, setMembers] = useState<GroupMember[]>([]);

  // Ad-hoc member input state
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customDest, setCustomDest] = useState("");
  const [customType, setCustomType] = useState<"wallet" | "bank">("wallet");
  const [customProvider, setCustomProvider] = useState("MTN Mobile Money");

  // Contact search in picker
  const [contactSearch, setContactSearch] = useState("");

  useEffect(() => {
    if (groupToEdit) {
      setName(groupToEdit.name);
      setDescription(groupToEdit.description);
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
    setShowAddCustom(false);
    setContactSearch("");
  }, [groupToEdit, open]);

  const filteredPresetContacts = useMemo(() => {
    const q = contactSearch.trim().toLowerCase();
    const existingIds = new Set(members.map((m) => m.destination.replace(/\s/g, "")));
    return PRESET_CONTACTS.filter(
      (c) => !existingIds.has(c.destination.replace(/\s/g, ""))
    ).filter(
      (c) =>
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.destination.includes(q) ||
        (c.networkOrBank && c.networkOrBank.toLowerCase().includes(q))
    );
  }, [contactSearch, members]);

  const toggleMemberFromPreset = (contact: GroupMember) => {
    setMembers((prev) => {
      const exists = prev.some((m) => m.destination === contact.destination);
      if (exists) {
        return prev.filter((m) => m.destination !== contact.destination);
      } else {
        const amt = Number(defaultAmount) || 0;
        return [...prev, { ...contact, defaultAmount: amt }];
      }
    });
  };

  const addCustomMember = () => {
    if (!customName.trim() || !customDest.trim()) return;
    const amt = Number(defaultAmount) || 0;
    const newM: GroupMember = {
      id: `m-custom-${Date.now()}`,
      name: customName.trim(),
      destination: customDest.trim(),
      type: customType,
      networkOrBank: customProvider,
      defaultAmount: amt,
    };
    setMembers((prev) => [...prev, newM]);
    setCustomName("");
    setCustomDest("");
    setShowAddCustom(false);
  };

  const removeMember = (dest: string) => {
    setMembers((prev) => prev.filter((m) => m.destination !== dest));
  };

  const updateMemberAmount = (dest: string, amtStr: string) => {
    const val = Number(amtStr.replace(/[^0-9.]/g, "")) || 0;
    setMembers((prev) =>
      prev.map((m) => (m.destination === dest ? { ...m, defaultAmount: val } : m))
    );
  };

  const canSave = name.trim().length >= 3 && members.length >= 2;

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
      const updated: PaymentGroup = {
        ...groupToEdit,
        name: name.trim(),
        description: description.trim(),
        defaultPerMemberAmount: defAmtNum,
        splitType,
        members: normalizedMembers,
      };
      onSuccess?.(updated);
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

  const totalCalculated = useMemo(() => {
    const defAmt = Number(defaultAmount) || 0;
    if (splitType === "equal") {
      return members.length * defAmt;
    }
    return members.reduce((sum, m) => sum + (m.defaultAmount || defAmt), 0);
  }, [members, defaultAmount, splitType]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-[18px] font-medium flex items-center gap-2">
            <Users size={18} className="text-primary" />
            {groupToEdit ? "Edit Payment Group" : "Create Payment Group"}
          </DialogTitle>
          <DialogDescription className="text-[13px]">
            Bundle multiple recipients for one-tap group transfers and Susu contributions.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-2 flex flex-col gap-5">
          {/* Group details */}
          <div className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="grp-name" className="text-[13px] font-medium text-foreground">
                Group Name
              </Label>
              <Input
                id="grp-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Family Contribution Circle"
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="grp-desc" className="text-[13px] font-medium text-foreground">
                Description / Purpose <span className="text-muted-foreground font-normal">(Optional)</span>
              </Label>
              <Input
                id="grp-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Monthly household maintenance pool"
              />
            </div>
          </div>

          {/* Amount configuration */}
          <div className="rounded-xl border border-border bg-muted/30 p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-foreground">Distribution Mode</span>
              <div className="flex items-center rounded-lg border border-border bg-background p-0.5 text-[12px]">
                <button
                  type="button"
                  onClick={() => setSplitType("equal")}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    splitType === "equal" ? "bg-muted font-medium text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Equal Share
                </button>
                <button
                  type="button"
                  onClick={() => setSplitType("custom")}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    splitType === "custom" ? "bg-muted font-medium text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Custom per Member
                </button>
              </div>
            </div>

            {splitType === "equal" && (
              <div className="flex items-center justify-between gap-4 pt-1">
                <span className="text-[12.5px] text-muted-foreground">Amount per Member</span>
                <div className="relative w-36">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground font-medium">
                    GHS
                  </span>
                  <Input
                    className="pl-11 h-9 tabular text-right text-[13.5px] font-medium"
                    value={defaultAmount}
                    onChange={(e) => setDefaultAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                    placeholder="0.00"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Members section */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-foreground">
                Group Members ({members.length})
              </span>
              <button
                type="button"
                onClick={() => setShowAddCustom(!showAddCustom)}
                className="text-[12px] font-medium text-primary hover:underline cursor-pointer flex items-center gap-1"
              >
                <Plus size={13} />
                {showAddCustom ? "Cancel manual entry" : "Add new number/account"}
              </button>
            </div>

            {/* Manual member entry card */}
            {showAddCustom && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5 flex flex-col gap-3 animate-in fade-in duration-150">
                <div className="grid grid-cols-2 gap-2.5">
                  <Input
                    placeholder="Full Name"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="h-9 text-[13px] bg-background"
                  />
                  <Input
                    placeholder="Phone or Account Number"
                    value={customDest}
                    onChange={(e) => setCustomDest(e.target.value)}
                    className="h-9 text-[13px] tabular bg-background"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCustomType("wallet");
                        setCustomProvider("MTN Mobile Money");
                      }}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium cursor-pointer border ${
                        customType === "wallet" ? "bg-background border-primary text-primary" : "border-transparent text-muted-foreground"
                      }`}
                    >
                      Mobile Wallet
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomType("bank");
                        setCustomProvider("GCB Bank");
                      }}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium cursor-pointer border ${
                        customType === "bank" ? "bg-background border-primary text-primary" : "border-transparent text-muted-foreground"
                      }`}
                    >
                      Bank Account
                    </button>
                  </div>
                  <Button size="sm" onClick={addCustomMember} disabled={!customName.trim() || !customDest.trim()}>
                    Add to Group
                  </Button>
                </div>
              </div>
            )}

            {/* Current members list */}
            {members.length > 0 ? (
              <div className="rounded-xl border border-border divide-y divide-border/60 max-h-48 overflow-y-auto">
                {members.map((m) => (
                  <div key={m.destination} className="flex items-center justify-between p-2.5 px-3 text-[13px]">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        {m.type === "wallet" ? <Smartphone size={14} /> : <Landmark size={14} />}
                      </span>
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-foreground truncate">{m.name}</span>
                        <span className="text-[11px] text-muted-foreground truncate tabular">
                          {m.networkOrBank || (m.type === "wallet" ? "Mobile Wallet" : "Bank")} • {m.destination}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      {splitType === "custom" && (
                        <div className="relative w-24">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">
                            GHS
                          </span>
                          <Input
                            className="pl-8 h-8 text-[12px] tabular text-right font-medium"
                            value={String(m.defaultAmount ?? defaultAmount)}
                            onChange={(e) => updateMemberAmount(m.destination, e.target.value)}
                          />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeMember(m.destination)}
                        className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors cursor-pointer"
                        aria-label={`Remove ${m.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border/80 p-4 text-center text-[12.5px] text-muted-foreground">
                No members added yet. Select from your saved contacts below or add a new number.
              </div>
            )}

            {/* Preset contacts picker */}
            <div className="flex flex-col gap-2 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-muted-foreground font-medium">Add from saved contacts</span>
                {filteredPresetContacts.length > 0 && (
                  <span className="text-[11px] text-muted-foreground">{filteredPresetContacts.length} available</span>
                )}
              </div>

              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-8.5 pl-8 text-[12px]"
                  placeholder="Search saved contacts..."
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pt-1">
                {filteredPresetContacts.slice(0, 10).map((c) => (
                  <button
                    key={c.destination}
                    type="button"
                    onClick={() => toggleMemberFromPreset(c)}
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[12px] hover:border-primary/50 text-foreground cursor-pointer transition-all"
                  >
                    <Plus size={12} className="text-primary" />
                    <span className="font-medium">{c.name}</span>
                    <span className="text-[10.5px] text-muted-foreground tabular">({c.destination.slice(-4)})</span>
                  </button>
                ))}
                {filteredPresetContacts.length === 0 && (
                  <span className="text-[12px] text-muted-foreground p-2">All contacts are already added or no match.</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Summary Footer */}
        <DialogFooter className="p-4 px-6 border-t border-border bg-muted/20 flex sm:items-center sm:justify-between flex-row">
          <div className="flex flex-col text-left">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
              Estimated Total Outflow
            </span>
            <span className="text-[16px] font-semibold text-foreground tabular">
              GHS {totalCalculated.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!canSave}>
              {groupToEdit ? "Save Changes" : "Create Group"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
