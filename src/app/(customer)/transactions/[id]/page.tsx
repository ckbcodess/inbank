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

  const isCredit = txn.direction === "credit";
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
    <div className="mx-auto flex w-full max-w-xl flex-col gap-10 animate-in fade-in duration-200">
      {/* Top Header Navigation matching standard details view */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/transactions"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
            aria-label="Back to transactions"
          >
            <ChevronLeft size={22} strokeWidth={1.8} />
          </Link>
          <div className="min-w-0">
            <h1 className="text-[20px] sm:text-[22px] font-medium leading-tight tracking-[-0.02em] text-foreground truncate">
              Transaction Details
            </h1>
            <p className="text-[12.5px] text-muted-foreground truncate">
              {txn.reference} · {formattedDate}
            </p>
          </div>
        </div>

        {/* Status Pill in Header */}
        <div className="shrink-0">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium border",
              state === "completed" && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
              state === "pending" && "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
              (state.startsWith("failed") || state === "reversed" || state === "disputed") &&
                "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
              state === "awaiting-approval" && "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20"
            )}
          >
            {state === "completed" && <Check size={12} strokeWidth={2.5} />}
            {state === "pending" && <Clock size={12} strokeWidth={2.5} />}
            {(state.startsWith("failed") || state === "reversed" || state === "disputed") && (
              <AlertCircle size={12} strokeWidth={2.5} />
            )}
            {state === "awaiting-approval" && <Clock size={12} strokeWidth={2.5} />}
            <span>{TRANSACTION_STATE_LABEL[state]}</span>
          </span>
        </div>
      </div>

      {/* Share Toast feedback */}
      {shareToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 rounded-full bg-foreground text-background px-4 py-2 text-[13px] font-normal shadow-lg animate-in fade-in slide-in-from-top-2">
          Transaction reference copied to clipboard!
        </div>
      )}

      {/* ── Main Premium Receipt Card ── */}
      <div className="relative flex flex-col rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        {/* Card Hero Header */}
        <div className="flex flex-col items-center justify-center p-6 sm:p-7 border-b border-border/70 bg-muted/20 text-center">
          <div className="flex items-center justify-center size-12 rounded-2xl bg-card border border-border/70 shadow-xs mb-3.5">
            <GCBLogo className="h-6 w-auto" />
          </div>

          <span className="text-[13px] text-muted-foreground font-normal">
            {title}
          </span>

          <div className="mt-1 flex items-baseline justify-center gap-1.5">
            <span
              className={cn(
                "text-[32px] sm:text-[36px] font-medium tracking-[-0.03em] tabular",
                isCredit ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
              )}
            >
              {isCredit ? "+" : "-"}
              {formatMoney(txn.amount, txn.currency, true)}
            </span>
          </div>

          <p className="mt-1 text-[13px] text-muted-foreground max-w-sm truncate">
            {txn.counterparty || txn.description}
          </p>
        </div>

        {/* ── Structured Details Sections ── */}
        <div className="p-5 sm:p-6 flex flex-col gap-6">
          {/* Section 1: Transaction Information */}
          <div className="flex flex-col gap-2.5">
            <span className="text-[11.5px] uppercase tracking-wider text-muted-foreground font-medium">
              Transaction Details
            </span>

            <div className="rounded-xl border border-border/70 bg-background/50 divide-y divide-border/60 text-[13.5px]">
              <div className="flex items-center justify-between px-3.5 py-2.5">
                <span className="text-muted-foreground">Reference</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-foreground tabular">
                    {txn.reference}
                  </span>
                  <SimpleTooltip content={copied ? "Copied!" : "Copy reference"}>
                    <button
                      type="button"
                      onClick={handleCopyReference}
                      className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted active:scale-[0.96] cursor-pointer"
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

              <div className="flex items-center justify-between px-3.5 py-2.5">
                <span className="text-muted-foreground">Date & Time</span>
                <span className="font-medium text-foreground tabular">
                  {formattedDate} · {formattedTime}
                </span>
              </div>

              <div className="flex items-center justify-between px-3.5 py-2.5">
                <span className="text-muted-foreground">Payment Channel</span>
                <span className="font-medium text-foreground">
                  {txn.channel || "Internet Banking"}
                </span>
              </div>

              {txn.category && (
                <div className="flex items-center justify-between px-3.5 py-2.5">
                  <span className="text-muted-foreground">Category</span>
                  <span className="font-medium text-foreground">{txn.category}</span>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Parties Involved */}
          <div className="flex flex-col gap-2.5">
            <span className="text-[11.5px] uppercase tracking-wider text-muted-foreground font-medium">
              Transfer Information
            </span>

            <div className="rounded-xl border border-border/70 bg-background/50 divide-y divide-border/60 text-[13.5px]">
              <div className="flex items-start justify-between gap-4 px-3.5 py-2.5">
                <span className="text-muted-foreground shrink-0">Recipient</span>
                <span className="font-medium text-foreground text-right">
                  {txn.counterparty || txn.description}
                </span>
              </div>

              {txn.counterpartyAccount && (
                <div className="flex items-center justify-between px-3.5 py-2.5">
                  <span className="text-muted-foreground">Recipient Account</span>
                  <span className="font-medium text-foreground tabular">
                    {txn.counterpartyAccount}
                  </span>
                </div>
              )}

              {fromAccount && (
                <div className="flex items-start justify-between gap-4 px-3.5 py-2.5">
                  <span className="text-muted-foreground shrink-0">From Account</span>
                  <span className="font-medium text-foreground text-right">
                    {fromAccount.name} <span className="tabular text-muted-foreground">(•••{fromAccount.number.replace(/\s+/g, "").slice(-4)})</span>
                  </span>
                </div>
              )}

              <div className="flex items-start justify-between gap-4 px-3.5 py-2.5">
                <span className="text-muted-foreground shrink-0">Narration</span>
                <span className="font-medium text-foreground text-right max-w-[280px]">
                  {txn.description}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Financial Breakdown */}
          <div className="flex flex-col gap-2.5">
            <span className="text-[11.5px] uppercase tracking-wider text-muted-foreground font-medium">
              Amount Breakdown
            </span>

            <div className="rounded-xl border border-border/70 bg-background/50 divide-y divide-border/60 text-[13.5px]">
              <div className="flex items-center justify-between px-3.5 py-2.5">
                <span className="text-muted-foreground">Transfer Amount</span>
                <span className="font-medium text-foreground tabular">
                  {sendAmountFormatted}
                </span>
              </div>

              {isForeign && (
                <>
                  <div className="flex items-center justify-between px-3.5 py-2.5">
                    <span className="text-muted-foreground">Receive Amount</span>
                    <span className="font-medium text-foreground tabular">
                      {receiveAmountFormatted}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-3.5 py-2.5">
                    <span className="text-muted-foreground">Exchange Rate</span>
                    <span className="font-medium text-foreground tabular">
                      1 {txn.currency} = {exchangeRate.toFixed(2)} GHS
                    </span>
                  </div>
                </>
              )}

              <div className="flex items-center justify-between px-3.5 py-2.5">
                <span className="text-muted-foreground">Processing Fee</span>
                <span className="font-medium text-foreground tabular">
                  {feeAmount > 0 ? formatMoney(feeAmount, "GHS", true) : "GHS 0.00"}
                </span>
              </div>

              <div className="flex items-center justify-between px-3.5 py-3 bg-muted/40 dark:bg-muted/20">
                <span className="text-[13.5px] font-medium text-foreground">
                  {isCredit ? "Total Credit" : "Total Debit"}
                </span>
                <span className="text-[17px] font-semibold text-foreground tracking-[-0.02em] tabular">
                  {formatMoney(totalDebit, "GHS", true)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Card Actions matching Figma Action Bar pattern */}
        <div className="flex items-center justify-between gap-3 p-4 sm:p-5 border-t border-border/70 bg-muted/20">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="h-9 gap-1.5 px-3 text-[13px] font-medium rounded-lg"
            >
              <Share size={14} strokeWidth={1.9} />
              Share
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="h-9 gap-1.5 px-3 text-[13px] font-medium rounded-lg"
            >
              <ArrowDownToLine size={14} strokeWidth={1.9} />
              Download Receipt
            </Button>
          </div>

          {!isCredit && (
            <Button
              size="sm"
              onClick={handleRepeat}
              className="h-9 gap-1.5 px-4 text-[13px] font-medium rounded-lg bg-primary text-primary-foreground shadow-xs active:scale-[0.96]"
            >
              <RefreshCw size={14} strokeWidth={1.9} />
              Repeat Payment
            </Button>
          )}
        </div>
      </div>

      {/* ── State-specific Recovery Affordances (Preserving 13.2 Business Rules) ── */}
      <StateBand state={state} txn={txn} />

      {/* ── State Switcher Testing Strip ── */}
      <div className="pt-2 border-t border-border/40">
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
