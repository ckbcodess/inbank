"use client";

import Link from "next/link";
import { Send, Receipt, CreditCard, Zap } from "lucide-react";
import { toast } from "sonner";

interface SuggestedForYouCardProps {
  onQuickAction?: (action: string) => void;
}

export function SuggestedForYouCard({ onQuickAction }: SuggestedForYouCardProps) {
  const quickActions = [
    {
      id: "send-wallet",
      label: "Send to Wallet",
      icon: Send,
      href: "/payments/send",
    },
    {
      id: "pay-bills",
      label: "Pay Bills",
      icon: Receipt,
      href: "/payments/bills",
    },
    {
      id: "card-topup",
      label: "Card Top up",
      icon: CreditCard,
      href: "/cards",
    },
    {
      id: "ecg-bill",
      label: "ECG",
      icon: Zap,
      href: "/payments/bills?biller=ecg",
    },
  ];

  const frequentBeneficiaries = [
    {
      initial: "K",
      name: "Kofi",
      detail: "MTN Airtime",
      bg: "bg-[#f1f8f9] dark:bg-[#1a2d32] text-[#0d4f5b] dark:text-[#7ee2f3]",
    },
    {
      initial: "L",
      name: "Lester",
      detail: "ECG",
      bg: "bg-[#ebe8de] dark:bg-[#312e25] text-[#544d32] dark:text-[#e4d8a5]",
    },
    {
      initial: "A",
      name: "Ama",
      detail: "St Marys School",
      bg: "bg-[#e0eedd] dark:bg-[#203222] text-[#2c532f] dark:text-[#a0e4a7]",
    },
    {
      initial: "M",
      name: "Kofi",
      detail: "MTN Momo",
      bg: "bg-[#e7dce8] dark:bg-[#342436] text-[#5a2e5d] dark:text-[#e9b6ec]",
    },
  ];

  const handleBeneficiaryClick = (beneficiary: typeof frequentBeneficiaries[0]) => {
    toast.info(`Quick pay to ${beneficiary.name} (${beneficiary.detail}) ready.`);
    onQuickAction?.(beneficiary.name);
  };

  return (
    <div className="flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-xs transition-all">
      {/* Top section: Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-medium text-foreground">Suggested for you</h2>
        <button
          type="button"
          onClick={() => toast("Customize quick suggestions")}
          className="text-[13px] text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
        >
          Edit
        </button>
      </div>

      {/* Row 1: 4 Quick Actions */}
      <div className="mt-5 grid grid-cols-4 gap-2">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.id}
              href={action.href}
              className="group flex flex-col items-center gap-2.5 text-center focus:outline-none"
            >
              <div className="flex size-14 items-center justify-center rounded-full border border-border bg-muted/60 text-foreground transition-all duration-200 group-hover:scale-105 group-hover:bg-muted group-hover:border-border/80 group-active:scale-95">
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
      <div className="mt-5 grid grid-cols-4 gap-2 border-t border-border/60 pt-4">
        {frequentBeneficiaries.map((b, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleBeneficiaryClick(b)}
            className="group flex flex-col items-center gap-2 text-center cursor-pointer focus:outline-none"
          >
            <div
              className={`flex size-14 items-center justify-center rounded-full text-[20px] font-medium transition-all duration-200 group-hover:scale-105 group-active:scale-95 ${b.bg}`}
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
  );
}
