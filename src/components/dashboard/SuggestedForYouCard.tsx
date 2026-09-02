"use client";

import Link from "next/link";
import { useState } from "react";
import { Send, Receipt, CreditCard, Zap, X, Check, ArrowRight, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface SuggestedForYouCardProps {
  onQuickAction?: (action: string) => void;
}

export function SuggestedForYouCard({ onQuickAction }: SuggestedForYouCardProps) {
  const [quickActions, setQuickActions] = useState([
    { id: "send-wallet", label: "Send to Wallet", icon: Send, href: "/payments/send", enabled: true },
    { id: "pay-bills", label: "Pay Bills", icon: Receipt, href: "/payments/bills", enabled: true },
    { id: "card-topup", label: "Card Top up", icon: CreditCard, href: "/cards", enabled: true },
    { id: "ecg-bill", label: "ECG", icon: Zap, href: "/payments/bills?biller=ecg", enabled: true },
  ]);

  const [frequentBeneficiaries] = useState([
    {
      initial: "K",
      name: "Kofi",
      detail: "MTN Airtime",
      phone: "+233 24 456 7890",
      bg: "bg-[#f1f8f9] dark:bg-[#1a2d32] text-[#0d4f5b] dark:text-[#7ee2f3]",
    },
    {
      initial: "L",
      name: "Lester",
      detail: "ECG",
      phone: "Account #019284-A",
      bg: "bg-[#ebe8de] dark:bg-[#312e25] text-[#544d32] dark:text-[#e4d8a5]",
    },
    {
      initial: "A",
      name: "Ama",
      detail: "St Marys School",
      phone: "Student ID: SM-2026-91",
      bg: "bg-[#e0eedd] dark:bg-[#203222] text-[#2c532f] dark:text-[#a0e4a7]",
    },
    {
      initial: "M",
      name: "Kofi",
      detail: "MTN Momo",
      phone: "+233 55 123 4567",
      bg: "bg-[#e7dce8] dark:bg-[#342436] text-[#5a2e5d] dark:text-[#e9b6ec]",
    },
  ]);

  // Modal states
  const [activeBeneficiary, setActiveBeneficiary] = useState<typeof frequentBeneficiaries[0] | null>(null);
  const [payAmount, setPayAmount] = useState("50");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const handleBeneficiaryClick = (beneficiary: typeof frequentBeneficiaries[0]) => {
    setActiveBeneficiary(beneficiary);
    setPayAmount("50");
    onQuickAction?.(beneficiary.name);
  };

  const handleSendPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBeneficiary || !payAmount || parseFloat(payAmount) <= 0) return;
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      const target = activeBeneficiary;
      setActiveBeneficiary(null);
      toast.success(`Payment of GHS ${payAmount}.00 to ${target.name} (${target.detail}) successful!`, {
        description: `Ref: TX-${Math.floor(100000 + Math.random() * 900000)} · Transferred from Current Account`,
      });
    }, 900);
  };

  return (
    <>
      <div className="flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-xs transition-all">
        {/* Top section: Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-medium text-foreground">Suggested for you</h2>
          <button
            type="button"
            onClick={() => setShowEditModal(true)}
            className="text-[14px] text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
          >
            Edit
          </button>
        </div>

        {/* Row 1: 4 Quick Actions */}
        <div className="my-auto py-2 grid grid-cols-4 gap-2">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.id}
                href={action.href}
                className="group flex flex-col items-center gap-2 text-center focus:outline-none"
              >
                <div className="flex size-[54px] sm:size-[56px] items-center justify-center rounded-full border border-border bg-card text-foreground shadow-xs transition-all duration-200 group-hover:scale-105 group-hover:bg-muted group-hover:border-border/80 group-active:scale-95">
                  <Icon size={20} strokeWidth={1.8} className="transition-transform group-hover:scale-110" />
                </div>
                <span className="text-[12px] font-normal leading-tight text-foreground transition-colors group-hover:text-primary">
                  {action.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Row 2: 4 Frequent Contacts */}
        <div className="grid grid-cols-4 gap-2 border-t border-border/60 pt-4">
          {frequentBeneficiaries.map((b, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleBeneficiaryClick(b)}
              className="group flex flex-col items-center gap-2 text-center cursor-pointer focus:outline-none"
            >
              <div
                className={`flex size-[54px] sm:size-[56px] items-center justify-center rounded-full text-[20px] font-normal transition-all duration-200 group-hover:scale-105 group-active:scale-95 ${b.bg}`}
              >
                {b.initial}
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[12px] font-normal leading-tight text-foreground">{b.name}</span>
                <span className="text-[11px] leading-tight text-muted-foreground">{b.detail}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Quick Pay Dialog Modal */}
      {activeBeneficiary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div className="flex items-center gap-3">
                <div className={`flex size-10 items-center justify-center rounded-full text-[16px] font-medium ${activeBeneficiary.bg}`}>
                  {activeBeneficiary.initial}
                </div>
                <div>
                  <h3 className="text-[16px] font-medium text-foreground">Quick Pay: {activeBeneficiary.name}</h3>
                  <p className="text-[12px] text-muted-foreground">{activeBeneficiary.detail} · {activeBeneficiary.phone}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveBeneficiary(null)}
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSendPayment} className="mt-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-foreground">Amount (GHS)</label>
                <div className="flex items-center rounded-xl border border-border bg-muted/40 px-4 py-2.5 focus-within:border-primary">
                  <span className="text-[16px] font-medium text-muted-foreground mr-2">GHS</span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full bg-transparent text-[20px] font-medium text-foreground outline-none tabular"
                    autoFocus
                    required
                  />
                </div>
              </div>

              {/* Quick Amount Chips */}
              <div className="flex items-center gap-2">
                {["20", "50", "100", "200", "500"].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setPayAmount(preset)}
                    className={`flex-1 rounded-lg border py-1.5 text-[12px] font-medium transition-colors cursor-pointer ${
                      payAmount === preset
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted/50 text-foreground hover:bg-muted"
                    }`}
                  >
                    +{preset}
                  </button>
                ))}
              </div>

              <div className="rounded-lg bg-muted/50 p-3 text-[12px] text-muted-foreground flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                <span>Zero transaction fees applied for instant wallet transfers.</span>
              </div>

              <div className="mt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveBeneficiary(null)}
                  className="rounded-xl border border-border px-4 py-2 text-[14px] font-medium text-foreground hover:bg-muted cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="flex items-center gap-2 rounded-xl bg-[#f6bf36] px-5 py-2 text-[14px] font-medium text-neutral-950 hover:bg-[#eab025] disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isProcessing ? "Processing..." : "Confirm & Send"}
                  <ArrowRight size={15} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customize Quick Suggestions Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div>
                <h3 className="text-[16px] font-medium text-foreground">Customize Shortcuts</h3>
                <p className="text-[12px] text-muted-foreground">Select which quick actions appear on your dashboard</p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 flex flex-col divide-y divide-border/60">
              {quickActions.map((action, idx) => (
                <div key={action.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-full bg-muted text-foreground">
                      <action.icon size={16} />
                    </div>
                    <span className="text-[14px] font-medium text-foreground">{action.label}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setQuickActions((prev) =>
                        prev.map((a, i) => (i === idx ? { ...a, enabled: !a.enabled } : a))
                      );
                    }}
                    className={`flex size-6 items-center justify-center rounded-md border transition-colors cursor-pointer ${
                      action.enabled
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-muted/40 text-transparent"
                    }`}
                  >
                    <Check size={14} strokeWidth={2.5} />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  toast.success("Quick suggestions updated successfully!");
                }}
                className="rounded-xl bg-foreground px-5 py-2 text-[14px] font-medium text-background hover:bg-foreground/90 cursor-pointer shadow-xs"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
