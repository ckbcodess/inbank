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

import { use, useState } from "react";
import { Building2, CreditCard, ShieldAlert, UserCog } from "lucide-react";
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
  { id: "u1", name: "Kwame Boateng", role: "Maker", status: "Active" },
  { id: "u2", name: "Efua Mensah", role: "Approver", status: "Active" },
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
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Adinkra Textiles Ltd"
        description={`CORP-90114 · ${id}`}
        backTo={{ href: "/admin/customers", label: "Customers" }}
        actions={
          <Button variant="destructive" size="sm" onClick={() => setSuspendOpen(true)} disabled={suspended}>
            <ShieldAlert size={14} strokeWidth={1.9} aria-hidden="true" />
            {suspended ? "Suspended" : "Suspend customer"}
          </Button>
        }
      />

      <StateSwitcher section="13.9" states={BASELINE_STATES} value={state} onChange={setState} />

      <StubNotice section="section 7 / sitemap 12.5" />

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Building2 size={19} strokeWidth={1.8} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] text-foreground">Corporate relationship</p>
            <p className="mt-0.5 text-[12.5px] text-muted-foreground tabular">
              Onboarded 12 Mar 2021 · Relationship manager: A. Owusu
            </p>
          </div>
          <Badge variant={suspended ? "warning" : "success"}>{suspended ? "Suspended" : "Active"}</Badge>
        </div>

        <dl className="grid grid-cols-1 gap-x-8 gap-y-4 pt-5 sm:grid-cols-3">
          <Fact label="Segment" value="Corporate" />
          <Fact label="Accounts" value="4" />
          <Fact label="Users" value={String(CUSTOMER_USERS.length)} />
        </dl>
      </section>

      {/* Issued Payment Cards */}
      <section className="rounded-2xl border border-border bg-card">
        <h2 className="flex items-center gap-2 border-b border-border px-5 py-4 text-[15px] text-foreground">
          <CreditCard size={16} strokeWidth={1.8} aria-hidden="true" className="text-muted-foreground" />
          Issued payment cards
        </h2>
        <ul className="divide-y divide-border">
          {customerCards.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
              <div className="flex items-center gap-3 min-w-0">
                <MiniCardThumbnail card={c} />
                <div className="flex flex-col min-w-0">
                  <span className="truncate text-[13px] font-medium text-foreground">{c.name}</span>
                  <span className="mt-0.5 text-[11.5px] text-muted-foreground tabular">
                    {c.scheme} {c.type} · {c.maskedNumber} · {c.holder}
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
        <h2 className="flex items-center gap-2 border-b border-border px-5 py-4 text-[15px] text-foreground">
          <UserCog size={16} strokeWidth={1.8} aria-hidden="true" className="text-muted-foreground" />
          User access
        </h2>
        <ul className="divide-y divide-border">
          {CUSTOMER_USERS.map((u) => (
            <li key={u.id} className="flex items-center gap-4 px-5 py-3.5">
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

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[12px] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-[13px] text-foreground tabular">{value}</dd>
    </div>
  );
}
