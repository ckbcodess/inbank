"use client";

/**
 * One company user (option C). Shows their role and what it means, their limit for one payment, the accounts they
 * can see, and whether they're on the mandate. The administrator can change access: a change that narrows it
 * (lower limit, fewer accounts) applies at once; one that widens it (another role, a higher limit, another account)
 * waits for an Authoriser or another administrator. Suspending is instant; reactivating waits, because it gives
 * access back.
 */

import { use, useState } from "react";
import { toast } from "sonner";
import PageHeader from "@/components/layout/PageHeader";
import SuspensionDialog from "@/components/SuspensionDialog";
import UserAccessFields from "@/components/corporate/admin/UserAccessFields";
import UserChangeSummary from "@/components/corporate/admin/UserChangeSummary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Fact } from "@/components/ui/fact";
import {
  draftOf,
  draftProblem,
  findCompanyUser,
  LIMIT_MEANING,
  pendingChangeFor,
  proposeUserChange,
  ROLE_LINE,
  roleHasLimit,
  suspendUser,
  useControlsVersion,
  widens,
  type UserDraft,
} from "@/lib/corporate/controls";
import { findAccount, formatMoney } from "@/lib/mock-data";
import { useSession } from "@/lib/session-store";

export default function CompanyUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  useControlsVersion();
  const actor = useSession((s) => s.actor);
  const user = findCompanyUser(id);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [editing, setEditing] = useState<UserDraft | null>(null);
  const [tried, setTried] = useState(false);

  if (!user) {
    return <PageHeader title="User Not Found" backTo={{ href: "/business/administration", label: "Administration" }} />;
  }

  const first = user.name.split(" ")[0];
  const pending = pendingChangeFor(user.id);
  const suspended = user.status === "Suspended";
  const problem = editing && tried ? draftProblem(editing) : "";
  const limitProblem = problem.includes("limit") ? problem : "";
  const accountsProblem = problem && !limitProblem ? problem : "";
  const willWait = editing ? widens(draftOf(user), editing) : false;

  function save() {
    if (!editing || !actor || !user) return;
    setTried(true);
    if (draftProblem(editing)) return;
    const { applied } = proposeUserChange({ kind: "update", userId: user.id, after: editing, proposedBy: actor.name });
    setEditing(null);
    toast.success(applied ? `Saved. It applies to ${first} now.` : "Sent for approval. It applies once it's approved.");
  }

  function reactivate() {
    if (!actor || !user) return;
    proposeUserChange({ kind: "reactivate", userId: user.id, after: draftOf(user), proposedBy: actor.name });
    toast.success(`Sent for approval. ${first} can sign in again once it's approved.`);
  }

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-10">
      <PageHeader
        title={user.name}
        description={`${user.designation} · ${user.email}`}
        backTo={{ href: "/business/administration", label: "Administration" }}
      />

      {pending && (
        <section className="flex flex-col gap-3">
          <h2 className="min-h-6 text-[16px] font-medium text-foreground">Change Waiting for Approval</h2>
          <UserChangeSummary change={pending} />
          <p className="tabular text-[12px] text-muted-foreground">{`Proposed by ${pending.proposedBy} · ${pending.proposedAt}`}</p>
        </section>
      )}

      {editing ? (
        <section className="flex flex-col gap-6">
          <UserAccessFields
            draft={editing}
            onChange={(next) => {
              setEditing(next);
              if (tried) setTried(false);
            }}
            limitError={limitProblem}
            accountsError={accountsProblem}
          />
          <div className="flex flex-col gap-2">
            <p className="text-[13px] text-muted-foreground">
              {willWait
                ? "This gives more access, so an Authoriser or another administrator approves it first."
                : `This only reduces access, so it applies to ${first} as soon as you save.`}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={save}>{willWait ? "Send for Approval" : "Save Changes"}</Button>
              <Button variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </section>
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <div className="flex min-h-6 items-center gap-2">
              <h2 className="text-[16px] font-medium text-foreground">{user.role}</h2>
              {suspended && <Badge variant="warning">Suspended</Badge>}
            </div>
            <p className="text-[14px] text-foreground">{ROLE_LINE[user.role]}</p>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              {roleHasLimit(user.role) && <Fact label={LIMIT_MEANING[user.role]} value={formatMoney(user.limit, "GHS", true)} mono />}
              <Fact label="On the Mandate" value={user.onMandate ? "Yes" : "No"} />
            </dl>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="min-h-6 text-[16px] font-medium text-foreground">Accounts They Can See</h2>
            <ul className="flex flex-col gap-2">
              {user.accountIds.map((accountId) => {
                const a = findAccount(accountId);
                if (!a) return null;
                return (
                  <li key={a.id} className="flex items-center justify-between gap-3">
                    <span className="truncate text-[14px] text-foreground">{a.name}</span>
                    <span className="tabular shrink-0 text-[13px] text-muted-foreground">•••• {a.number.replace(/\s/g, "").slice(-4)}</span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-3">
              {!suspended && (
                <Button
                  variant="outline"
                  disabled={Boolean(pending)}
                  onClick={() => {
                    setTried(false);
                    setEditing(draftOf(user));
                  }}
                >
                  Change Access
                </Button>
              )}
              {suspended ? (
                <Button variant="outline" disabled={Boolean(pending)} onClick={reactivate}>
                  Reactivate {first}
                </Button>
              ) : (
                <Button variant="destructive" onClick={() => setSuspendOpen(true)}>
                  Suspend {first}
                </Button>
              )}
            </div>
            <p className="text-[12px] text-muted-foreground">
              {pending
                ? "A change is already waiting for approval. Once it's decided you can make another."
                : suspended
                  ? `${first} can't sign in. Reactivating gives access back, so it needs approval.`
                  : "Suspending stops them signing in straight away."}
            </p>
          </section>
        </>
      )}

      <SuspensionDialog
        open={suspendOpen}
        onOpenChange={setSuspendOpen}
        subject={user.name}
        action="suspend"
        onConfirm={() => {
          setSuspendOpen(false);
          suspendUser(user.id);
          toast.success(`${user.name} is suspended.`);
        }}
      />
    </div>
  );
}
