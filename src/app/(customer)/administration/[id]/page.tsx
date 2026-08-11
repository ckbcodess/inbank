"use client";

/**
 * User Details → User Access Wizard — section 5, state model 13.7. STUB.
 *
 * The wizard is a flow reached FROM User Details, not a nav destination (12.4).
 *
 * The one behaviour worth showing even in stub form is the wizard dependency
 * rule: when a later step is unavailable because of an earlier selection, the
 * REASON is stated. Never a silent grey-out.
 */

import { use, useState } from "react";
import Link from "next/link";
import { Check, Info, Lock, ShieldAlert, UserCog } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import StubNotice from "@/components/StubNotice";
import SuspensionDialog from "@/components/SuspensionDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Role = "Viewer" | "Maker" | "Approver" | "Corporate Admin";

interface Step {
  n: number;
  name: string;
  /** Reason this step is unavailable, or null when it's available. */
  lockedReason: (role: Role) => string | null;
}

const STEPS: Step[] = [
  { n: 1, name: "Profile Details", lockedReason: () => null },
  { n: 2, name: "Roles & Service Access", lockedReason: () => null },
  {
    n: 3,
    name: "Transaction Limits",
    // Section 5's worked example, verbatim in spirit.
    lockedReason: (role) =>
      role === "Viewer" ? "Limits unavailable — this user has Viewer-only access." : null,
  },
  {
    n: 4,
    name: "Approval Matrices",
    // Section 5: only expose when the selected role permits approval authority.
    lockedReason: (role) =>
      role === "Approver" || role === "Corporate Admin"
        ? null
        : `Approval matrices unavailable — the ${role} role carries no approval authority.`,
  },
  { n: 5, name: "Review", lockedReason: () => null },
];

export default function UserDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [role, setRole] = useState<Role>("Maker");
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [suspended, setSuspended] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Kwame Boateng"
        description={`kwame.boateng@example.com · ${id}`}
        backTo={{ href: "/administration", label: "Administration" }}
        actions={
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setSuspendOpen(true)}
            disabled={suspended}
          >
            <ShieldAlert size={14} strokeWidth={1.9} aria-hidden="true" />
            {suspended ? "Suspended" : "Suspend user"}
          </Button>
        }
      />

      <StubNotice section="section 5" states="13.7" />

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <UserCog size={19} strokeWidth={1.8} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] text-foreground">Access configuration</p>
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">
              Role selection in step 2 determines which later steps apply.
            </p>
          </div>
          <Badge variant={suspended ? "warning" : "success"}>
            {suspended ? "Suspended" : "Active"}
          </Badge>
        </div>

        {/* Role selector drives the dependency demonstration below */}
        <div className="mt-5">
          <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
            Selected role (step 2)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {(["Viewer", "Maker", "Approver", "Corporate Admin"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                aria-pressed={role === r}
                className={`rounded-lg border px-3 py-1.5 text-[12.5px] transition-all ${
                  role === r
                    ? "border-primary bg-[var(--active-bg)] text-foreground"
                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card">
        <h2 className="border-b border-border px-5 py-4 text-[15px] text-foreground">
          User Access Wizard
        </h2>
        <ol className="divide-y divide-border">
          {STEPS.map((step) => {
            const reason = step.lockedReason(role);
            const locked = reason !== null;
            return (
              <li key={step.n} className="flex items-start gap-3.5 px-5 py-4">
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] ${
                    locked
                      ? "bg-muted text-muted-foreground"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {locked ? <Lock size={12} strokeWidth={2} aria-hidden="true" /> : step.n === 5 ? <Check size={13} strokeWidth={2.4} aria-hidden="true" /> : step.n}
                </span>

                <div className="min-w-0 flex-1">
                  <p className={`text-[13.5px] ${locked ? "text-muted-foreground" : "text-foreground"}`}>
                    {step.name}
                  </p>
                  {/* 13.7: the reason is stated explicitly — never a silent grey-out */}
                  {locked && (
                    <p className="mt-1 flex items-start gap-1.5 text-[12.5px] text-amber-700 dark:text-amber-400">
                      <Info size={13} strokeWidth={1.9} aria-hidden="true" className="mt-px shrink-0" />
                      {reason}
                    </p>
                  )}
                </div>

                <Button variant="outline" size="xs" disabled>
                  {locked ? "Unavailable" : "Open"}
                </Button>
              </li>
            );
          })}
        </ol>
      </section>

      <div>
        <Button variant="outline" nativeButton={false} render={<Link href="/administration" />}>
          Back to Administration
        </Button>
      </div>

      {/* Same shared compliance modal used by Customer Details in the Admin
          Portal — one component, both shells (12.6). */}
      <SuspensionDialog
        open={suspendOpen}
        onOpenChange={setSuspendOpen}
        subject="Kwame Boateng"
        action="suspend"
        onConfirm={() => {
          setSuspendOpen(false);
          setSuspended(true);
        }}
      />
    </div>
  );
}
