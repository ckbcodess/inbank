"use client";

/**
 * Customer Details — section 7. STUB.
 *
 * Customer relationship, status and associated users, with User Access managed
 * as a SECTION inside this screen rather than a separate surface (section 7).
 *
 * Suspend/Deactivate uses the shared compliance modal — the same component the
 * customer shell's User Details uses (12.6: build once, not twice).
 */

import { Fact } from "@/components/ui/fact";
import { use, useState } from "react";
import Link from "next/link";
import { Building2, CreditCard, ShieldAlert, UserCog } from "@/components/ui/icons";
import PageHeader from "@/components/layout/PageHeader";
import StubNotice from "@/components/StubNotice";
import SuspensionDialog from "@/components/SuspensionDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import type { BaselineState } from "@/lib/states";
import { cardsForProfile, formatMoney } from "@/lib/mock-data";
import { MiniCardThumbnail } from "@/components/cards/MiniCardThumbnail";

const BASELINE_STATES: readonly BaselineState[] = ["loading", "empty", "populated", "error"] as const;

const CUSTOMER_USERS = [
  { id: "u1", name: "Ransford Gyasi", role: "Inputter", status: "Active" },
  { id: "u2", name: "Esther Appiah", role: "Authoriser", status: "Active" },
  { id: "u3", name: "Yaw Oppong", role: "Corporate Admin", status: "Active" },
  { id: "u4", name: "Adjoa Frimpong", role: "Viewer", status: "Suspended" },
];

export default function CustomerDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [state, setState] = useState<BaselineState>("populated");
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [suspended, setSuspended] = useState(false);

  const customerCards = cardsForProfile("CORPORATE");

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Adinkra Textiles Ltd"
        description={`CORP-90114 · ${id}`}
        backTo={{ href: "/admin/customers", label: "Customers" }}
        actions={
          <Button variant="destructive" onClick={() => setSuspendOpen(true)} disabled={suspended}>
            <ShieldAlert size={14} aria-hidden="true" />
            {suspended ? "Suspended" : "Suspend customer"}
          </Button>
        }
      />

      <StateSwitcher section="13.9" states={BASELINE_STATES} value={state} onChange={setState} />

      <StubNotice section="section 7 / sitemap 12.5" />

      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Building2 size={19} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] text-foreground">Corporate relationship</p>
            <p className="mt-0.5 text-[12.5px] text-muted-foreground tabular">
              Onboarded 12 Mar 2021 · Relationship manager: A. Owusu
            </p>
          </div>
          <Badge variant={suspended ? "warning" : "success"}>{suspended ? "Suspended" : "Active"}</Badge>
        </div>

        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 pt-4 sm:grid-cols-4">
          <Fact mono label="Segment" value="Corporate" />
          <Fact mono label="Accounts" value="4" />
          <Fact mono label="Users" value={String(CUSTOMER_USERS.length)} />
          <div className="flex flex-col">
            <dt className="text-[12px] text-muted-foreground">Enrolment</dt>
            <dd className="mt-1">
              <Link
                href="/admin/enrolments/enr-2026-0814"
                className="text-[13px] font-medium text-foreground underline underline-offset-4 hover:text-foreground/80 flex items-center gap-1"
              >
                <span>Active (ENR-2026-0814)</span>
              </Link>
            </dd>
          </div>
        </dl>
      </section>

      {/* Issued Payment Cards */}
      <section className="rounded-2xl border border-border bg-card">
        <h2 className="flex items-center gap-2 border-b border-border px-4 py-3 text-[15px] text-foreground">
          <CreditCard size={16} aria-hidden="true" className="text-muted-foreground" />
          Issued payment cards
        </h2>
        <ul className="divide-y divide-border">
          {customerCards.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2 px-4 py-3">
              <div className="flex items-center gap-2 min-w-0">
                <MiniCardThumbnail card={c} />
                <div className="flex flex-col min-w-0">
                  <span className="truncate text-[13px] font-medium text-foreground">{c.name}</span>
                  <span className="mt-0.5 text-[11.5px] text-muted-foreground tabular">
                    {c.scheme} · {c.maskedNumber} · {c.holder}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[13px] text-foreground tabular">
                  {c.type === "Prepaid" && c.balance !== null ? formatMoney(c.balance, c.currency) : "Debit"}
                </span>
                <Badge variant={c.status === "Active" ? "success" : "destructive"}>{c.status}</Badge>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* User Access — a section within Customer Details, not its own screen */}
      <section className="rounded-2xl border border-border bg-card">
        <h2 className="flex items-center gap-2 border-b border-border px-4 py-3 text-[15px] text-foreground">
          <UserCog size={16} aria-hidden="true" className="text-muted-foreground" />
          User access
        </h2>
        <ul className="divide-y divide-border">
          {CUSTOMER_USERS.map((u) => (
            <li key={u.id} className="flex items-center gap-3 px-4 py-3">
              <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">{u.name}</span>
              <Badge variant="outline">{u.role}</Badge>
              <Badge variant={u.status === "Active" ? "success" : "warning"}>{u.status}</Badge>
              <Button variant="ghost" size="xs" disabled>
                Manage
              </Button>
            </li>
          ))}
        </ul>
      </section>

      {/* Shared compliance modal — identical component in both shells */}
      <SuspensionDialog
        open={suspendOpen}
        onOpenChange={setSuspendOpen}
        subject="Adinkra Textiles Ltd"
        action="suspend"
        onConfirm={() => {
          setSuspendOpen(false);
          setSuspended(true);
        }}
      />
    </div>
  );
}

