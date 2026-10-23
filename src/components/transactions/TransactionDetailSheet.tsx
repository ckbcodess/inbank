"use client";

import { personalRepeatHref } from "@/lib/repeat-payment";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, Share2, FileDown, RotateCw } from "@/components/ui/icons";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { findAccount, type Transaction } from "@/lib/mock-data";
import { getTransactionType } from "@/lib/transaction-type";
import { receiptFields } from "@/lib/receipt-fields";
import { useTransactionDetail } from "@/lib/transaction-detail";
import { Bone } from "@/components/states/PageSkeletons";
import { ShareReceiptDialog, type ReceiptFormat } from "./ShareReceiptDialog";
import { cn } from "@/lib/utils";
import { roundMoney } from "@/lib/money";

interface TransactionDetailSheetProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Where "Repeat" goes for this transaction, or null to hide it. Left out, it is the personal Send & Pay link;
   * business passes its own so the sheet never leads out of the business app.
   */
  repeatHref?: ((t: Transaction) => string | null) | null;
}

function formatFullDate(dateStr: string, timeStr?: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const formattedDate = d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    if (!timeStr) return formattedDate;
    
    // Parse time if like "14:05"
    let timeFormatted = timeStr;
    if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
      const [hh, mm] = timeStr.split(":").map(Number);
      const hour12 = hh % 12 === 0 ? 12 : hh % 12;
      const ampm = hh >= 12 ? "PM" : "AM";
      timeFormatted = `${hour12}:${String(mm).padStart(2, "0")} ${ampm}`;
    }
    return `${formattedDate}, ${timeFormatted}`;
  } catch {
    return dateStr;
  }
}

export function TransactionDetailSheet({
  transaction: incoming,
  open,
  onOpenChange,
  repeatHref = personalRepeatHref,
}: TransactionDetailSheetProps) {
  const router = useRouter();
  const [copied, setCopied] = React.useState(false);
  const [shareFormat, setShareFormat] = React.useState<ReceiptFormat | null>(null);

  // The list clears its selection the moment the sheet is closed. Keep showing the last transaction so the sheet
  // is still there to slide out; without this it vanished with no exit animation.
  const [last, setLast] = React.useState<Transaction | null>(incoming);
  React.useEffect(() => {
    if (incoming) setLast(incoming);
  }, [incoming]);
  const transaction = incoming ?? last;

  // The row already knows the amount, who, when and the status; the rest comes from the detail call.
  const { status: detailStatus, retry } = useTransactionDetail(transaction);
  const detailReady = detailStatus === "ready";

  if (!transaction) return null;

  const account = findAccount(transaction.accountId);
  const isFailed =
    transaction.state.startsWith("failed") ||
    transaction.state === "reversed" ||
    transaction.state === "disputed";
  const isPending =
    transaction.state === "pending" || transaction.state === "awaiting-approval";

  const statusLabel = isFailed
    ? "Failed"
    : isPending
    ? "Pending"
    : "Completed";

  const currencyCode = transaction.currency || "GHS";
  const formattedAmount = `${currencyCode} ${transaction.amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  // A fee is shown only when one was recorded: a missing fee is unknown, not zero.
  const feeKnown = typeof transaction.fee === "number";
  const feeAmount = feeKnown ? transaction.fee! : 0;
  const totalDebited = roundMoney(transaction.amount + feeAmount);
  const formattedFee = `${currencyCode} ${feeAmount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  const formattedTotal = `${currencyCode} ${totalDebited.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const channelType = getTransactionType(transaction);
  const dateTimeString = formatFullDate(transaction.date, transaction.time);

  // The who-and-where rows follow the kind of transaction (bank transfer, mobile money, airtime, bill...)
  const detailFields = receiptFields(transaction);
  const isCredit = transaction.direction === "credit";
  const fromLabel = isCredit ? "Credited To" : "From Account";
  const totalLabel = isCredit ? "Total Credited" : "Total Debited";

  const fromAccountLabel = account ? `${account.type} (***${account.number.slice(-4)})` : "";

  // Rows with nothing behind them are left out rather than filled with a stand-in.
  const narration = transaction.description?.trim() ?? "";
  const categoryLabel = !isCredit && transaction.category ? transaction.category : "";
  const showBreakdown = feeKnown;

  const handleCopyRef = async () => {
    try {
      await navigator.clipboard.writeText(transaction.reference);
      setCopied(true);
      toast.success("Transaction ID copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy transaction ID");
    }
  };

  const repeatTo = repeatHref ? repeatHref(transaction) : null;
  const handleRepeat = () => {
    if (!repeatTo) return;
    onOpenChange(false);
    router.push(repeatTo);
  };

  // Receipt text copy / share
  const receiptText = (masked: boolean) => {
    const lines = [
      "GCB Bank Receipt",
      `Channel: ${channelType}`,
      `Amount: ${masked ? "Hidden" : formattedAmount}`,
      `Date & Time: ${dateTimeString}`,
      ...detailFields.map((f) => `${f.label}: ${f.value}`),
      `Status: ${statusLabel}`,
      `Transaction ID: ${transaction.reference}`,
      ...(fromAccountLabel ? [`${fromLabel}: ${fromAccountLabel}`] : []),
      ...(narration ? [`Narration: ${narration}`] : []),
      ...(categoryLabel ? [`Category: ${categoryLabel}`] : []),
      ...(masked
        ? ["Amounts and fees are hidden on this receipt."]
        : showBreakdown
          ? [`Amount: ${formattedAmount}`, `Fee: ${formattedFee}`, `${totalLabel}: ${formattedTotal}`]
          : []),
    ];
    return lines.join("\n");
  };

  const saveReceiptPdf = (masked: boolean) => {
    const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const amountRows: [string, string][] = masked || !showBreakdown
      ? []
      : [
          ["Amount", formattedAmount],
          ["Fee", formattedFee],
          [totalLabel, formattedTotal],
        ];

    const rows: [string, string][] = [
      ["Channel Type", channelType],
      ...detailFields.map((f): [string, string] => [f.label, f.value]),
      ["Status", statusLabel],
      ["Transaction ID", transaction.reference],
      ...(fromAccountLabel ? [[fromLabel, fromAccountLabel] as [string, string]] : []),
      ...(narration ? [["Narration", narration] as [string, string]] : []),
      ...(categoryLabel ? [["Category", categoryLabel] as [string, string]] : []),
      ...amountRows,
    ];

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>GCB-Receipt-${esc(transaction.reference)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111; margin: 40px auto; max-width: 480px; }
  .channel { font-size: 13px; color: #666; text-align: center; margin-bottom: 6px; }
  .amount { font-size: 32px; font-weight: 700; text-align: center; margin: 0 0 4px; }
  .date { font-size: 13px; color: #777; text-align: center; margin-bottom: 32px; }
  .row { display: flex; justify-content: space-between; padding: 10px 0; font-size: 13.5px; }
  .label { color: #777; }
  .val { font-weight: 500; text-align: right; }
  .divider { border-bottom: 1px dashed #e2e2e2; margin: 12px 0; }
  .badge { background: #dcfce7; color: #15803d; padding: 2px 8px; border-radius: 9999px; font-size: 12px; }
</style></head><body>
  <div class="channel">${esc(channelType)}</div>
  <div class="amount">${esc(masked ? "Amount Hidden" : formattedAmount)}</div>
  <div class="date">${esc(dateTimeString)}</div>
  <div class="divider"></div>
  ${rows.map(([k, v]) => `
    <div class="row">
      <span class="label">${esc(k)}</span>
      <span class="val">${k === "Status" ? `<span class="badge">${esc(v)}</span>` : esc(v)}</span>
    </div>
  `).join("")}
</body></html>`;

    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    if (!doc || !frame.contentWindow) {
      frame.remove();
      toast.error("Couldn't prepare PDF");
      return;
    }
    doc.open();
    doc.write(html);
    doc.close();
    const win = frame.contentWindow;
    win.onafterprint = () => frame.remove();
    setTimeout(() => win.print(), 150);
  };

  const handleShare = async (masked: boolean, format: ReceiptFormat) => {
    if (format === "pdf") {
      saveReceiptPdf(masked);
      return;
    }
    const text = receiptText(masked);
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: `${channelType} - ${transaction.reference}`, text });
        return;
      } catch {
        // cancelled, fall back to copy
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success(masked ? "Receipt copied with amounts hidden" : "Receipt copied to clipboard");
    } catch {
      toast.error("Couldn't copy receipt");
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="center"
          className="flex flex-col bg-modal p-0 select-text overflow-hidden"
          showCloseButton={true}
        >
          {/* ── Scrollable Content Area ── */}
          <div className="relative z-10 flex-1 overflow-y-auto px-5 sm:px-8 pt-12 pb-5 no-scrollbar flex flex-col">
            {/* Centred in the space above the buttons; scrolls if the receipt is taller than that */}
            <div className="my-auto">
              {/* ── Hero Section (Channel, Big Amount, Date & Time) ── */}
              <div className="flex flex-col items-center text-center pb-5">
                <span className="text-[13px] font-normal text-muted-foreground tracking-normal">
                  {channelType}
                </span>
                <h2 className="mt-4 text-[32px] sm:text-[40px] font-normal text-foreground tracking-[var(--ls-display)] leading-none tabular">
                  {formattedAmount}
                </h2>
                <span className="mt-4 text-[12px] text-muted-foreground/80 tracking-normal">
                  {dateTimeString}
                </span>
              </div>

              {/* ── Section 1: who and where, for this kind of transaction ── */}
              <div className="flex flex-col gap-3 py-5">
                {detailStatus === "loading" &&
                  [0, 1, 2].map((i) => (
                    <div key={i} className="flex items-center justify-between gap-3">
                      <Bone className="h-4 w-16" />
                      <Bone className="h-4 w-28" />
                    </div>
                  ))}
                {detailStatus === "error" && (
                  <div className="flex items-center justify-between gap-3 text-[13px]">
                    <span className="text-muted-foreground">Couldn’t load the details of this payment.</span>
                    <button
                      type="button"
                      onClick={retry}
                      className="shrink-0 cursor-pointer font-medium text-foreground underline underline-offset-2"
                    >
                      Try again
                    </button>
                  </div>
                )}
                {detailReady && detailFields.map((f, i) => (
                  <div key={f.label} className="flex items-center justify-between gap-3 text-[13px]">
                    <span className="text-muted-foreground font-normal">{f.label}</span>
                    <span
                      className={cn(
                        "text-foreground text-right",
                        i === 0 ? "font-medium tracking-[var(--ls-tight)]" : "font-medium tabular",
                      )}
                    >
                      {f.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* ── Section 2: Status / Transaction ID / From Account ── */}
              <div className="flex flex-col gap-3 relative py-5 before:absolute before:inset-x-0 before:top-0 before:h-px before:content-[''] before:bg-[repeating-linear-gradient(to_right,var(--border)_0_6px,transparent_6px_16px)]">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-muted-foreground font-normal">Status</span>
                  <span
                    className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium",
                      isFailed
                        ? "bg-pill-destructive text-pill-destructive-text"
                        : isPending
                        ? "bg-pill-warning text-pill-warning-text"
                        : "bg-pill-success text-pill-success-text"
                    )}
                  >
                    {statusLabel}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-muted-foreground font-normal">Transaction ID</span>
                  {detailReady ? (
                    <button
                      type="button"
                      onClick={handleCopyRef}
                      className="group flex items-center gap-2 text-foreground font-medium tabular cursor-pointer"
                      title="Copy"
                    >
                      <span>{transaction.reference}</span>
                      {copied ? (
                        <Check size={13} className="text-success-text" />
                      ) : (
                        <Copy
                          size={13}
                          className="text-muted-foreground group-hover:text-foreground transition-colors"
                        />
                      )}
                    </button>
                  ) : (
                    detailStatus === "loading" && <Bone className="h-4 w-28" />
                  )}
                </div>

                {fromAccountLabel && (
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-muted-foreground font-normal">{fromLabel}</span>
                    <span className="text-foreground font-medium text-right">
                      {fromAccountLabel}
                    </span>
                  </div>
                )}
              </div>

              {/* ── Section 3: Narration & Category ── */}
              {(detailStatus === "loading" || (detailReady && (narration || categoryLabel))) && (
                <div className="flex flex-col gap-3 relative py-5 before:absolute before:inset-x-0 before:top-0 before:h-px before:content-[''] before:bg-[repeating-linear-gradient(to_right,var(--border)_0_6px,transparent_6px_16px)]">
                  {detailStatus === "loading" ? (
                    <>
                      <div className="flex items-center justify-between gap-3">
                        <Bone className="h-4 w-16" />
                        <Bone className="h-4 w-32" />
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <Bone className="h-4 w-16" />
                        <Bone className="h-4 w-20" />
                      </div>
                    </>
                  ) : (
                    <>
                      {narration && (
                        <div className="flex items-center justify-between text-[13px]">
                          <span className="text-muted-foreground font-normal">Narration</span>
                          <span className="text-foreground font-medium text-right truncate max-w-[200px]">
                            {narration}
                          </span>
                        </div>
                      )}
                      {categoryLabel && (
                        <div className="flex items-center justify-between text-[13px]">
                          <span className="text-muted-foreground font-normal">Category</span>
                          <span className="text-foreground font-medium text-right">
                            {categoryLabel}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ── Section 4: Breakdown (Amount, Fee, Total Debited), once a fee is on record ── */}
              {(detailStatus === "loading" || (detailReady && showBreakdown)) && (
                <div className="flex flex-col gap-3 relative py-5 before:absolute before:inset-x-0 before:top-0 before:h-px before:content-[''] before:bg-[repeating-linear-gradient(to_right,var(--border)_0_6px,transparent_6px_16px)]">
                  {detailStatus === "loading" ? (
                    [0, 1, 2].map((i) => (
                      <div key={i} className="flex items-center justify-between gap-3">
                        <Bone className="h-4 w-16" />
                        <Bone className="h-4 w-24" />
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="flex items-center justify-between text-[13px]">
                        <span className="text-muted-foreground font-normal">Amount</span>
                        <span className="text-foreground font-medium tabular text-right">
                          {formattedAmount}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[13px]">
                        <span className="text-muted-foreground font-normal">Fee</span>
                        <span className="text-foreground font-medium tabular text-right">
                          {formattedFee}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[13px]">
                        <span className="text-muted-foreground font-normal">{totalLabel}</span>
                        <span className="text-foreground font-medium tabular text-right">
                          {formattedTotal}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Bottom Circular Action Buttons (Share, Save as PDF, Repeat): pinned to the foot of the sheet ── */}
          <div className="relative z-10 shrink-0 px-5 sm:px-8 pb-6 pt-3">
            <div>
              <div className="flex items-center justify-center gap-6">
                {/* Share Action */}
                <button
                  type="button"
                  onClick={() => setShareFormat("text")}
                  disabled={!detailReady}
                  className="group flex flex-col items-center gap-2 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl p-1 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="size-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xs transition-transform duration-fast active:scale-95 group-hover:brightness-95">
                    <Share2 size={20} />
                  </div>
                  <span className="text-[12px] font-normal text-foreground tracking-tight">
                    Share
                  </span>
                </button>

                {/* Save as PDF Action */}
                <button
                  type="button"
                  onClick={() => setShareFormat("pdf")}
                  disabled={!detailReady}
                  className="group flex flex-col items-center gap-2 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl p-1 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="size-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xs transition-transform duration-fast active:scale-95 group-hover:brightness-95">
                    <FileDown size={20} />
                  </div>
                  <span className="text-[12px] font-normal text-foreground tracking-tight">
                    Save as PDF
                  </span>
                </button>

                {/* Repeat Action: only where the app has somewhere to repeat it to */}
                {repeatTo && (
                  <button
                    type="button"
                    onClick={handleRepeat}
                  disabled={!detailReady}
                    className="group flex flex-col items-center gap-2 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl p-1 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <div className="size-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xs transition-transform duration-fast active:scale-95 group-hover:brightness-95">
                      <RotateCw size={20} />
                    </div>
                    <span className="text-[12px] font-normal text-foreground tracking-tight">
                      Repeat
                    </span>
                  </button>
                )}
              </div>
              {!detailReady && (
                <p className="mt-3 text-center text-[12px] text-muted-foreground">
                  {detailStatus === "loading"
                    ? "Share, save and repeat are ready once the details load."
                    : "Share, save and repeat need the details. Try loading them again."}
                </p>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Share / PDF Privacy Dialog */}
      <ShareReceiptDialog
        format={shareFormat}
        onClose={() => setShareFormat(null)}
        onShare={handleShare}
      />
    </>
  );
}

