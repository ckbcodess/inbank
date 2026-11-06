"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronLeft, CircleMinus, RotateCcw, UserPlus, Users } from "@/components/ui/icons";
import { Account, formatMoney } from "@/lib/mock-data";
import { GroupMember, PaymentGroup } from "@/lib/groups-store";
import { Button } from "@/components/ui/button";
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
  getDetailedFeeBreakdown,
} from "./shared";

import EditGroupModal from "@/components/payments/EditGroupModal";
import { Field } from "@/components/ui/field";
import { InlineError } from "@/components/ui/inline-error";
import { MemberAmountInput } from "@/components/payments/MemberAmountInput";
import { PayeeAvatar } from "@/components/ui/payee-avatar";
import { SearchField } from "@/components/ui/search-field";
import { TotalRow } from "@/components/ui/total-row";
import { cn } from "@/lib/utils";
import { roundMoney, sumMoney } from "@/lib/money";

const num = (v: string | undefined) => Number((v ?? "").replace(/[^0-9.]/g, "")) || 0;

/** An icon-only member action (leave out, reset, add back). The label is its accessible name and tooltip. */
function IconAction({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors duration-hover hover:bg-muted hover:text-foreground"
    >
      {children}
    </button>
  );
}

/** A long group gets a search box above its amounts. */
const SEARCH_FROM_MEMBERS = 8;
/** How many faces the closed amounts row shows before it says "+4". */
const STACK_SIZE = 4;

/** The page behind Edit amounts: one row per member, Done goes back to the payment. */
function GroupAmountsPage({
  groupName,
  members,
  memberAmounts,
  amountFor,
  baseFor,
  hasAdjustments,
  sentAmount,
  amountLabel,
  search,
  onSearchChange,
  onMemberAmountChange,
  onResetMemberAmount,
  onClearMemberAmounts,
  onAddOrRemoveMembers,
  onDone,
}: {
  groupName: string;
  members: GroupMember[];
  memberAmounts: Record<string, string>;
  amountFor: (memberId: string) => number;
  baseFor: (memberId: string) => number;
  hasAdjustments: boolean;
  sentAmount: number;
  amountLabel: string;
  search: string;
  onSearchChange: (value: string) => void;
  onMemberAmountChange: (memberId: string, value: string) => void;
  onResetMemberAmount: (memberId: string) => void;
  onClearMemberAmounts: () => void;
  onAddOrRemoveMembers: () => void;
  onDone: () => void;
}) {
  const query = search.trim().toLowerCase();
  const visibleMembers = query ? members.filter((m) => m.name.toLowerCase().includes(query)) : members;

  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-200 ease-out">
      <div data-page-header className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onDone}
          className="relative -ml-1 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:ml-0 sm:size-8"
          aria-label="Back to payment"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="type-page-title min-w-0 truncate font-medium tracking-[var(--ls-heading)] text-foreground">
          Edit Amounts
        </h1>
      </div>

      {/* The group, with its member actions on the same line, above the list they act on. */}
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-[14px] font-medium text-foreground">{groupName}</span>
        <div className="flex shrink-0 items-center gap-4">
          {hasAdjustments && (
            <button
              type="button"
              onClick={onClearMemberAmounts}
              className="cursor-pointer text-[12px] text-foreground underline underline-offset-4"
            >
              Reset all
            </button>
          )}
          <button
            type="button"
            onClick={onAddOrRemoveMembers}
            className="cursor-pointer text-[12px] text-foreground underline underline-offset-4"
          >
            Add or remove members
          </button>
        </div>
      </div>

      {members.length > SEARCH_FROM_MEMBERS && (
        <SearchField value={search} onChange={onSearchChange} placeholder="Search members" />
      )}

      {/* A changed row says what it was and can be reset on its own. */}
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
                  <span className="tabular truncate text-[12px] text-muted-foreground">
                    {leftOut ? "Left out" : changed ? `Was ${formatMoney(base, "GHS", true)}` : m.networkOrBank}
                  </span>
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {leftOut || changed ? (
                  <IconAction
                    label={leftOut ? `Add ${m.name} back` : `Reset ${m.name}`}
                    onClick={() => onResetMemberAmount(m.id)}
                  >
                    {leftOut ? <UserPlus size={16} /> : <RotateCcw size={16} />}
                  </IconAction>
                ) : (
                  amount > 0 && (
                    <IconAction label={`Leave out ${m.name}`} onClick={() => onMemberAmountChange(m.id, "0")}>
                      <CircleMinus size={16} />
                    </IconAction>
                  )
                )}
                <MemberAmountInput
                  name={m.name}
                  value={memberAmounts[m.id] ?? String(base)}
                  amount={amount}
                  onChange={(val) => onMemberAmountChange(m.id, val)}
                />
              </div>
            </div>
          );
        })}
        {visibleMembers.length === 0 && (
          <p className="p-2 text-[13px] text-muted-foreground">{`No members found matching “${search.trim()}”.`}</p>
        )}
      </div>

      <TotalRow label={<span className="tabular">{amountLabel}</span>} value={formatMoney(sentAmount, "GHS", true)} className="pt-2" />

      <Button type="button" size="xl" onClick={onDone} className="w-full">
        Done
      </Button>
    </div>
  );
}

/** What a member gets unless the customer changes it for this payment. */
export function groupBaseAmount(group: PaymentGroup, perMember: string, memberId: string): number {
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
  summary,
}: {
  group: PaymentGroup;
  perMember: string;
  overrides: Record<string, string>;
  /** The member count as the row shows it, such as "10 members". */
  summary: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      {/* The Members row is the dropdown: closed it names the count, open it lists who gets what. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between gap-4 px-3 py-2 text-left"
      >
        <span className="shrink-0 text-[13px] text-muted-foreground">Members</span>
        <span className="flex min-w-0 items-center gap-2 text-[13px] text-foreground">
          <span className="tabular truncate text-right">{summary}</span>
          <ChevronDown size={16} className={cn("shrink-0 text-muted-foreground transition-transform duration-hover", open && "rotate-180")} />
        </span>
      </button>

      {open && (
        <div className="custom-scrollbar scroll-fade flex max-h-[288px] flex-col overflow-y-auto overscroll-contain px-3 animate-in fade-in duration-150 ease-out">
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
      )}
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
  /** Edit amounts opens its own page. The parent owns the flag so it can drop its header while the page is up. */
  amountsOpen: boolean;
  onAmountsOpenChange: (open: boolean) => void;
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
  amountsOpen,
  onAmountsOpenChange,
}: GroupPaymentFlowProps) {

  const fromAccount = useMemo(
    () => accounts.find((a) => a.id === state.fromId) ?? accounts[0],
    [accounts, state.fromId]
  );

  const selectedGroup = useMemo(() => groups.find((g) => g.id === state.groupId), [groups, state.groupId]);

  // One amounts view for both splits. Closed by default; Edit amounts opens the member list and Done closes it.
  const [membersExpanded, setMembersExpanded] = useState(false);
  const editingAmounts = amountsOpen;
  const setEditingAmounts = onAmountsOpenChange;
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
  const amountLabel = changedCount > 0 ? `${peopleLabel}, ${changedCount} changed` : peopleLabel;

  // Narration and category come after the amount; anything already filled in stays on screen.
  const showDetails = sentAmount > 0 || Boolean(state.narration) || Boolean(state.category);

  const closeAmounts = () => {
    setEditingAmounts(false);
    setMemberSearch("");
  };

  // Edit amounts opens its own page (as Send to new group does); the page replaces this flow until Done.
  const openAmounts = () => setEditingAmounts(true);
  const editGroupModal = (
    /* Members change here without leaving the payment: the group stays picked and the total follows. */
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
  );

  if (editingAmounts && selectedGroup) {
    return (
      <>
        <GroupAmountsPage
          groupName={selectedGroup.name}
          members={members}
          memberAmounts={memberAmounts}
          amountFor={amountFor}
          baseFor={baseFor}
          hasAdjustments={hasAdjustments}
          sentAmount={sentAmount}
          amountLabel={amountLabel}
          search={memberSearch}
          onSearchChange={setMemberSearch}
          onMemberAmountChange={onMemberAmountChange}
          onResetMemberAmount={onResetMemberAmount}
          onClearMemberAmounts={onClearMemberAmounts}
          onAddOrRemoveMembers={() => setEditGroupOpen(true)}
          onDone={closeAmounts}
        />
        {editGroupModal}
      </>
    );
  }

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
                action={
                  <button type="button" onClick={openAmounts} className="cursor-pointer text-[13px] text-foreground underline underline-offset-4">
                    Edit amounts
                  </button>
                }
              />
            ) : (
              <Field
                label="Amounts"
                action={
                  <button type="button" onClick={openAmounts} className="cursor-pointer text-[13px] text-foreground underline underline-offset-4">
                    Edit amounts
                  </button>
                }
              >
                {/* The summary opens and closes the member list in place. Edit amounts goes to its own page. */}
                <button
                  type="button"
                  onClick={() => setMembersExpanded((v) => !v)}
                  aria-expanded={membersExpanded}
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
                    {hasAdjustments && <span className="truncate text-[13px] text-foreground">Changed for this payment</span>}
                  </span>
                  <ChevronDown
                    size={16}
                    className={cn("shrink-0 text-muted-foreground transition-transform duration-hover", membersExpanded && "rotate-180")}
                  />
                </button>

                {membersExpanded && (
                  <div className="custom-scrollbar scroll-fade -mx-1 mt-2 flex max-h-[288px] flex-col gap-0.5 overflow-y-auto overscroll-contain px-1 animate-in fade-in duration-150 ease-out">
                    {members.map((m) => {
                      const base = baseFor(m.id);
                      const amount = amountFor(m.id);
                      const leftOut = amount === 0 && base > 0;
                      const changed = base > 0 && amount > 0 && amount !== base;
                      return (
                        <div key={m.id} className="flex items-center justify-between gap-3 rounded-xl p-2">
                          <span className="flex min-w-0 items-center gap-3">
                            <PayeeAvatar name={m.name} size="md" />
                            <span className="flex min-w-0 flex-col">
                              <span className={cn("truncate text-[14px]", leftOut ? "text-muted-foreground" : "text-foreground")}>{m.name}</span>
                              <span className="truncate text-[12px] text-muted-foreground">
                                {leftOut ? "Left out" : changed ? `Was ${formatMoney(base, "GHS", true)}` : m.networkOrBank}
                              </span>
                            </span>
                          </span>
                          <span className="tabular shrink-0 text-[14px] text-foreground">{formatMoney(amount, "GHS", true)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Field>
            )}

            {/* What the members get, in one line. The review adds the fee and the total debit. */}
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

      {editGroupModal}
    </div>
  );
}
