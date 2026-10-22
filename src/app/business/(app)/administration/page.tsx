"use client";

/**
 * Administration: the company's internet banking users and the changes waiting on a second person. Only a
 * Corporate Admin reaches it; the nav hides it otherwise (12.3).
 *
 * Option C (designer, 2026-10-22): the administrator adds users and changes their access inside the bank's
 * ceilings. Anything that widens access waits for an Authoriser or another administrator; narrowing applies at
 * once. The rows read the same control table the payment screens enforce (`lib/corporate/controls.ts`).
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Plus } from "@/components/ui/icons";
import PageHeader from "@/components/layout/PageHeader";
import UserChangeSummary from "@/components/corporate/admin/UserChangeSummary";
import { ExpandableSearch } from "@/components/ui/expandable-search";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TileChip } from "@/components/ui/action-tile";
import { ListCard } from "@/components/ui/list-card";
import { FilteredEmptyState } from "@/components/states/ListStates";
import {
  canApproveUserChange,
  COMPANY_USERS,
  findCompanyUser,
  pendingChangeFor,
  pendingUserChanges,
  roleHasLimit,
  useControlsVersion,
  type CompanyUser,
} from "@/lib/corporate/controls";
import { formatMoney } from "@/lib/mock-data";
import { useSession } from "@/lib/session-store";

function limitLine(u: CompanyUser): string {
  return roleHasLimit(u.role) ? `Up to ${formatMoney(u.limit, "GHS", true)} a payment` : "No payment limit";
}

export default function AdministrationPage() {
  const version = useControlsVersion();
  const actor = useSession((s) => s.actor);
  const [query, setQuery] = useState("");

  const users = useMemo(() => {
    void version;
    const q = query.trim().toLowerCase();
    if (!q) return [...COMPANY_USERS];
    return COMPANY_USERS.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q),
    );
  }, [query, version]);
  const waiting = useMemo(() => {
    void version;
    return pendingUserChanges();
  }, [version]);

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Administration"
        actions={
          <Button nativeButton={false} render={<Link href="/business/administration/new" />}>
            <Plus size={15} aria-hidden="true" />
            Add User
          </Button>
        }
      />

      {waiting.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="min-h-6 text-[16px] font-medium text-foreground">Waiting for Approval</h2>
          <p className="text-[12px] text-muted-foreground">
            New access starts once an Authoriser or another administrator approves it. Nobody approves their own change.
          </p>
          <ListCard as="div" className="gap-5 p-4 sm:p-5">
            {waiting.map((change) => {
              const name = change.userId ? findCompanyUser(change.userId)?.name : change.after.name;
              const mine = canApproveUserChange(actor, change);
              return (
                <div key={change.id} className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[14px] text-foreground">
                      {change.kind === "add" ? `Add ${name}` : change.kind === "reactivate" ? `Reactivate ${name}` : `Change ${name}`}
                    </span>
                    {mine ? (
                      <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/business/approvals/user-change/${change.id}`} />}>
                        Review Change
                      </Button>
                    ) : (
                      <span className="tabular text-[12px] text-muted-foreground">
                        {`Proposed by ${change.proposedBy} · ${change.proposedAt}`}
                      </span>
                    )}
                  </div>
                  <UserChangeSummary change={change} />
                </div>
              );
            })}
          </ListCard>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex min-h-6 items-center justify-between gap-3">
          <h2 className="text-[16px] font-medium text-foreground">Users</h2>
          <ExpandableSearch value={query} onChange={setQuery} placeholder="Search by name or role" tooltip="Search users" />
        </div>

        {users.length === 0 ? (
          <FilteredEmptyState onReset={() => setQuery("")} description={`No users match "${query}".`} />
        ) : (
          <ListCard>
            {users.map((u) => (
              <li key={u.id}>
                <Link
                  href={`/business/administration/${u.id}`}
                  className="group flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-item-hover sm:px-3"
                >
                  <TileChip tone="onCard">
                    <span className="text-[13px] font-medium">{u.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}</span>
                  </TileChip>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-[15px] font-medium tracking-[var(--ls-tight)] text-foreground">{u.name}</span>
                      {u.status === "Suspended" && <Badge variant="warning">Suspended</Badge>}
                      {pendingChangeFor(u.id) && <Badge variant="outline">Change waiting</Badge>}
                    </span>
                    <span className="truncate text-[13px] text-muted-foreground">
                      {u.role} · <span className="tabular">{limitLine(u)}</span> ·{" "}
                      {u.accountIds.length === 1 ? "1 account" : `${u.accountIds.length} accounts`}
                    </span>
                  </span>
                  <ChevronRight size={20} aria-hidden="true" className="shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
                </Link>
              </li>
            ))}
          </ListCard>
        )}
      </section>
    </div>
  );
}
