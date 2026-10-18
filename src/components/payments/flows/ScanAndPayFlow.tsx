"use client";

import { useState, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  Check,
  Store,
  Fuel,
  ShoppingCart,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Account } from "@/lib/mock-data";
import {
  FromAccountSelector,
  AmountInput,
  NarrationInput,
  CategorySelect,
  InsufficientFundsAlert,
  ProceedButton,
  CollapsedDetailsBadge,
} from "./shared";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { GCBLogo } from "@/components/ui/GCBLogo";
import { QrCode } from "@/components/ui/qr-code";
import { useSession } from "@/lib/session-store";

export interface ScanAndPayFormState {
  fromId: string;
  qrMerchant: string;
  qrCode: string;
  amount: string;
  narration: string;
  category: string;
}

const SAMPLE_MERCHANTS = [
  { name: "Melcom Plus — Kaneshie", code: "GCB-QR-88210", city: "Accra", icon: Store },
  { name: "Shell Service Station — Airport City", code: "GCB-QR-14092", city: "Accra", icon: Fuel },
  { name: "Shoprite — Accra Mall", code: "GCB-QR-55129", city: "Accra", icon: ShoppingCart },
  { name: "Starbites Food & Drink — East Legon", code: "GCB-QR-33104", city: "Accra", icon: UtensilsCrossed },
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
  detailsCollapsed,
  onToggleCollapsed,
}: ScanAndPayFlowProps) {
  const searchParams = useSearchParams();
  const initialMode = searchParams?.get("mode") === "scan" ? "scan" : "myqr";
  const [activeMode, setActiveMode] = useState<"scan" | "myqr">(initialMode);

  // Terminal ID modal dialog state
  const [terminalDialogOpen, setTerminalDialogOpen] = useState(false);
  const [terminalInput, setTerminalInput] = useState("");

  // Hidden file input ref for gallery selection
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // My QR state: default to primary account, allows switching for multi-account users
  const [receiveAccountId, setReceiveAccountId] = useState(accounts[0]?.id || "");
  const receiveAccount = useMemo(
    () => accounts.find((a) => a.id === receiveAccountId) ?? accounts[0],
    [accounts, receiveAccountId]
  );

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

  const parsedAmount = parseFloat(state.amount) || 0;
  const hasInsufficientFunds = Boolean(fromAccount && parsedAmount > fromAccount.available);
  const isMerchantSelected = Boolean(state.qrMerchant.trim());
  const canProceed = Boolean(isMerchantSelected && parsedAmount > 0 && !hasInsufficientFunds);

  function handleSelectMerchant(m: (typeof SAMPLE_MERCHANTS)[0]) {
    onChange("qrMerchant", m.name);
    onChange("qrCode", m.code);
    if (!state.narration) {
      onChange("narration", `Purchase at ${m.name.split("—")[0].trim()}`);
    }
  }

  function handleConfirmTerminal(code: string) {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    const found = SAMPLE_MERCHANTS.find((m) => m.code === trimmed);
    if (found) {
      handleSelectMerchant(found);
      toast.success(`Connected to ${found.name}`);
    } else {
      onChange("qrMerchant", `Merchant Terminal (${trimmed})`);
      onChange("qrCode", trimmed);
      if (!state.narration) {
        onChange("narration", `Payment to Terminal ${trimmed}`);
      }
      toast.success(`Terminal ${trimmed} verified`);
    }
    setTerminalDialogOpen(false);
  }

  function handleClearMerchant() {
    onChange("qrMerchant", "");
    onChange("qrCode", "");
    setCollapsed(false);
  }

  function handleGalleryUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      // Simulate scanning decoded QR code from image
      const randomMerchant = SAMPLE_MERCHANTS[Math.floor(Math.random() * SAMPLE_MERCHANTS.length)];
      handleSelectMerchant(randomMerchant);
      toast.success(`Scanned QR code: ${randomMerchant.name}`);
    }
    // Reset file input so user can choose the same file again if needed
    e.target.value = "";
  }

  const actor = useSession((s) => s.actor);
  const userName = actor?.name || "Ransford Gyasi";

  const handleShareMyQr = async () => {
    const shareText = `GCB GhQR Payment Details\nName: ${userName}\nAccount: ${receiveAccount?.name || "Operating Account"} (∗∗∗∗ ${receiveAccount?.number?.replace(/\s+/g, "").slice(-4) || "0313"})\nBank: GCB Bank PLC`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "My GCB QR Code",
          text: shareText,
        });
        return;
      } catch {
        // Fallback to clipboard copy
      }
    }
    await navigator.clipboard.writeText(shareText);
    toast.success("Account QR details copied to clipboard");
  };

  const handleDownloadMyQr = () => {
    toast.success("Personal QR code image saved to downloads");
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ── STAGE A: IDENTIFY / VIEW QR (When no merchant is selected yet) ── */}
      {!isMerchantSelected ? (
        <div className="flex flex-col w-full max-w-xl mx-auto min-h-[calc(100dvh-200px)] sm:min-h-[calc(100dvh-240px)]">
          {/* Segmented Control Switcher stays anchored at top */}
          <SegmentedControl
            aria-label="QR Mode"
            value={activeMode}
            onChange={(val) => setActiveMode(val as "scan" | "myqr")}
            fullWidth
            options={[
              { value: "myqr", label: "My QR" },
              { value: "scan", label: "Scan & Pay" },
            ]}
          />

          {/* Mode 1: My QR — centered in remaining space below toggles */}
          {activeMode === "myqr" ? (
            <div className="flex flex-1 flex-col justify-center gap-6 my-auto pt-6 animate-in fade-in duration-200">
              {/* Canvas with identical footprint without border so buttons don't shift */}
              <div className="relative flex min-h-[46vh] sm:min-h-0 sm:aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-2xl p-4">
                {/* Centered QR Container */}
                <div className="flex flex-col items-center justify-center text-foreground p-2 w-[320px] sm:w-[350px]">
                  <QrCode
                    value={`00020101021226500010com.ghana.pay0115GCB-0313-982105204541153039365802GH59${String(userName.length).padStart(2, "0")}${userName.toUpperCase()}6005ACCRA62140110GCB03139826304${(receiveAccount?.number || "0313").replace(/\s+/g, "").slice(-4)}`}
                    size={260}
                    className="size-auto text-neutral-950 dark:text-neutral-50"
                    moduleColor="currentColor"
                    bgColor="transparent"
                    centerLogo={
                      <div className="flex items-center justify-center">
                        <GCBLogo
                          className="w-12 h-auto"
                          eagleColor="#FFC423"
                          wordmarkColor="currentColor"
                        />
                      </div>
                    }
                  />
                  <div className="mt-4 flex flex-col items-center text-center">
                    <span className="text-[14.5px] font-semibold text-foreground tracking-tight">{userName}</span>
                    <span className="text-[12px] text-muted-foreground font-mono mt-0.5">
                      {receiveAccount?.name || "Operating Account"} ∗∗∗∗ {(receiveAccount?.number || "0313").replace(/\s+/g, "").slice(-4)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Account Switcher underneath the QR code — styled like the account fields in Send & Pay */}
              {accounts.length > 1 && (
                <div className="w-full">
                  <FromAccountSelector
                    accounts={accounts}
                    value={receiveAccountId}
                    onChange={(id: string) => {
                      setReceiveAccountId(id);
                      const selected = accounts.find((a) => a.id === id);
                      if (selected) {
                        toast.success(`Receiving account changed to ${selected.name}`);
                      }
                    }}
                    label="Receiving Account"
                    placeholder="Select account to receive funds"
                  />
                </div>
              )}

              {/* Two Action Buttons: Outline on left, Primary on right */}
              <div className="flex w-full items-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-12 text-[14px] font-medium rounded-xl border-border/80 bg-background hover:bg-muted text-foreground transition-colors cursor-pointer"
                  onClick={handleShareMyQr}
                >
                  Share QR Code
                </Button>
                <Button
                  type="button"
                  className="flex-1 h-12 text-[14px] font-medium rounded-xl bg-primary text-primary-foreground hover:bg-primary-hover shadow-xs cursor-pointer"
                  onClick={handleDownloadMyQr}
                >
                  Download
                </Button>
              </div>
            </div>
          ) : (
            /* Mode 2: Scan & Pay — centered in remaining space below toggles */
            <div className="flex flex-1 flex-col justify-center gap-6 my-auto pt-6 animate-in fade-in duration-200">
              {/* Viewfinder Canvas (Solid black camera feed look) */}
              <div
                className="relative flex min-h-[58vh] sm:min-h-0 sm:aspect-[4/3] w-full flex-col items-center justify-center overflow-hidden rounded-2xl bg-black border border-black/80 text-white cursor-pointer group shadow-md"
                onClick={() => {
                  // Convenience: clicking viewport simulates scanning a merchant
                  const sample = SAMPLE_MERCHANTS[0];
                  handleSelectMerchant(sample);
                  toast.success(`Scanned QR code: ${sample.name}`);
                }}
                title="Tap to scan or select from gallery below"
              >
                {/* Crosshairs Viewfinder target box */}
                <div className="relative size-44 sm:size-52 flex flex-col items-center justify-center transition-transform duration-300 group-hover:scale-[1.02]">
                  {/* Four Corner Crosshair Brackets matching user reference */}
                  <svg
                    viewBox="0 0 200 200"
                    className="size-full pointer-events-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {/* Top-Left */}
                    <path
                      d="M 14 54 L 14 30 A 16 16 0 0 1 30 14 L 54 14"
                      stroke="#FFFFFF"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                    {/* Top-Right */}
                    <path
                      d="M 146 14 L 170 14 A 16 16 0 0 1 186 30 L 186 54"
                      stroke="#FFFFFF"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                    {/* Bottom-Left */}
                    <path
                      d="M 14 146 L 14 170 A 16 16 0 0 0 30 186 L 54 186"
                      stroke="#FFFFFF"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                    {/* Bottom-Right */}
                    <path
                      d="M 146 186 L 170 186 A 16 16 0 0 0 186 170 L 186 146"
                      stroke="#FFFFFF"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                {/* Subtitle helper placed directly underneath the crosshairs */}
                <p className="mt-4 text-center px-4 text-[13.5px] font-medium text-white/90 tracking-tight drop-shadow-sm">
                  Scan the QR code to pay
                </p>

                {/* Hidden gallery file input */}
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleGalleryUpload}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              {/* Two Action Buttons: Outline on left, Primary on right */}
              <div className="flex w-full items-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-12 text-[14px] font-medium rounded-xl border-border/80 bg-background hover:bg-muted text-foreground transition-colors cursor-pointer"
                  onClick={() => galleryInputRef.current?.click()}
                >
                  Select from Gallery
                </Button>
                <Button
                  type="button"
                  className="flex-1 h-12 text-[14px] font-medium rounded-xl bg-primary text-primary-foreground hover:bg-primary-hover shadow-xs cursor-pointer"
                  onClick={() => {
                    setTerminalInput("");
                    setTerminalDialogOpen(true);
                  }}
                >
                  Enter Merchant ID
                </Button>
              </div>
            </div>
          )}

          {/* Merchant ID Dialog Modal (matching user reference mockup with theme awareness) */}
          <Dialog open={terminalDialogOpen} onOpenChange={setTerminalDialogOpen}>
            <DialogContent size="sm" className="rounded-3xl p-0 overflow-hidden shadow-2xl border border-border/70 bg-card text-foreground">
              {/* Header: Title on left, close on right */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
                <span className="text-[16px] font-medium text-foreground tracking-tight">
                  Merchant ID
                </span>
                <button
                  type="button"
                  onClick={() => setTerminalDialogOpen(false)}
                  className="flex size-7 items-center justify-center rounded-full bg-muted/80 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X size={15} strokeWidth={2} />
                </button>
              </div>

              {/* Body: Centered store icon, headline, and pill-bordered input */}
              <div className="flex flex-col items-center px-6 pt-7 pb-6">
                {/* Green store badge */}
                <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 shadow-sm mb-4">
                  <Store size={22} strokeWidth={1.75} />
                </div>

                {/* Headline */}
                <h3 className="text-[20px] sm:text-[22px] font-semibold text-foreground tracking-tight text-center mb-5">
                  Enter the merchant ID
                </h3>

                {/* Centered input */}
                <div className="w-full">
                  <Input
                    id="terminal-input-id"
                    value={terminalInput}
                    onChange={(e) => setTerminalInput(e.target.value.toUpperCase())}
                    placeholder="E.G. GCB-QR-88210"
                    className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-center font-mono uppercase text-[15px] tracking-wider placeholder:text-muted-foreground/60 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && terminalInput.trim()) {
                        e.preventDefault();
                        handleConfirmTerminal(terminalInput);
                      }
                    }}
                  />
                </div>
              </div>

              {/* Footer: Right-aligned Cancel button (and Continue if text is typed) */}
              <div className="flex items-center justify-end px-6 py-4 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setTerminalDialogOpen(false)}
                  className="text-[14px] font-medium text-muted-foreground hover:text-foreground px-2 py-1 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                {terminalInput.trim() && (
                  <Button
                    type="button"
                    className="ml-3 h-9 px-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary-hover font-medium shadow-xs cursor-pointer"
                    onClick={() => handleConfirmTerminal(terminalInput)}
                  >
                    Continue
                  </Button>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        /* ── STAGE B: MERCHANT IDENTIFIED -> PAYMENT DETAILS ── */
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-top-2 duration-200 ease-out">
          {/* Source Account Selector */}
          <FromAccountSelector
            accounts={accounts}
            value={state.fromId}
            onChange={(id: string) => onChange("fromId", id)}
          />

          {/* Identified Merchant Card */}
          <Field label="Merchant Details">
            {isCollapsed ? (
              <CollapsedDetailsBadge
                title={state.qrMerchant}
                subtitle={`Terminal: ${state.qrCode || "Verified GCB QR"}`}
                icon={<Store size={18} className="text-primary" />}
                nameCheck={{ confirmed: true }}
                onChange={() => setCollapsed(false)}
              />
            ) : (
              <div className="flex items-center justify-between rounded-xl border border-success/30 bg-success/5 p-3.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-success/15 text-success">
                    <Store size={20} strokeWidth={1.8} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[14px] font-medium text-foreground truncate">
                        {state.qrMerchant}
                      </span>
                      <span className="flex size-3.5 shrink-0 items-center justify-center rounded-full bg-success text-success-foreground shadow-xs">
                        <Check size={9} strokeWidth={3} className="shrink-0" />
                      </span>
                    </div>
                    <span className="text-[11.5px] text-muted-foreground font-mono">
                      Terminal: {state.qrCode || "Universal QR Verified"}
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearMerchant}
                  className="text-xs text-muted-foreground hover:text-foreground h-8 px-2.5 cursor-pointer"
                  aria-label="Change merchant"
                >
                  Change
                </Button>
              </div>
            )}
          </Field>

          {/* Amount Input */}
          <AmountInput
            value={state.amount}
            onChange={(val: string) => onChange("amount", val)}
            onFocus={() => {
              setCollapsed(true);
            }}
            currency="GHS"
            error={hasInsufficientFunds ? <InsufficientFundsAlert /> : undefined}
          />

          {/* Narration */}
          <NarrationInput
            value={state.narration}
            onChange={(val: string) => onChange("narration", val)}
            placeholder="e.g. Counter Checkout / Table 4"
          />

          {/* Category */}
          <CategorySelect
            value={state.category}
            onChange={(val: string) => onChange("category", val)}
          />

          {/* Action Button */}
          <ProceedButton
            disabled={!canProceed}
            onClick={onProceed}
            label="Review & Pay Merchant"
          />
        </div>
      )}
    </div>
  );
}
