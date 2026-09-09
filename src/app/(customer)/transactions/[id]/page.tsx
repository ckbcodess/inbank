"use client";

/**
 * Transaction Details — styled like the Review / Receipt screen matching Figma & mobile specs.
 *
 * Implements:
 * - Review-style navigation header with Back button next to the title (no clipping, no bottom sheet handles).
 * - Receipt card layout with GCB brand logo and elevated status checkmark (unclipped, relative overflow-visible).
 * - Structured key-value rows separated by dashed dividers:
 *   • Block 1: Transaction ID, Date, Time, Status.
 *   • Block 2: Recipient Name, Narration, From Account, Category.
 *   • Block 3: Send Amount, Receive Amount, Exchange Rate, Fee, Total.
 * - Scalloped perforated ticket receipt bottom edge (self-contained overflow).
 * - Circular action buttons: Share and Repeat (with Download PDF receipt option).
 * - Failure state bands (13.2 recovery affordances: failed-single, failed-bulk, failed-trade, reversed).
 * - StateSwitcher tool at bottom for testing all 8 states.
 */

import { use, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowDownToLine,
  ArrowRight,
  Check,
  ChevronLeft,
  Clock,
  Copy,
  FileWarning,
  History,
  Info,
  Layers,
  RefreshCw,
  RotateCcw,
  Share,
  ShieldQuestion,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { GCBLogo } from "@/components/ui/GCBLogo";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import { TRANSACTION_STATE_LABEL, type TransactionState } from "@/lib/states";
import {
  findTransaction,
  findAccount,
  formatDate,
  formatMoney,
  TRADE_VERSIONS,
  type Transaction,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const ALL_STATES: readonly TransactionState[] = [
  "pending",
  "completed",
  "failed-single",
  "failed-bulk",
  "failed-trade",
  "reversed",
  "disputed",
  "awaiting-approval",
] as const;

function getTransactionTitle(t: Transaction): string {
  if (t.paymentMethod === "papss") return "PAPSS Transfer";
  if (t.paymentMethod === "airtime") return "Airtime Purchase";
  if (t.paymentMethod === "data") return "Data Bundle Purchase";
  if (t.paymentMethod === "wallet-to-bank") return "Wallet to Bank Transfer";
  if (t.paymentMethod === "gip") return "Instant Pay (GIP)";
  if (t.paymentMethod === "ach") return "ACH Direct Credit";
  if (t.paymentMethod === "rtgs") return "RTGS Transfer";
  if (t.paymentMethod === "momo") return "Mobile Money Transfer";
  if (t.paymentMethod === "own-account") return "Transfer Between Accounts";
  if (t.paymentMethod === "card") return "Card Payment";
  if (t.paymentMethod === "bill") return "Bill Payment";
  if (t.channel === "Mobile App") return "GCB Mobile Transfer";
  return "GCB Transfer";
}

export default function TransactionDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const txn = findTransaction(id);
  const [state, setState] = useState<TransactionState>(txn?.state ?? "completed");
  const [copied, setCopied] = useState(false);
  const [shareToast, setShareToast] = useState(false);

  const fromAccount = useMemo(() => {
    return txn ? findAccount(txn.accountId) : undefined;
  }, [txn]);

  if (!txn) {
    return (
      <div className="mx-auto flex max-w-[480px] flex-col items-center justify-center gap-4 py-16 text-center">
        <h1 className="text-[20px] font-semibold text-foreground">Transaction not found</h1>
        <p className="text-[14px] text-muted-foreground">
          The transaction record you requested could not be located.
        </p>
        <Button onClick={() => router.push("/transactions")} variant="outline" className="mt-2">
          Back to Transactions
        </Button>
      </div>
    );
  }

  const title = getTransactionTitle(txn);

  // Formatted date and time
  const dateObj = new Date(txn.date);
  const formattedDate = !isNaN(dateObj.getTime())
    ? dateObj.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })
    : txn.date;
  const formattedTime = "12:34 PM";

  // Financial calculations
  const feeAmount = txn.fee ?? 0;
  const isForeign = txn.currency !== "GHS";
  const exchangeRate = isForeign ? 10.0 : 1;
  const sendAmountFormatted = `${txn.currency} ${txn.amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  const receiveAmountFormatted = isForeign
    ? `GHS ${(txn.amount * exchangeRate).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : sendAmountFormatted;

  const totalDebit = isForeign
    ? txn.amount * exchangeRate + feeAmount
    : txn.amount + feeAmount;

  const handleCopyReference = async () => {
    try {
      await navigator.clipboard.writeText(txn.reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${title} - ${txn.reference}`,
          text: `GCB Transaction ${txn.reference} for ${formatMoney(txn.amount, txn.currency)} to ${txn.counterparty || txn.description}.`,
        });
        return;
      } catch {
        // user cancelled or fallback
      }
    }
    // Fallback to clipboard
    handleCopyReference();
    setShareToast(true);
    setTimeout(() => setShareToast(false), 2500);
  };

  const handleRepeat = () => {
    router.push(`/payments/send?duplicate=${txn.id}&amount=${txn.amount}&payee=${encodeURIComponent(txn.counterparty || txn.description)}`);
  };

  const handleDownload = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 py-6 px-4 animate-in fade-in duration-200">
      {/* Navigation Header matching Review Screen pattern (Back button next to Title) */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push("/transactions")}
          className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer shrink-0"
          aria-label="Back to transactions"
        >
          <ChevronLeft size={22} strokeWidth={1.8} />
        </button>
        <h1 className="text-[24px] sm:text-[26px] font-medium leading-[32px] tracking-[-0.02em] text-foreground">
          Transaction Details
        </h1>
      </div>

      {/* Share Toast feedback */}
      {shareToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 rounded-full bg-foreground text-background px-4 py-2 text-[13px] font-medium shadow-lg animate-in fade-in slide-in-from-top-2">
          Transaction reference copied to clipboard!
        </div>
      )}

      {/* ── Main Receipt Card (NO overflow-hidden on outer container to ensure badge is unclipped) ── */}
      <div className="relative flex flex-col rounded-[24px] border border-border/80 bg-card p-6 sm:p-8 shadow-sm mt-4">
        {/* Elevated Circular Status Indicator on Top Edge */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-6 flex items-center justify-center z-10">
          <div className="flex size-12 items-center justify-center rounded-full bg-card shadow-sm ring-1 ring-border/60 p-1">
            {state === "completed" && (
              <div className="flex size-10 items-center justify-center rounded-full bg-[#12B76A] text-white">
                <Check size={20} strokeWidth={3} />
              </div>
            )}
            {state === "pending" && (
              <div className="flex size-10 items-center justify-center rounded-full bg-[#F79009] text-white">
                <Clock size={20} strokeWidth={2.6} />
              </div>
            )}
            {(state.startsWith("failed") || state === "reversed" || state === "disputed") && (
              <div className="flex size-10 items-center justify-center rounded-full bg-[#F04438] text-white">
                <AlertCircle size={20} strokeWidth={2.6} />
              </div>
            )}
            {state === "awaiting-approval" && (
              <div className="flex size-10 items-center justify-center rounded-full bg-blue-500 text-white">
                <Clock size={20} strokeWidth={2.6} />
              </div>
            )}
          </div>
        </div>

        {/* Card Header: GCB Logo (left) */}
        <div className="flex items-center w-full mb-1">
          <GCBLogo className="h-8 w-auto" />
        </div>

        {/* Transaction Title */}
        <h2 className="text-[22px] font-bold text-foreground text-center tracking-tight mt-2 mb-6">
          {title}
        </h2>

        {/* ── Group 1: Transaction Metadata ── */}
        <div className="flex flex-col gap-3 text-[14px]">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Transaction ID</span>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-foreground tabular-nums numorainput">
                {txn.reference}
              </span>
              <SimpleTooltip content={copied ? "Copied!" : "Copy reference"}>
                <button
                  type="button"
                  onClick={handleCopyReference}
                  className="text-muted-foreground hover:text-foreground transition-colors p-0.5 cursor-pointer"
                  aria-label="Copy reference"
                >
                  {copied ? (
                    <Check size={13} className="text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Copy size={13} />
                  )}
                </button>
              </SimpleTooltip>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Date</span>
            <span className="font-semibold text-foreground tabular-nums numorainput">{formattedDate}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Time</span>
            <span className="font-semibold text-foreground tabular-nums numorainput">{formattedTime}</span>
          </div>

          {state !== "completed" && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <span
                className={cn(
                  "font-semibold capitalize text-[13.5px]",
                  state === "pending" && "text-amber-600 dark:text-amber-400",
                  state.startsWith("failed") && "text-rose-600 dark:text-rose-400",
                  state === "reversed" && "text-muted-foreground"
                )}
              >
                {TRANSACTION_STATE_LABEL[state]}
              </span>
            </div>
          )}
        </div>

        {/* Dashed Horizontal Divider */}
        <div className="border-b border-dashed border-border/80 my-4" />

        {/* ── Group 2: Counterparty & Purpose ── */}
        <div className="flex flex-col gap-3 text-[14px]">
          <div className="flex items-start justify-between gap-4">
            <span className="text-muted-foreground shrink-0">Recipient Name</span>
            <span className="font-semibold text-foreground text-right">
              {txn.counterparty || txn.description}
            </span>
          </div>

          {txn.counterpartyAccount && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Recipient Account</span>
              <span className="font-semibold text-foreground tabular-nums numorainput">
                {txn.counterpartyAccount}
              </span>
            </div>
          )}

          {fromAccount && (
            <div className="flex items-start justify-between gap-4">
              <span className="text-muted-foreground shrink-0">From Account</span>
              <span className="font-medium text-foreground text-right">
                {fromAccount.name} (•••{fromAccount.number.replace(/\s+/g, "").slice(-4)})
              </span>
            </div>
          )}

          <div className="flex items-start justify-between gap-4">
            <span className="text-muted-foreground shrink-0">Narration</span>
            <span className="font-semibold text-foreground text-right">
              {txn.description}
            </span>
          </div>

          {txn.category && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Category</span>
              <span className="font-medium text-foreground">{txn.category}</span>
            </div>
          )}
        </div>

        {/* Dashed Horizontal Divider */}
        <div className="border-b border-dashed border-border/80 my-4" />

        {/* ── Group 3: Financial Breakdown (Structured like Review Screen) ── */}
        <div className="flex flex-col gap-3 text-[14px]">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Send Amount</span>
            <span className="font-semibold text-foreground tabular-nums numorainput">
              {sendAmountFormatted}
            </span>
          </div>

          {isForeign && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Receive Amount</span>
                <span className="font-semibold text-foreground tabular-nums numorainput">
                  {receiveAmountFormatted}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Exchange Rate</span>
                <span className="font-semibold text-foreground tabular-nums numorainput">
                  1 {txn.currency} = GHS {exchangeRate.toFixed(2)}
                </span>
              </div>
            </>
          )}

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Fee</span>
            <span className="font-semibold text-foreground tabular-nums numorainput">
              {feeAmount > 0 ? formatMoney(feeAmount, "GHS", true) : "GHS 0.00"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Total</span>
            <span className="font-bold text-[16px] text-foreground tabular-nums numorainput">
              {formatMoney(totalDebit, "GHS", true)}
            </span>
          </div>
        </div>

        {/* Dashed Divider before bottom scalloped edge */}
        <div className="border-b border-dashed border-border/80 my-4" />

        {/* Ticket Scalloped Bottom Edge Container */}
        <div className="relative -mx-6 -mb-6 sm:-mx-8 sm:-mb-8 mt-5 h-4 overflow-hidden rounded-b-[24px]">
          <div className="flex justify-between w-[calc(100%+16px)] -ml-2">
            {Array.from({ length: 22 }).map((_, i) => (
              <span
                key={i}
                className="size-3.5 rounded-full bg-background border border-border/60 shrink-0 -mb-2 shadow-inner"
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom Circular Action Buttons (Matching Screenshot) ── */}
      <div className="flex items-center justify-center gap-14 pt-4 pb-1">
        {/* Share Button */}
        <button
          type="button"
          onClick={handleShare}
          className="flex flex-col items-center gap-2 group cursor-pointer"
        >
          <span className="flex size-14 items-center justify-center rounded-full bg-muted/70 text-foreground transition-all group-hover:scale-105 group-hover:bg-muted shadow-xs">
            <Share size={22} strokeWidth={1.9} />
          </span>
          <span className="text-[13px] font-medium text-muted-foreground group-hover:text-foreground">
            Share
          </span>
        </button>

        {/* Repeat Button */}
        <button
          type="button"
          onClick={handleRepeat}
          className="flex flex-col items-center gap-2 group cursor-pointer"
        >
          <span className="flex size-14 items-center justify-center rounded-full bg-muted/70 text-foreground transition-all group-hover:scale-105 group-hover:bg-muted shadow-xs">
            <RefreshCw size={22} strokeWidth={1.9} />
          </span>
          <span className="text-[13px] font-medium text-muted-foreground group-hover:text-foreground">
            Repeat
          </span>
        </button>
      </div>

      {/* Secondary Download Receipt Action */}
      <div className="flex justify-center -mt-1 mb-2">
        <button
          type="button"
          onClick={handleDownload}
          className="text-[12.5px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <ArrowDownToLine size={14} />
          Download PDF Receipt
        </button>
      </div>

      {/* ── State-specific Recovery Affordances (Preserving 13.2 Business Rules) ── */}
      <StateBand state={state} txn={txn} />

      {/* ── State Switcher Testing Strip ── */}
      <div className="pt-4 border-t border-border/40">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider text-center mb-2">
          State Simulator (Section 13.2)
        </p>
        <StateSwitcher
          section="13.2"
          states={ALL_STATES}
          value={state}
          onChange={setState}
          labels={TRANSACTION_STATE_LABEL}
        />
      </div>
    </div>
  );
}

/**
 * Renders the state recovery affordance based on transaction state.
 */
function StateBand({
  state,
  txn,
}: {
  state: TransactionState;
  txn: NonNullable<ReturnType<typeof findTransaction>>;
}) {
  switch (state) {
    case "pending":
      return (
        <Band tone="warning" icon={<Clock size={17} strokeWidth={1.8} aria-hidden="true" />} title="Processing">
          <p>
            This payment has been submitted and is being processed. Funds are expected to settle by{" "}
            <span className="font-semibold text-foreground">{formatDate(txn.valueDate)}, end of day</span>.
          </p>
        </Band>
      );

    case "completed":
      return null;

    case "failed-single":
      return (
        <Band tone="destructive" icon={<AlertCircle size={17} strokeWidth={1.8} aria-hidden="true" />} title="Payment failed">
          <p>
            {txn.failureReason ??
              "The receiving bank rejected this payment. No funds left your account."}
          </p>
          <p className="mt-1.5 text-muted-foreground">
            Nothing was debited. Duplicating creates a new draft with these details so you can correct and resubmit.
          </p>
          <div className="mt-3">
            <Button size="sm" nativeButton={false} render={<Link href={`/payments/send?duplicate=${txn.id}`} />}>
              <Copy size={14} strokeWidth={1.9} className="mr-1.5" />
              Duplicate &amp; Edit
            </Button>
          </div>
        </Band>
      );

    case "failed-bulk":
      return (
        <Band tone="destructive" icon={<Layers size={17} strokeWidth={1.8} aria-hidden="true" />} title="Failed within a batch">
          <p>{txn.failureReason ?? "This record failed as part of a bulk payment batch."}</p>
          <p className="mt-1.5 text-muted-foreground">
            Records in a batch are corrected together in batch validation.
          </p>
          <div className="mt-3">
            <Button
              size="sm"
              variant="outline"
              nativeButton={false}
              render={<Link href={`/payments/bulk/${txn.batchId ?? "batch-0090"}`} />}
            >
              <ArrowRight size={14} strokeWidth={1.9} className="mr-1.5" />
              Open batch correction
            </Button>
          </div>
        </Band>
      );

    case "failed-trade":
      return (
        <Band tone="warning" icon={<FileWarning size={17} strokeWidth={1.8} aria-hidden="true" />} title="Returned by bank operations">
          <p>{txn.failureReason ?? "This trade request was returned for correction."}</p>
          <div className="mt-3 rounded-xl border border-border bg-background">
            <p className="flex items-center gap-1.5 border-b border-border px-3 py-2 text-[12px] uppercase tracking-wider text-muted-foreground">
              <History size={13} strokeWidth={1.9} />
              Version history
            </p>
            <ul className="divide-y divide-border">
              {TRADE_VERSIONS.map((v) => (
                <li key={v.version} className="flex items-center gap-3 px-3 py-2 text-[13px]">
                  <span className="w-8 shrink-0 text-muted-foreground tabular-nums numorainput">v{v.version}</span>
                  <span className="min-w-0 flex-1 truncate text-foreground">{v.summary}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" nativeButton={false} render={<Link href={`/trade/${txn.tradeId ?? "trade-0417"}`} />}>
              <RotateCcw size={14} className="mr-1.5" />
              Resubmit as v{TRADE_VERSIONS.length + 1}
            </Button>
          </div>
        </Band>
      );

    case "reversed":
      return (
        <Band tone="neutral" icon={<RotateCcw size={17} strokeWidth={1.8} aria-hidden="true" />} title="Reversed">
          <p>
            This transaction completed and was later reversed with reference{" "}
            <span className="font-semibold text-foreground tabular-nums numorainput">{txn.reversalReference ?? "—"}</span>.
          </p>
        </Band>
      );

    case "disputed":
      return (
        <Band tone="warning" icon={<ShieldQuestion size={17} strokeWidth={1.8} aria-hidden="true" />} title="Under dispute">
          <p>
            This transaction has been flagged as disputed and is being investigated. You&apos;ll be notified when the outcome is recorded.
          </p>
        </Band>
      );

    case "awaiting-approval":
      return (
        <Band tone="neutral" icon={<Clock size={17} strokeWidth={1.8} />} title="Waiting for approval">
          <p>
            This payment is in an approver&apos;s queue and hasn&apos;t been sent yet.
          </p>
        </Band>
      );

    default:
      return null;
  }
}

function Band({
  tone,
  icon,
  title,
  children,
}: {
  tone: "warning" | "destructive" | "neutral";
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  const toneClasses = {
    warning: "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400",
    destructive: "border-destructive/30 bg-destructive/5 text-destructive",
    neutral: "border-border bg-muted/40 text-foreground",
  }[tone];

  return (
    <section className={cn("rounded-2xl border p-4 text-[13.5px]", toneClasses)}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0">{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-[14px]">{title}</p>
          <div className="mt-1 text-foreground/90">{children}</div>
        </div>
      </div>
    </section>
  );
}
