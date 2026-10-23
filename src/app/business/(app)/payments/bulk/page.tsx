"use client";

/**
 * Pay in Bulk (BRD v2 §13 portal bulk payment, BRL-21, SEC-19). An inputter builds a batch from one account: they
 * upload a CSV in the template's columns, or add payments on screen, or both. Every line is checked as it arrives;
 * a line that needs attention says why, right under it, and is fixed or removed in place, never by uploading the
 * whole file again. The lines that need attention can be downloaded as an error report. A file already submitted is
 * caught before it's used. When every line is right, the review states what leaves the account (amounts, fees, how
 * many by payment type) and who sees it next; the inputter confirms with a code and the batch goes down the same
 * approval path as a single payment. Model: `lib/corporate/bulk.ts`.
 */

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Download, Pencil, Plus, Trash2, Upload } from "@/components/ui/icons";
import PageHeader from "@/components/layout/PageHeader";
import TransactionOtpModal from "@/components/payments/TransactionOtpModal";
import { BankSelect, FromAccountSelector } from "@/components/payments/flows/shared";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ListCard } from "@/components/ui/list-card";
import { ReviewSummary } from "@/components/ui/review-summary";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { businessAccounts } from "@/lib/corporate/accounts";
import {
  BULK_RAILS,
  CSV_TEMPLATE,
  duplicateOf,
  errorReportCsv,
  feeFor,
  fingerprint,
  lineErrors,
  parseCsv,
  railFor,
  renumber,
  submitBatch,
  totals,
  type BulkBatch,
  type BulkLine,
} from "@/lib/corporate/bulk";
import { approvalPath, companyUserFor, describePath } from "@/lib/corporate/controls";
import { canInitiate } from "@/lib/corporate/roles";
import { formatMoney } from "@/lib/mock-data";
import { useSession } from "@/lib/session-store";

const BLANK: Omit<BulkLine, "row"> = { name: "", bank: "", account: "", rail: "gip", amount: 0, reference: "" };

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export default function BulkPaymentPage() {
  const actor = useSession((s) => s.actor);
  const accounts = useMemo(() => (actor ? businessAccounts().filter((a) => a.status === "Active" && a.currency === "GHS") : []), [actor]);
  const limit = companyUserFor(actor)?.limit;

  const [step, setStep] = useState<"lines" | "review" | "submitted">("lines");
  const [fromId, setFromId] = useState(() => accounts[0]?.id ?? "");
  const [batchName, setBatchName] = useState("");
  const [lines, setLines] = useState<BulkLine[]>([]);
  const [file, setFile] = useState<{ name: string; hash: string } | null>(null);
  const [fileProblem, setFileProblem] = useState("");
  const [editing, setEditing] = useState<{ row: number | null; draft: Omit<BulkLine, "row"> } | null>(null);
  const [otpOpen, setOtpOpen] = useState(false);
  const [submitted, setSubmitted] = useState<BulkBatch | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const from = accounts.find((a) => a.id === fromId);
  const checked = lines.map((l) => ({ line: l, errors: lineErrors(l, lines) }));
  const needAttention = checked.filter((c) => c.errors.length > 0).length;
  const sum = totals(lines);
  const overLimit = limit !== undefined && sum.amount > limit;
  const overBalance = from ? sum.debit > from.available : false;
  const blocked = !from
    ? "Choose the account to pay from."
    : !batchName.trim()
      ? "Name the batch, so approvers know what it's for."
      : lines.length === 0
        ? "Add at least one payment."
        : needAttention > 0
          ? needAttention === 1
            ? "1 payment needs attention."
            : `${needAttention} payments need attention.`
          : overLimit && limit !== undefined
            ? `The batch is above your limit of ${formatMoney(limit, "GHS", true)} for one payment. Remove some lines or split it into two batches.`
            : overBalance
              ? "The batch and its fees are more than the account has available."
              : "";

  if (actor && !canInitiate(actor.role)) {
    return (
      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6">
        <PageHeader title="Pay in Bulk" backTo={{ href: "/business/overview", label: "Home" }} />
        <p className="text-[14px] text-muted-foreground">Payments are prepared by inputters. You review or authorise them in Approvals.</p>
      </div>
    );
  }

  async function onFile(f: File) {
    setFileProblem("");
    const text = await f.text();
    const hash = fingerprint(text);
    const earlier = duplicateOf(hash);
    if (earlier) {
      setFileProblem(`This file was already submitted as ${earlier.id} (${earlier.name}) on ${earlier.submittedAt.slice(0, 10)}. Upload a different file.`);
      return;
    }
    const parsed = parseCsv(text);
    if ("problem" in parsed) {
      setFileProblem(parsed.problem);
      return;
    }
    setFile({ name: f.name, hash });
    setLines((prev) => renumber([...prev, ...parsed.lines]));
    if (!batchName.trim()) setBatchName(f.name.replace(/\.csv$/i, "").replace(/[-_]+/g, " "));
  }

  function saveLine() {
    if (!editing) return;
    const draft = editing.draft;
    setLines((prev) =>
      editing.row === null
        ? renumber([...prev, { ...draft, row: prev.length + 1 }])
        : prev.map((l) => (l.row === editing.row ? { ...draft, row: l.row } : l)),
    );
    setEditing(null);
  }

  /* ── Submitted ────────────────────────────────────────────────────────────── */
  if (step === "submitted" && submitted) {
    return (
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6 pt-6">
        <CheckCircle2 size={24} className="text-success-text" aria-hidden="true" />
        <div className="flex flex-col gap-1">
          <h1 className="text-[22px] font-medium tracking-[var(--ls-heading)] text-foreground">Submitted for approval</h1>
          <p className="text-[14px] leading-relaxed text-muted-foreground">
            {`${submitted.lines.length} payments in ${submitted.name} go to ${describePath(approvalPath(sum.amount))}. Nothing leaves ${from?.name ?? "the account"} until it's authorised.`}
          </p>
          <p className="tabular text-[12px] text-muted-foreground">{`Batch ${submitted.id}`}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button nativeButton={false} render={<Link href={`/business/payments/bulk/${submitted.id}`} />}>
            View Batch
          </Button>
          <Button variant="ghost" nativeButton={false} render={<Link href="/business/payments" />}>
            Back to Send &amp; Pay
          </Button>
        </div>
      </div>
    );
  }

  /* ── Review ───────────────────────────────────────────────────────────────── */
  if (step === "review" && from) {
    const byRail = BULK_RAILS.map((r) => ({ r, n: lines.filter((l) => l.rail === r).length })).filter((x) => x.n > 0);
    return (
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-8">
        <PageHeader title="Review Batch" backTo={{ href: "/business/payments/bulk", label: "Edit Batch", onClick: () => setStep("lines") }} />
        <ReviewSummary
          details={[
            { label: "From", value: `${from.name} (•••• ${from.number.replace(/\s/g, "").slice(-4)})` },
            { label: "Batch", value: batchName },
            { label: "Payments", value: String(lines.length), tabular: true },
            { label: "Sent by", value: byRail.map(({ r, n }) => `${n} by ${railFor(r)?.shortName ?? r}`).join(" · ") },
          ]}
          breakdown={[
            { label: "Amount", value: formatMoney(sum.amount, "GHS", true), tabular: true },
            { label: "Fees", value: formatMoney(sum.fees, "GHS", true), tabular: true },
          ]}
          total={formatMoney(sum.debit, "GHS", true)}
          totalLabel="Total Once Approved"
        />
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          {`This goes to ${describePath(approvalPath(sum.amount))}. Either can send it back to you with a comment. Nothing is debited until it's authorised; then each payment goes out on its own and shows its own status.`}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => setOtpOpen(true)}>Submit for Approval</Button>
          <Button variant="ghost" onClick={() => setStep("lines")}>
            Edit
          </Button>
        </div>
        <TransactionOtpModal
          open={otpOpen}
          onOpenChange={setOtpOpen}
          title="Confirm With Your Code"
          onSuccess={() => {
            setOtpOpen(false);
            if (!actor) return;
            const batch = submitBatch({ name: batchName.trim(), accountId: from.id, lines, submittedBy: actor.name, fileName: file?.name, fileHash: file?.hash });
            setSubmitted(batch);
            setStep("submitted");
          }}
          summary={
            <p className="text-[13px] text-foreground">
              {`Submit ${lines.length} payments, ${formatMoney(sum.amount, "GHS", true)} in total, from ${from.name} for approval.`}
            </p>
          }
        />
      </div>
    );
  }

  /* ── Lines ────────────────────────────────────────────────────────────────── */
  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-10">
      <PageHeader title="Pay in Bulk" backTo={{ href: "/business/payments", label: "Send & Pay" }} />

      <section className="flex flex-col gap-5">
        <FromAccountSelector accounts={accounts} value={fromId} onChange={setFromId} />
        <Field label="Batch Name" htmlFor="batch-name">
          <Input id="batch-name" placeholder="For example, October payroll" value={batchName} onChange={(e) => setBatchName(e.target.value)} />
        </Field>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex min-h-6 flex-wrap items-center justify-between gap-2">
          <h2 className="text-[16px] font-medium text-foreground">Payments</h2>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => download("bulk-payments-template.csv", CSV_TEMPLATE)}>
              <Download size={14} aria-hidden="true" />
              Template
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
              <Upload size={14} aria-hidden="true" />
              Upload a CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEditing({ row: null, draft: { ...BLANK } })}>
              <Plus size={14} aria-hidden="true" />
              Add a Payment
            </Button>
          </div>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
            e.target.value = "";
          }}
        />
        {fileProblem && (
          <p role="alert" className="text-[13px] text-destructive-text">
            {fileProblem}
          </p>
        )}

        {lines.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="tabular text-[13px] text-muted-foreground">
              {`${lines.length} ${lines.length === 1 ? "payment" : "payments"} · ${formatMoney(sum.amount, "GHS", true)}`}
              {needAttention > 0 && <span className="text-warning-text">{` · ${needAttention} need attention`}</span>}
            </p>
            {needAttention > 0 && (
              <Button variant="ghost" size="sm" onClick={() => download("bulk-payments-errors.csv", errorReportCsv(lines))}>
                <Download size={14} aria-hidden="true" />
                Error Report
              </Button>
            )}
          </div>
        )}

        {editing && <LineForm draft={editing.draft} onChange={(draft) => setEditing({ ...editing, draft })} onSave={saveLine} onCancel={() => setEditing(null)} />}

        {lines.length === 0 && !editing ? (
          <p className="text-[13px] text-muted-foreground">
            Upload a CSV in the template&apos;s columns, or add payments one by one. You can do both.
          </p>
        ) : (
          lines.length > 0 && (
            <ListCard>
              {checked.map(({ line, errors }) => (
                <li key={line.row} className="flex items-start gap-3 rounded-xl px-2 py-3 sm:px-3">
                  <span className="tabular w-6 shrink-0 pt-0.5 text-[12px] text-muted-foreground">{line.row}</span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-[14px] text-foreground">{line.name || "No name"}</span>
                    <span className="tabular truncate text-[12px] text-muted-foreground">
                      {`${line.bank || "No bank"} · ${line.account || "No account"} · ${railFor(line.rail)?.shortName ?? line.rail.toUpperCase()}`}
                    </span>
                    {errors.map((e) => (
                      <span key={e} className="text-[12px] text-destructive-text">
                        {e}
                      </span>
                    ))}
                  </span>
                  <span className="tabular shrink-0 pt-0.5 text-[14px] text-foreground">{formatMoney(line.amount, "GHS", true)}</span>
                  <span className="flex shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-10"
                      aria-label={`Edit line ${line.row}`}
                      onClick={() => setEditing({ row: line.row, draft: { ...line } })}
                    >
                      <Pencil size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-10"
                      aria-label={`Remove line ${line.row}`}
                      onClick={() => setLines((prev) => renumber(prev.filter((l) => l.row !== line.row)))}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </span>
                </li>
              ))}
            </ListCard>
          )
        )}
      </section>

      <div className="flex flex-col gap-2">
        <Button disabled={Boolean(blocked)} onClick={() => setStep("review")} className="self-start">
          Review Batch
        </Button>
        {blocked && lines.length > 0 && <p className="text-[12px] text-muted-foreground">{blocked}</p>}
      </div>
    </div>
  );
}

function LineForm({
  draft,
  onChange,
  onSave,
  onCancel,
}: {
  draft: Omit<BulkLine, "row">;
  onChange: (d: Omit<BulkLine, "row">) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const ready = draft.name.trim() && draft.bank && draft.account.trim() && draft.amount > 0;
  return (
    <ListCard as="div" className="gap-4 p-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Recipient Name" htmlFor="line-name">
          <Input id="line-name" value={draft.name} onChange={(e) => onChange({ ...draft, name: e.target.value })} autoFocus />
        </Field>
        <Field label="Bank">
          <BankSelect value={draft.bank} onChange={(bank) => onChange({ ...draft, bank })} />
        </Field>
        <Field label="Account Number" htmlFor="line-account">
          <Input
            id="line-account"
            inputMode="numeric"
            className="tabular"
            value={draft.account}
            onChange={(e) => onChange({ ...draft, account: e.target.value })}
          />
        </Field>
        <Field label="Payment Type" htmlFor="line-rail">
          <Select value={draft.rail} onValueChange={(v) => v && onChange({ ...draft, rail: v })}>
            <SelectTrigger id="line-rail" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BULK_RAILS.map((r) => (
                <SelectItem key={r} value={r}>
                  {`${railFor(r)?.shortName ?? r} · ${railFor(r)?.speed ?? ""} · fee ${formatMoney(feeFor(r), "GHS", true)}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Amount" htmlFor="line-amount">
          <Input
            id="line-amount"
            inputMode="decimal"
            className="tabular"
            value={draft.amount ? String(draft.amount) : ""}
            onChange={(e) => onChange({ ...draft, amount: Number(e.target.value.replace(/[^0-9.]/g, "")) || 0 })}
          />
        </Field>
        <Field label="Reference" htmlFor="line-reference" optional>
          <Input id="line-reference" value={draft.reference} onChange={(e) => onChange({ ...draft, reference: e.target.value })} />
        </Field>
      </div>
      <div className="flex gap-3">
        <Button disabled={!ready} onClick={onSave}>
          Save Payment
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </ListCard>
  );
}
