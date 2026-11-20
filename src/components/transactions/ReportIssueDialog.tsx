"use client";

/**
 * Tell the bank something is wrong, and get a case to track. Opened from the Help menu (any topic), a receipt or a
 * failed payment (the transaction is already known, so the topic and transaction are not asked). Fields appear as
 * they become relevant: the topic first, then for a payment which one and what went wrong. Every report goes into
 * one store (`lib/issues-store.ts`), which Reported Issues reads. The prototype files nothing with the bank.
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/lib/session-store";
import { ISSUE_TOPICS, PAYMENT_REASONS, useIssuesStore, type IssueTopic } from "@/lib/issues-store";
import { formatDate, formatMoney, transactionsForProfile } from "@/lib/mock-data";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";

const PAYMENT: IssueTopic = "A Payment or Transfer";

export function ReportIssueDialog({
  open,
  onOpenChange,
  reference,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The transaction being reported, when it's opened from one. */
  reference?: string;
}) {
  const router = useRouter();
  const actor = useSession((s) => s.actor);
  const report = useIssuesStore((s) => s.report);
  const { showAmounts } = useAmountVisibility();

  const [topic, setTopic] = useState<IssueTopic | null>(null);
  const [transactionRef, setTransactionRef] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [tried, setTried] = useState(false);

  // From a transaction the topic and transaction are known: trust them rather than ask.
  const effectiveTopic = reference ? PAYMENT : topic;
  const effectiveRef = reference ?? transactionRef;
  const isPayment = effectiveTopic === PAYMENT;

  // The last few payments out, newest first, to pick from instead of typing a reference.
  const recent = useMemo(
    () =>
      transactionsForProfile()
        .filter((t) => t.direction === "debit")
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 8),
    [],
  );

  // The note is what the bank has to go on unless a payment and its problem already say it.
  const detailsRequired = !isPayment || !reason || reason === "Something Else";
  const errors = {
    topic: !effectiveTopic ? "Choose what it’s about." : null,
    transaction: isPayment && !effectiveRef ? "Choose the payment." : null,
    reason: isPayment && !reason ? "Choose what went wrong." : null,
    details: detailsRequired && !details.trim() ? "Tell us what happened." : null,
  };
  const valid = !Object.values(errors).some(Boolean);

  const close = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      setTopic(null);
      setTransactionRef(null);
      setReason(null);
      setDetails("");
      setTried(false);
    }
  };

  const send = () => {
    if (!valid || !actor || !effectiveTopic) {
      setTried(true);
      return;
    }
    const issue = report({
      actorId: actor.id,
      topic: effectiveTopic,
      reason: isPayment ? (reason ?? undefined) : undefined,
      transactionRef: isPayment ? (effectiveRef ?? undefined) : undefined,
      details: details.trim(),
    });
    close(false);
    toast.success(`Report sent. Your case reference is ${issue.ref}.`, {
      action: { label: "Track", onClick: () => router.push(`/help/issues/${issue.id}`) },
    });
  };

  const show = (e: string | null) => (tried ? e : null);

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Report an Issue</DialogTitle>
        </DialogHeader>
        <DialogBody className="gap-4">
          {reference ? (
            <div className="flex items-center justify-between gap-3 px-1">
              <span className="text-body text-muted-foreground">Transaction</span>
              <span className="tabular text-body text-foreground" translate="no">{reference}</span>
            </div>
          ) : (
            <Field label="What’s It About?" error={show(errors.topic)}>
              <Select value={topic} onValueChange={(v) => setTopic(v as IssueTopic)}>
                <SelectTrigger className="w-full" aria-invalid={!!show(errors.topic)}>
                  <SelectValue placeholder="Choose a topic" />
                </SelectTrigger>
                <SelectContent>
                  {ISSUE_TOPICS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          {isPayment && !reference && (
            <Field label="Which Payment?" error={show(errors.transaction)}>
              <Select value={transactionRef} onValueChange={(v) => setTransactionRef(v as string)}>
                <SelectTrigger className="w-full" aria-invalid={!!show(errors.transaction)}>
                  <SelectValue placeholder="Choose from your recent payments" />
                </SelectTrigger>
                <SelectContent>
                  {recent.map((t) => (
                    <SelectItem key={t.id} value={t.reference}>
                      {`${t.counterparty} · ${formatMoney(t.amount, t.currency, showAmounts)} · ${formatDate(t.date)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          {isPayment && (
            <Field label="What Went Wrong?" error={show(errors.reason)}>
              <Select value={reason} onValueChange={(v) => setReason(v as string)}>
                <SelectTrigger className="w-full" aria-invalid={!!show(errors.reason)}>
                  <SelectValue placeholder="Choose a reason" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          {effectiveTopic && (
            <Field label="Details" optional={!detailsRequired} error={show(errors.details)}>
              <Textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                aria-invalid={!!show(errors.details)}
                placeholder={
                  detailsRequired
                    ? "What happened, and when? Don’t include your PIN or any code."
                    : "Anything that helps us look into it"
                }
              />
            </Field>
          )}
        </DialogBody>
        <DialogFooter>
          <Button size="md" type="button" className="w-full" onClick={send}>
            Send Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
