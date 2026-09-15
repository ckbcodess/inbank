"use client";

import React, { useState, useMemo } from "react";
import {
  Camera,
  CheckCircle2,
  Flashlight,
  QrCode,
  Store,
  Upload,
  X,
} from "lucide-react";
import { Account, formatMoney } from "@/lib/mock-data";
import {
  FromAccountSelector,
  AmountInput,
  NarrationInput,
  InsufficientFundsAlert,
  ProceedButton,
  CollapsedDetailsBadge,
} from "./shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export interface ScanAndPayFormState {
  fromId: string;
  qrMerchant: string;
  qrCode: string;
  amount: string;
  narration: string;
  category: string;
}

const SAMPLE_MERCHANTS = [
  { name: "Melcom Plus — Kaneshie", code: "GCB-QR-88210", city: "Accra", icon: "🏪" },
  { name: "Shell Service Station — Airport City", code: "GCB-QR-14092", city: "Accra", icon: "⛽" },
  { name: "Shoprite — Accra Mall", code: "GCB-QR-55129", city: "Accra", icon: "🛒" },
  { name: "Starbites Food & Drink — East Legon", code: "GCB-QR-33104", city: "Accra", icon: "🍽️" },
];

interface ScanAndPayFlowProps {
  accounts: Account[];
  state: ScanAndPayFormState;
  onChange: (key: keyof ScanAndPayFormState, value: string) => void;
  onProceed: () => void;
  detailsCollapsed?: boolean;
  onToggleCollapsed?: (collapsed: boolean) => void;
}

export function ScanAndPayFlow({
  accounts,
  state,
  onChange,
  onProceed,
  detailsCollapsed = false,
  onToggleCollapsed,
}: ScanAndPayFlowProps) {
  const [activeTab, setActiveTab] = useState<"camera" | "manual">("camera");
  const [flashlight, setFlashlight] = useState(false);

  const fromAccount = useMemo(
    () => accounts.find((a) => a.id === state.fromId) ?? accounts[0],
    [accounts, state.fromId]
  );

  const parsedAmount = parseFloat(state.amount) || 0;
  const hasInsufficientFunds = Boolean(fromAccount && parsedAmount > fromAccount.available);
  const isMerchantSelected = Boolean(state.qrMerchant.trim());
  const canProceed = Boolean(isMerchantSelected && parsedAmount > 0 && !hasInsufficientFunds);

  function handleSelectMerchant(m: (typeof SAMPLE_MERCHANTS)[0]) {
    onChange("qrMerchant", m.name);
    onChange("qrCode", m.code);
    if (!state.narration) {
      onChange("narration", `Purchase at ${m.name}`);
    }
  }

  function handleClearMerchant() {
    onChange("qrMerchant", "");
    onChange("qrCode", "");
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── STAGE 1: MERCHANT & QR CODE INPUT ── */}
      <div className="flex flex-col gap-4">
        {detailsCollapsed && isMerchantSelected ? (
          <CollapsedDetailsBadge
            title={state.qrMerchant}
            subtitle={`Terminal: ${state.qrCode || "Verified GCB QR"}`}
            icon={<QrCode size={18} className="text-primary" />}
            onChange={() => onToggleCollapsed?.(false)}
          />
        ) : (
          <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-medium text-foreground flex items-center gap-2">
                <QrCode size={18} className="text-primary" />
                Scan or Enter Merchant Code
              </span>
              <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 bg-muted/30">
                <button
                  type="button"
                  onClick={() => setActiveTab("camera")}
                  className={`px-2.5 py-1 text-[11.5px] font-medium rounded-md transition-colors cursor-pointer ${
                    activeTab === "camera"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Scanner
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("manual")}
                  className={`px-2.5 py-1 text-[11.5px] font-medium rounded-md transition-colors cursor-pointer ${
                    activeTab === "manual"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Enter ID
                </button>
              </div>
            </div>

            {/* Viewfinder Scanner Tab */}
            {activeTab === "camera" && !isMerchantSelected && (
              <div className="flex flex-col gap-3">
                <div className="relative flex aspect-video w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-border bg-[#111] text-white">
                  {/* Viewfinder Target Box */}
                  <div className="relative size-44 rounded-2xl border-2 border-dashed border-amber-400/80 bg-white/5 flex items-center justify-center">
                    <div className="absolute inset-x-2 top-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-pulse shadow-[0_0_8px_#f59e0b]" />
                    <Camera size={28} className="text-white/40" />
                  </div>

                  {/* Flashlight toggle */}
                  <button
                    type="button"
                    onClick={() => setFlashlight(!flashlight)}
                    className={`absolute bottom-3 right-3 flex size-8 items-center justify-center rounded-full transition-colors cursor-pointer ${
                      flashlight ? "bg-amber-400 text-black" : "bg-white/10 text-white hover:bg-white/20"
                    }`}
                    aria-label="Toggle flashlight"
                  >
                    <Flashlight size={14} />
                  </button>

                  <span className="absolute bottom-3 left-4 text-[11px] text-white/60">
                    Align GCB GhanaPay or Universal QR inside frame
                  </span>
                </div>

                {/* Quick Simulation Selectors */}
                <div className="flex flex-col gap-2 pt-1">
                  <span className="text-[11.5px] text-muted-foreground">
                    Or select a verified merchant to simulate scan:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {SAMPLE_MERCHANTS.map((m) => (
                      <button
                        key={m.code}
                        type="button"
                        onClick={() => handleSelectMerchant(m)}
                        className="flex items-center gap-2.5 rounded-xl border border-border bg-muted/20 p-2.5 text-left transition-colors hover:bg-muted/60 hover:border-primary/40 cursor-pointer"
                      >
                        <span className="text-lg shrink-0">{m.icon}</span>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[12.5px] font-medium text-foreground truncate">{m.name}</span>
                          <span className="text-[11px] text-muted-foreground font-mono">{m.code}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Manual ID Input Tab */}
            {activeTab === "manual" && !isMerchantSelected && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="merchant-id" className="text-[13px] text-muted-foreground">
                    Merchant Terminal / PayCode ID
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="merchant-id"
                      value={state.qrCode}
                      onChange={(e) => onChange("qrCode", e.target.value.toUpperCase())}
                      placeholder="e.g. GCB-QR-88210"
                      className="h-11 font-mono uppercase"
                    />
                    <Button
                      type="button"
                      className="h-11 px-4 text-[13px]"
                      onClick={() => {
                        const code = state.qrCode.trim().toUpperCase();
                        const found = SAMPLE_MERCHANTS.find((m) => m.code === code);
                        onChange("qrMerchant", found ? found.name : `Verified Merchant (${code})`);
                      }}
                      disabled={!state.qrCode.trim()}
                    >
                      Verify
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Resolved Merchant Confirmation Banner */}
            {isMerchantSelected && (
              <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <Store size={20} strokeWidth={1.8} />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[14px] font-medium text-foreground">{state.qrMerchant}</span>
                      <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="text-[11.5px] text-muted-foreground font-mono">
                      Terminal: {state.qrCode || "Universal QR Verified"}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClearMerchant}
                  className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                  aria-label="Remove merchant"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── STAGE 2: AMOUNT & SOURCE ACCOUNT ── */}
        {isMerchantSelected && (
          <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-xs animate-in fade-in duration-150">
            <FromAccountSelector
              accounts={accounts}
              value={state.fromId}
              onChange={(id: string) => onChange("fromId", id)}
            />

            <AmountInput
              value={state.amount}
              onChange={(val: string) => onChange("amount", val)}
              currency="GHS"
            />

            <NarrationInput
              value={state.narration}
              onChange={(val: string) => onChange("narration", val)}
              placeholder="e.g. Counter Checkout / Table 4"
            />

            {hasInsufficientFunds && (
              <InsufficientFundsAlert
                available={fromAccount ? fromAccount.available : 0}
                currency={fromAccount ? fromAccount.currency : "GHS"}
              />
            )}

            <ProceedButton
              disabled={!canProceed}
              onClick={onProceed}
              label="Review & Pay Merchant"
            />
          </div>
        )}
      </div>
    </div>
  );
}
