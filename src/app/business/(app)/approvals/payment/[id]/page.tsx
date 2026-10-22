"use client";

/**
 * Payment approval (BRD v2 BRL-04 to BRL-10). One screen for both approval steps:
 *
 *   review     a Reviewer checks it and passes it on, or sends it back
 *   authorise  an Authoriser releases it with a one-time code, or sends it back
 *
 * Either can leave a comment; sending back needs one, because the inputter has to know what to change. The path
 * so far (who submitted it, who reviewed it, what they said) sits above the decision. A step above the person's
 * limit, or beyond what the company may still release today, can't be taken, and the screen says why.
 * Trade requests have their own screen (/approvals/trade/[id]).
 */

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowUpRight } from "@/components/ui/icons";
import PageHeader from "@/components/layout/PageHeader";
import ApprovalTrail from "@/components/corporate/approvals/ApprovalTrail";
import TransactionOtpModal from "@/components/payments/TransactionOtpModal";
import { Button } from "@/components/ui/button";
import { Fact } from "@/components/ui/fact";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { RevealingAmount } from "@/components/providers/AmountVisibilityProvider";
import { businessTransactions, findBusinessAccount } from "@/lib/corporate/accounts";
import { currentStep, eligibility, findApproval, inQueueFor } from "@/lib/corporate/approvals";
import { companyUserFor } from "@/lib/corporate/controls";
import { approveStep, sendBack } from "@/lib/corporate/payments";
import { formatMoney } from "@/lib/mock-data";
import { useSession } from "@/lib/session-store";

export default function PaymentApprovalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const actor = useSession((s) => s.actor);
  const item = findApproval(id);

  const [comment, setComment] = useState("");
  const [commentError, setCommentError] = useState("");
  const [otpOpen, setOtpOpen] = useState(false);

  if (!item || item.type !== "payment") {
    return <PageHeader title="Approval Not Found" backTo={{ href: "/business/approvals", label: "Approvals" }} />;
  }

  const step = currentStep(item);
  const mine = inQueueFor(actor, item);
  const can = eligibility(actor, item);
  const authorising = step?.kind === "authorise";
  const account = item.accountId ? findBusinessAccount(item.accountId) : undefined;
  const accountLabel = account ? `${account.name} (•••• ${account.number.replace(/\s/g, "").slice(-4)})` : "";
  const record = businessTransactions().find((t) => t.reference === item.reference);
  const limit = companyUserFor(actor)?.limit;
  const inputter = item.submittedBy.split(" ")[0];

  function done(message: string) {
    toast.success(message);
    router.push("/business/approvals");
  }

  function approve() {
    if (!actor || !item) return;
    approveStep(item.id, actor.name, comment);
    done(authorising ? "Payment authorised. It's on its way." : "Passed to an Authoriser.");
  }

  function handleSendBack() {
    if (!actor || !item) return;
    if (!comment.trim()) {
      setCommentError(`Say what ${inputter} should change.`);
      return;
    }
    sendBack(item.id, actor.name, comment);
    done(`Sent back to ${item.submittedBy}.`);
  }

  const blockedReason = !can.ok
    ? can.reason === "over-limit"
      ? `This is above your limit of ${formatMoney(can.limit, "GHS", true)} for one payment. Send it back, or it waits for someone with a higher limit.`
      : `The company can release ${formatMoney(can.room, "GHS", true)} more today, which isn't enough for this payment. It can be authorised tomorrow.`
    : "";

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-10">
      <PageHeader
        title={!mine ? "Payment" : authorising ? "Authorise Payment" : "Review Payment"}
        description={`${item.reference} · submitted by ${item.submittedBy}`}
        backTo={{ href: "/business/approvals", label: "Approvals" }}
      />

      <section className="flex flex-col gap-2" aria-label="Amount">
        <span className="text-[13px] text-muted-foreground">To {item.counterparty}</span>
        <span className="tabular text-[40px] leading-none tracking-[var(--ls-heading)] text-foreground sm:text-[48px]">
          <RevealingAmount amount={item.amount} currency={item.currency} />
        </span>
      </section>

      <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        {accountLabel && <Fact label="From" value={accountLabel} />}
        <Fact label="Description" value={item.description} />
        <Fact label="Submitted" value={item.submittedAt} mono />
        {limit !== undefined && <Fact label="Your Limit for One Payment" value={formatMoney(limit, "GHS", true)} mono />}
      </dl>

      <section className="flex flex-col gap-3">
        <h2 className="min-h-6 text-[16px] font-medium text-foreground">Approval Path</h2>
        <ApprovalTrail item={item} />
        {item.batchId && (
          <Link
            href={`/business/payments/bulk/${item.batchId}`}
            className="inline-flex items-center gap-1 self-start text-[13px] text-muted-foreground underline underline-offset-4 transition-colors duration-hover hover:text-foreground"
          >
            See every payment in this batch
            <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        )}
        {record && !item.batchId && (
          <Link
            href={`/business/transactions/${record.id}`}
            className="inline-flex items-center gap-1 self-start text-[13px] text-muted-foreground underline underline-offset-4 transition-colors duration-hover hover:text-foreground"
          >
            View the payment record
            <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        )}
      </section>

      {mine ? (
        <section className="flex flex-col gap-5">
          <Field
            label="Comment"
            htmlFor="approval-comment"
            optional
            hint={`Needed if you send it back. ${inputter} and later approvers see it.`}
            error={commentError}
          >
            <Textarea
              id="approval-comment"
              rows={3}
              value={comment}
              aria-invalid={Boolean(commentError)}
              onChange={(e) => {
                setComment(e.target.value);
                if (commentError) setCommentError("");
              }}
            />
          </Field>

          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <Button disabled={!can.ok} onClick={() => (authorising ? setOtpOpen(true) : approve())}>
                {authorising ? "Authorise Payment" : "Pass to Authoriser"}
              </Button>
              <Button variant="outline" onClick={handleSendBack}>
                Send Back to {inputter}
              </Button>
            </div>
            {blockedReason && <p className="text-[12px] text-muted-foreground">{blockedReason}</p>}
          </div>
        </section>
      ) : (
        <p className="text-[13px] text-muted-foreground">
          {item.status === "authorised"
            ? "This payment has been authorised."
            : item.status === "returned"
              ? `This payment was sent back to ${item.submittedBy}.`
              : "This payment isn't waiting on you."}
        </p>
      )}

      <TransactionOtpModal
        open={otpOpen}
        onOpenChange={setOtpOpen}
        title="Authorise With Your Code"
        onSuccess={() => {
          setOtpOpen(false);
          approve();
        }}
        summary={
          <p className="text-[13.5px] text-foreground">
            Release <span className="tabular">{formatMoney(item.amount, item.currency, true)}</span> to {item.counterparty}
            {account ? ` from ${account.name}` : ""}. It leaves the account once you confirm.
          </p>
        }
      />
    </div>
  );
}
