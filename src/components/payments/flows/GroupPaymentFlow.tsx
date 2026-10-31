"use client";

import { useState, useMemo } from "react";
import { Users } from "@/components/ui/icons";
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

import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { sumMoney } from "@/lib/money";

const num = (v: string | undefined) => Number((v ?? "").replace(/[^0-9.]/g, "")) || 0;

/** What one member gets: their own change if the customer made one, else the group's amount (custom groups keep each member's own). */
export function groupMemberAmount(
  group: PaymentGroup,
  perMember: string,
  overrides: Record<string, string>,
  memberId: string,
): number {
  const o = overrides[memberId];
  if (o !== undefined) return num(o);
  const m = group.members.find((x) => x.id === memberId);
  if (group.splitType === "custom") return m?.defaultAmount ?? num(perMember);
  return num(perMember);
}

/** The total that leaves the account for a group payment. */
export function groupTotal(group: PaymentGroup, perMember: string, overrides: Record<string, string>): number {
  return sumMoney(group.members.map((m) => groupMemberAmount(group, perMember, overrides, m.id)));
}

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
  /** Amounts the customer changed for single members, by member id. */
  memberAmounts: Record<string, string>;
  onMemberAmountChange: (memberId: string, value: string) => void;
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
  memberAmounts,
  onMemberAmountChange,
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

  // Open by default for a custom split (each share is the point), closed for an equal one; the customer can flip either.
  const [membersOpen, setMembersOpen] = useState<boolean | null>(null);
  const memberCount = selectedGroup?.members.length || 1;
  const totalDebit = selectedGroup ? groupTotal(selectedGroup, state.grpAmount, memberAmounts) : 0;
  const overBalance = totalDebit > (fromAccount?.available ?? 0);
  const isValid = Boolean(state.fromId) && Boolean(state.groupName) && totalDebit > 0 && !overBalance;
  const isEqual = selectedGroup?.splitType === "equal";
  const showMembers = membersOpen ?? !isEqual;
  const changedCount = Object.keys(memberAmounts).length;

  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-200 ease-out">
      {/* 1. From Account */}
      <FromAccountSelector
        accounts={accounts}
        value={state.fromId}
        onChange={(id) => onChange("fromId", id)}
      />

      {/* 2. Destination Group */}
      <Field
        label="Contribution Group"
        action={
          !(selectedGroup && isCollapsed) && groups.length > 0 ? (
            <button
              type="button"
              onClick={onOpenCreateGroup}
              className="cursor-pointer text-[13px] text-foreground underline underline-offset-4"
            >
              Send to new group
            </button>
          ) : undefined
        }
      >

        {selectedGroup && isCollapsed ? (
          <CollapsedDetailsBadge
            title={selectedGroup.name}
            subtitle={`${selectedGroup.members.length} members · ${selectedGroup.splitType === "equal" ? "Equal split" : "Custom split"}`}
            icon={<Users size={20} strokeWidth={1.8} className="shrink-0" />}
            onChange={() => setCollapsed(false)}
          />
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-5 rounded-2xl border border-dashed border-border/80 text-center gap-2">
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
            <SelectTrigger className="min-h-[52px] h-auto border-border/80 bg-card text-left flex items-center">
              {!selectedGroup ? (
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="flex size-8 shrink-0 items-center justify-center text-muted-foreground">
                    <Users size={20} />
                  </span>
                  <span className="text-[15px] text-muted-foreground font-normal truncate">
                    Select contribution group
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between min-w-0 flex-1 gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex size-8 shrink-0 items-center justify-center text-foreground">
                      <Users size={20} />
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
</Field>

      {/* Progressive Disclosure: Only reveal Amount & subsequent form fields after group is selected */}
      {Boolean(selectedGroup) && (
        <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-top-2 duration-200 ease-out">
          {/* 3. Amount: one amount for everyone, with any member's share open to change */}
          <div className="flex flex-col gap-3">
            {isEqual && (
              <AmountInput
                value={state.grpAmount}
                onChange={(val) => onChange("grpAmount", val)}
                label="Amount per Member"
              />
            )}

            <button
              type="button"
              onClick={() => setMembersOpen(!showMembers)}
              aria-expanded={showMembers}
              className="cursor-pointer self-start text-[13px] text-foreground underline underline-offset-4"
            >
              {showMembers ? "Hide amounts" : changedCount > 0 ? `Change amounts (${changedCount} changed)` : "Change amounts"}
            </button>

            {showMembers && selectedGroup && (
              <div className="flex flex-col gap-1 animate-in fade-in duration-150 ease-out">
                {selectedGroup.members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-3 rounded-xl p-2">
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-[14px] text-foreground">{m.name}</span>
                      <span className="truncate text-[12px] text-muted-foreground">{m.networkOrBank}</span>
                    </span>
                    <Input
                      inputMode="decimal"
                      aria-label={`Amount for ${m.name}`}
                      value={memberAmounts[m.id] ?? String(groupMemberAmount(selectedGroup, state.grpAmount, memberAmounts, m.id))}
                      onChange={(e) => onMemberAmountChange(m.id, e.target.value.replace(/[^0-9.]/g, ""))}
                      className="tabular w-28 text-right"
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pb-2 pt-2">
              <span className="text-[18px] text-muted-foreground">
                Total Amount:
                <span className="sr-only"> for {memberCount} {memberCount === 1 ? "member" : "members"}</span>
              </span>
              <span className="tabular text-[20px] text-foreground sm:text-[22px]">{formatMoney(totalDebit, "GHS", true)}</span>
            </div>
            {overBalance && <InsufficientFundsAlert />}
          </div>

          {/* 4. Narration */}
          <NarrationInput
            value={state.narration}
            onChange={(val) => onChange("narration", val)}
            placeholder="e.g. Susu contribution"
          />

          {/* 5. Transaction Category (Optional) */}
          <CategorySelect
            value={state.category}
            onChange={(val) => onChange("category", val)}
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
