/**
 * What a user change does, line by line: for a new user, their role, limit and accounts; for a change, only what
 * differs, as "before → after". The approver reads exactly what they're agreeing to, and the administrator sees
 * the same lines while it waits.
 */

import { roleHasLimit, type UserChange, type UserDraft } from "@/lib/corporate/controls";
import { findAccount, formatMoney } from "@/lib/mock-data";

function accountNames(ids: string[]): string {
  return ids.map((id) => findAccount(id)?.name ?? id).join(", ");
}

function limitText(d: UserDraft): string {
  return roleHasLimit(d.role) ? formatMoney(d.limit, "GHS", true) : "None";
}

export function changeLines(change: UserChange): { label: string; value: string }[] {
  const { before, after } = change;
  if (!before) {
    return [
      { label: "Role", value: after.role },
      ...(roleHasLimit(after.role) ? [{ label: "Limit for One Payment", value: limitText(after) }] : []),
      { label: "Accounts", value: accountNames(after.accountIds) },
    ];
  }
  const lines: { label: string; value: string }[] = [];
  if (change.kind === "reactivate") lines.push({ label: "Status", value: "Suspended → Active" });
  if (before.role !== after.role) lines.push({ label: "Role", value: `${before.role} → ${after.role}` });
  if (limitText(before) !== limitText(after)) {
    lines.push({ label: "Limit for One Payment", value: `${limitText(before)} → ${limitText(after)}` });
  }
  const added = after.accountIds.filter((id) => !before.accountIds.includes(id));
  const removed = before.accountIds.filter((id) => !after.accountIds.includes(id));
  if (added.length) lines.push({ label: "Accounts Added", value: accountNames(added) });
  if (removed.length) lines.push({ label: "Accounts Removed", value: accountNames(removed) });
  return lines;
}

export default function UserChangeSummary({ change }: { change: UserChange }) {
  return (
    <dl className="flex flex-col gap-2">
      {changeLines(change).map((line) => (
        <div key={line.label} className="flex items-start justify-between gap-4">
          <dt className="text-[13px] text-muted-foreground">{line.label}</dt>
          <dd className="tabular text-right text-[13px] text-foreground">{line.value}</dd>
        </div>
      ))}
    </dl>
  );
}
