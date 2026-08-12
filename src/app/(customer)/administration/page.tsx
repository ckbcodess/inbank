"use client";

/**
 * User Management — section 5, state model 13.1. STUB.
 *
 * Only reachable by a Corporate Admin; the nav entry is absent for everyone
 * else (12.3). User Details is an object destination reached from this list.
 */

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Plus, Search, UserCog } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import StubNotice from "@/components/StubNotice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import { LIST_STATE_LABEL, type ListState } from "@/lib/states";

const LIST_STATES: readonly ListState[] = [
  "loading",
  "empty",
  "filtered-empty",
  "populated",
  "partial-load",
  "error",
] as const;

const USERS = [
  { id: "user-1", name: "Kwame Boateng", email: "kwame.boateng@example.com", role: "Maker", status: "Active", access: "Payments, Trade" },
  { id: "user-2", name: "Efua Mensah", email: "efua.mensah@example.com", role: "Approver", status: "Active", access: "Payments, Trade, Approvals" },
  { id: "user-3", name: "Yaw Oppong", email: "yaw.oppong@example.com", role: "Corporate Admin", status: "Active", access: "Full access" },
  { id: "user-4", name: "Adjoa Frimpong", email: "adjoa.frimpong@example.com", role: "Viewer", status: "Suspended", access: "View only" },
];

export default function UserManagementPage() {
  const [state, setState] = useState<ListState>("populated");

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Administration"
        description="Users, roles, limits and approval matrices for this corporate relationship."
        actions={
          <Button nativeButton={false} render={<Link href="/administration/user-1" />}>
            <Plus size={15} strokeWidth={1.9} aria-hidden="true" />
            Add user
          </Button>
        }
      />

      <StateSwitcher
        section="13.1"
        states={LIST_STATES}
        value={state}
        onChange={setState}
        labels={LIST_STATE_LABEL}
      />

      <StubNotice section="section 5 / sitemap 12.4" states="13.1 list, 13.7 wizard" />

      <section className="rounded-2xl border border-border bg-card">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
          <div className="relative min-w-[200px] flex-1">
            <Search
              size={15}
              strokeWidth={1.9}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input placeholder="Search users by name, email or role" className="pl-9" aria-label="Search users" />
          </div>
        </div>

        <ul className="divide-y divide-border">
          {USERS.map((u) => (
            <li key={u.id}>
              <Link
                href={`/administration/${u.id}`}
                className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-muted/50 active:scale-[0.99] transition-transform"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <UserCog size={16} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[13.5px] text-foreground">{u.name}</span>
                  <span className="truncate text-[12px] text-muted-foreground">{u.email}</span>
                </span>
                <span className="hidden shrink-0 text-[12.5px] text-muted-foreground sm:block sm:w-44">
                  {u.access}
                </span>
                <Badge variant="outline">{u.role}</Badge>
                <Badge variant={u.status === "Active" ? "success" : "warning"}>{u.status}</Badge>
                <ChevronRight size={16} strokeWidth={1.8} aria-hidden="true" className="shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
