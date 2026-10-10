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
  ArrowRight,
  Check,
  Clock,
  Copy,
  FileDown,
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
import { toast } from "sonner";
import { getTransactionType } from "@/lib/transaction-type";
import { ShareReceiptDialog, type ReceiptFormat } from "@/components/transactions/ShareReceiptDialog";
import { RoundAction } from "@/components/ui/round-action";
import { TransactionStatusBadge, transactionStatusLabel } from "@/components/StatusBadge";
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
  if (t.paymentMethod === "data") return "Internet Purchase";
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

/** "14:05" -> "2:05 PM". Payments made in the app save their time; older history gets a steady stand-in per transaction. */
function receiptTime(t: Transaction): string {
  let hh: number;
  let mm: number;
  if (t.time && /^\d{1,2}:\d{2}$/.test(t.time)) {
    [hh, mm] = t.time.split(":").map(Number);
  } else {
    let h = 0;
    for (const c of t.id) h = (h * 31 + c.charCodeAt(0)) % 1440;
    hh = 8 + Math.floor((h % 600) / 60);
    mm = h % 60;
  }
  const hour12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${hour12}:${String(mm).padStart(2, "0")} ${hh >= 12 ? "PM" : "AM"}`;
}

export default function TransactionDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const txn = findTransaction(id);
  const [state, setState] = useState<TransactionState>(txn?.state ?? "completed");
  const [copied, setCopied] = useState(false);
  const [shareFormat, setShareFormat] = useState<ReceiptFormat | null>(null);

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
  const formattedTime = receiptTime(txn);

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

  // The receipt as text. Masked leaves out every money figure (amount, fee, total, exchange rate).
  const receiptText = (masked: boolean) => {
    const to = txn.counterparty || txn.description;
    const lines = [
      "GCB Bank receipt",
      `Status: ${transactionStatusLabel(state)}`,
      `Type: ${getTransactionType(txn)}`,
      `${isCredit ? "From" : "To"}: ${to}`,
      `Date: ${formattedDate}`,
      `Time: ${formattedTime}`,
      `Reference: ${txn.reference}`,
      masked
        ? "Amounts are hidden on this receipt."
        : `${isCredit ? "Amount credited" : "Amount debited"}: ${formatMoney(txn.amount, txn.currency)}${feeAmount > 0 ? ` (fee ${formatMoney(feeAmount, "GHS")}, total ${formatMoney(totalDebit, "GHS")})` : ""}`,
    ];
    return lines.join("\n");
  };

  // Save as PDF: the receipt on a clean page of its own, handed to the browser's print dialog ("Save as PDF").
  const saveReceiptPdf = (masked: boolean) => {
    const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const rows: [string, string][] = [
      ["Status", transactionStatusLabel(state)],
      ["Transaction type", getTransactionType(txn)],
      [isCredit ? "From" : "To", txn.counterparty || txn.description],
      ["Date", formattedDate],
      ["Time", formattedTime],
      ["Reference", txn.reference],
      ...(masked
        ? ([] as [string, string][])
        : ([
            ["Processing fee", feeAmount > 0 ? formatMoney(feeAmount, "GHS") : "GHS 0.00"],
            [isCredit ? "Total credited" : "Total debited", formatMoney(totalDebit, "GHS")],
          ] as [string, string][])),
    ];
    const amount = masked ? "Amount hidden" : `${isCredit ? "+" : "-"}${formatMoney(txn.amount, txn.currency)}`;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>GCB-receipt-${esc(txn.reference)}</title>
<style>
  body { font-family: "Open Sans", Arial, sans-serif; color: #2e2e2e; margin: 48px auto; max-width: 520px; }
  h1 { font-size: 15px; font-weight: 500; margin: 0 0 4px; }
  .status { font-size: 12px; color: #6b6b6b; margin-bottom: 28px; }
  .amount { font-size: 34px; margin: 0 0 28px; letter-spacing: -0.02em; }
  .row { display: flex; justify-content: space-between; gap: 24px; padding: 11px 0; border-top: 1px dashed #cfcfcf; font-size: 13px; }
  .row span:first-child { color: #6b6b6b; }
  .note { margin-top: 24px; font-size: 11px; color: #8a8a8a; }
</style></head><body>
<h1>GCB Bank receipt</h1>
<div class="status">${esc(methodLabel)}</div>
<p class="amount">${esc(amount)}</p>
${rows.map(([k, v]) => `<div class="row"><span>${esc(k)}</span><span>${esc(v)}</span></div>`).join("")}
${masked ? '<p class="note">Amounts are hidden on this receipt.</p>' : ""}
</body></html>`;
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    if (!doc || !frame.contentWindow) {
      frame.remove();
      toast.error("Couldn’t prepare the PDF");
      return;
    }
    doc.open();
    doc.write(html);
    doc.close();
    const win = frame.contentWindow;
    win.onafterprint = () => frame.remove();
    // Give the page a beat to lay out before the print dialog opens.
    setTimeout(() => win.print(), 150);
  };

  const shareReceipt = async (masked: boolean, format: ReceiptFormat) => {
    if (format === "pdf") {
      saveReceiptPdf(masked);
      return;
    }
    const text = receiptText(masked);
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: `${methodLabel} - ${txn.reference}`, text });
        return;
      } catch {
        // cancelled, or not allowed: fall through to copying
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success(masked ? "Receipt copied with amounts hidden" : "Receipt copied", { description: "Paste it into any chat or email." });
    } catch {
      toast.error("Couldn’t copy the receipt");
    }
  };

  const handleRepeat = () => {
    router.push(
      `/payments/send?duplicate=${txn.id}&amount=${txn.amount}&payee=${encodeURIComponent(
        txn.counterparty || txn.description
      )}`
    );
  };

  return (
    <div className="w-full flex flex-col gap-8">
      {/* Page Header with Back, Title, Status, and Action Controls */}
      <PageHeader
        title="Transaction Details"
        backTo={{ href: "/transactions", label: "Transactions" }}
      />

      {/* Receipt: the amount first, what to do with it, then the details as a quiet list. No card around it. */}
      <div className="mx-auto flex w-full max-w-xl flex-col gap-10">
        <section className="flex flex-col items-center gap-2 pt-4 text-center">
          <span className="text-[16px] font-medium text-foreground">{getTransactionType(txn)}</span>
          <span
            className={cn(
              "tabular text-[34px] tracking-[-0.02em] sm:text-[42px]",
              isCredit ? "text-success" : "text-foreground",
            )}
          >
            {isCredit ? "+" : "-"}
            {formatMoney(txn.amount, txn.currency, true)}
          </span>
          <span className="tabular text-[13px] text-muted-foreground">
            {formatDate(txn.date)}, {formattedTime}
          </span>
          {isForeign && (
            <p className="tabular text-[13px] text-muted-foreground">
              ≈ {formatMoney(txn.amount * exchangeRate, "GHS", true)} (1 {txn.currency} = {exchangeRate.toFixed(2)} GHS)
            </p>
          )}
        </section>

        {/* State-specific Recovery Affordances (Section 13.2) */}
        <StateBand state={state} txn={txn} />

        <section className="flex flex-col gap-2">
          {/* Grouped: the payment itself, who it went from and to, what it was for, and the money. Dashed lines between groups. */}
          <div className="flex flex-col divide-y divide-dashed divide-border">
            {[
              [
                { label: "Status", value: <TransactionStatusBadge state={state} /> },
                {
                  label: "Reference",
                  value: (
                    <span className="flex items-center gap-2">
                      <span>{txn.reference}</span>
                      <SimpleTooltip content={copied ? "Copied" : "Copy reference"}>
                        <button
                          type="button"
                          onClick={handleCopyReference}
                          className="cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          aria-label="Copy reference"
                        >
                          {copied ? <Check size={13} className="text-success-text" /> : <Copy size={13} strokeWidth={1.8} />}
                        </button>
                      </SimpleTooltip>
                    </span>
                  ),
                },
              ],
              [
                {
                  label: "From Account",
                  value: fromAccount ? (
                    <>
                      {fromAccount.name}{" "}
                      <span className="tabular text-muted-foreground">(•••{fromAccount.number.replace(/\s+/g, "").slice(-4)})</span>
                    </>
                  ) : (
                    "Operating Account"
                  ),
                },
                { label: isCredit ? "Sender" : "Recipient", value: txn.counterparty || txn.description },
                ...(txn.counterpartyAccount ? [{ label: "Recipient Account", value: txn.counterpartyAccount }] : []),
              ],
              [
                ...(txn.category ? [{ label: "Category", value: txn.category }] : []),
                { label: "Narration", value: txn.description },
              ],
              [
                { label: "Amount", value: formatMoney(txn.amount, txn.currency, true) },
                { label: "Processing Fee", value: feeAmount > 0 ? formatMoney(feeAmount, "GHS", true) : "GHS 0.00" },
                { label: isCredit ? "Total Credited" : "Total Debited", value: formatMoney(totalDebit, "GHS", true), strong: true },
              ],
            ].map((group, gi) => (
              <dl key={gi} className="flex flex-col gap-3 py-5 first:pt-3 last:pb-0">
                {group.map((row) => (
                  <div key={row.label} className="flex items-baseline justify-between gap-6">
                    <dt className="shrink-0 text-[13px] text-muted-foreground">{row.label}</dt>
                    <dd className={cn("tabular min-w-0 text-right text-[14px] text-foreground", "strong" in row && row.strong && "text-[15px]")}>
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            ))}
          </div>
        </section>

        {/* What to do with the receipt, beneath it: the shared round quick actions */}
        <div className="flex flex-wrap justify-center gap-2">
          <RoundAction icon={Share} label="Share" onClick={() => setShareFormat("text")} />
          <RoundAction icon={FileDown} label="Save as PDF" onClick={() => setShareFormat("pdf")} />
          {!isCredit && <RoundAction icon={RefreshCw} label="Repeat" onClick={handleRepeat} />}
        </div>

      <ShareReceiptDialog format={shareFormat} onClose={() => setShareFormat(null)} onShare={shareReceipt} />

      {/* Registers this screen's states in the Dev Mode menu; draws nothing. */}
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
              Open Batch Correction
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
    warning: "border-warning/30 bg-warning/5 text-warning-text",
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
