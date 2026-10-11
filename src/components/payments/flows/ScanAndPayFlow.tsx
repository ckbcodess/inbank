"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  Camera,
  Check,
  Flashlight,
  Store,
  Fuel,
  ShoppingCart,
  UtensilsCrossed,
  Share2,
  Download,
  Image as ImageIcon,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GCBLogo } from "@/components/ui/GCBLogo";
import { cn } from "@/lib/utils";

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
  const initialMode = searchParams?.get("mode") === "myqr" ? "myqr" : "scan";
  const [activeMode, setActiveMode] = useState<"scan" | "myqr">(initialMode);

  // My QR state
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
    setCollapsed(false);
  }

  function handleGalleryUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const randomMerchant = SAMPLE_MERCHANTS[0];
      handleSelectMerchant(randomMerchant);
      toast.success(`Scanned QR successfully: ${randomMerchant.name}`);
    }
  }

  const handleShareMyQr = async () => {
    const shareText = `GCB GhQR Payment Details\nName: Kwesi Appiah\nAccount: ${receiveAccount?.name || "Operating Account"} (•••• ${receiveAccount?.number?.replace(/\s+/g, "").slice(-4) || "0313"})\nBank: GCB Bank PLC`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "My GCB QR Code",
          text: shareText,
        });
        return;
      } catch {
        // Fallback to copy
      }
    }
    await navigator.clipboard.writeText(shareText);
    toast.success("Account QR details copied to clipboard");
  };

  const handleDownloadMyQr = () => {
    toast.success("Personal QR code image downloaded to device");
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200 ease-out">
      {/* 1. Mode Switcher: Scan & Pay vs My QR */}
      <div className="flex justify-center">
        <SegmentedControl
          aria-label="QR Mode"
          value={activeMode}
          onChange={(val) => setActiveMode(val as "scan" | "myqr")}
          options={[
            { value: "scan", label: "Scan & Pay" },
            { value: "myqr", label: "My QR" },
          ]}
        />
      </div>

      {/* ── MODE A: MY QR ── */}
      {activeMode === "myqr" ? (
        <div className="flex flex-col gap-6 animate-in fade-in duration-200">
          <Field label="Receiving Account">
            <Select value={receiveAccountId} onValueChange={(val) => val && setReceiveAccountId(val)}>
              <SelectTrigger className="w-full h-12">
                <SelectValue placeholder="Select account to receive into" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    <div className="flex items-center justify-between w-full gap-4">
                      <span>{acc.name}</span>
                      <span className="text-xs text-muted-foreground font-mono">
                        •••• {acc.number.replace(/\s+/g, "").slice(-4)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* Personal QR Display Card */}
          <div className="relative mx-auto flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-border/80 bg-card p-6 text-center shadow-xs">
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex items-center gap-2">
                <GCBLogo className="h-6 w-auto text-foreground" />
                <span className="text-xs font-medium text-foreground tracking-wide uppercase">
                  GCB GhQR
                </span>
              </div>
              <h3 className="text-[17px] font-medium text-foreground pt-1">
                Kwesi Appiah
              </h3>
              <p className="text-[12.5px] text-muted-foreground font-mono">
                {receiveAccount?.name || "Operating Account"} ••••{" "}
                {receiveAccount?.number?.replace(/\s+/g, "").slice(-4) || "0313"}
              </p>
            </div>

            {/* Stylized QR Code Box */}
            <div className="relative flex size-56 items-center justify-center rounded-2xl border border-border/80 bg-white p-4 shadow-xs">
              <svg
                viewBox="0 0 200 200"
                className="size-full"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* 3 Large Corner Position Detection Patterns */}
                <rect x="10" y="10" width="50" height="50" rx="6" fill="#1C1C1E" />
                <rect x="18" y="18" width="34" height="34" rx="3" fill="#FFFFFF" />
                <rect x="25" y="25" width="20" height="20" rx="2" fill="#1C1C1E" />

                <rect x="140" y="10" width="50" height="50" rx="6" fill="#1C1C1E" />
                <rect x="148" y="18" width="34" height="34" rx="3" fill="#FFFFFF" />
                <rect x="155" y="25" width="20" height="20" rx="2" fill="#1C1C1E" />

                <rect x="10" y="140" width="50" height="50" rx="6" fill="#1C1C1E" />
                <rect x="18" y="148" width="34" height="34" rx="3" fill="#FFFFFF" />
                <rect x="25" y="155" width="20" height="20" rx="2" fill="#1C1C1E" />

                {/* Timing patterns & decorative GhQR data blocks */}
                <g fill="#1C1C1E">
                  <rect x="70" y="16" width="10" height="10" rx="1" />
                  <rect x="90" y="16" width="10" height="10" rx="1" />
                  <rect x="110" y="16" width="10" height="10" rx="1" />
                  <rect x="16" y="70" width="10" height="10" rx="1" />
                  <rect x="16" y="90" width="10" height="10" rx="1" />
                  <rect x="16" y="110" width="10" height="10" rx="1" />

                  <rect x="70" y="40" width="10" height="10" rx="1" />
                  <rect x="100" y="40" width="10" height="10" rx="1" />
                  <rect x="120" y="40" width="10" height="10" rx="1" />

                  <rect x="40" y="70" width="10" height="10" rx="1" />
                  <rect x="70" y="70" width="10" height="10" rx="1" />
                  <rect x="120" y="70" width="10" height="10" rx="1" />
                  <rect x="140" y="70" width="10" height="10" rx="1" />
                  <rect x="170" y="70" width="10" height="10" rx="1" />

                  <rect x="40" y="100" width="10" height="10" rx="1" />
                  <rect x="70" y="100" width="10" height="10" rx="1" />
                  <rect x="140" y="100" width="10" height="10" rx="1" />
                  <rect x="160" y="100" width="10" height="10" rx="1" />

                  <rect x="40" y="120" width="10" height="10" rx="1" />
                  <rect x="100" y="120" width="10" height="10" rx="1" />
                  <rect x="120" y="120" width="10" height="10" rx="1" />
                  <rect x="170" y="120" width="10" height="10" rx="1" />

                  <rect x="70" y="140" width="10" height="10" rx="1" />
                  <rect x="110" y="140" width="10" height="10" rx="1" />
                  <rect x="150" y="140" width="10" height="10" rx="1" />

                  <rect x="80" y="160" width="10" height="10" rx="1" />
                  <rect x="120" y="160" width="10" height="10" rx="1" />
                  <rect x="170" y="160" width="10" height="10" rx="1" />

                  <rect x="70" y="180" width="10" height="10" rx="1" />
                  <rect x="100" y="180" width="10" height="10" rx="1" />
                  <rect x="140" y="180" width="10" height="10" rx="1" />
                </g>

                {/* Central Shield with Golden Eagle */}
                <rect x="78" y="78" width="44" height="44" rx="8" fill="#FFFFFF" stroke="#FFC423" strokeWidth="2" />
              </svg>
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <GCBLogo className="size-7 text-foreground" />
              </div>
            </div>

            <p className="text-[12px] text-muted-foreground max-w-[280px]">
              Scan with GCB Mobile App, GhanaPay, or any GhQR-compliant banking app to pay this account.
            </p>

            {/* Actions: Share & Download */}
            <div className="flex w-full items-center gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 gap-2 text-[13px]"
                onClick={handleShareMyQr}
              >
                <Share2 size={15} />
                <span>Share QR</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1 gap-2 text-[13px]"
                onClick={handleDownloadMyQr}
              >
                <Download size={15} />
                <span>Download</span>
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* ── MODE B: SCAN & PAY ── */
        <div className="flex flex-col gap-6 animate-in fade-in duration-200">
          {/* 1. Source Account */}
          <FromAccountSelector
            accounts={accounts}
            value={state.fromId}
            onChange={(id: string) => onChange("fromId", id)}
          />

          {/* 2. Merchant & QR Identification */}
          <Field label="Merchant Details">
            {isMerchantSelected && isCollapsed ? (
              <CollapsedDetailsBadge
                title={state.qrMerchant}
                subtitle={`Terminal: ${state.qrCode || "Verified GCB QR"}`}
                icon={<Store size={18} className="text-primary" />}
                nameCheck={{ confirmed: true }}
                onChange={() => setCollapsed(false)}
              />
            ) : isMerchantSelected ? (
              <div className="flex items-center justify-between rounded-xl border border-success/30 bg-success/5 p-3.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-success/15 text-success">
                    <Store size={20} strokeWidth={1.8} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[14px] font-medium text-foreground truncate">{state.qrMerchant}</span>
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
                  className="text-xs text-muted-foreground hover:text-foreground h-8 px-2.5"
                  aria-label="Remove merchant"
                >
                  Change
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-muted-foreground">Identify merchant</span>
                  <SegmentedControl
                    aria-label="Merchant identification method"
                    value={activeTab}
                    onChange={(val) => setActiveTab(val as "camera" | "manual")}
                    options={[
                      { value: "camera", label: "Scanner" },
                      { value: "manual", label: "Enter ID" },
                    ]}
                  />
                </div>

                {/* Viewfinder Scanner Tab */}
                {activeTab === "camera" && (
                  <div className="flex flex-col gap-3">
                    <div className="relative flex aspect-video sm:aspect-[16/9] w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-border/70 bg-muted/30 text-foreground">
                      {/* Viewfinder Target Box */}
                      <div className="relative size-36 sm:size-44 flex items-center justify-center rounded-2xl border-2 border-dashed border-primary/40 bg-background/30 backdrop-blur-xs">
                        <div className="absolute inset-x-3 top-0 h-0.5 bg-primary/70 animate-pulse" />
                        <Camera size={26} className="text-muted-foreground/60" strokeWidth={1.5} />
                      </div>

                      {/* Top right: Select QR from Gallery */}
                      <label className="absolute top-3 right-3 flex items-center gap-1.5 rounded-lg border border-border/70 bg-background/80 px-2.5 py-1.5 text-[11.5px] text-foreground hover:bg-muted/80 backdrop-blur-xs cursor-pointer transition-colors shadow-xs">
                        <ImageIcon size={13} />
                        <span>Gallery</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleGalleryUpload}
                        />
                      </label>

                      {/* Flashlight toggle */}
                      <button
                        type="button"
                        onClick={() => setFlashlight(!flashlight)}
                        className={cn(
                          "absolute bottom-3 right-3 flex size-8 items-center justify-center rounded-lg border transition-colors cursor-pointer",
                          flashlight
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background/80 text-muted-foreground border-border/70 hover:text-foreground backdrop-blur-xs"
                        )}
                        aria-label="Toggle flashlight"
                      >
                        <Flashlight size={14} />
                      </button>

                      <span className="absolute bottom-3 left-3 text-[11.5px] text-muted-foreground">
                        Align GCB GhanaPay or Universal QR inside frame
                      </span>
                    </div>

                    {/* Quick Simulation Selectors */}
                    <div className="flex flex-col gap-2 pt-1">
                      <span className="text-[11.5px] font-medium text-muted-foreground">
                        Or select a verified merchant to simulate scan:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {SAMPLE_MERCHANTS.map((m) => {
                          const Icon = m.icon;
                          return (
                            <button
                              key={m.code}
                              type="button"
                              onClick={() => handleSelectMerchant(m)}
                              className="flex items-center gap-2.5 rounded-xl border border-border/70 bg-muted/15 p-2.5 text-left transition-colors hover:bg-muted/50 hover:border-border cursor-pointer group"
                            >
                              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:text-foreground transition-colors">
                                <Icon size={16} strokeWidth={1.75} />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-[12.5px] font-medium text-foreground truncate">{m.name}</span>
                                <span className="text-[11px] text-muted-foreground font-mono">{m.code}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Manual ID Input Tab */}
                {activeTab === "manual" && (
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Input
                        id="merchant-id"
                        value={state.qrCode}
                        onChange={(e) => onChange("qrCode", e.target.value.toUpperCase())}
                        placeholder="e.g. GCB-QR-88210"
                        className="uppercase font-mono"
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
                )}
              </div>
            )}
          </Field>

          {/* 3. Progressive Disclosure: Amount, Narration, Category, CTA */}
          {isMerchantSelected && (
            <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-top-2 duration-200 ease-out">
              <AmountInput
                value={state.amount}
                onChange={(val: string) => onChange("amount", val)}
                onFocus={() => {
                  setCollapsed(true);
                }}
                currency="GHS"
                error={hasInsufficientFunds ? <InsufficientFundsAlert /> : undefined}
              />

              <NarrationInput
                value={state.narration}
                onChange={(val: string) => onChange("narration", val)}
                placeholder="e.g. Counter Checkout / Table 4"
              />

              <CategorySelect
                value={state.category}
                onChange={(val: string) => onChange("category", val)}
              />

              <ProceedButton
                disabled={!canProceed}
                onClick={onProceed}
                label="Review & Pay Merchant"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
