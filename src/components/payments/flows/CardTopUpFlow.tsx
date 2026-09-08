"use client";

import { useState, useMemo, useEffect } from "react";
import { CreditCard } from "lucide-react";
import { Account, CARDS, formatMoney } from "@/lib/mock-data";
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

  const fromAccount = useMemo(
    () => accounts.find((a) => a.id === state.fromId) ?? accounts[0],
    [accounts, state.fromId]
  );

  const fundableCards = useMemo(() => {
    const list = CARDS.filter((c) => c.fundable && c.status === "Active");
    return list.length > 0 ? list : CARDS.filter((c) => c.status === "Active");
  }, []);

  const selectedCard = useMemo(() => {
    return fundableCards.find((c) => c.id === state.cardId) ?? fundableCards[0];
  }, [fundableCards, state.cardId]);

  useEffect(() => {
    if (!state.cardId && selectedCard) {
      onChange("cardId", selectedCard.id);
    }
  }, [state.cardId, selectedCard, onChange]);

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
      <div className="flex flex-col gap-2">
        <label className="text-[14px] font-medium text-foreground">Destination Card</label>
        {selectedCard && isCollapsed ? (
          <CollapsedDetailsBadge
            title={selectedCard.name}
            subtitle={`${selectedCard.scheme} ${selectedCard.type} (${selectedCard.maskedNumber}) · Current: ${formatMoney(selectedCard.balance ?? 0, selectedCard.currency, true)}`}
            onChange={() => setCollapsed(false)}
          />
        ) : (
          <Select
            value={state.cardId || ""}
            onValueChange={(val) => {
              if (val) {
                onChange("cardId", val);
              }
            }}
          >
            <SelectTrigger className="h-[68px] min-h-[68px] px-4 w-full rounded-2xl border border-border/80 bg-card text-left shadow-none flex items-center">
              {!selectedCard ? (
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
                    <CreditCard size={18} strokeWidth={1.8} />
                  </span>
                  <span className="text-[15px] text-muted-foreground font-normal">
                    Select destination card
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between min-w-0 flex-1 gap-3">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
                      <CreditCard size={18} strokeWidth={1.8} />
                    </span>
                    <div className="flex flex-col min-w-0 text-left gap-0.5">
                      <span className="text-[15px] text-foreground font-medium truncate leading-tight">
                        {selectedCard.name}
                      </span>
                      <span className="text-[13px] text-muted-foreground font-normal truncate leading-tight">
                        {selectedCard.scheme} {selectedCard.type} ? {selectedCard.maskedNumber}
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
                  {c.name} ({c.maskedNumber}) — {formatMoney(c.balance ?? 0, c.currency, true)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* 3. Amount */}
      <AmountInput
        value={state.amount}
        onChange={(val) => onChange("amount", val)}
        currency={selectedCard?.currency || "GHS"}
        label={`Top up Amount (${selectedCard?.currency || "GHS"})`}
        onFocus={() => {
          if (selectedCard) setCollapsed(true);
        }}
      />

      {/* 4. Narration */}
      <NarrationInput
        value={state.narration}
        onChange={(val) => onChange("narration", val)}
        placeholder="Card top up"
      />

      {/* 5. Transaction Category (Optional) */}
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
        label="Top up Card"
      />
    </div>
  );
}
