"use client";

/**
 * Reported Issues: every case the customer has raised and where it stands, open ones first. Report an issue from the
 * Help menu lands here with `?new=1`, which opens the form over the list, so a new case appears in the place it will
 * be tracked from.
 */

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { ListCard } from "@/components/ui/list-card";
import { TrueEmptyState } from "@/components/states/ListStates";
import { ReportIssueDialog } from "@/components/transactions/ReportIssueDialog";
import { ChevronRight, MessageSquareWarning, Plus } from "@/components/ui/icons";
import { isOpen, issueTitle, useMyIssues, type Issue } from "@/lib/issues-store";
import { useSession, useSessionHydrated } from "@/lib/session-store";
import { formatDate } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { IssueStatusBadge } from "@/components/help/IssueStatus";

function IssueRow({ issue }: { issue: Issue }) {
  const open = isOpen(issue);
  return (
    <li>
      <Link
        href={`/help/issues/${issue.id}`}
        className="flex w-full items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none sm:px-3"
      >
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted",
            open ? "text-foreground" : "text-muted-foreground",
          )}
        >
          <MessageSquareWarning size={16} aria-hidden="true" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className={cn("truncate text-body", open ? "text-foreground" : "text-muted-foreground")}>{issueTitle(issue)}</span>
          <span className="tabular truncate text-caption text-muted-foreground">
            <span translate="no">{issue.ref}</span> · {formatDate(issue.createdAt)}
          </span>
        </span>
        <IssueStatusBadge status={issue.status} />
        <ChevronRight size={15} aria-hidden="true" className="shrink-0 text-muted-foreground" />
      </Link>
    </li>
  );
}

function ReportedIssues() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const hydrated = useSessionHydrated();
  const actor = useSession((s) => s.actor);
  const issues = useMyIssues(actor?.id);
  const [reporting, setReporting] = useState(false);

  // Arriving with ?new=1 opens the form once, then drops the flag so Back and refresh don't reopen it.
  useEffect(() => {
    if (params.get("new") === "1") {
      setReporting(true);
      router.replace(pathname, { scroll: false });
    }
  }, [params, pathname, router]);

  const open = issues.filter(isOpen);
  const closed = issues.filter((i) => !isOpen(i));

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10">
      <PageHeader
        title="Reported Issues"
        backTo={{ href: "/help", label: "FAQs" }}
        actions={
          issues.length > 0 && (
            <Button onClick={() => setReporting(true)}>
              <Plus size={15} aria-hidden="true" />
              Report an issue
            </Button>
          )
        }
      />

      {!hydrated ? null : issues.length === 0 ? (
        <TrueEmptyState
          icon={<MessageSquareWarning size={22} />}
          title="Nothing reported"
          description="If something goes wrong with a payment, a card or the app, tell us here and follow it until it’s sorted."
          action={
            <Button onClick={() => setReporting(true)}>
              <Plus size={15} aria-hidden="true" />
              Report an issue
            </Button>
          }
        />
      ) : (
        <>
          {open.length > 0 && (
            <section className="flex flex-col gap-3">
              <SectionHeading title="Open" />
              <ListCard>
                {open.map((i) => (
                  <IssueRow key={i.id} issue={i} />
                ))}
              </ListCard>
            </section>
          )}
          {closed.length > 0 && (
            <section className="flex flex-col gap-3">
              <SectionHeading title="Closed" />
              <ListCard>
                {closed.map((i) => (
                  <IssueRow key={i.id} issue={i} />
                ))}
              </ListCard>
            </section>
          )}
        </>
      )}

      <ReportIssueDialog open={reporting} onOpenChange={setReporting} />
    </div>
  );
}

export default function ReportedIssuesPage() {
  return (
    <Suspense fallback={null}>
      <ReportedIssues />
    </Suspense>
  );
}
