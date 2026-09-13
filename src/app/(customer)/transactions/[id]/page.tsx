"use client";

/**
 * Transaction Details — distilled minimal view.
 *
 * Implements:
 * - Unified PageHeader with back navigation, clear transaction title, metadata subtitle,
 *   standard TransactionStatusBadge, and top action controls (Share, Receipt, Repeat).
 * - Distilled single-surface financial card with clear amount hierarchy, tabular figures,
 *   and inline foreign exchange conversion.
 * - Clean structured definition list for transaction attributes without cards-inside-cards nesting.
 * - Preserved Section 13.2 state recovery affordances and interactive StateSwitcher simulator.
 * - Strict Zero-Bold Rule and semantic design token compliance.
 */

import { use, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowDownToLine,
  ArrowRight,
  Check,
  Clock,
  Copy,
  FileWarning,
  History,
  Layers,
  RefreshCw,
  RotateCcw,
  Share,
  ShieldQuestion,
} from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { GCBLogo } from "@/components/ui/GCBLogo";
import { TransactionStatusBadge } from "@/components/StatusBadge";
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

function getTransactionMethodLabel(t: Transaction): string {
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
        <h1 className="text-[20px] text-foreground">Transaction not found</h1>
        <p className="text-[14px] text-muted-foreground">
          The transaction record you requested could not be located.
        </p>
        <Button onClick={() => router.push("/transactions")} variant="outline" className="mt-2">
          Back to Transactions
        </Button>
      </div>
    );
  }

  const methodLabel = getTransactionMethodLabel(txn);

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
          title: `${methodLabel} - ${txn.reference}`,
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
    router.push(
      `/payments/send?duplicate=${txn.id}&amount=${txn.amount}&payee=${encodeURIComponent(
        txn.counterparty || txn.description
      )}`
    );
  };

  const handleDownload = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="w-full flex flex-col gap-8">
      {/* Page Header with Back, Title, Status, and Action Controls */}
      <PageHeader
        title={txn.counterparty || txn.description}
        description={`${formattedDate} · ${formattedTime} · ${methodLabel}`}
        badge={<TransactionStatusBadge state={state} />}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="rounded-lg h-8 px-3 text-[13px] border-border/80"
            >
              {copied ? (
                <Check size={14} className="text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Share size={14} strokeWidth={1.8} />
              )}
              Share
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="rounded-lg h-8 px-3 text-[13px] border-border/80"
            >
              <ArrowDownToLine size={14} strokeWidth={1.8} />
              Receipt
            </Button>
            {!isCredit && (
              <Button
                size="sm"
                onClick={handleRepeat}
                className="rounded-lg h-8 px-3 text-[13px]"
              >
                <RefreshCw size={14} strokeWidth={1.8} />
                Repeat
              </Button>
            )}
          </div>
        }
        backTo={{ href: "/transactions", label: "Transactions" }}
      />

      {/* Share Toast feedback */}
      {shareToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 rounded-full bg-foreground text-background px-4 py-2 text-[13px] shadow-lg animate-in fade-in slide-in-from-top-2">
          Transaction reference copied to clipboard
        </div>
      )}

      {/* Centered Receipt Container */}
      <div className="mx-auto w-full max-w-3xl flex flex-col gap-8">
        {/* Primary Financial Card */}
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        {/* Amount & FX Summary */}
        <div className="flex flex-col items-center justify-center text-center pb-6 border-b border-border">
          <div className="flex items-center justify-center size-12 rounded-2xl bg-card border border-border/80 shadow-xs mb-3.5">
            <GCBLogo className="h-6 w-auto" />
          </div>

          <span className="text-[12px] text-muted-foreground uppercase tracking-wider">
            {isCredit ? "Amount Credited" : "Amount Debited"}
          </span>

          <div className="mt-1 flex items-baseline justify-center gap-3 flex-wrap">
            <span
              className={cn(
                "text-[34px] sm:text-[40px] tracking-[-0.03em] tabular-nums numorainput",
                isCredit ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
              )}
            >
              {isCredit ? "+" : "-"}
              {formatMoney(txn.amount, txn.currency, true)}
            </span>
          </div>

          {isForeign && (
            <p className="mt-1 text-[13.5px] text-muted-foreground tabular-nums numorainput">
              ≈ {formatMoney(txn.amount * exchangeRate, "GHS", true)} (1 {txn.currency} = {exchangeRate.toFixed(2)} GHS)
            </p>
          )}
        </div>

        {/* Unified Transaction Details Grid */}
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 pt-6">
          <div>
            <dt className="text-[12px] text-muted-foreground">Reference</dt>
            <dd className="mt-1 flex items-center gap-2 text-[14px] text-foreground tabular-nums numorainput">
              <span>{txn.reference}</span>
              <SimpleTooltip content={copied ? "Copied" : "Copy reference"}>
                <button
                  type="button"
                  onClick={handleCopyReference}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted cursor-pointer"
                  aria-label="Copy reference"
                >
                  {copied ? (
                    <Check size={13} className="text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Copy size={13} strokeWidth={1.8} />
                  )}
                </button>
              </SimpleTooltip>
            </dd>
          </div>

          <div>
            <dt className="text-[12px] text-muted-foreground">Date & Time</dt>
            <dd className="mt-1 text-[14px] text-foreground tabular-nums numorainput">
              {formattedDate} · {formattedTime}
            </dd>
          </div>

          <div>
            <dt className="text-[12px] text-muted-foreground">From Account</dt>
            <dd className="mt-1 text-[14px] text-foreground">
              {fromAccount ? (
                <>
                  {fromAccount.name}{" "}
                  <span className="text-muted-foreground tabular-nums numorainput">
                    (•••{fromAccount.number.replace(/\s+/g, "").slice(-4)})
                  </span>
                </>
              ) : (
                "Operating Account"
              )}
            </dd>
          </div>

          <div>
            <dt className="text-[12px] text-muted-foreground">Recipient</dt>
            <dd className="mt-1 text-[14px] text-foreground">
              {txn.counterparty || txn.description}
            </dd>
          </div>

          {txn.counterpartyAccount && (
            <div>
              <dt className="text-[12px] text-muted-foreground">Recipient Account</dt>
              <dd className="mt-1 text-[14px] text-foreground tabular-nums numorainput">
                {txn.counterpartyAccount}
              </dd>
            </div>
          )}

          <div>
            <dt className="text-[12px] text-muted-foreground">Payment Channel</dt>
            <dd className="mt-1 text-[14px] text-foreground">
              {txn.channel || "Internet Banking"}
            </dd>
          </div>

          {txn.category && (
            <div>
              <dt className="text-[12px] text-muted-foreground">Category</dt>
              <dd className="mt-1 text-[14px] text-foreground">{txn.category}</dd>
            </div>
          )}

          <div>
            <dt className="text-[12px] text-muted-foreground">Narration</dt>
            <dd className="mt-1 text-[14px] text-foreground">
              {txn.description}
            </dd>
          </div>

          <div>
            <dt className="text-[12px] text-muted-foreground">Processing Fee</dt>
            <dd className="mt-1 text-[14px] text-foreground tabular-nums numorainput">
              {feeAmount > 0 ? formatMoney(feeAmount, "GHS", true) : "GHS 0.00"}
            </dd>
          </div>

          <div>
            <dt className="text-[12px] text-muted-foreground">
              {isCredit ? "Total Credited" : "Total Debited"}
            </dt>
            <dd className="mt-1 text-[15px] text-foreground tabular-nums numorainput">
              {formatMoney(totalDebit, "GHS", true)}
            </dd>
          </div>
        </dl>
      </div>

      {/* State-specific Recovery Affordances (Section 13.2) */}
      <StateBand state={state} txn={txn} />

      {/* State Simulator Strip for testing Section 13.2 */}
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
            <span className="text-foreground tabular-nums numorainput">{formatDate(txn.valueDate)}, end of day</span>.
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
              <Copy size={14} strokeWidth={1.8} className="mr-1.5" />
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
              <ArrowRight size={14} strokeWidth={1.8} className="mr-1.5" />
              Open batch correction
            </Button>
          </div>
        </Band>
      );

    case "failed-trade":
      return (
        <Band tone="warning" icon={<FileWarning size={17} strokeWidth={1.8} aria-hidden="true" />} title="Returned by bank operations">
          <p>{txn.failureReason ?? "This trade request was returned for correction."}</p>
          <div className="mt-3 rounded-xl border border-border bg-card">
            <p className="flex items-center gap-1.5 border-b border-border px-3 py-2 text-[12px] uppercase tracking-wider text-muted-foreground">
              <History size={13} strokeWidth={1.8} />
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
              <RotateCcw size={14} strokeWidth={1.8} className="mr-1.5" />
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
            <span className="text-foreground tabular-nums numorainput">{txn.reversalReference ?? "—"}</span>.
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
          <p className="text-[14px]">{title}</p>
          <div className="mt-1 text-foreground/90">{children}</div>
        </div>
      </div>
    </section>
  );
}
