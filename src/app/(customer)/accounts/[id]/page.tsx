"use client";

/**
 * Account Details — object destination, reached only from the Accounts list
 * (12.4). State model: baseline per 13.9 (object-detail-derived).
 *
 * Designed to faithfully match Figma node 1264:2483.
 */

import { use, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  FileText,
  Plus,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import { ListSkeleton } from "@/components/states/ListStates";
import type { BaselineState } from "@/lib/states";
import { cardsForProfile, findAccount, formatDate, transactionsForAccount } from "@/lib/mock-data";
import { useSession } from "@/lib/session-store";
import { MiniCardThumbnail } from "@/components/cards/MiniCardThumbnail";
import { useAmountVisibility, RevealingAmount } from "@/components/providers/AmountVisibilityProvider";
import LinkSourceAccountModal from "@/components/dashboard/LinkSourceAccountModal";
import { useContextualBack } from "@/lib/contextual-back";

const BASELINE: readonly BaselineState[] = ["loading", "empty", "populated", "error"] as const;

export default function AccountDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  useAmountVisibility();
  const { id } = use(params);
  const { handleBack: handleBackNavigation } = useContextualBack("/accounts");
  const account = findAccount(id);
  const activeProfile = useSession((s) => s.activeProfile);
  const actor = useSession((s) => s.actor);
  const [state, setState] = useState<BaselineState>("populated");
  const [isFundModalOpen, setIsFundModalOpen] = useState(false);

  if (!account) {
    return (
      <div className="w-full flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBackNavigation}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
          >
            <ChevronLeft size={16} strokeWidth={2} />
          </button>
          <h1 className="text-[24px] font-medium text-foreground">Account not found</h1>
        </div>
        <p className="text-[13px] text-muted-foreground">
          This account isn&apos;t available under the current banking relationship.
        </p>
      </div>
    );
  }

  const profileCards = cardsForProfile(activeProfile?.kind);
  const linkedCards = profileCards.filter((c) => c.linkedAccountId === account.id || account.id === "acc-001");
  const transactions = transactionsForAccount(account.id);
  const recentTransactions = transactions.slice(0, 5);

  // Account holder string resolution
  const holderName =
    account.isJoint && account.jointHolders && account.jointHolders.length > 0
      ? account.jointHolders.join(" & ")
      : activeProfile?.name || actor?.name || "Primary Account Holder";

  return (
    <div className="w-full flex flex-col gap-6 sm:gap-10">
      {/* Figma 1277:11187 Header: Back + Title + Standing Order + Request Dropdown */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={handleBackNavigation}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer -ml-1"
            title="Back"
            aria-label="Back to Accounts"
          >
            <ChevronLeft size={22} strokeWidth={1.8} />
          </button>
          <h1 className="text-[22px] sm:text-[26px] font-medium leading-[30px] sm:leading-[32px] tracking-[-0.02em] text-foreground truncate">
            {account.name}
          </h1>
          {account.isJoint && (
            <span
              title={account.mandate ? `Mandate: ${account.mandate}` : "Joint Account"}
              className="inline-flex items-center rounded-full bg-[#FEF3D6] px-2.5 py-0.5 text-[11px] font-medium text-[#B27B00] dark:bg-amber-500/20 dark:text-amber-300 shrink-0"
            >
              Joint
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 pl-9 sm:pl-0">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            className="rounded-lg h-8 px-3 text-[13px] font-medium border-border/80 bg-white dark:bg-card shadow-xs hover:bg-muted/50"
            render={<Link href="/payments?tab=standing-orders" />}
          >
            <Plus size={14} strokeWidth={2} aria-hidden="true" />
            Standing Order
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg h-8 px-3 text-[13px] font-medium border-border/80 bg-white dark:bg-card shadow-xs hover:bg-muted/50"
                >
                  Request
                  <ChevronDown size={14} strokeWidth={2} className="text-muted-foreground ml-0.5" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                render={
                  <Link href={`/accounts/${account.id}/statement`} className="flex items-center gap-2 w-full">
                    <FileText size={14} className="text-muted-foreground" />
                    <span>Statement</span>
                  </Link>
                }
              />
              <DropdownMenuItem
                render={
                  <Link href="/requests/cheque-book" className="flex items-center gap-2 w-full">
                    <span>Cheque Book</span>
                  </Link>
                }
              />
              <DropdownMenuItem
                render={
                  <Link href="/requests/reference-letter" className="flex items-center gap-2 w-full">
                    <span>Reference Letter</span>
                  </Link>
                }
              />
              <DropdownMenuItem
                render={
                  <Link href="/requests/card" className="flex items-center gap-2 w-full">
                    <span>Link New Card</span>
                  </Link>
                }
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {state === "loading" && (
        <div className="rounded-2xl border border-border bg-card">
          <ListSkeleton rows={5} columns={4} />
        </div>
      )}

      {state === "error" && (
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-card px-5 py-4">
          <AlertCircle size={17} strokeWidth={1.8} aria-hidden="true" className="mt-px shrink-0 text-destructive" />
          <div>
            <p className="text-[14px] text-foreground font-medium">Couldn&apos;t load this account</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              The balance shown may be out of date. Try again in a moment.
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setState("populated")}>
              Retry
            </Button>
          </div>
        </div>
      )}

      {state === "empty" && (
        <>
          <AccountHeroGrid
            account={account}
            holderName={holderName}
            onOpenFund={() => setIsFundModalOpen(true)}
          />
          <div className="rounded-2xl border border-border bg-card px-6 py-14 text-center">
            <p className="text-[15px] font-medium text-foreground">No activity on this account yet</p>
            <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
              Transactions will appear here once money moves in or out.
            </p>
          </div>
        </>
      )}

      {state === "populated" && (
        <>
          {/* 2-Card Hero Grid */}
          <AccountHeroGrid
            account={account}
            holderName={holderName}
            onOpenFund={() => setIsFundModalOpen(true)}
          />

          {/* Linked Cards Section */}
          {linkedCards.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[17px] font-medium text-foreground tracking-[-0.01em]">Linked Cards</h2>
                <Link
                  href="/cards"
                  className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Manage cards
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {linkedCards.map((c) => (
                  <Link
                    key={c.id}
                    href={`/cards/${c.id}`}
                    className="group flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-border/80 bg-card hover:bg-muted/30 transition-all shadow-xs"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <MiniCardThumbnail card={c} />
                      <div className="flex flex-col min-w-0">
                        <span className="truncate text-[13.5px] font-medium text-foreground">
                          {c.name}
                        </span>
                        <span className="text-[11.5px] text-muted-foreground tabular mt-0.5">
                          {c.type} · {c.maskedNumber}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={15} className="text-muted-foreground/60 group-hover:text-foreground transition-transform group-hover:translate-x-0.5 shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Activity Section matching Figma 1:1 */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[18px] font-medium text-foreground tracking-[-0.01em]">Activity</h2>
              <Link
                href="/transactions"
                className="text-[13.5px] text-muted-foreground hover:text-foreground transition-colors"
              >
                View all
              </Link>
            </div>

            <div className="rounded-2xl border border-border/80 bg-card overflow-hidden divide-y divide-border/40 shadow-xs">
              {recentTransactions.length === 0 ? (
                <div className="px-6 py-12 text-center text-[13.5px] text-muted-foreground">
                  No activity on this account yet.
                </div>
              ) : (
                recentTransactions.map((t) => {
                  const isCredit = t.direction === "credit";
                  const isFailed = t.state.startsWith("failed") || t.state === "reversed" || t.state === "disputed";
                  const isPending = t.state === "pending" || t.state === "awaiting-approval";

                  return (
                    <Link
                      key={t.id}
                      href={`/transactions/${t.id}`}
                      className="flex items-center gap-3.5 px-4 py-3 transition-colors hover:bg-muted/30"
                    >
                      {/* Direction Anchor Icon */}
                      <div
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-full transition-colors",
                          isCredit
                            ? "bg-emerald-500/10 text-[#12B76A] dark:text-emerald-400"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {isCredit ? (
                          <ArrowDownLeft className="size-4 stroke-[1.8]" />
                        ) : (
                          <ArrowUpRight className="size-4 stroke-[1.8]" />
                        )}
                      </div>

                      {/* Counterparty & Metadata */}
                      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                        <span className="font-normal text-foreground text-[14px] leading-tight truncate">
                          {t.counterparty || t.description}
                        </span>
                        <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground truncate">
                          <span>{formatDate(t.date)}</span>
                          <span>·</span>
                          <span className="truncate">{t.category || t.paymentMethod || "Payment"}</span>
                        </div>
                      </div>

                      {/* Amount & State / Reference */}
                      <div className="shrink-0 flex flex-col items-end gap-0.5">
                        <span
                          className={cn(
                            "tabular text-[14px] font-normal",
                            isCredit ? "text-[#12B76A] dark:text-emerald-400" : "text-foreground"
                          )}
                        >
                          {isCredit ? "+ " : "− "}
                          <RevealingAmount amount={t.amount} currency={t.currency} />
                        </span>
                        {isFailed ? (
                          <span className="text-[11.5px] text-[#F04438] dark:text-rose-400 font-normal">
                            Failed
                          </span>
                        ) : isPending ? (
                          <span className="text-[11.5px] text-[#F79009] dark:text-amber-400 font-normal">
                            Pending
                          </span>
                        ) : (
                          <span className="text-[11.5px] text-muted-foreground">
                            {t.reference}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* Discrete StateSwitcher at bottom for testing */}
      <div className="pt-2 opacity-40 hover:opacity-100 transition-opacity">
        <StateSwitcher section="13.9 baseline" states={BASELINE} value={state} onChange={setState} />
      </div>

      {/* Fund Account Modal */}
      <LinkSourceAccountModal
        isOpen={isFundModalOpen}
        onClose={() => setIsFundModalOpen(false)}
      />
    </div>
  );
}

interface AccountHeroGridProps {
  account: NonNullable<ReturnType<typeof findAccount>>;
  holderName: string;
  onOpenFund: () => void;
}

function AccountHeroGrid({ account, holderName, onOpenFund }: AccountHeroGridProps) {
  const [showFullAccountNum, setShowFullAccountNum] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const swiftCode = "GHCBGHAC";

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((curr) => (curr === key ? null : curr));
    }, 2000);
  };

  const formattedAccountNum = account.number;
  const maskedAccountNum = formattedAccountNum.replace(/\d(?=.*\d{4})/g, "•");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full items-stretch">
      {/* Left Hero Card - Balance, Actions & Account Details */}
      <div className="lg:col-span-7 flex flex-col justify-between rounded-2xl border border-border/80 bg-[#f6f6f5] dark:bg-card/70 p-5 sm:p-6 shadow-2xs min-h-[220px] gap-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-normal text-muted-foreground">Available balance</span>
              {account.status === "Dormant" && (
                <Badge variant="warning" className="text-[10px] px-2 py-0">
                  Dormant
                </Badge>
              )}
            </div>
            <div className="text-[32px] sm:text-[36px] font-normal tracking-[-0.03em] text-foreground tabular leading-none">
              <RevealingAmount amount={account.available} currency={account.currency} />
            </div>
          </div>

          {/* Action buttons directly underneath the amount */}
          <div className="flex items-center gap-2.5 pt-0.5">
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              className="bg-white dark:bg-card border-border/80 text-[13px] font-medium h-9 px-4 rounded-xl shadow-2xs hover:bg-muted/60 transition-colors"
              render={<Link href="/payments" />}
            >
              <Send size={13} className="text-muted-foreground mr-1.5" />
              Pay
            </Button>
            <Button
              size="sm"
              onClick={onOpenFund}
              className="bg-primary hover:bg-primary-hover text-primary-foreground font-medium h-9 px-4 rounded-xl shadow-2xs active:scale-[0.98] transition-all cursor-pointer text-[13px] whitespace-nowrap"
            >
              <ArrowDownLeft size={14} className="text-primary-foreground mr-1.5 shrink-0" />
              Fund Account
            </Button>
          </div>
        </div>

        {/* Bottom Metadata Grid: Type, Currency, Status, Mandate */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 sm:pt-5 border-t border-border/50">
          <div className="flex flex-col gap-0.5">
            <span className="text-[12px] text-muted-foreground">Type</span>
            <span className="text-[14px] sm:text-[15px] font-normal text-foreground">{account.type}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[12px] text-muted-foreground">Currency</span>
            <span className="text-[14px] sm:text-[15px] font-normal text-foreground">{account.currency}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[12px] text-muted-foreground">Status</span>
            <span className="text-[14px] sm:text-[15px] font-normal text-foreground">{account.status}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[12px] text-muted-foreground">Mandate</span>
            <span className="text-[14px] sm:text-[15px] font-normal text-foreground">
              {account.mandate || (account.isJoint ? "Both to sign" : "Single authority")}
            </span>
          </div>
        </div>
      </div>

      {/* Right Hero Card - Account Identifiers & SWIFT Details */}
      <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-2xs min-h-[220px]">
        {/* Section title matching Figma 1277:11364 */}
        <div className="text-[12px] text-muted-foreground font-normal mb-1">
          Details
        </div>

        {/* Account Number */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span className="text-[12px]">Account number</span>
            <button
              type="button"
              onClick={() => setShowFullAccountNum((v) => !v)}
              className="hover:text-foreground transition-colors p-0.5 rounded text-muted-foreground cursor-pointer"
              title={showFullAccountNum ? "Mask account number" : "Reveal account number"}
              aria-label={showFullAccountNum ? "Mask account number" : "Reveal account number"}
            >
              {showFullAccountNum ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-mono tabular text-foreground font-normal">
              {showFullAccountNum ? formattedAccountNum : maskedAccountNum}
            </span>
            <button
              type="button"
              onClick={() => handleCopy("accountNumber", account.number.replace(/\s+/g, ""))}
              className="text-muted-foreground hover:text-foreground p-1 transition-colors rounded hover:bg-muted cursor-pointer"
              title="Copy account number"
              aria-label="Copy account number"
            >
              {copiedKey === "accountNumber" ? (
                <Check size={13} className="text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Copy size={13} />
              )}
            </button>
          </div>
        </div>

        {/* Account Holder */}
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-muted-foreground">Account holder</span>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[15px] font-normal text-foreground truncate max-w-[190px] sm:max-w-[220px] uppercase text-right">
              {holderName}
            </span>
            <button
              type="button"
              onClick={() => handleCopy("holderName", holderName)}
              className="text-muted-foreground hover:text-foreground p-1 transition-colors rounded hover:bg-muted shrink-0 cursor-pointer"
              title="Copy account holder name"
              aria-label="Copy account holder name"
            >
              {copiedKey === "holderName" ? (
                <Check size={13} className="text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Copy size={13} />
              )}
            </button>
          </div>
        </div>

        {/* SWIFT Code */}
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-muted-foreground uppercase tracking-wider">SWIFT Code</span>
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-mono tabular text-foreground font-normal uppercase">
              {swiftCode}
            </span>
            <button
              type="button"
              onClick={() => handleCopy("swift", swiftCode)}
              className="text-muted-foreground hover:text-foreground p-1 transition-colors rounded hover:bg-muted cursor-pointer"
              title="Copy SWIFT code"
              aria-label="Copy SWIFT code"
            >
              {copiedKey === "swift" ? (
                <Check size={13} className="text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Copy size={13} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

