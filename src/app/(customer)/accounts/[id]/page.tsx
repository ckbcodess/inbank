"use client";

/**
 * Account Details — object destination, reached only from the Accounts list
 * (12.4). State model: baseline per 13.9 (object-detail-derived).
 * Layout: Figma 1896:15266.
 *
 * One calm column:
 *  1. Balance card — type, number, balance (with its own eye, the same switch
 *     as the header eye) and Type / Currency / Status.
 *  2. Two actions: Top up (the Add money modal) and Share details.
 *  3. Four doors: My Spends, Standing orders, Place a request (statements,
 *     cheque books, bank letters — its own flow) and Last 10 transactions
 *     (a mini statement in a dialog, with "View All Transactions" — the
 *     transactions list filtered to this account — one tap further).
 */

import { use, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Check,
  Copy,
  Eye,
  EyeOff,
  Files,
  Landmark,
  PieChart,
  Plus,
  Repeat,
  Share,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import { ListErrorState, ListSkeleton, TrueEmptyState } from "@/components/states/ListStates";
import type { BaselineState } from "@/lib/states";
import { findAccount, formatDate, transactionsForAccount, type Account, type Transaction } from "@/lib/mock-data";
import { useSession } from "@/lib/session-store";
import { accountHolderName } from "@/lib/account-holder";
import { useCustomerAccounts } from "@/lib/use-customer-accounts";
import { useAccountPrefs } from "@/lib/accounts-store";
import { useAmountVisibility, RevealingAmount } from "@/components/providers/AmountVisibilityProvider";
import LinkSourceAccountModal, { type ModalScreen } from "@/components/dashboard/LinkSourceAccountModal";
import { useCardLinkReturn } from "@/lib/card-link";
import PageHeader from "@/components/layout/PageHeader";
import { ActionTile } from "@/components/ui/action-tile";
import { ToggleTile } from "@/components/ui/toggle-tile";

const BASELINE: readonly BaselineState[] = ["loading", "empty", "populated", "error"] as const;
const SWIFT_CODE = "GHCBGHAC";
const MINI_STATEMENT_SIZE = 10;

/** "1243 5456 6233" — easier to read out and to check against a payslip. */
function groupDigits(number: string): string {
  const digits = number.replace(/\s+/g, "");
  return /^\d+$/.test(digits) ? digits.replace(/(\d{4})(?=\d)/g, "$1 ") : number;
}

export default function AccountDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const activeProfile = useSession((s) => s.activeProfile);
  const actor = useSession((s) => s.actor);
  // Default and reactivation live here, not in an Accounts row menu — both are
  // rare, and the list rows stay one-tap-one-destination.
  const { accounts: customerAccounts, defaultId } = useCustomerAccounts();
  // The customer's own copy first: it carries a wallet balance that moved in.
  const account = customerAccounts.find((a) => a.id === id) ?? findAccount(id);
  const setDefaultAccount = useAccountPrefs((s) => s.setDefaultAccount);
  const [state, setState] = useState<BaselineState>("populated");
  const [fundOpen, setFundOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [recentOpen, setRecentOpen] = useState(false);
  const [fundResume, setFundResume] = useState<{ screen: ModalScreen; sourceId?: string } | null>(null);

  // Back from the bank's card page (Add money → new card): reopen with the card.
  useCardLinkReturn((result) => {
    if (result.status === "linked") {
      toast.success(`${result.source.title} linked`, { description: "It's selected — choose an amount to add." });
      setFundResume({ screen: "linked_source_select", sourceId: result.source.id });
      setFundOpen(true);
      return;
    }
    toast("Card not linked", {
      description: "Nothing was saved. You can try again whenever you're ready.",
      action: {
        label: "Try again",
        onClick: () => {
          setFundResume({ screen: "link_new_card" });
          setFundOpen(true);
        },
      },
    });
  });

  if (!account) {
    return (
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-3">
        <PageHeader title="Account not found" backTo={{ href: "/accounts", label: "Accounts" }} />
        <p className="pl-11 text-[13px] text-muted-foreground">
          This account isn&apos;t available under the current banking relationship.
        </p>
      </div>
    );
  }

  const recent = state === "empty" ? [] : transactionsForAccount(account.id).slice(0, MINI_STATEMENT_SIZE);
  const holderName = accountHolderName(account, activeProfile, actor);
  const dormant = account.status === "Dormant";
  // "Default" only means something when there's more than one account to pick from,
  // and a dormant account can't be one.
  const choosable = !dormant && customerAccounts.length > 1 && customerAccounts.some((a) => a.id === account.id);
  const isDefault = choosable && account.id === defaultId;
  const canBeDefault = choosable && !isDefault;

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-10 sm:gap-12">
      <PageHeader
        title={account.name}
        backTo={{ href: "/accounts", label: "Accounts" }}
        badge={
          account.isJoint ? (
            <Badge variant="outline" title={account.mandate ? `Mandate: ${account.mandate}` : undefined}>
              Joint
            </Badge>
          ) : null
        }
        actions={
          dormant ? (
            <HeaderPill
              onClick={() =>
                toast.success("Reactivation requested", {
                  description: `We'll let you know when ${account.name} is active again.`,
                })
              }
            >
              Reactivate
            </HeaderPill>
          ) : undefined
        }
      />

      {state === "loading" && <ListSkeleton rows={5} columns={3} />}

      {state === "error" && (
        <div className="rounded-2xl border border-border bg-card">
          <ListErrorState
            onRetry={() => setState("populated")}
            description="We couldn't load this account. Your money hasn't moved — try again."
          />
        </div>
      )}

      {(state === "populated" || state === "empty") && (
        <>
          <div className="flex flex-col gap-6">
            <BalanceCard account={account} isDefault={isDefault} />
            <div className="flex gap-4 sm:gap-6">
              <Button onClick={() => setFundOpen(true)} className="h-11 flex-1 gap-2 rounded-lg text-[14px] drop-shadow-sm">
                <Plus size={18} strokeWidth={1.9} aria-hidden="true" />
                Top up
              </Button>
              <Button
                variant="outline"
                onClick={() => setShareOpen(true)}
                className="h-11 flex-1 gap-2 rounded-lg bg-card text-[14px]"
              >
                <Share size={17} strokeWidth={1.8} aria-hidden="true" />
                Share details
              </Button>
            </div>
          </div>

          <nav aria-label="Account options" className="flex flex-col gap-4">
            <ActionTile href={`/accounts/${account.id}/expenses`} icon={PieChart} title="My Spends" />
            <ActionTile onClick={() => setRecentOpen(true)} icon={ArrowLeftRight} title="Last 10 Transactions" />
            <ActionTile href="/payments/standing" icon={Repeat} title="Standing Orders" />
            <ActionTile
              href={`/accounts/${account.id}/requests`}
              icon={Files}
              title="Place a Request"
              description="Statements, cheque books, bank letters"
            />
            {/* The card's badge shows which account is the default; this is only the way to make it one. */}
            {canBeDefault && (
              <ToggleTile
                variant="row"
                title="Set as Default"
                checked={false}
                onCheckedChange={() => {
                  setDefaultAccount(account.id);
                  toast.success(`${account.name} is now your default`);
                }}
              />
            )}
          </nav>
        </>
      )}

      <div className="pt-2 opacity-40 transition-opacity hover:opacity-100">
        <StateSwitcher section="13.9 baseline" states={BASELINE} value={state} onChange={setState} />
      </div>

      <LinkSourceAccountModal
        isOpen={fundOpen}
        onClose={() => {
          setFundOpen(false);
          setFundResume(null);
        }}
        initialScreen={fundResume?.screen}
        initialSourceId={fundResume?.sourceId}
        targetAccount={account}
      />
      <ShareDetailsDialog open={shareOpen} onOpenChange={setShareOpen} account={account} holderName={holderName} />
      <RecentTransactionsDialog open={recentOpen} onOpenChange={setRecentOpen} account={account} transactions={recent} />
    </div>
  );
}

/* ── Header action ─────────────────────────────────────────────────────────── */

/** The quiet header pill Send & Pay uses for "Standing Orders". */
function HeaderPill({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 shrink-0 cursor-pointer items-center rounded-[8px] bg-muted px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-muted/80"
    >
      {children}
    </button>
  );
}

/* ── Balance card ──────────────────────────────────────────────────────────── */

function BalanceCard({ account, isDefault }: { account: Account; isDefault: boolean }) {
  const { showAmounts, toggleAmountVisibility } = useAmountVisibility();
  const facts: [string, string][] = [
    ["Type", account.type],
    ["Currency", account.currency],
    ["Status", account.status],
  ];

  return (
    <section
      aria-label="Balance"
      className="relative flex min-h-[248px] flex-col justify-between gap-6 overflow-hidden rounded-xl border border-border bg-[var(--account-card)] p-6"
    >
      {/* Decorative dot map (Figma 1896:15434) */}
      <Image
        src="/images/figma/account-card-pattern.svg"
        unoptimized
        alt=""
        aria-hidden="true"
        width={430.279}
        height={343.429}
        className="pointer-events-none absolute -right-[207.7px] top-[8.68px] h-[343.429px] w-[430.279px] max-w-none select-none dark:opacity-40"
      />

      {isDefault && <Badge className="absolute right-6 top-6">Default</Badge>}

      <div className="relative flex flex-col gap-2 text-[14px] leading-5 tracking-[-0.005em] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Landmark size={15} strokeWidth={1.8} aria-hidden="true" />
          {account.type}
        </span>
        <span className="tabular">{account.number.replace(/\s+/g, "")}</span>
      </div>

      <div className="relative flex items-center gap-2">
        <RevealingAmount
          amount={account.available}
          currency={account.currency}
          className="text-[30px] leading-[1.25] tracking-[-0.015em] text-foreground tabular sm:text-[36px]"
        />
        {/* Same switch as the header eye — one control, not two. */}
        <button
          type="button"
          onClick={toggleAmountVisibility}
          className="rounded-md p-1 text-foreground transition-colors hover:bg-background/60 cursor-pointer"
          aria-label={showAmounts ? "Hide balance" : "Show balance"}
          aria-pressed={!showAmounts}
          title={showAmounts ? "Hide balance" : "Show balance"}
        >
          {showAmounts ? <Eye size={18} strokeWidth={1.8} /> : <EyeOff size={18} strokeWidth={1.8} />}
        </button>
      </div>

      <dl className="relative flex gap-8">
        {facts.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-2">
            <dt className="text-[12px] leading-5 text-muted-foreground">{label}</dt>
            <dd
              className={cn(
                "text-[16px] leading-6 tracking-[-0.005em]",
                label === "Status" && value !== "Active" ? "text-warning" : "text-foreground",
              )}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ── Last 10 transactions ──────────────────────────────────────────────────── */

function ActivityRow({ t }: { t: Transaction }) {
  const isCredit = t.direction === "credit";
  const isFailed = t.state.startsWith("failed") || t.state === "reversed" || t.state === "disputed";
  const isPending = t.state === "pending" || t.state === "awaiting-approval";

  return (
    <li>
      <Link
        href={`/transactions/${t.id}`}
        className="flex items-center gap-3.5 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/50"
      >
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full",
            isCredit ? "bg-success/10 text-success" : "bg-muted text-muted-foreground",
          )}
        >
          {isCredit ? <ArrowDownLeft size={16} strokeWidth={1.8} /> : <ArrowUpRight size={16} strokeWidth={1.8} />}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[14px] text-foreground">{t.counterparty || t.description}</span>
          <span className="truncate text-[12px] text-muted-foreground">
            <span className="tabular">{formatDate(t.date)}</span> · {t.category || t.paymentMethod || "Payment"}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-0.5">
          <span className={cn("text-[14px] tabular", isCredit ? "text-success" : "text-foreground")}>
            {isCredit ? "+ " : "− "}
            <RevealingAmount amount={t.amount} currency={t.currency} />
          </span>
          {isFailed ? (
            <span className="text-[11.5px] text-destructive">Failed</span>
          ) : isPending ? (
            <span className="text-[11.5px] text-warning">Pending</span>
          ) : null}
        </span>
      </Link>
    </li>
  );
}

/** A mini statement: the last ten movements, with this account's full transaction list one tap further. */
function RecentTransactionsDialog({
  open,
  onOpenChange,
  account,
  transactions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: Account;
  transactions: Transaction[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Last 10 Transactions</DialogTitle>
        </DialogHeader>
        <DialogBody>
          {transactions.length === 0 ? (
            <TrueEmptyState
              title="No activity on this account yet"
              description="Money in and out of this account will show here."
            />
          ) : (
            <ul className="-mx-2 flex flex-col">
              {transactions.map((t) => (
                <ActivityRow key={t.id} t={t} />
              ))}
            </ul>
          )}
        </DialogBody>
        <DialogFooter>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/transactions?account=${account.id}`} />}
            className="h-10 w-full rounded-lg text-[13.5px]"
          >
            View All Transactions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Share account details ─────────────────────────────────────────────────── */

function ShareDetailsDialog({
  open,
  onOpenChange,
  account,
  holderName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: Account;
  holderName: string;
}) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const rows: { key: string; label: string; value: string; copy?: string }[] = [
    { key: "holder", label: "Account holder", value: holderName },
    { key: "number", label: "Account number", value: groupDigits(account.number), copy: account.number.replace(/\s+/g, "") },
    { key: "bank", label: "Bank", value: "GCB Bank PLC" },
    { key: "swift", label: "SWIFT code", value: SWIFT_CODE },
  ];

  const copy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 2000);
  };

  const copyAll = () => {
    navigator.clipboard.writeText(rows.map((r) => `${r.label}: ${r.value}`).join("\n"));
    toast.success("Account details copied", { description: "Paste them into a message to get paid." });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Share account details</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <p className="mb-3 text-[13px] text-muted-foreground">Give these to anyone sending money to this account.</p>
          <dl className="flex flex-col divide-y divide-border/50">
            {rows.map((r) => (
              <div key={r.key} className="flex items-center justify-between gap-3 py-3">
                <dt className="text-[13px] text-muted-foreground">{r.label}</dt>
                <dd className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-[14px] text-foreground tabular">{r.value}</span>
                  <button
                    type="button"
                    onClick={() => copy(r.key, r.copy ?? r.value)}
                    className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
                    aria-label={`Copy ${r.label.toLowerCase()}`}
                  >
                    {copiedKey === r.key ? (
                      <Check size={14} strokeWidth={1.9} className="text-success" />
                    ) : (
                      <Copy size={14} strokeWidth={1.8} />
                    )}
                  </button>
                </dd>
              </div>
            ))}
          </dl>
        </DialogBody>
        <DialogFooter>
          <Button onClick={copyAll} className="h-10 w-full gap-1.5 rounded-lg text-[13.5px]">
            <Copy size={15} strokeWidth={1.8} />
            Copy all
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
