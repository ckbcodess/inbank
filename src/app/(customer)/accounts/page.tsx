"use client";

/**
 * S06 Accounts (list) — section 2, state model 13.1.
 *
 * Implements all six list states. `empty` and `filtered-empty` are separate
 * branches with different copy and different actions, per 13.1.
 *
 * Account Details is reached from a row here, never from navigation (12.4).
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Plus, Search, Wallet } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import {
  FilteredEmptyState,
  ListErrorState,
  ListSkeleton,
  PartialLoadFooter,
  TrueEmptyState,
} from "@/components/states/ListStates";
import { LIST_STATE_LABEL, type ListState } from "@/lib/states";
import { accountsForProfile, formatMoney } from "@/lib/mock-data";
import { useSession } from "@/lib/session-store";
import { useAmountVisibility, RevealingAmount } from "@/components/providers/AmountVisibilityProvider";

const LIST_STATES: readonly ListState[] = [
  "loading",
  "empty",
  "filtered-empty",
  "populated",
  "partial-load",
  "error",
] as const;

export default function AccountsPage() {
  useAmountVisibility();
  const activeProfile = useSession((s) => s.activeProfile);
  const accounts = accountsForProfile(activeProfile?.kind);

  const [state, setState] = useState<ListState>("populated");
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    if (!query.trim()) return accounts;
    const q = query.toLowerCase();
    return accounts.filter(
      (a) => a.name.toLowerCase().includes(q) || a.number.replace(/\s/g, "").includes(q.replace(/\s/g, "")),
    );
  }, [query, accounts]);

  // A live search that matches nothing is genuinely filtered-empty — the state
  // switcher and real filtering converge on the same branch.
  const effective: ListState = state === "populated" && query.trim() && results.length === 0 ? "filtered-empty" : state;

  const rows = effective === "partial-load" ? accounts : results;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Accounts"
        description="Balances and activity across your banking relationship."
      />

      <StateSwitcher
        section="13.1"
        states={LIST_STATES}
        value={state}
        onChange={setState}
        labels={LIST_STATE_LABEL}
      />

      <div className="rounded-2xl border border-border bg-card">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
          <div className="relative min-w-[200px] flex-1">
            <Search
              size={15}
              strokeWidth={1.9}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or account number"
              className="pl-9"
              aria-label="Search accounts"
            />
          </div>
          <Button variant="outline" size="sm">
            <Plus size={14} strokeWidth={1.9} aria-hidden="true" />
            Open an account
          </Button>
        </div>

        {/* States */}
        {effective === "loading" && <ListSkeleton rows={4} columns={4} />}

        {effective === "error" && (
          <ListErrorState
            onRetry={() => setState("populated")}
            description="We couldn't load your accounts. Your balances are unaffected — try again."
          />
        )}

        {effective === "empty" && (
          <TrueEmptyState
            icon={<Wallet size={20} strokeWidth={1.7} aria-hidden="true" />}
            title="No accounts yet"
            description="Once an account is opened under this relationship it will appear here with its balance and activity."
            action={
              <Button size="sm">
                <Plus size={14} strokeWidth={1.9} aria-hidden="true" />
                Open an account
              </Button>
            }
          />
        )}

        {effective === "filtered-empty" && (
          <FilteredEmptyState
            onReset={() => {
              setQuery("");
              setState("populated");
            }}
            description="No accounts match your search. Clear it to see everything under this relationship."
          />
        )}

        {(effective === "populated" || effective === "partial-load") && (
          <>
            <ul className="divide-y divide-border">
              {rows.map((acc) => (
                <li key={acc.id}>
                  <Link
                    href={`/accounts/${acc.id}`}
                    className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-muted/50 active:scale-[0.99] transition-transform"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Wallet size={17} strokeWidth={1.8} aria-hidden="true" />
                    </span>

                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[14px] text-foreground">{acc.name}</span>
                        {acc.status === "Dormant" && <Badge variant="warning">Dormant</Badge>}
                      </span>
                      <span className="mt-0.5 text-[12px] text-muted-foreground tabular">
                        {acc.type} · {acc.number}
                      </span>
                    </span>

                    <span className="flex shrink-0 flex-col items-end">
                      <span className="text-[14px] text-foreground tabular">
                        <RevealingAmount amount={acc.balance} currency={acc.currency} />
                      </span>
                      <span className="mt-0.5 text-[12px] text-muted-foreground tabular">
                        <RevealingAmount amount={acc.available} currency={acc.currency} /> available
                      </span>
                    </span>

                    <ChevronRight size={16} strokeWidth={1.8} aria-hidden="true" className="shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>

            {/* 13.1 partial load — rows above stay interactive */}
            {effective === "partial-load" && <PartialLoadFooter />}
          </>
        )}
      </div>
    </div>
  );
}
