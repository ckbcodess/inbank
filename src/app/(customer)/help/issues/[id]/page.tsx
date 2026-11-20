"use client";

/**
 * One reported issue: its status as a badge by the title, its progress on the tracker, then the references and
 * what the customer told us. The dates are on the tracker only. An open case
 * can be withdrawn in one tap, with Undo, because stopping is never harder than starting.
 */

import { use } from "react";
import { toast } from "sonner";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { TrueEmptyState } from "@/components/states/ListStates";
import { MessageSquareWarning } from "@/components/ui/icons";
import { isOpen, issueTitle, useIssuesStore } from "@/lib/issues-store";
import { IssueStatusBadge, IssueTracker } from "@/components/help/IssueStatus";
import { useSession, useSessionHydrated } from "@/lib/session-store";
import { DashedDivider } from "@/components/ui/dashed-divider";

/** A reference row: label left, the value right in tabular figures (references are never translated). */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6 px-1 py-2">
      <span className="shrink-0 text-body text-muted-foreground">{label}</span>
      <span className="tabular min-w-0 text-right text-body text-foreground" translate="no">
        {value}
      </span>
    </div>
  );
}

export default function IssueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const hydrated = useSessionHydrated();
  const actor = useSession((s) => s.actor);
  const issue = useIssuesStore((s) => s.issues.find((i) => i.id === id && i.actorId === actor?.id));
  const withdraw = useIssuesStore((s) => s.withdraw);
  const reopen = useIssuesStore((s) => s.reopen);

  if (!hydrated) return null;

  if (!issue) {
    return (
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-4">
        <PageHeader title="Reported Issue" backTo={{ href: "/help/issues", label: "Reported Issues" }} />
        <TrueEmptyState
          icon={<MessageSquareWarning size={22} />}
          title="We can’t find this case"
          description="It may belong to another login. Your reported issues are all in one list."
        />
      </div>
    );
  }

  const open = isOpen(issue);

  const onWithdraw = () => {
    withdraw(issue.id);
    toast.success(`${issue.ref} withdrawn.`, {
      id: `withdraw-${issue.id}`,
      action: { label: "Undo", onClick: () => reopen(issue.id) },
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-10">
      <PageHeader
        title={issueTitle(issue)}
        badge={<IssueStatusBadge status={issue.status} />}
        backTo={{ href: "/help/issues", label: "Reported Issues" }}
      />

      <div className="flex flex-col gap-8">
        {/* Where it stands comes first: it's what a customer opens a case to check. Its dates live on the tracker. */}
        <IssueTracker issue={issue} />

        <DashedDivider />

        <section className="flex flex-col gap-4">
          <div className="flex flex-col">
            <Row label="Case reference" value={issue.ref} />
            {issue.transactionRef && <Row label="Transaction" value={issue.transactionRef} />}
          </div>
          {issue.details && (
            <div className="flex flex-col gap-1 px-1">
              <span className="text-body text-muted-foreground">What you told us</span>
              <p className="text-body leading-relaxed text-foreground">{issue.details}</p>
            </div>
          )}
        </section>
      </div>

      {open && (
        <Button variant="outline" size="xl" className="w-full" onClick={onWithdraw}>
          Withdraw report
        </Button>
      )}
    </div>
  );
}
