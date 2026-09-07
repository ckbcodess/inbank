"use client";

import { useMemo } from "react";
import { Landmark, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Account, formatMoney } from "@/lib/mock-data";

export interface OwnAccountFormState {
  fromId: string;
  toOwnAccountId: string;
  amount: string;
  narration: string;
  category: string;
}

interface OwnAccountFlowProps {
  accounts: Account[];
  state: OwnAccountFormState;
  onChange: (key: keyof OwnAccountFormState, value: string) => void;
  onProceed: () => void;
}

export function OwnAccountFlow({
  accounts,
  state,
  onChange,
  onProceed,
}: OwnAccountFlowProps) {
  const fromAccount = useMemo(
    () => accounts.find((a) => a.id === state.fromId) ?? accounts[0],
    [accounts, state.fromId]
  );

  const toAccount = useMemo(
    () => accounts.find((a) => a.id === state.toOwnAccountId),
    [accounts, state.toOwnAccountId]
  );

  const numAmount = Number(state.amount.replace(/[^0-9.]/g, "")) || 0;
  const overBalance = numAmount > (fromAccount?.available ?? 0);
  const isValid =
    Boolean(state.fromId) &&
    Boolean(state.toOwnAccountId) &&
    state.fromId !== state.toOwnAccountId &&
    numAmount > 0 &&
    !overBalance;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200 ease-out">
      {/* 1. From Account */}
      <div className="flex flex-col gap-2">
        <label className="text-[14px] font-medium text-foreground">From Account</label>
        <Select
          value={state.fromId}
          onValueChange={(val) => {
            if (val) {
              onChange("fromId", val);
              if (state.toOwnAccountId === val) {
                onChange("toOwnAccountId", "");
              }
            }
          }}
        >
          <SelectTrigger className="h-auto min-h-[72px] py-3.5 px-4 w-full rounded-2xl border border-border/80 bg-card hover:bg-muted/20 text-left cursor-pointer transition-colors shadow-none">
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Landmark size={19} strokeWidth={1.8} />
              </span>
              <div className="flex flex-col min-w-0 text-left gap-0.5">
                <span className="text-[15px] text-foreground font-medium tracking-[-0.01em] truncate leading-tight">
                  {fromAccount?.name || "Select Account"}
                </span>
                <span className="text-[13px] text-muted-foreground font-normal truncate tabular leading-tight">
                  {fromAccount?.number || ""}
                </span>
                <span className="text-[12.5px] text-muted-foreground font-normal truncate tabular leading-tight mt-0.5">
                  Balance: {formatMoney(fromAccount?.available ?? 0, fromAccount?.currency || "GHS", true)}
                </span>
              </div>
            </div>
          </SelectTrigger>
          <SelectContent>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name} ({a.number}) — {formatMoney(a.available, a.currency, true)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 2. To Account */}
      <div className="flex flex-col gap-2">
        <label className="text-[14px] font-medium text-foreground">To Account</label>
        <Select
          value={state.toOwnAccountId}
          onValueChange={(val) => val && onChange("toOwnAccountId", val)}
        >
          <SelectTrigger className="h-auto min-h-[72px] py-3.5 px-4 w-full rounded-2xl border border-border/80 bg-card hover:bg-muted/20 text-left cursor-pointer transition-colors shadow-none">
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Landmark size={19} strokeWidth={1.8} />
              </span>
              <div className="flex flex-col min-w-0 text-left gap-0.5">
                {toAccount ? (
                  <>
                    <span className="text-[15px] text-foreground font-medium tracking-[-0.01em] truncate leading-tight">
                      {toAccount.name}
                    </span>
                    <span className="text-[13px] text-muted-foreground font-normal truncate tabular leading-tight">
                      {toAccount.number}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[15px] text-muted-foreground font-medium tracking-[-0.01em] truncate leading-tight">
                      Select destination account
                    </span>
                    <span className="text-[12.5px] text-muted-foreground/70 font-normal truncate leading-tight">
                      Choose from your accounts
                    </span>
                  </>
                )}
              </div>
            </div>
          </SelectTrigger>
          <SelectContent>
            {accounts
              .filter((a) => a.id !== state.fromId)
              .map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name} ({a.number}) — {formatMoney(a.available, a.currency, true)}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* 3. Amount */}
      <div className="flex flex-col gap-2">
        <label className="text-[14px] font-medium text-foreground">Amount</label>
        <div className="relative flex items-center justify-center rounded-2xl border border-border/80 bg-card py-4 px-4">
          <span className="text-[17px] font-medium text-muted-foreground mr-2">GHS</span>
          <input
            type="text"
            inputMode="decimal"
            value={state.amount}
            onChange={(e) => {
              const val = e.target.value.replace(/[^\d.]/g, "");
              onChange("amount", val);
            }}
            placeholder="0"
            className="bg-transparent text-[28px] font-semibold text-foreground tracking-tight outline-none w-48 text-left tabular"
          />
        </div>
      </div>

      {/* 4. Narration */}
      <div className="flex flex-col gap-2">
        <label className="text-[14px] font-medium text-foreground">Narration</label>
        <input
          type="text"
          value={state.narration}
          onChange={(e) => onChange("narration", e.target.value)}
          placeholder=""
          className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all"
        />
      </div>

      {/* 5. Transaction Category (Optional) */}
      <div className="flex flex-col gap-2">
        <label className="text-[14px] font-medium text-foreground">Transaction Category (Optional)</label>
        <Select
          value={state.category}
          onValueChange={(val) => onChange("category", val || "")}
        >
          <SelectTrigger className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground shadow-none">
            <SelectValue placeholder="" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="General">General</SelectItem>
            <SelectItem value="Savings">Savings</SelectItem>
            <SelectItem value="Family & Friends">Family & Friends</SelectItem>
            <SelectItem value="Living Expenses">Living Expenses</SelectItem>
            <SelectItem value="Business">Business</SelectItem>
            <SelectItem value="Utilities">Utilities</SelectItem>
            <SelectItem value="Rent">Rent</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {overBalance && (
        <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-[12.5px] text-destructive animate-in fade-in duration-150 ease-out">
          <AlertCircle size={15} className="mt-0.5 shrink-0 text-destructive" />
          <div>
            <span className="font-semibold">Insufficient funds.</span> Transfer amount exceeds your available balance ({formatMoney(fromAccount?.available ?? 0, fromAccount?.currency || "GHS", true)}).
          </div>
        </div>
      )}

      {/* 6. Proceed CTA */}
      <div className="pt-2">
        <Button
          type="button"
          className="w-full h-13 rounded-2xl text-[16px] font-medium bg-primary text-primary-foreground drop-shadow-sm active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
          disabled={!isValid}
          onClick={onProceed}
        >
          Proceed
        </Button>
      </div>
    </div>
  );
}
