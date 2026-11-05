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
  ProceedButton,
  MAX_AMOUNT,
  getDetailedFeeBreakdown,
} from "./shared";

import EditGroupModal from "@/components/payments/EditGroupModal";
import { Field } from "@/components/ui/field";
import { InlineError } from "@/components/ui/inline-error";
import { Input } from "@/components/ui/input";
import { PayeeAvatar } from "@/components/ui/payee-avatar";
import { SearchField } from "@/components/ui/search-field";
import { TotalRow } from "@/components/ui/total-row";
import { cn } from "@/lib/utils";
import { roundMoney, sumMoney } from "@/lib/money";

const num = (v: string | undefined) => Number((v ?? "").replace(/[^0-9.]/g, "")) || 0;

/** A long group gets a search box above its amounts. */
const SEARCH_FROM_MEMBERS = 8;
/** How many faces the closed amounts row shows before it says "+4". */
const STACK_SIZE = 4;

/** Keeps a typed amount to digits, one point and two decimals. Returns null when it would pass the ceiling, so the keystroke is ignored. */
function cleanAmount(raw: string): string | null {
  const [whole, ...decimals] = raw.replace(/[^0-9.]/g, "").split(".");
  const value = decimals.length > 0 ? `${whole}.${decimals.join("").slice(0, 2)}` : whole;
  return Number(value) > MAX_AMOUNT ? null : value;
}

/** What a member gets unless the customer changes it for this payment. */
function groupBaseAmount(group: PaymentGroup, perMember: string, memberId: string): number {
  const m = group.members.find((x) => x.id === memberId);
  if (group.splitType === "custom") return m?.defaultAmount ?? num(perMember);
  return num(perMember);
}

/** What one member gets: their own change if the customer made one, else the group's amount (custom groups keep each member's own). */
export function groupMemberAmount(
  group: PaymentGroup,
  perMember: string,
  overrides: Record<string, string>,
  memberId: string,
): number {
  const o = overrides[memberId];
  if (o !== undefined) return num(o);
  return groupBaseAmount(group, perMember, memberId);
}

/** The total that goes to the members, before the fee. */
export function groupTotal(group: PaymentGroup, perMember: string, overrides: Record<string, string>): number {
  return sumMoney(group.members.map((m) => groupMemberAmount(group, perMember, overrides, m.id)));
}

/** How many members this payment reaches. A member at zero is left out, and the fee is charged per payment made. */
export function groupPaidCount(group: PaymentGroup, perMember: string, overrides: Record<string, string>): number {
  return group.members.filter((m) => groupMemberAmount(group, perMember, overrides, m.id) > 0).length;
}

/** Says who the payment reaches: "8 members", or "7 of 8 members" when someone is left out. */
export function groupPeopleLabel(paid: number, total: number): string {
  if (paid !== total) return `${paid} of ${total} members`;
  return total === 1 ? "1 member" : `${total} members`;
}

/** The amount a group starts on. Never a made-up figure: a group with no saved amount starts empty. */
export function groupStartAmount(group: PaymentGroup | undefined): string {
  return group?.defaultPerMemberAmount ? String(group.defaultPerMemberAmount) : "";
}

/** Who gets what, for the review step: each person, where it goes and how much. */
export function GroupMemberBreakdown({
  group,
  perMember,
  overrides,
}: {
  group: PaymentGroup;
  perMember: string;
  overrides: Record<string, string>;
}) {
  return (
    <div className="custom-scrollbar scroll-fade flex max-h-[288px] flex-col overflow-y-auto overscroll-contain px-3">
      {group.members.map((m) => {
        const amount = groupMemberAmount(group, perMember, overrides, m.id);
        return (
          <div key={m.id} className="flex items-center justify-between gap-4 py-2">
            <span className="flex min-w-0 flex-col">
              <span className={cn("truncate text-[13px]", amount > 0 ? "text-foreground" : "text-muted-foreground")}>{m.name}</span>
              <span className="tabular truncate text-[12px] text-muted-foreground">
                {m.networkOrBank ? `${m.networkOrBank} · ${m.destination}` : m.destination}
              </span>
            </span>
            {amount > 0 ? (
              <span className="tabular shrink-0 text-[13px] text-foreground">{formatMoney(amount, "GHS", true)}</span>
            ) : (
              <span className="shrink-0 text-[13px] text-muted-foreground">Left out</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** The two lines that name a group, in the same shape as the account above it. */
function GroupOption({ name, detail, muted }: { name: string; detail?: string; muted?: boolean }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <span className={cn("flex size-8 shrink-0 items-center justify-center", muted ? "text-muted-foreground" : "text-foreground")}>
        <Users size={20} className="shrink-0" />
      </span>
      {detail ? (
        <div className="flex min-w-0 flex-col gap-0.5 text-left">
          <span className="truncate text-[14px] font-medium leading-tight tracking-[var(--ls-tight)] text-foreground">{name}</span>
          <span className="tabular truncate text-[12px] font-normal leading-tight text-muted-foreground">{detail}</span>
        </div>
      ) : (
        <span className="truncate text-[14px] font-normal text-muted-foreground">{name}</span>
      )}
    </div>
  );
}

/** One member's amount. Plain digits while typing, the money format once they leave the box. */
function MemberAmountInput({
  name,
  value,
  amount,
  onChange,
}: {
  name: string;
  value: string;
  amount: number;
  onChange: (value: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <Input
      inputMode="decimal"
      enterKeyHint="done"
      aria-label={`Amount for ${name}`}
      value={focused ? value : amount.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      onFocus={(e) => {
        setFocused(true);
        // The value swaps to plain digits on this render, so select after it lands: typing then replaces the amount.
        const el = e.currentTarget;
        requestAnimationFrame(() => el.select());
      }}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        const next = cleanAmount(e.target.value);
        if (next !== null) onChange(next);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      className="tabular w-28 text-right"
    />
  );
}

export interface GroupPaymentFormState {
  fromId: string;
  groupId: string;
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
  /** Drops every member amount the customer typed. */
  onClearMemberAmounts: () => void;
  /** Drops the amount the customer typed for one member, so they go back to their group amount. */
  onResetMemberAmount: (memberId: string) => void;
  onOpenCreateGroup: () => void;
  onProceed: () => void;
}

export function GroupPaymentFlow({
  accounts,
  groups,
  state,
  onChange,
  memberAmounts,
  onMemberAmountChange,
  onClearMemberAmounts,
  onResetMemberAmount,
  onOpenCreateGroup,
  onProceed,
}: GroupPaymentFlowProps) {

  const fromAccount = useMemo(
    () => accounts.find((a) => a.id === state.fromId) ?? accounts[0],
    [accounts, state.fromId]
  );

  const selectedGroup = useMemo(() => groups.find((g) => g.id === state.groupId), [groups, state.groupId]);

  // One amounts view for both splits. Closed by default; Edit amounts opens the member list and Done closes it.
  const [editingAmounts, setEditingAmounts] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [editGroupOpen, setEditGroupOpen] = useState(false);

  const members = selectedGroup?.members ?? [];
  const memberCount = members.length;
  const isEqual = selectedGroup?.splitType === "equal";

  const amountFor = (memberId: string) =>
    selectedGroup ? groupMemberAmount(selectedGroup, state.grpAmount, memberAmounts, memberId) : 0;
  const baseFor = (memberId: string) => (selectedGroup ? groupBaseAmount(selectedGroup, state.grpAmount, memberId) : 0);

  const sentAmount = selectedGroup ? groupTotal(selectedGroup, state.grpAmount, memberAmounts) : 0;
  const paidCount = selectedGroup ? groupPaidCount(selectedGroup, state.grpAmount, memberAmounts) : 0;
  // The fee shows on the review, not here, but it leaves the same account, so the balance check counts it.
  const fee = getDetailedFeeBreakdown({ rail: "group", bankCategory: null, membersCount: paidCount }).feeAmount;
  const totalDebit = sumMoney([sentAmount, fee]);
  const available = fromAccount?.available ?? 0;
  const shortfall = roundMoney(totalDebit - available);
  const overBalance = shortfall > 0;
  const isValid = Boolean(state.fromId) && Boolean(selectedGroup) && sentAmount > 0 && !overBalance;

  // A member typed back to their own amount is not a change, and one set to zero is left out rather than changed.
  const changedCount = members.filter((m) => {
    const amount = amountFor(m.id);
    const base = baseFor(m.id);
    return base > 0 && amount > 0 && amount !== base;
  }).length;
  const hasAdjustments = members.some((m) => memberAmounts[m.id] !== undefined && amountFor(m.id) !== baseFor(m.id));
  const everyoneLeftOut = memberCount > 0 && paidCount === 0 && members.some((m) => memberAmounts[m.id] !== undefined);

  const peopleLabel = groupPeopleLabel(paidCount, memberCount);
  const amountLabel =
    changedCount > 0
      ? `${peopleLabel}, ${changedCount} changed`
      : isEqual && paidCount === memberCount
      ? `${peopleLabel} × ${formatMoney(num(state.grpAmount), "GHS", true)}`
      : peopleLabel;

  const query = memberSearch.trim().toLowerCase();
  const visibleMembers = query ? members.filter((m) => m.name.toLowerCase().includes(query)) : members;

  // Narration and category come after the amount; anything already filled in stays on screen.
  const showDetails = sentAmount > 0 || Boolean(state.narration) || Boolean(state.category);

  const closeAmounts = () => {
    setEditingAmounts(false);
    setMemberSearch("");
  };

  const amountsToggle = (
    <button
      type="button"
      onClick={() => (editingAmounts ? closeAmounts() : setEditingAmounts(true))}
      aria-expanded={editingAmounts}
      className="cursor-pointer text-[13px] text-foreground underline underline-offset-4"
    >
      {editingAmounts ? "Done" : "Edit amounts"}
    </button>
  );

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
          groups.length > 0 ? (
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

        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/80 p-5 text-center">
            <Users size={28} className="text-muted-foreground" />
            <p className="text-[14px] text-muted-foreground">No groups created yet.</p>
            <button
              type="button"
              onClick={onOpenCreateGroup}
              className="cursor-pointer text-[13px] text-foreground underline underline-offset-4"
            >
              Create your first group
            </button>
          </div>
        ) : (
          <Select
            value={state.groupId || ""}
            onValueChange={(id) => {
              if (!id || id === state.groupId) return;
              // A new group starts on its own amount, or empty; nothing carries over from the last one.
              onChange("groupId", id);
              onChange("grpAmount", groupStartAmount(groups.find((g) => g.id === id)));
              closeAmounts();
            }}
          >
            <SelectTrigger>
              {selectedGroup ? (
                <GroupOption
                  name={selectedGroup.name}
                  detail={`${groupPeopleLabel(memberCount, memberCount)} · ${isEqual ? "Equal split" : "Custom split"}`}
                />
              ) : (
                <GroupOption name="Select contribution group" muted />
              )}
            </SelectTrigger>
            <SelectContent>
              {groups.map((g) => (
                <SelectItem key={g.id} value={g.id} className="py-2">
                  <GroupOption
                    name={g.name}
                    detail={`${groupPeopleLabel(g.members.length, g.members.length)} · ${
                      g.splitType === "equal" && g.defaultPerMemberAmount
                        ? `${formatMoney(g.defaultPerMemberAmount, "GHS", true)} each`
                        : g.splitType === "equal"
                        ? "Equal split"
                        : "Custom split"
                    }`}
                  />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </Field>

      {/* A group can only be paid once it has people in it. */}
      {selectedGroup && memberCount === 0 && (
        <p className="text-[13px] text-muted-foreground">
          This group has no members yet.{" "}
          <button
            type="button"
            onClick={() => setEditGroupOpen(true)}
            className="cursor-pointer text-foreground underline underline-offset-4"
          >
            Add members
          </button>
        </p>
      )}

      {/* Progressive Disclosure: Only reveal Amount & subsequent form fields after group is selected */}
      {selectedGroup && memberCount > 0 && (
        <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-top-2 duration-200 ease-out">
          {/* 3. Amount: one amount for everyone, with any member's share open to change */}
          <div className="flex flex-col gap-3">
            {/* One amounts block for both splits: the same Edit amounts / Done control sits on its label row. */}
            {isEqual ? (
              <AmountInput
                value={state.grpAmount}
                onChange={(val) => onChange("grpAmount", val)}
                label="Amount per Member"
                action={amountsToggle}
              />
            ) : (
              // Collapsed, the row is the one control; open, the label row's Done closes it.
              <Field label="Amounts" action={editingAmounts ? amountsToggle : undefined}>
                {!editingAmounts && (
                  <button
                    type="button"
                    onClick={() => setEditingAmounts(true)}
                    aria-expanded={false}
                    className="field-surface flex min-h-(--control-xl) w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-transparent bg-field px-3 py-2 text-left transition-colors hover:bg-field-hover"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span aria-hidden="true" className="flex shrink-0 items-center">
                        {members.slice(0, STACK_SIZE).map((m, i) => (
                          <PayeeAvatar key={m.id} name={m.name} size="sm" className={cn("ring-2 ring-field", i > 0 && "-ml-2")} />
                        ))}
                        {memberCount > STACK_SIZE && (
                          <span className="tabular ml-2 text-[12px] text-muted-foreground">+{memberCount - STACK_SIZE}</span>
                        )}
                      </span>
                      <span className="truncate text-[14px] text-foreground">
                        {hasAdjustments ? "Changed for this payment" : "Each member's own amount"}
                      </span>
                    </span>
                    <span className="shrink-0 text-[13px] text-foreground underline underline-offset-4">Edit amounts</span>
                  </button>
                )}
              </Field>
            )}

            {/* The member list is the same for both splits. A changed row says what it was and can be reset on its own. */}
            {editingAmounts && (
              <div className="flex flex-col gap-2 animate-in fade-in duration-150 ease-out">
                {memberCount > SEARCH_FROM_MEMBERS && (
                  <SearchField value={memberSearch} onChange={setMemberSearch} placeholder="Search members" />
                )}
                <div className="custom-scrollbar scroll-fade -mx-1 flex max-h-[288px] flex-col gap-0.5 overflow-y-auto overscroll-contain px-1">
                  {visibleMembers.map((m) => {
                    const base = baseFor(m.id);
                    const amount = amountFor(m.id);
                    const leftOut = amount === 0 && base > 0;
                    const changed = base > 0 && amount > 0 && amount !== base;
                    return (
                      <div key={m.id} className="flex items-center justify-between gap-3 rounded-xl p-2">
                        <div className="flex min-w-0 items-center gap-3">
                          <PayeeAvatar name={m.name} size="md" />
                          <span className="flex min-w-0 flex-col">
                            <span className={cn("truncate text-[14px]", leftOut ? "text-muted-foreground" : "text-foreground")}>
                              {m.name}
                            </span>
                            <span className="flex min-w-0 items-center gap-2 text-[12px] text-muted-foreground">
                              <span className="tabular truncate">
                                {leftOut ? "Left out" : changed ? `Was ${formatMoney(base, "GHS", true)}` : m.networkOrBank}
                              </span>
                              {(leftOut || changed) && (
                                <button
                                  type="button"
                                  onClick={() => onResetMemberAmount(m.id)}
                                  aria-label={leftOut ? `Add ${m.name} back` : `Reset ${m.name}`}
                                  className="shrink-0 cursor-pointer text-foreground underline underline-offset-4"
                                >
                                  {leftOut ? "Add back" : "Reset"}
                                </button>
                              )}
                              {!leftOut && !changed && amount > 0 && (
                                <button
                                  type="button"
                                  onClick={() => onMemberAmountChange(m.id, "0")}
                                  aria-label={`Leave out ${m.name}`}
                                  className="shrink-0 cursor-pointer text-foreground underline underline-offset-4"
                                >
                                  Leave out
                                </button>
                              )}
                            </span>
                          </span>
                        </div>
                        <MemberAmountInput
                          name={m.name}
                          value={memberAmounts[m.id] ?? String(base)}
                          amount={amount}
                          onChange={(val) => onMemberAmountChange(m.id, val)}
                        />
                      </div>
                    );
                  })}
                  {visibleMembers.length === 0 && (
                    <p className="p-2 text-[13px] text-muted-foreground">{`No members found matching “${memberSearch.trim()}”.`}</p>
                  )}
                </div>
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setEditGroupOpen(true)}
                    className="cursor-pointer text-[12px] text-foreground underline underline-offset-4"
                  >
                    Add or remove members
                  </button>
                  {hasAdjustments && (
                    <button
                      type="button"
                      onClick={onClearMemberAmounts}
                      className="cursor-pointer text-[12px] text-foreground underline underline-offset-4"
                    >
                      Reset all
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* What the members get, in one line. The review adds the fee and the total debit. */}
            <TotalRow label={<span className="tabular">{amountLabel}</span>} value={formatMoney(sentAmount, "GHS", true)} className="pt-2" />
            {overBalance && (
              <InlineError
                className="text-left"
                message={`With the fee, that's ${formatMoney(shortfall, "GHS", true)} more than this account has. Lower the amounts, or pay from another account.`}
              />
            )}
          </div>

          {showDetails && (
            <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-top-2 duration-200 ease-out">
              {/* 4. Narration */}
              <NarrationInput
                value={state.narration}
                onChange={(val) => onChange("narration", val)}
                placeholder="For example, October susu"
              />

              {/* 5. Transaction Category (Optional) */}
              <CategorySelect
                value={state.category}
                onChange={(val) => onChange("category", val)}
              />
            </div>
          )}
        </div>
      )}

      {/* 6. Proceed CTA */}
      <div className="flex flex-col gap-2">
        <ProceedButton
          disabled={!isValid}
          onClick={onProceed}
          label="Proceed"
        />
        {everyoneLeftOut && (
          <p className="text-[12px] text-muted-foreground">Add an amount for at least one member to proceed.</p>
        )}
      </div>

      {/* Members change here without leaving the payment: the group stays picked and the total follows. */}
      <EditGroupModal
        open={editGroupOpen}
        onOpenChange={setEditGroupOpen}
        group={selectedGroup ?? null}
        onSuccess={(updated) => {
          // Only a new saved amount replaces what is on screen; an edit to the members keeps what was typed.
          if (updated.defaultPerMemberAmount !== selectedGroup?.defaultPerMemberAmount) {
            onChange("grpAmount", groupStartAmount(updated));
          }
        }}
        onDeleted={() => {
          onChange("groupId", "");
          onChange("grpAmount", "");
          closeAmounts();
        }}
      />
    </div>
  );
}
