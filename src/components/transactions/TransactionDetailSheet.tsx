"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, Share2, FileDown, RotateCw } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { findAccount, type Transaction } from "@/lib/mock-data";
import { getTransactionType } from "@/lib/transaction-type";
import { receiptFields } from "@/lib/receipt-fields";
import { ShareReceiptDialog, type ReceiptFormat } from "./ShareReceiptDialog";
import { cn } from "@/lib/utils";

interface TransactionDetailSheetProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showFullPageLink?: boolean;
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

  const feeAmount = typeof transaction.fee === "number" ? transaction.fee : 0;
  const totalDebited = transaction.amount + feeAmount;
  const formattedFee = `${currencyCode} ${feeAmount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  const formattedTotal = `${currencyCode} ${totalDebited.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const recipientName =
    transaction.counterparty || transaction.description || "Akua Gyasi";
  const channelType = getTransactionType(transaction) || "Channel Type";
  const dateTimeString = formatFullDate(transaction.date, transaction.time || "8:42 AM");

  // The who-and-where rows follow the kind of transaction (bank transfer, mobile money, airtime, bill...)
  const detailFields = receiptFields(transaction);
  const isCredit = transaction.direction === "credit";
  const fromLabel = isCredit ? "Credited To" : "From Account";
  const totalLabel = isCredit ? "Total Credited" : "Total Debited";

  const fromAccountLabel = account
    ? `${account.type} (***${account.number.slice(-4)})`
    : "Savings Account (***1100)";

  const narration = transaction.description || "For Bananas";
  const categoryLabel = transaction.category || "Transport";

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

  const handleRepeat = () => {
    onOpenChange(false);
    router.push(
      `/payments/send?duplicate=${transaction.id}&amount=${transaction.amount}&payee=${encodeURIComponent(
        recipientName
      )}`
    );
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
      `${fromLabel}: ${fromAccountLabel}`,
      `Narration: ${narration}`,
      `Category: ${categoryLabel}`,
      ...(masked
        ? ["Amounts and fees are hidden on this receipt."]
        : [
            `Amount: ${formattedAmount}`,
            `Fee: ${formattedFee}`,
            `${totalLabel}: ${formattedTotal}`,
          ]),
    ];
    return lines.join("\n");
  };

  const saveReceiptPdf = (masked: boolean) => {
    const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const amountRows: [string, string][] = masked
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
      [fromLabel, fromAccountLabel],
      ["Narration", narration],
      ["Category", categoryLabel],
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
          side="right"
          className="flex flex-col bg-modal p-0 select-text overflow-hidden"
          showCloseButton={true}
        >
          {/* ── Scrollable Content Area ── */}
          <div className="relative z-10 flex-1 overflow-y-auto px-6 sm:px-9 pt-14 pb-6 no-scrollbar flex flex-col">
            {/* Centred in the space above the buttons; scrolls if the receipt is taller than that */}
            <div className="my-auto">
              {/* ── Hero Section (Channel, Big Amount, Date & Time) ── */}
              <div className="flex flex-col items-center text-center pb-6">
                <span className="text-[13px] font-normal text-muted-foreground tracking-normal">
                  {channelType}
                </span>
                <h2 className="mt-5 text-[32px] sm:text-[40px] font-normal text-foreground tracking-[var(--ls-display)] leading-none tabular">
                  {formattedAmount}
                </h2>
                <span className="mt-5 text-[12.5px] text-muted-foreground/80 tracking-normal">
                  {dateTimeString}
                </span>
              </div>

              {/* ── Section 1: who and where, for this kind of transaction ── */}
              <div className="flex flex-col gap-4 py-6">
                {detailFields.map((f, i) => (
                  <div key={f.label} className="flex items-center justify-between gap-4 text-[13.5px]">
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
              <div className="flex flex-col gap-4 relative py-6 before:absolute before:inset-x-0 before:top-0 before:h-px before:content-[''] before:bg-[repeating-linear-gradient(to_right,var(--border)_0_6px,transparent_6px_16px)]">
                <div className="flex items-center justify-between text-[13.5px]">
                  <span className="text-muted-foreground font-normal">Status</span>
                  <span
                    className={cn(
                      "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11.5px] font-medium",
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

                <div className="flex items-center justify-between text-[13.5px]">
                  <span className="text-muted-foreground font-normal">Transaction ID</span>
                  <button
                    type="button"
                    onClick={handleCopyRef}
                    className="group flex items-center gap-1.5 text-foreground font-medium tabular cursor-pointer"
                    title="Copy"
                  >
                    <span>{transaction.reference}</span>
                    {copied ? (
                      <Check size={13} strokeWidth={1.8} className="text-success-text" />
                    ) : (
                      <Copy
                        size={13}
                        strokeWidth={1.7}
                        className="text-muted-foreground group-hover:text-foreground transition-colors"
                      />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between text-[13.5px]">
                  <span className="text-muted-foreground font-normal">{fromLabel}</span>
                  <span className="text-foreground font-medium text-right">
                    {fromAccountLabel}
                  </span>
                </div>
              </div>

              {/* ── Section 3: Narration & Category ── */}
              <div className="flex flex-col gap-4 relative py-6 before:absolute before:inset-x-0 before:top-0 before:h-px before:content-[''] before:bg-[repeating-linear-gradient(to_right,var(--border)_0_6px,transparent_6px_16px)]">
                <div className="flex items-center justify-between text-[13.5px]">
                  <span className="text-muted-foreground font-normal">Narration</span>
                  <span className="text-foreground font-medium text-right truncate max-w-[200px]">
                    {narration}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[13.5px]">
                  <span className="text-muted-foreground font-normal">Category</span>
                  <span className="text-foreground font-medium text-right">
                    {categoryLabel}
                  </span>
                </div>
              </div>

              {/* ── Section 4: Breakdown (Amount, Fee, Total Debited) ── */}
              <div className="flex flex-col gap-4 relative py-6 before:absolute before:inset-x-0 before:top-0 before:h-px before:content-[''] before:bg-[repeating-linear-gradient(to_right,var(--border)_0_6px,transparent_6px_16px)]">
                <div className="flex items-center justify-between text-[13.5px]">
                  <span className="text-muted-foreground font-normal">Amount</span>
                  <span className="text-foreground font-medium tabular text-right">
                    {formattedAmount}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[13.5px]">
                  <span className="text-muted-foreground font-normal">Fee</span>
                  <span className="text-foreground font-medium tabular text-right">
                    {formattedFee}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[13.5px]">
                  <span className="text-muted-foreground font-normal">{totalLabel}</span>
                  <span className="text-foreground font-medium tabular text-right">
                    {formattedTotal}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Bottom Circular Action Buttons (Share, Save as PDF, Repeat): pinned to the foot of the sheet ── */}
          <div className="relative z-10 shrink-0 px-6 sm:px-9 pb-8 pt-4">
            <div>
              <div className="flex items-center justify-center gap-7">
                {/* Share Action */}
                <button
                  type="button"
                  onClick={() => setShareFormat("text")}
                  className="group flex flex-col items-center gap-2 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl p-1"
                >
                  <div className="size-13 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xs transition-transform duration-fast active:scale-95 group-hover:brightness-95">
                    <Share2 size={20} strokeWidth={2} />
                  </div>
                  <span className="text-[12.5px] font-normal text-foreground tracking-tight">
                    Share
                  </span>
                </button>

                {/* Save as PDF Action */}
                <button
                  type="button"
                  onClick={() => setShareFormat("pdf")}
                  className="group flex flex-col items-center gap-2 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl p-1"
                >
                  <div className="size-13 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xs transition-transform duration-fast active:scale-95 group-hover:brightness-95">
                    <FileDown size={20} strokeWidth={2} />
                  </div>
                  <span className="text-[12.5px] font-normal text-foreground tracking-tight">
                    Save as PDF
                  </span>
                </button>

                {/* Repeat Action */}
                <button
                  type="button"
                  onClick={handleRepeat}
                  className="group flex flex-col items-center gap-2 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl p-1"
                >
                  <div className="size-13 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xs transition-transform duration-fast active:scale-95 group-hover:brightness-95">
                    <RotateCw size={20} strokeWidth={2} />
                  </div>
                  <span className="text-[12.5px] font-normal text-foreground tracking-tight">
                    Repeat
                  </span>
                </button>
              </div>
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

