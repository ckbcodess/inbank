import { useState } from "react";
import Link from "next/link";
import { ChevronDown, X, Download, RotateCw, CheckCircle2, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { RevealingAmount } from "@/components/providers/AmountVisibilityProvider";
import type { Transaction } from "@/lib/mock-data";
import { toast } from "sonner";

interface RecentActivityWidgetProps {
  transactions?: Transaction[];
}

export function RecentActivityWidget({ transactions = [] }: RecentActivityWidgetProps) {
  const [selectedAccount, setSelectedAccount] = useState("Current •••82139");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [selectedTx, setSelectedTx] = useState<{
    id: string;
    title: string;
    subtitle: string;
    amount: number;
    direction: string;
    status: string;
    reference: string;
    category: string;
  } | null>(null);

  const accountOptions = [
    { label: "All Accounts", id: "all" },
    { label: "Current •••82139", id: "current" },
    { label: "Savings •••10482", id: "savings" },
    { label: "FX Foreign •••93012", id: "fx" },
  ];

  // Raw mock transaction dataset
  const allMockItems = [
    {
      id: "act-1",
      title: "Supermarket Purchase — Melcom",
      subtitle: "11 Aug 2026 · Melcom Stores",
      amount: 450.0,
      direction: "debit",
      status: "Completed",
      account: "Current •••82139",
      reference: "TX-9481029",
      category: "Groceries",
    },
    {
      id: "act-2",
      title: "Fuel Purchase — Shell Airport",
      subtitle: "11 Aug 2026 · Shell Oil Ghana",
      amount: 600.0,
      direction: "debit",
      status: "Completed",
      account: "Current •••82139",
      reference: "TX-9481030",
      category: "Transport",
    },
    {
      id: "act-3",
      title: "ECG Electricity Prepaid",
      subtitle: "11 Aug 2026 · Electricity Co of Ghana",
      amount: 350.0,
      direction: "debit",
      status: "Completed",
      account: "Current •••82139",
      reference: "TX-9481031",
      category: "Utilities",
    },
    {
      id: "act-4",
      title: "Monthly Salary Credit",
      subtitle: "10 Aug 2026 · Employer Ltd",
      amount: 8500.0,
      direction: "credit",
      status: "Completed",
      account: "Current •••82139",
      reference: "TX-9481032",
      category: "Income",
    },
    {
      id: "act-5",
      title: "Transfer to Savings",
      subtitle: "08 Aug 2026 · Personal Savings Account",
      amount: 2000.0,
      direction: "credit",
      status: "Completed",
      account: "Savings •••10482",
      reference: "TX-9481033",
      category: "Savings",
    },
    {
      id: "act-6",
      title: "Amazon AWS Cloud Services",
      subtitle: "05 Aug 2026 · Amazon Web Services",
      amount: 1250.0,
      direction: "debit",
      status: "Completed",
      account: "FX Foreign •••93012",
      reference: "TX-9481034",
      category: "Shopping",
    },
  ];

  const filteredItems =
    selectedAccount === "All Accounts"
      ? allMockItems.slice(0, 5)
      : allMockItems.filter((item) => item.account === selectedAccount || selectedAccount.includes(item.account.split(" ")[0])).slice(0, 5);

  const items = filteredItems.length > 0 ? filteredItems : allMockItems.slice(0, 5);

  return (
    <>
      <div className="flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-xs transition-all">
        {/* Top Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-[16px] font-medium text-foreground">Recent activity</h2>
            {/* Account Filter Pill Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                className="flex items-center gap-2 rounded-full border border-border/80 bg-muted/60 px-3.5 py-1 text-[12px] font-normal text-foreground transition-colors hover:bg-muted cursor-pointer"
              >
                <span>{selectedAccount}</span>
                <ChevronDown size={13} className="text-muted-foreground" />
              </button>

              {showFilterMenu && (
                <div className="absolute left-0 top-full z-30 mt-1.5 w-48 rounded-xl border border-border bg-card py-1 shadow-lg animate-in fade-in zoom-in-95 duration-100">
                  {accountOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setSelectedAccount(opt.label);
                        setShowFilterMenu(false);
                      }}
                      className={`flex w-full items-center px-3.5 py-2 text-left text-[12px] transition-colors cursor-pointer ${
                        selectedAccount === opt.label
                          ? "bg-muted font-medium text-foreground"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Link
            href="/accounts"
            className="text-[14px] text-muted-foreground transition-colors hover:text-foreground"
          >
            View all
          </Link>
        </div>

        {/* Transactions List */}
        <div className="my-auto flex flex-col divide-y divide-border/60">
          {items.map((item) => {
            const isDebit = item.direction === "debit";
            return (
              <div
                key={item.id}
                onClick={() => setSelectedTx(item)}
                className="flex items-center justify-between py-2.5 first:pt-1 last:pb-1 cursor-pointer hover:bg-muted/40 rounded-lg px-2 -mx-2 transition-colors"
              >
                {/* Left Details */}
                <div className="flex flex-col min-w-0 pr-3">
                  <span className="truncate text-[13px] font-normal text-foreground">
                    {item.title}
                  </span>
                  <span className="truncate text-[11px] text-muted-foreground">
                    {item.subtitle}
                  </span>
                </div>

                {/* Right: Amount & Status Badge */}
                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={`text-[13px] font-medium tabular ${
                      isDebit ? "text-foreground" : "text-[#16a34a] dark:text-[#49ff8d]"
                    }`}
                  >
                    {isDebit ? "-" : "+"}
                    <RevealingAmount amount={item.amount} currency="GHS" />
                  </span>

                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:bg-emerald-500/15 dark:text-[#49ff8d]">
                    {item.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Transaction Details Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div className="flex items-center gap-3">
                <div className={`flex size-10 items-center justify-center rounded-full ${
                  selectedTx.direction === "debit" ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-600"
                }`}>
                  {selectedTx.direction === "debit" ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
                </div>
                <div>
                  <h3 className="text-[16px] font-medium text-foreground">{selectedTx.title}</h3>
                  <p className="text-[12px] text-muted-foreground">{selectedTx.subtitle}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Receipt Summary */}
            <div className="my-5 flex flex-col items-center justify-center rounded-xl bg-muted/40 p-4 text-center">
              <span className="text-[12px] text-muted-foreground">Amount Transferred</span>
              <span className="mt-1 text-[26px] font-medium tabular text-foreground">
                GHS {selectedTx.amount.toFixed(2)}
              </span>
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-[#49ff8d]">
                <CheckCircle2 size={12} /> {selectedTx.status}
              </span>
            </div>

            {/* Breakdown Details */}
            <div className="flex flex-col divide-y divide-border/60 text-[13px]">
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Reference</span>
                <span className="font-mono text-foreground">{selectedTx.reference}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Category</span>
                <span className="font-medium text-foreground">{selectedTx.category}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Fee</span>
                <span className="text-foreground">GHS 0.00 (Zero Fee)</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Channel</span>
                <span className="text-foreground">Instant Electronic Transfer</span>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  toast.success("Receipt PDF downloaded to your device.");
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-muted/50 py-2.5 text-[13px] font-medium text-foreground hover:bg-muted cursor-pointer"
              >
                <Download size={15} />
                Download PDF
              </button>
              <button
                type="button"
                onClick={() => {
                  toast.success(`Repeat transfer of GHS ${selectedTx.amount} queued.`);
                  setSelectedTx(null);
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#f6bf36] py-2.5 text-[13px] font-medium text-neutral-950 hover:bg-[#eab025] cursor-pointer shadow-xs"
              >
                <RotateCw size={15} />
                Repeat Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
