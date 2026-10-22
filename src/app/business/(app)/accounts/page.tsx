"use client";

/**
 * Business Accounts — the company's accounts, one row each with what can be spent. Laid out like the personal
 * list (the same rows in the same glass-edged list card); unlike it, a company wants the balance on the row: it
 * picks the account to pay from by what is in it. Only the accounts this person was given are listed (UAR-05).
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Landmark } from "@/components/ui/icons";
import PageHeader from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { TileChip } from "@/components/ui/action-tile";
import { LIST_CARD_CLASS, ListCard } from "@/components/ui/list-card";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import { ListErrorState, ListSkeleton, TrueEmptyState } from "@/components/states/ListStates";
import { RevealingAmount } from "@/components/providers/AmountVisibilityProvider";
import type { BaselineState } from "@/lib/states";
import { businessAccounts } from "@/lib/corporate/accounts";
import { useSession } from "@/lib/session-store";

const BASELINE: readonly BaselineState[] = ["loading", "empty", "populated", "error"] as const;

/** Last four digits only: the full number is on the account, and a list is read aloud and screenshotted. */
function tail(number: string) {
  return `•••• ${number.replace(/\s/g, "").slice(-4)}`;
}

export default function BusinessAccountsPage() {
  const [state, setState] = useState<BaselineState>("populated");
  // Per-user visibility (UAR-05): re-read when the signed-in person changes.
  const actorId = useSession((s) => s.actor?.id);
  const accounts = useMemo(() => (actorId ? businessAccounts() : []), [actorId]);

  return (
    <div className="flex flex-col gap-10">
      <PageHeader title="Accounts" />

      <StateSwitcher section="13.9 baseline" states={BASELINE} value={state} onChange={setState} />

      {state === "loading" && (
        <div className={LIST_CARD_CLASS}>
          <ListSkeleton rows={4} />
        </div>
      )}

      {state === "error" && (
        <ListErrorState
          onRetry={() => setState("populated")}
          description="We couldn't load your accounts. Nothing has changed on them — try again."
        />
      )}

      {(state === "empty" || (state === "populated" && accounts.length === 0)) && (
        <TrueEmptyState
          title="No accounts yet"
          description="Accounts linked to this business will show here."
        />
      )}

      {state === "populated" && accounts.length > 0 && (
        <ListCard aria-label="Accounts">
            {accounts.map((account) => (
              <li key={account.id}>
                <Link
                  href={`/business/accounts/${account.id}`}
                  className="group flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-item-hover sm:px-3"
                >
                  <TileChip tone="onCard">
                    <Landmark size={20} aria-hidden="true" />
                  </TileChip>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-[15px] font-medium tracking-[var(--ls-tight)] text-foreground">{account.name}</span>
                      {account.status === "Dormant" && <Badge variant="warning">Dormant</Badge>}
                    </span>
                    <span className="truncate text-[13px] text-muted-foreground tabular">
                      {account.type} · {tail(account.number)}
                      {account.mandate ? ` · ${account.mandate}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-[14px] text-foreground tabular">
                    <RevealingAmount amount={account.available} currency={account.currency} />
                  </span>
                  <ChevronRight
                    size={20}
                    aria-hidden="true"
                    className="shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
                  />
                </Link>
              </li>
            ))}
        </ListCard>
      )}
    </div>
  );
}
