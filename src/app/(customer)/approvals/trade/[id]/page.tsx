"use client";

/**
 * Trade Approval Details — section 4, state model 13.5.
 *
 * The SECOND of the two approval screens, entirely separate from Payment
 * Approval Details. Trade review needs three things payments never do:
 * documents, version comparison, and a clarification loop — which is exactly
 * why the doc split them rather than making one conditional screen.
 *
 * 13.5 states:
 *   awaiting-decision         — document viewer present
 *   documents-incomplete      — decision controls blocked until resolved
 *   version-comparison        — VISUAL DIFF of v(n) vs v(n-1), not two docs
 *                               side by side
 *   returned-for-clarification— visually + functionally distinct from Rejected
 *                               (FR-13); recoverable, carries forward
 *   decision-submitted        — transient
 */

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Download,
  FileText,
  FileWarning,
  GitCompare,
  Loader2,
  MessageSquareWarning,
  XCircle,
} from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import RejectionDialog from "@/components/approvals/RejectionDialog";
import ReturnForClarificationDialog from "@/components/approvals/ReturnForClarificationDialog";
import type { TradeApprovalState } from "@/lib/states";
import {
  TRADE_DOCUMENTS,
  TRADE_VERSIONS,
  VERSION_DIFF,
  findApproval,
  formatMoney,
} from "@/lib/mock-data";

const STATES: readonly TradeApprovalState[] = [
  "awaiting-decision",
  "documents-incomplete",
  "version-comparison",
  "returned-for-clarification",
  "decision-submitted",
] as const;

const STATE_LABEL: Record<TradeApprovalState, string> = {
  "awaiting-decision": "Awaiting decision",
  "documents-incomplete": "Documents missing",
  "version-comparison": "Version comparison",
  "returned-for-clarification": "Returned for clarification",
  "decision-submitted": "Decision submitted",
};

export default function TradeApprovalDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const item = findApproval(id);

  const [state, setState] = useState<TradeApprovalState>("awaiting-decision");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [outcome, setOutcome] = useState<"approved" | "rejected" | null>(null);
  const [activeDoc, setActiveDoc] = useState(TRADE_DOCUMENTS[0].id);
  const [clarificationNote, setClarificationNote] = useState("");

  if (!item || item.type !== "trade") {
    return <PageHeader title="Approval not found" backTo={{ href: "/approvals", label: "Approval queue" }} />;
  }

  const currentVersion = TRADE_VERSIONS[TRADE_VERSIONS.length - 1];
  const previousVersion = TRADE_VERSIONS[TRADE_VERSIONS.length - 2];
  const missingDocs = TRADE_DOCUMENTS.filter((d) => d.status === "missing");
  const doc = TRADE_DOCUMENTS.find((d) => d.id === activeDoc) ?? TRADE_DOCUMENTS[0];

  // 13.5: decision controls are blocked while required documents are missing.
  const decisionBlocked = state === "documents-incomplete";
  const isTerminal = state === "decision-submitted" || state === "returned-for-clarification";

  function submitDecision(kind: "approved" | "rejected") {
    setOutcome(kind);
    setState("decision-submitted");
    window.setTimeout(() => router.push("/approvals"), 1600);
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Trade approval"
        description={`${item.reference} · submitted by ${item.submittedBy}`}
        backTo={{ href: "/approvals", label: "Approval queue" }}
      />

      <StateSwitcher
        section="13.5"
        states={STATES}
        value={state}
        onChange={(next) => {
          setState(next);
          if (next !== "decision-submitted") setOutcome(null);
        }}
        labels={STATE_LABEL}
      />

      {/* ── Returned for clarification — WARNING tone, recoverable.
             Compare with the destructive treatment of a rejection below. ── */}
      {state === "returned-for-clarification" && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-5">
          <div className="flex items-start gap-3">
            <MessageSquareWarning
              size={18}
              strokeWidth={1.8}
              aria-hidden="true"
              className="mt-px shrink-0 text-amber-600 dark:text-amber-400"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[14px] text-amber-700 dark:text-amber-400">
                  Returned to submitter for clarification
                </p>
                <Badge variant="warning">Awaiting response</Badge>
              </div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-foreground/90">
                This request is still live. {item.submittedBy} has been asked to respond and will
                resubmit as v{TRADE_VERSIONS.length + 1}, which you&apos;ll be able to compare against
                v{currentVersion.version}.
              </p>
              {clarificationNote && (
                <blockquote className="mt-3 rounded-lg border-l-2 border-amber-500/50 bg-background/60 px-3.5 py-2.5 text-[13px] text-foreground">
                  {clarificationNote}
                </blockquote>
              )}
              <p className="mt-3 text-[12.5px] text-muted-foreground">
                This is not a rejection — nothing has been cancelled and no new request is needed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Transient decision confirmation */}
      {state === "decision-submitted" && (
        <div
          className={`flex items-start gap-3 rounded-2xl border p-5 ${
            outcome === "rejected"
              ? "border-destructive/30 bg-destructive/5"
              : "border-emerald-500/30 bg-emerald-500/5"
          }`}
        >
          {outcome === "rejected" ? (
            <XCircle size={17} strokeWidth={1.8} aria-hidden="true" className="mt-px shrink-0 text-destructive" />
          ) : (
            <CheckCircle2
              size={17}
              strokeWidth={1.8}
              aria-hidden="true"
              className="mt-px shrink-0 text-emerald-600 dark:text-emerald-400"
            />
          )}
          <div>
            <p className="text-[14px] text-foreground">
              {outcome === "rejected" ? "Trade request rejected" : "Trade request approved"}
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
              {outcome === "rejected"
                ? "This request is closed. A new request is required to proceed."
                : "The request moves to bank operations for processing."}
            </p>
            <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <Loader2 size={13} className="animate-spin" aria-hidden="true" />
              Returning you to the queue…
            </p>
          </div>
        </div>
      )}

      {/* Documents missing — blocks the decision (13.5) */}
      {state === "documents-incomplete" && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-5">
          <FileWarning
            size={17}
            strokeWidth={1.8}
            aria-hidden="true"
            className="mt-px shrink-0 text-amber-600 dark:text-amber-400"
          />
          <div>
            <p className="text-[14px] text-amber-700 dark:text-amber-400">
              {missingDocs.length} required document{missingDocs.length === 1 ? "" : "s"} not attached
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-foreground/90">
              You can&apos;t approve this request until{" "}
              {missingDocs.map((d) => d.name).join(", ")} {missingDocs.length === 1 ? "is" : "are"}{" "}
              provided. Return it for clarification to ask the submitter for the missing paperwork.
            </p>
          </div>
        </div>
      )}

      {/* Trade summary */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="border-b border-border pb-5">
          <span className="text-[12px] text-muted-foreground">Trade value</span>
          <p className="mt-1.5 text-[28px] leading-none tracking-[-0.02em] text-foreground tabular">
            {formatMoney(item.amount, item.currency)}
          </p>
        </div>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-4 pt-5 sm:grid-cols-2">
          <Fact label="Reference" value={item.reference} mono />
          <Fact label="Counterparty" value={item.counterparty} />
          <Fact label="Instrument" value={item.description} />
          <Fact label="Submitted by" value={item.submittedBy} />
          <Fact label="Submitted at" value={item.submittedAt} mono />
          <Fact label="Current version" value={`v${currentVersion.version} — ${currentVersion.summary}`} />
        </dl>
      </section>

      {/* ── Version comparison — a real field-level diff, per 13.5 ── */}
      {state === "version-comparison" ? (
        <section className="rounded-2xl border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <GitCompare size={16} strokeWidth={1.8} aria-hidden="true" className="text-muted-foreground" />
              <h2 className="text-[15px] text-foreground">
                Comparing v{previousVersion.version} → v{currentVersion.version}
              </h2>
            </div>
            <Button variant="outline" size="sm" onClick={() => setState("awaiting-decision")}>
              Close comparison
            </Button>
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] gap-x-4 border-b border-border bg-muted/30 px-5 py-2.5 text-[11px] uppercase tracking-wider text-muted-foreground">
            <span>v{previousVersion.version} — {previousVersion.submittedAt}</span>
            <span />
            <span>v{currentVersion.version} — {currentVersion.submittedAt}</span>
          </div>

          <ul className="divide-y divide-border">
            {VERSION_DIFF.map((row) => (
              <li
                key={row.field}
                className={`px-5 py-3 ${row.changed ? "bg-amber-500/5" : ""}`}
              >
                <p className="mb-1.5 text-[12px] text-muted-foreground">{row.field}</p>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-4">
                  <span
                    className={`text-[13px] tabular ${
                      row.changed
                        ? "text-destructive line-through decoration-destructive/40"
                        : "text-muted-foreground"
                    }`}
                  >
                    {row.previous}
                  </span>
                  <ArrowRight
                    size={14}
                    strokeWidth={1.8}
                    aria-hidden="true"
                    className={row.changed ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground/40"}
                  />
                  <span
                    className={`text-[13px] tabular ${
                      row.changed ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"
                    }`}
                  >
                    {row.current}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <p className="border-t border-border px-5 py-3 text-[12.5px] text-muted-foreground">
            {VERSION_DIFF.filter((r) => r.changed).length} of {VERSION_DIFF.length} fields changed
            between these versions.
          </p>
        </section>
      ) : (
        /* ── Document viewer — present in the default awaiting-decision state ── */
        <section className="rounded-2xl border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <h2 className="text-[15px] text-foreground">Documents</h2>
            <Button variant="outline" size="sm" onClick={() => setState("version-comparison")}>
              <GitCompare size={14} strokeWidth={1.9} aria-hidden="true" />
              Compare v{previousVersion.version} → v{currentVersion.version}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[240px_1fr]">
            {/* Document list */}
            <ul className="divide-y divide-border border-b border-border md:border-b-0 md:border-r">
              {TRADE_DOCUMENTS.map((d) => {
                const isActive = d.id === activeDoc;
                const isMissing = d.status === "missing";
                return (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() => !isMissing && setActiveDoc(d.id)}
                      disabled={isMissing}
                      className={`flex w-full items-center gap-2.5 px-4 py-3 text-left transition-colors ${
                        isActive && !isMissing ? "bg-[var(--active-bg)]" : "hover:bg-muted/50"
                      } ${isMissing ? "cursor-not-allowed opacity-60" : ""}`}
                    >
                      <FileText
                        size={15}
                        strokeWidth={1.8}
                        aria-hidden="true"
                        className={isMissing ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] text-foreground">{d.name}</span>
                        <span className="block text-[11.5px] text-muted-foreground">
                          {isMissing ? "Not provided" : `${d.pages} pages · ${d.type}`}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* Viewer pane */}
            <div className="flex min-h-[320px] flex-col">
              <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] text-foreground">{doc.name}</p>
                  <p className="text-[12px] text-muted-foreground tabular">
                    {doc.pages} pages · uploaded {doc.uploadedAt}
                  </p>
                </div>
                <Button variant="ghost" size="icon-sm" aria-label="Download document">
                  <Download size={15} strokeWidth={1.9} aria-hidden="true" />
                </Button>
              </div>

              {/* Document surface stand-in */}
              <div className="flex flex-1 items-center justify-center bg-muted/30 p-6">
                <div className="flex aspect-[1/1.294] w-full max-w-[260px] flex-col gap-2 rounded-lg border border-border bg-background p-5 shadow-sm">
                  <div className="h-2 w-1/2 rounded bg-muted" />
                  <div className="h-2 w-3/4 rounded bg-muted" />
                  <div className="mt-3 h-2 w-full rounded bg-muted" />
                  <div className="h-2 w-full rounded bg-muted" />
                  <div className="h-2 w-2/3 rounded bg-muted" />
                  <div className="mt-auto flex items-center justify-between">
                    <div className="h-2 w-1/3 rounded bg-muted" />
                    <div className="h-6 w-6 rounded-full bg-muted" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Decision controls — three outcomes, unlike payment's two ── */}
      {!isTerminal && (
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => submitDecision("approved")} disabled={decisionBlocked}>
            <CheckCircle2 size={15} strokeWidth={1.9} aria-hidden="true" />
            Approve trade
          </Button>

          {/* Recoverable path — visually secondary, warning-toned, not destructive */}
          <Button
            variant="outline"
            onClick={() => setReturnOpen(true)}
            className="border-amber-500/40 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400"
          >
            <MessageSquareWarning size={15} strokeWidth={1.9} aria-hidden="true" />
            Return for clarification
          </Button>

          {/* Terminal path */}
          <Button variant="destructive" onClick={() => setRejectOpen(true)}>
            <XCircle size={15} strokeWidth={1.9} aria-hidden="true" />
            Reject
          </Button>

          {decisionBlocked && (
            <p className="w-full text-[12.5px] text-muted-foreground">
              Approval is unavailable while required documents are missing. Returning for
              clarification is still available.
            </p>
          )}
        </div>
      )}

      <RejectionDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        reference={item.reference}
        onConfirm={() => {
          setRejectOpen(false);
          submitDecision("rejected");
        }}
      />

      <ReturnForClarificationDialog
        open={returnOpen}
        onOpenChange={setReturnOpen}
        reference={item.reference}
        nextVersion={TRADE_VERSIONS.length + 1}
        onConfirm={({ note }) => {
          setReturnOpen(false);
          setClarificationNote(note);
          setState("returned-for-clarification");
        }}
      />
    </div>
  );
}

function Fact({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[12px] text-muted-foreground">{label}</dt>
      <dd className={`mt-0.5 text-[13px] text-foreground ${mono ? "tabular" : ""}`}>{value}</dd>
    </div>
  );
}
