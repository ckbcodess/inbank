"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { CreditCard } from "lucide-react";
import { Account, cardsForProfile, formatMoney } from "@/lib/mock-data";
import { useSession } from "@/lib/session-store";
import { getEffectiveCardsForProfile, useCardsDevStore } from "@/lib/cards-dev-store";
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
  SchedulePaymentSection,
  ScheduleFrequency,
} from "./shared";

import { Field } from "@/components/ui/field";
export interface CardTopUpFormState {
  fromId: string;
  cardId: string;
  amount: string;
  narration: string;
  category: string;
  isScheduled?: boolean;
  scheduleDate?: string;
  scheduleFrequency?: ScheduleFrequency;
  scheduleEndDate?: string;
}

interface CardTopUpFlowProps {
  accounts: Account[];
  state: CardTopUpFormState;
  onChange: (key: keyof CardTopUpFormState, value: string | boolean | ScheduleFrequency | undefined) => void;
  onProceed: () => void;
  detailsCollapsed?: boolean;
  onToggleCollapsed?: (collapsed: boolean) => void;
}

export function CardTopUpFlow({
  accounts,
  state,
  onChange,
  onProceed,
  detailsCollapsed,
  onToggleCollapsed,
}: CardTopUpFlowProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(detailsCollapsed ?? false);
  const isCollapsed = detailsCollapsed !== undefined ? detailsCollapsed : internalCollapsed;

  const setCollapsed = (val: boolean) => {
    setInternalCollapsed(val);
    onToggleCollapsed?.(val);
  };

  const activeProfile = useSession((s) => s.activeProfile);
  const devState = useCardsDevStore();
  const profileKind = activeProfile?.kind ?? "RETAIL";

  const fromAccount = useMemo(
    () => accounts.find((a) => a.id === state.fromId) ?? accounts[0],
    [accounts, state.fromId]
  );

  // Strictly filter to the current customer's own GCB cards
  const myCards = useMemo(() => {
    const raw = cardsForProfile(profileKind);
    const { cards } = getEffectiveCardsForProfile(profileKind, raw, devState);
    return cards;
  }, [profileKind, devState]);

  // Card top-up is only applicable for the user's active GCB Prepaid and Virtual cards (which hold their own balance)
  const fundableCards = useMemo(() => {
    const list = myCards.filter((c) => c.fundable && c.status === "Active");
    if (state.cardId && !list.some((c) => c.id === state.cardId)) {
      const match = myCards.find((c) => c.id === state.cardId);
      if (match) list.unshift(match);
    }
    return list;
  }, [myCards, state.cardId]);

  const selectedCard = useMemo(() => {
    if (!state.cardId) return undefined;
    return fundableCards.find((c) => c.id === state.cardId) ?? myCards.find((c) => c.id === state.cardId);
  }, [fundableCards, myCards, state.cardId]);

  const numAmount = Number(state.amount.replace(/[^0-9.]/g, "")) || 0;
  const overBalance = numAmount > (fromAccount?.available ?? 0);
  const isValid = Boolean(state.fromId) && Boolean(selectedCard) && numAmount > 0 && !overBalance;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200 ease-out">
      {/* 1. From Account */}
      <FromAccountSelector
        accounts={accounts}
        value={state.fromId}
        onChange={(id) => onChange("fromId", id)}
      />

      {/* 2. Destination Card */}
      <Field label="Destination Card">
        {selectedCard && isCollapsed ? (
          <CollapsedDetailsBadge
            title={`GCB ${selectedCard.name}`}
            subtitle={`GCB ${selectedCard.type} · ${selectedCard.scheme} · ${selectedCard.maskedNumber}`}
            icon={<CreditCard size={18} strokeWidth={1.8} className="shrink-0" />}
            onChange={() => setCollapsed(false)}
          />
        ) : fundableCards.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-4 text-center space-y-2">
            <p className="text-[13.5px] font-medium text-foreground">No eligible GCB cards to top up</p>
            <p className="text-[12px] text-muted-foreground max-w-sm mx-auto">
              Card top-ups apply to GCB Prepaid and Virtual cards. GCB Debit cards draw directly from your bank account.
            </p>
            <Link
              href="/cards/request"
              className="inline-flex items-center justify-center rounded-xl bg-primary px-3.5 py-2 text-[12.5px] font-medium text-primary-foreground hover:bg-primary/90 transition-colors mt-1"
            >
              Request a GCB Card
            </Link>
          </div>
        ) : (
          <Select
            value={state.cardId || ""}
            onValueChange={(val) => {
              if (val) {
                onChange("cardId", val);
              }
            }}
          >
            <SelectTrigger className="h-[58px] min-h-[58px] rounded-2xl px-4.5 text-left flex items-center">
              {!selectedCard ? (
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="flex size-9 shrink-0 items-center justify-center text-muted-foreground">
                    <CreditCard size={20} strokeWidth={1.8} className="shrink-0" />
                  </span>
                  <span className="text-[14px] text-muted-foreground font-normal">
                    Select your GCB card
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between min-w-0 flex-1 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex size-9 shrink-0 items-center justify-center text-foreground">
                      <CreditCard size={20} strokeWidth={1.8} className="shrink-0" />
                    </span>
                    <div className="flex flex-col min-w-0 text-left gap-0.5">
                      <span className="text-[14.5px] text-foreground font-medium truncate leading-tight">
                        GCB {selectedCard.name}
                      </span>
                      <span className="text-[12px] text-muted-foreground font-normal truncate leading-tight">
                        GCB {selectedCard.type} · {selectedCard.scheme} · {selectedCard.maskedNumber}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[14px] text-foreground font-semibold tabular block">
                      {formatMoney(selectedCard.balance ?? 0, selectedCard.currency, true)}
                    </span>
                    <span className="text-[11.5px] text-muted-foreground font-normal">Balance</span>
                  </div>
                </div>
              )}
            </SelectTrigger>
            <SelectContent>
              {fundableCards.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  GCB {c.name} ({c.maskedNumber}) — {formatMoney(c.balance ?? 0, c.currency, true)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </Field>

      {/* Progressive Disclosure: Only reveal Amount & onwards after card is selected */}
      {Boolean(selectedCard) && (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-top-2 duration-200 ease-out">
          {/* 3. Amount */}
          <AmountInput
            value={state.amount}
            onChange={(val) => onChange("amount", val)}
            onFocus={() => {
              if (selectedCard) setCollapsed(true);
            }}
            currency="GHS"
            label="Enter Amount"
            error={
              overBalance ? (
                <InsufficientFundsAlert />
              ) : undefined
            }
          />

          {/* 4. Narration */}
          <NarrationInput
            value={state.narration}
            onChange={(val) => onChange("narration", val)}
            placeholder="Card top up"
          />

          {/* 5. Transaction Category */}
          <CategorySelect
            value={state.category}
            onChange={(val) => onChange("category", val)}
          />

          {/* 6. Schedule Payment */}
          <SchedulePaymentSection
            state={{
              enabled: state.isScheduled ?? false,
              startDate: state.scheduleDate || new Date(Date.now() + 86400000).toISOString().split("T")[0],
              frequency: state.scheduleFrequency || "once",
              endDate: state.scheduleEndDate || "",
            }}
            onChange={(updates) => {
              if (updates.enabled !== undefined) onChange("isScheduled", updates.enabled);
              if (updates.startDate !== undefined) onChange("scheduleDate", updates.startDate);
              if (updates.frequency !== undefined) onChange("scheduleFrequency", updates.frequency);
              if (updates.endDate !== undefined) onChange("scheduleEndDate", updates.endDate);
            }}
          />

          {/* 7. Proceed CTA */}
          <ProceedButton
            disabled={!isValid}
            onClick={onProceed}
            label="Top Up Card"
          />
        </div>
      )}
    </div>
  );
}
