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
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, Landmark, PieChart as PieChartIcon, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const router = useRouter();
  const pathname = usePathname();
  const activeProfile = useSession((s) => s.activeProfile);
  const accounts = accountsForProfile(activeProfile?.kind);

  const [activeTab, setActiveTab] = useState<"accounts" | "spends">(
    searchParams.get("tab") === "spends" ? "spends" : "accounts"
  );
  const [selectedSpendAccountId, setSelectedSpendAccountId] = useState<string | null>(null);

  const handleSwitchTab = (tab: "accounts" | "spends") => {
    setActiveTab(tab);
    if (tab === "spends") {
      router.push(`${pathname}?tab=spends`);
    } else {
      router.push(pathname);
    }
  };

  const [state, setState] = useState<ListState>("populated");
  const [query, setQuery] = useState("");
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("link_source") === "true") {
      setIsLinkModalOpen(true);
    }
    const tabParam = searchParams.get("tab");
    setActiveTab(tabParam === "spends" ? "spends" : "accounts");
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

  if (activeTab === "spends") {
    return (
      <MySpendsWidget
        accounts={accounts}
        selectedAccountId={selectedSpendAccountId}
        onSelectAccount={setSelectedSpendAccountId}
        onBackToAccounts={() => handleSwitchTab("accounts")}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      {/* ── Header: Title & Action Buttons (1:1 Figma Node 1225:6904) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-[26px] font-medium leading-[32px] tracking-[-0.02em] text-foreground">
          Accounts
        </h1>

        <div className="flex items-center gap-3">
          {/* My Spends Button */}
          <Button
            type="button"
            variant="outline"
            onClick={() => handleSwitchTab("spends")}
            className="h-10 px-4 rounded-xl border border-border/80 bg-background/50 hover:bg-muted font-medium text-[13.5px] text-foreground flex items-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
          >
            <PieChartIcon size={16} className="text-foreground" />
            <span>My Spends</span>
          </Button>

          {/* Add Funding Method Button (GCB Yellow) */}
          <Button
            type="button"
            onClick={() => setIsLinkModalOpen(true)}
            className="h-10 px-4 rounded-xl bg-[#fdc307] hover:bg-[#eab306] text-[#18181b] font-semibold text-[13.5px] flex items-center gap-2 cursor-pointer transition-all active:scale-[0.98] shadow-xs"
          >
            <Plus size={16} strokeWidth={2.2} />
            <span>Add Funding Method</span>
          </Button>
        </div>
      </div>

      {/* ── Search Input (1:1 Figma Node 1225:6909) ── */}
      <div className="relative w-full">
        <Search
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search accounts..."
          className="w-full h-11 pl-11 pr-4 rounded-xl border border-border/80 bg-card/60 dark:bg-[#18181a] text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#fdc307] focus:border-[#fdc307] transition-all"
        />
      </div>

      {/* State Switcher for Section 13.1 verification */}
      <StateSwitcher
        section="13.1"
        states={LIST_STATES}
        value={state}
        onChange={setState}
        labels={LIST_STATE_LABEL}
      />

      {/* ── Accounts Card List (1:1 Figma Node 1225:6909) ── */}
      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
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
            icon={<Landmark size={20} strokeWidth={1.7} aria-hidden="true" />}
            title="No accounts yet"
            description="Once an account is opened or linked under this relationship it will appear here with its balance and activity."
            action={
              <Button
                size="sm"
                onClick={() => setIsLinkModalOpen(true)}
                className="bg-[#fdc307] text-[#18181b] hover:bg-[#eab306] cursor-pointer rounded-xl font-semibold text-[13px]"
              >
                <Plus size={14} strokeWidth={2.2} aria-hidden="true" />
                Add Funding Method
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
            <ul className="divide-y divide-border/60">
              {rows.map((acc) => {
                const otherHolder = acc.jointHolders?.[1] || acc.jointHolders?.[0];
                const subtitle = acc.isJoint && otherHolder
                  ? `${acc.number} • with ${otherHolder}`
                  : acc.number;

                return (
                  <li key={acc.id} className="group relative">
                    <Link
                      href={`/accounts/${acc.id}`}
                      className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/40 active:scale-[0.998]"
                    >
                      {/* Left: Icon & Identity */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted/70 text-foreground dark:bg-[#27272a] border border-border/40">
                          <Landmark size={18} strokeWidth={1.8} aria-hidden="true" />
                        </span>

                        <div className="flex min-w-0 flex-col justify-center">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="truncate text-[14.5px] sm:text-[15px] font-medium text-foreground tracking-[-0.01em]">
                              {acc.name}
                            </span>
                            {acc.isJoint && (
                              <span
                                title={acc.mandate ? `Mandate: ${acc.mandate}` : "Joint Account"}
                                className="inline-flex items-center rounded-full bg-[#FEF3D6] dark:bg-[#3b2d18] px-2 py-0.5 text-[10.5px] font-semibold text-[#B27B00] dark:text-[#f59e0b]"
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
                          <span className="mt-0.5 text-[12.5px] sm:text-[13px] text-muted-foreground tabular font-normal truncate">
                            {subtitle}
                          </span>
                        </div>
                      </div>

                      {/* Right: Available Balance & Chevron */}
                      <div className="flex items-center shrink-0 pl-2">
                        <span className="text-[13px] sm:text-[13.5px] text-muted-foreground font-normal">
                          Available:
                        </span>
                        <span className="text-[14px] sm:text-[14.5px] font-semibold text-foreground ml-1.5 tabular-nums numorainput">
                          GHS <RevealingAmount amount={acc.available} currency="" />
                        </span>
                        <ChevronRight
                          size={16}
                          strokeWidth={1.8}
                          aria-hidden="true"
                          className="ml-3 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                        />
                      </div>
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
