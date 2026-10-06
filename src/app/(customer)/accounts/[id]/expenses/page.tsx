"use client";

/**
 * My Spends — reached only from Account Details. Scoped to that one account;
 * there is no relationship-wide expenses hub and no account selector here.
 *
 * 13.9 baseline states. The period lives in the URL (`?period=`) so it survives
 * a reload and can be shared. Breakdown only — payments live on the statement.
 */

import { use, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import { ContextChip } from "@/components/layout/ContextChip";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import { AccountExpensesView } from "@/components/accounts/AccountExpenses";
import { findAccount } from "@/lib/mock-data";
import { EXPENSE_PERIODS, type ExpensePeriod } from "@/lib/insights";
import type { BaselineState } from "@/lib/states";

const BASELINE: readonly BaselineState[] = ["loading", "empty", "populated", "error"] as const;

function parsePeriod(value: string | null): ExpensePeriod {
  return (EXPENSE_PERIODS as readonly string[]).includes(value ?? "") ? (value as ExpensePeriod) : "30d";
}

export default function AccountExpensesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const account = findAccount(id);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const period = parsePeriod(searchParams.get("period"));
  const [state, setState] = useState<BaselineState>("populated");

  if (!account) {
    return <PageHeader title="Account not found" backTo={{ href: "/accounts", label: "My Accounts" }} />;
  }

  const setPeriod = (p: ExpensePeriod) => {
    router.replace(p === "30d" ? pathname : `${pathname}?period=${p}`, { scroll: false });
  };

  return (
    <div className="mx-auto flex w-full max-w-[880px] flex-col gap-8 sm:gap-10">
      <PageHeader
        title="My Spends"
        backTo={{ href: `/accounts/${account.id}`, label: account.name }}
        badge={
          <ContextChip title={`${account.name} ${account.number}`}>
            {account.name} <span className="tabular">•• {account.number.slice(-4)}</span>
          </ContextChip>
        }
      />

      <AccountExpensesView
        account={account}
        period={period}
        onPeriodChange={setPeriod}
        state={state}
        onRetry={() => setState("populated")}
      />

      <div className="pt-2 opacity-40 hover:opacity-100 transition-opacity">
        <StateSwitcher section="13.9 baseline" states={BASELINE} value={state} onChange={setState} />
      </div>
    </div>
  );
}
