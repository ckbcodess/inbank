import { Badge } from "@/components/ui/badge";
import { ProgressTracker, type TrackerStep } from "@/components/ui/progress-tracker";
import { ISSUE_STATUS_LABEL, type Issue, type IssueStatus } from "@/lib/issues-store";
import { formatDateTime } from "@/lib/mock-data";

const VARIANT: Record<IssueStatus, "info" | "warning" | "success" | "secondary"> = {
  received: "info",
  "in-review": "warning",
  resolved: "success",
  withdrawn: "secondary",
};

/** A case's status as a pill: Received (blue), In review (amber), Resolved (green), Withdrawn (grey). */
export function IssueStatusBadge({ status }: { status: IssueStatus }) {
  return <Badge variant={VARIANT[status]}>{ISSUE_STATUS_LABEL[status]}</Badge>;
}

/** What each stage says before the case reaches it. */
const UPCOMING: Partial<Record<IssueStatus, string>> = {
  "in-review": "Someone at the bank looks into it.",
  resolved: "We’ll tell you by SMS and email when it’s sorted.",
};

/**
 * A case's updates on the progress tracker: Received, In review, Resolved, each with its date and the bank's note once
 * reached. A withdrawn case ends at Withdrawn and leaves out the stages it never got to.
 */
export function IssueTracker({ issue }: { issue: Issue }) {
  const reached = new Map(issue.updates.map((u) => [u.status, u]));
  const stages: IssueStatus[] =
    issue.status === "withdrawn"
      ? [...(["received", "in-review", "resolved"] as const).filter((s) => reached.has(s)), "withdrawn"]
      : ["received", "in-review", "resolved"];

  const steps: TrackerStep[] = stages.map((s) => {
    const u = reached.get(s);
    return {
      key: s,
      title: ISSUE_STATUS_LABEL[s],
      date: u ? formatDateTime(u.at) : undefined,
      description: u ? u.note : UPCOMING[s],
    };
  });
  const current = stages.reduce((last, s, i) => (reached.has(s) ? i : last), 0);

  return <ProgressTracker steps={steps} current={current} />;
}
