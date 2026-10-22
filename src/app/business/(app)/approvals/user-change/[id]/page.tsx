"use client";

/**
 * Approve a user change (option C): the second person on anything that widens someone's access. Reached by an
 * Authoriser from Approvals, or by another administrator from Administration. It states exactly what changes,
 * who proposed it, and that it applies the moment it's approved; approving takes a one-time code, like releasing
 * a payment. Declining needs a reason, which the administrator sees.
 */

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import PageHeader from "@/components/layout/PageHeader";
import UserChangeSummary from "@/components/corporate/admin/UserChangeSummary";
import TransactionOtpModal from "@/components/payments/TransactionOtpModal";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
  approveUserChange,
  canApproveUserChange,
  declineUserChange,
  findCompanyUser,
  findUserChange,
  useControlsVersion,
} from "@/lib/corporate/controls";
import { isCorporateAdmin } from "@/lib/corporate/roles";
import { useSession } from "@/lib/session-store";

export default function UserChangeApprovalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  useControlsVersion();
  const router = useRouter();
  const actor = useSession((s) => s.actor);
  const change = findUserChange(id);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [otpOpen, setOtpOpen] = useState(false);

  const back =
    actor && isCorporateAdmin(actor.role)
      ? { href: "/business/administration", label: "Administration" }
      : { href: "/business/approvals", label: "Approvals" };

  if (!change) return <PageHeader title="Change Not Found" backTo={back} />;

  const name = change.userId ? (findCompanyUser(change.userId)?.name ?? change.after.name) : change.after.name;
  const title = change.kind === "add" ? `Add ${name}` : change.kind === "reactivate" ? `Reactivate ${name}` : `Change ${name}'s Access`;
  const mine = canApproveUserChange(actor, change);

  function finish(message: string) {
    toast.success(message);
    router.push(back.href);
  }

  function decline() {
    if (!actor || !change) return;
    if (!reason.trim()) {
      setReasonError(`Say why, so ${change.proposedBy.split(" ")[0]} knows what to change.`);
      return;
    }
    declineUserChange(change.id, actor.name, reason);
    finish(`Declined. ${change.proposedBy} can see why.`);
  }

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-8">
      <PageHeader title={title} description={`Proposed by ${change.proposedBy} · ${change.proposedAt}`} backTo={back} />

      <section className="flex flex-col gap-3">
        <h2 className="min-h-6 text-[16px] font-medium text-foreground">What Changes</h2>
        <UserChangeSummary change={change} />
        <p className="text-[12px] text-muted-foreground">
          {`${change.after.designation}${change.after.onMandate ? " · on your mandate" : ""} · ${change.after.email}`}
        </p>
      </section>

      {mine ? (
        <section className="flex flex-col gap-5">
          <p className="text-[13px] text-muted-foreground">
            {`It applies as soon as you approve, and we tell ${name.split(" ")[0]} by SMS and email.`}
          </p>
          <Field label="Reason" htmlFor="decline-reason" optional error={reasonError}>
            <Textarea
              id="decline-reason"
              rows={3}
              placeholder="Needed if you decline"
              value={reason}
              aria-invalid={Boolean(reasonError)}
              onChange={(e) => {
                setReason(e.target.value);
                if (reasonError) setReasonError("");
              }}
            />
          </Field>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setOtpOpen(true)}>Approve Change</Button>
            <Button variant="outline" onClick={decline}>
              Decline
            </Button>
          </div>
        </section>
      ) : (
        <p className="text-[13px] text-muted-foreground">
          {change.status === "approved"
            ? `Approved by ${change.decidedBy}.`
            : change.status === "declined"
              ? `Declined by ${change.decidedBy}: “${change.reason}”`
              : change.proposedBy === actor?.name
                ? "You proposed this, so someone else approves it."
                : "This change isn't waiting on you."}
        </p>
      )}

      <TransactionOtpModal
        open={otpOpen}
        onOpenChange={setOtpOpen}
        title="Approve With Your Code"
        onSuccess={() => {
          setOtpOpen(false);
          if (!actor) return;
          approveUserChange(change.id, actor.name);
          finish(`Approved. It applies to ${name} now.`);
        }}
        summary={<p className="text-[13.5px] text-foreground">{`${title}, as proposed by ${change.proposedBy}.`}</p>}
      />
    </div>
  );
}
