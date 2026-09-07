"use client";

import { useMemo } from "react";
import { Users, Plus } from "lucide-react";
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
}

export function GroupPaymentFlow({
  accounts,
  groups,
  state,
  onChange,
  onOpenCreateGroup,
  onProceed,
}: GroupPaymentFlowProps) {
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
        <div className="flex items-center justify-between">
          <label className="text-[14px] font-medium text-foreground">Select Contribution Group</label>
          <button
            type="button"
            onClick={onOpenCreateGroup}
            className="flex items-center gap-1 text-[13px] font-medium text-primary hover:underline cursor-pointer"
          >
            <Plus size={14} />
            <span>Create new group</span>
          </button>
        </div>

        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl border border-dashed border-border/80 text-center gap-3">
            <Users size={28} className="text-muted-foreground" />
            <p className="text-[14px] text-muted-foreground">No groups created yet.</p>
            <button
              type="button"
              onClick={onOpenCreateGroup}
              className="text-[14px] font-medium text-primary hover:underline"
            >
              Create your first group
            </button>
          </div>
        ) : (
          <Select
            value={state.groupName || groups[0]?.name}
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
            <SelectTrigger className="h-auto min-h-[68px] py-3 px-4 w-full rounded-2xl border border-border/80 bg-card text-left shadow-none">
              {!selectedGroup ? (
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Users size={18} strokeWidth={1.8} />
                  </span>
                  <span className="text-[15px] text-muted-foreground font-normal truncate">
                    Select group
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between min-w-0 flex-1 gap-3">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
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
                      {selectedGroup.members.length} members
                    </span>
                  </div>
                </div>
              )}
            </SelectTrigger>
            <SelectContent>
              {groups.map((g) => (
                <SelectItem key={g.id} value={g.name}>
                  {g.name} ({g.members.length} members)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* 3. Amount */}
      <div className="flex flex-col gap-2">
        <AmountInput
          value={state.grpAmount}
          onChange={(val) => onChange("grpAmount", val)}
          label={selectedGroup?.splitType === "equal" ? "Amount per Member" : "Total Amount"}
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
      />

      {overBalance && (
        <InsufficientFundsAlert
          available={fromAccount?.available ?? 0}
          currency={fromAccount?.currency || "GHS"}
        />
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
