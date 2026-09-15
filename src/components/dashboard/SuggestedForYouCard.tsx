"use client";

import Link from "next/link";
import { useState } from "react";
import { Send, Receipt, CreditCard, Zap, Check, ArrowRight, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
      <div className="flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-xs transition-colors">
        {/* Top section: Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-medium text-foreground">Suggested for you</h2>
          <button
            type="button"
            onClick={() => setShowEditModal(true)}
            className="rounded-lg px-2.5 py-1 text-[12.5px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-[0.96] transition-transform cursor-pointer"
          >
            Customize
          </button>
        </div>

        {/* Row 1: 4 Quick Actions */}
        <div className="my-auto py-2.5 grid grid-cols-4 gap-2">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.id}
                href={action.href}
                className="group flex flex-col items-center gap-2 text-center focus:outline-none"
              >
                <div
                  data-ripple="true"
                  className="relative flex size-[52px] sm:size-[54px] items-center justify-center overflow-hidden rounded-2xl border border-border/80 bg-muted/40 text-foreground shadow-2xs transition-[background-color,border-color] duration-150 group-hover:bg-muted group-hover:border-border"
                >
                  <Icon size={19} strokeWidth={1.8} className="transition-transform group-hover:scale-105" />
                </div>
                <span className="text-[12px] font-normal leading-tight text-foreground truncate max-w-full px-1">
                  {action.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Row 2: 4 Frequent Contacts */}
        <div className="grid grid-cols-4 gap-2 border-t border-border/50 pt-3.5">
          {frequentBeneficiaries.map((b, idx) => (
            <button
              key={idx}
              type="button"
              data-ripple="true"
              onClick={() => handleBeneficiaryClick(b)}
              className="group relative flex flex-col items-center gap-2 text-center cursor-pointer focus:outline-none overflow-hidden rounded-xl p-1"
            >
              <div
                className={`flex size-[52px] sm:size-[54px] items-center justify-center rounded-full text-[19px] font-medium transition-transform duration-150 group-hover:scale-105 ${b.bg}`}
              >
                {b.initial}
              </div>
              <div className="flex flex-col items-center max-w-full px-0.5">
                <span className="text-[12px] font-normal leading-tight text-foreground truncate max-w-full">{b.name}</span>
                <span className="text-[11px] leading-tight text-muted-foreground truncate max-w-full">{b.detail}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Quick Pay Dialog Modal */}
      <Dialog open={!!activeBeneficiary} onOpenChange={(open) => !open && setActiveBeneficiary(null)}>
        {activeBeneficiary && (
          <DialogContent size="md">
            <DialogHeader>
              <DialogTitle>Quick pay: {activeBeneficiary.name}</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSendPayment}>
              <DialogBody>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/60">
                  <div className={`flex size-9 items-center justify-center rounded-full text-[14px] font-medium shrink-0 ${activeBeneficiary.bg}`}>
                    {activeBeneficiary.initial}
                  </div>
                  <div>
                    <span className="text-[13.5px] font-medium text-foreground">{activeBeneficiary.name}</span>
                    <p className="text-[12px] text-muted-foreground">{activeBeneficiary.detail} · {activeBeneficiary.phone}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-medium text-foreground">Amount (GHS)</label>
                  <div className="flex items-center rounded-xl border border-border bg-muted/40 px-3.5 py-2 focus-within:border-primary">
                    <span className="text-[14px] font-medium text-muted-foreground mr-2">GHS</span>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      className="w-full bg-transparent text-[17px] font-medium text-foreground outline-none tabular"
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
                      className={`flex-1 rounded-xl border py-1.5 text-[12px] transition-colors cursor-pointer ${
                        payAmount === preset
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : "border-border bg-muted/40 text-foreground hover:bg-muted"
                      }`}
                    >
                      +{preset}
                    </button>
                  ))}
                </div>

                <div className="rounded-xl bg-muted/40 p-3 text-[12px] text-muted-foreground flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                  <span>Zero transaction fees applied for instant wallet transfers.</span>
                </div>
              </DialogBody>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveBeneficiary(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isProcessing}
                  className="gap-1.5"
                >
                  {isProcessing ? "Processing..." : "Confirm & send"}
                  <ArrowRight size={14} strokeWidth={1.8} />
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        )}
      </Dialog>

      {/* Customize Quick Suggestions Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Customize shortcuts</DialogTitle>
          </DialogHeader>

          <DialogBody>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              Select which quick actions appear on your dashboard.
            </p>

            <div className="flex flex-col divide-y divide-border/60">
              {quickActions.map((action, idx) => (
                <div key={action.id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-full bg-muted text-foreground">
                      <action.icon size={15} />
                    </div>
                    <span className="text-[13.5px] font-medium text-foreground">{action.label}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setQuickActions((prev) =>
                        prev.map((a, i) => (i === idx ? { ...a, enabled: !a.enabled } : a))
                      );
                    }}
                    className={`flex size-5 items-center justify-center rounded-md border transition-colors cursor-pointer ${
                      action.enabled
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-muted/40 text-transparent"
                    }`}
                  >
                    <Check size={12} strokeWidth={2.5} />
                  </button>
                </div>
              ))}
            </div>
          </DialogBody>

          <DialogFooter>
            <Button
              size="sm"
              onClick={() => {
                setShowEditModal(false);
                toast.success("Quick suggestions updated successfully!");
              }}
            >
              Save preferences
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
