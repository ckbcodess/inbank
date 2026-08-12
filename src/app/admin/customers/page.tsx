"use client";

/**
 * Customer Management — section 7, state model 13.1. STUB.
 * Searchable internal customer directory. Customer Details is an object
 * destination reached from this list (12.5).
 */

import { useState } from "react";
import Link from "next/link";
import { Building2, ChevronRight, Search } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import StubNotice from "@/components/StubNotice";
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

const CUSTOMERS = [
  { id: "cust-1", name: "Adinkra Textiles Ltd", ref: "CORP-90114", segment: "Corporate", users: 12, status: "Active" },
  { id: "cust-2", name: "Volta Industries", ref: "CORP-90233", segment: "Corporate", users: 8, status: "Active" },
  { id: "cust-3", name: "Kumasi Trading Co.", ref: "CORP-90310", segment: "SME", users: 3, status: "Suspended" },
  { id: "cust-4", name: "Coastal Fisheries Ltd", ref: "CORP-90422", segment: "SME", users: 5, status: "Active" },
];

export default function CustomerManagementPage() {
  const [state, setState] = useState<ListState>("populated");

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Customers" description="Internal customer directory." />

      <StateSwitcher
        section="13.1"
        states={LIST_STATES}
        value={state}
        onChange={setState}
        labels={LIST_STATE_LABEL}
      />

      <StubNotice section="section 7 / sitemap 12.5" states="13.1 list" />

      <section className="rounded-2xl border border-border bg-card">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
          <div className="relative min-w-[200px] flex-1">
            <Search
              size={15}
              strokeWidth={1.9}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input placeholder="Search by name or customer reference" className="pl-9" aria-label="Search customers" />
          </div>
        </div>

        <ul className="divide-y divide-border">
          {CUSTOMERS.map((c) => (
            <li key={c.id}>
              <Link
                href={`/admin/customers/${c.id}`}
                className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-muted/50 active:scale-[0.99] transition-transform"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Building2 size={16} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[13.5px] text-foreground">{c.name}</span>
                  <span className="mt-0.5 truncate text-[12px] text-muted-foreground tabular">
                    {c.ref} · {c.users} users
                  </span>
                </span>
                <Badge variant="outline">{c.segment}</Badge>
                <Badge variant={c.status === "Active" ? "success" : "warning"}>{c.status}</Badge>
                <ChevronRight size={16} strokeWidth={1.8} aria-hidden="true" className="shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
