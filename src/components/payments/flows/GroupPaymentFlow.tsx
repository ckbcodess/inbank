"use client";

import { useState, useMemo } from "react";
import { Users } from "lucide-react";
import { Account, formatMoney } from "@/lib/mock-data";
import { PaymentGroup } from "@/lib/groups-store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  FromAccountSelector,
  AmountInput,
  NarrationInput,
  CategorySelect,
  InsufficientFundsAlert,
  ProceedButton,
  CollapsedDetailsBadge,
} from "./shared";

export interface GroupPaymentFormState {
  fromId: string;
  groupName: string;
  grpAmount: string;
  narration: string;
  category: string;
}

interface GroupPaymentFlowProps {
  accounts: Account[];
  groups: PaymentGroup[];
  state: GroupPaymentFormState;
  onChange: (key: keyof GroupPaymentFormState, value: string) => void;
  onOpenCreateGroup: () => void;
  onProceed: () => void;
  detailsCollapsed?: boolean;
  onToggleCollapsed?: (collapsed: boolean) => void;
}

export function GroupPaymentFlow({
  accounts,
  groups,
  state,
  onChange,
  onOpenCreateGroup,
  onProceed,
  detailsCollapsed,
  onToggleCollapsed,
}: GroupPaymentFlowProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(detailsCollapsed ?? false);
  const isCollapsed = detailsCollapsed !== undefined ? detailsCollapsed : internalCollapsed;

  const setCollapsed = (val: boolean) => {
    setInternalCollapsed(val);
    onToggleCollapsed?.(val);
  };

  const fromAccount = useMemo(
    () => accounts.find((a) => a.id === state.fromId) ?? accounts[0],
    [accounts, state.fromId]
  );

  const selectedGroup = useMemo(() => {
    return groups.find((g) => g.name === state.groupName);
  }, [groups, state.groupName]);

  const numAmount = Number(state.grpAmount.replace(/[^0-9.]/g, "")) || 0;
  const memberCount = selectedGroup?.members.length || 1;
  const totalDebit = numAmount * (selectedGroup?.splitType === "equal" ? memberCount : 1);
  const overBalance = totalDebit > (fromAccount?.available ?? 0);
  const isValid = Boolean(state.fromId) && Boolean(state.groupName) && numAmount > 0 && !overBalance;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200 ease-out">
      {/* 1. From Account */}
      <FromAccountSelector
        accounts={accounts}
        value={state.fromId}
        onChange={(id) => onChange("fromId", id)}
      />

      {/* 2. Destination Group */}
      <div className="flex flex-col gap-2">
        <label className="text-[14px] font-medium text-foreground">Contribution Group</label>

        {selectedGroup && isCollapsed ? (
          <CollapsedDetailsBadge
            title={selectedGroup.name}
            subtitle={`${selectedGroup.members.length} members · ${selectedGroup.splitType === "equal" ? "Equal split" : "Custom split"}`}
            onChange={() => setCollapsed(false)}
          />
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl border border-dashed border-border/80 text-center gap-3">
            <Users size={28} className="text-muted-foreground" />
            <p className="text-[14px] text-muted-foreground">No groups created yet.</p>
            <button
              type="button"
              onClick={onOpenCreateGroup}
              className="text-[14px] font-medium text-foreground hover:underline cursor-pointer"
            >
              Create your first group
            </button>
          </div>
        ) : (
          <Select
            value={state.groupName || ""}
            onValueChange={(val) => {
              if (val) {
                onChange("groupName", val);
                const g = groups.find((grp) => grp.name === val);
                if (g?.defaultPerMemberAmount) {
                  onChange("grpAmount", String(g.defaultPerMemberAmount));
                }
              }
            }}
          >
            <SelectTrigger className="min-h-[52px] h-auto py-2.5 w-full rounded-2xl border border-border/80 bg-card px-4 text-left shadow-none flex items-center">
              {!selectedGroup ? (
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
                    <Users size={18} strokeWidth={1.8} />
                  </span>
                  <span className="text-[15px] text-muted-foreground font-normal truncate">
                    Select contribution group
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between min-w-0 flex-1 gap-3">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
                      <Users size={18} strokeWidth={1.8} />
                    </span>
                    <div className="flex flex-col min-w-0 text-left gap-0.5">
                      <span className="text-[15px] text-foreground font-medium truncate leading-tight">
                        {selectedGroup.name}
                      </span>
                      <span className="text-[13px] text-muted-foreground font-normal truncate leading-tight">
                        {selectedGroup.splitType === "equal" ? "Equal split" : "Custom split"}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[14px] text-muted-foreground font-medium tabular">
                      {selectedGroup.members.length} {selectedGroup.members.length === 1 ? "member" : "members"}
                    </span>
                  </div>
                </div>
              )}
            </SelectTrigger>
            <SelectContent>
              {groups.map((g) => (
                <SelectItem key={g.id} value={g.name}>
                  {g.name} ({g.members.length} {g.members.length === 1 ? "member" : "members"})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Progressive Disclosure: Only reveal Amount & subsequent form fields after group is selected */}
      {Boolean(selectedGroup) && (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-top-2 duration-200 ease-out">
          {/* 3. Amount */}
          <div className="flex flex-col gap-2">
            <AmountInput
              value={state.grpAmount}
              onChange={(val) => onChange("grpAmount", val)}
              label={selectedGroup?.splitType === "equal" ? "Amount per Member (Preset)" : "Total Amount"}
              disabled={Boolean(selectedGroup)}
              error={
                overBalance ? (
                  <InsufficientFundsAlert
                    available={fromAccount?.available ?? 0}
                    currency={fromAccount?.currency || "GHS"}
                  />
                ) : undefined
              }
            />
            {selectedGroup && selectedGroup.splitType === "equal" && numAmount > 0 && (
              <div className="flex items-center justify-between px-2 text-[13px] text-muted-foreground">
                <span>Total Group Debit ({memberCount} members):</span>
                <span className="font-semibold text-foreground tabular">
                  {formatMoney(totalDebit, "GHS", true)}
                </span>
              </div>
            )}
          </div>

          {/* 4. Narration */}
          <NarrationInput
            value={state.narration}
            onChange={(val) => onChange("narration", val)}
            placeholder="Group contribution reference"
          />

          {/* 5. Transaction Category (Optional) */}
          <CategorySelect
            value={state.category}
            onChange={(val) => onChange("category", val)}
            defaultCategory="Donations"
          />
        </div>
      )}

      {/* 6. Proceed CTA */}
      <ProceedButton
        disabled={!isValid}
        onClick={onProceed}
        label="Proceed"
      />
    </div>
  );
}
