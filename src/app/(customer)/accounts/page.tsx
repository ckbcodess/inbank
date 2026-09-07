"use client";

/**
 * S06 Accounts (list) — section 2, state model 13.1.
 *
 * Implements all six list states. `empty` and `filtered-empty` are separate
 * branches with different copy and different actions, per 13.1.
 *
 * Account Details is reached from a row here, never from navigation (12.4).
 */

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronRight, Landmark, PieChart as PieChartIcon, PiggyBank, Plus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExpandableSearch } from "@/components/ui/expandable-search";
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
import { accountsForProfile } from "@/lib/mock-data";
import { useSession } from "@/lib/session-store";
import { useAmountVisibility, RevealingAmount } from "@/components/providers/AmountVisibilityProvider";
import LinkSourceAccountModal from "@/components/dashboard/LinkSourceAccountModal";
import { MySpendsWidget } from "@/components/accounts/MySpendsWidget";

const LIST_STATES: readonly ListState[] = [
  "loading",
  "empty",
  "filtered-empty",
  "populated",
  "partial-load",
  "error",
] as const;

function AccountsContent() {
  useAmountVisibility();
  const searchParams = useSearchParams();
  const activeProfile = useSession((s) => s.activeProfile);
  const accounts = accountsForProfile(activeProfile?.kind);

  const [activeTab, setActiveTab] = useState<"accounts" | "spends">(
    searchParams.get("tab") === "spends" ? "spends" : "accounts"
  );
  const [selectedSpendAccountId, setSelectedSpendAccountId] = useState<string | null>(null);

  const [state, setState] = useState<ListState>("populated");
  const [query, setQuery] = useState("");
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("link_source") === "true") {
      setIsLinkModalOpen(true);
    }
    if (searchParams.get("tab") === "spends") {
      setActiveTab("spends");
    }
  }, [searchParams]);

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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[24px] sm:text-[26px] font-medium tracking-tight text-foreground">
            {activeTab === "accounts" ? "Accounts" : "My Spends"}
          </h1>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            {activeTab === "accounts"
              ? "Balances and activity across your banking relationship."
              : "Track your spending trends by transaction types and categories."}
          </p>
        </div>

        {/* View Switcher: Accounts vs My Spends + Link Account Button */}
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-xl bg-muted/80 p-1 border border-border/60">
            <button
              type="button"
              onClick={() => setActiveTab("accounts")}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-[13px] font-medium rounded-lg transition-all cursor-pointer ${
                activeTab === "accounts"
                  ? "bg-white dark:bg-card text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Wallet size={14} />
              <span>Accounts</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("spends")}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-[13px] font-medium rounded-lg transition-all cursor-pointer ${
                activeTab === "spends"
                  ? "bg-white dark:bg-card text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <PieChartIcon size={14} />
              <span>My Spends</span>
            </button>
          </div>

          <Button
            type="button"
            onClick={() => setIsLinkModalOpen(true)}
            className="rounded-xl bg-[#fdc307] text-[13px] font-semibold text-[#451a03] hover:bg-[#eab306] active:scale-[0.96] transition-all shadow-xs cursor-pointer h-9 px-3.5"
          >
            <Plus size={14} strokeWidth={2} />
            Link Account
          </Button>
        </div>
      </div>

      {activeTab === "spends" ? (
        <MySpendsWidget
          accounts={accounts}
          selectedAccountId={selectedSpendAccountId}
          onSelectAccount={setSelectedSpendAccountId}
        />
      ) : (
        <>
          <StateSwitcher
            section="13.1"
            states={LIST_STATES}
            value={state}
            onChange={setState}
            labels={LIST_STATE_LABEL}
          />

      <div className="rounded-2xl border border-border bg-card">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
          <span className="text-[13px] font-medium text-muted-foreground">
            {rows.length} {rows.length === 1 ? "account" : "accounts"}
          </span>

          <ExpandableSearch
            value={query}
            onChange={setQuery}
            placeholder="Search by name or account number..."
            tooltip="Search accounts"
          />
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
            description="Once an account is opened or linked under this relationship it will appear here with its balance and activity."
            action={
              <Button
                size="sm"
                onClick={() => setIsLinkModalOpen(true)}
                className="bg-[#F2B200] text-black hover:bg-[#E0A300] cursor-pointer rounded-xl font-medium"
              >
                <Plus size={14} strokeWidth={1.9} aria-hidden="true" />
                Link an account
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
              {rows.map((acc) => {
                const isSavings = acc.type === "Savings";
                const Icon = isSavings ? PiggyBank : Landmark;
                const nameHasType = acc.name.toLowerCase().includes(acc.type.toLowerCase());
                const accountSubtitle = nameHasType ? acc.number : `${acc.type} · ${acc.number}`;

                return (
                  <li key={acc.id} className="group relative">
                    <Link
                      href={`/accounts/${acc.id}`}
                      className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/40 active:scale-[0.995] transition-transform"
                    >
                      {/* Unified Circular Icon Badge matching payment flows */}
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted/80 text-foreground dark:bg-[#252525] border border-border/40">
                        <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                      </span>

                      {/* Account Identity */}
                      <div className="flex min-w-0 flex-1 flex-col justify-center">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="truncate text-[14.5px] sm:text-[15px] font-medium text-foreground tracking-[-0.01em]">
                            {acc.name}
                          </span>
                          {acc.isJoint && (
                            <span
                              title={acc.mandate ? `Mandate: ${acc.mandate}` : "Joint Account"}
                              className="inline-flex items-center rounded-full bg-[#FEF3D6] px-2 py-0.5 text-[10.5px] font-semibold text-[#B27B00] dark:bg-amber-500/20 dark:text-amber-300"
                            >
                              Joint
                            </span>
                          )}
                          {acc.status === "Dormant" && (
                            <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                              Dormant
                            </Badge>
                          )}
                        </div>
                        <span className="mt-0.5 text-[12.5px] sm:text-[13px] text-muted-foreground tabular font-normal">
                          {accountSubtitle}
                        </span>
                      </div>

                      {/* Balance Details — Primary currency shown, subline has no repeated currency near chevron */}
                      <div className="flex shrink-0 flex-col items-end justify-center">
                        <span className="text-[14.5px] sm:text-[15px] font-medium text-foreground tabular">
                          <RevealingAmount amount={acc.balance} currency={acc.currency} />
                        </span>
                        <span className="mt-0.5 text-[12px] sm:text-[12.5px] text-muted-foreground tabular font-normal">
                          Available: <RevealingAmount amount={acc.available} currency="" />
                        </span>
                      </div>

                      <ChevronRight
                        size={16}
                        strokeWidth={1.8}
                        aria-hidden="true"
                        className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* 13.1 partial load — rows above stay interactive */}
            {effective === "partial-load" && <PartialLoadFooter />}
          </>
        )}
      </div>

      {/* Link Source Account Modal */}
      <LinkSourceAccountModal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
      />
        </>
      )}
    </div>
  );
}

export default function AccountsPage() {
  return (
    <Suspense fallback={<div className="min-h-[400px] animate-pulse bg-muted/20 rounded-2xl" />}>
      <AccountsContent />
    </Suspense>
  );
}
