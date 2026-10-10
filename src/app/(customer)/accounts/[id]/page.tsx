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

import { use, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
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
import type { DevStateGroup } from "@/components/providers/DevStateProvider";
import { SHOW_DEMO_TOOLS } from "@/lib/demo-tools";
import { ListErrorState, TrueEmptyState } from "@/components/states/ListStates";
import type { BaselineState } from "@/lib/states";
import { findAccount, formatDate, formatMoney, transactionsForAccount, type Account, type Transaction } from "@/lib/mock-data";
import { useSession } from "@/lib/session-store";
import { accountHolderName } from "@/lib/account-holder";
import { useCustomerAccounts } from "@/lib/use-customer-accounts";
import { useAccountPrefs } from "@/lib/accounts-store";
import { useAmountVisibility, RevealingAmount } from "@/components/providers/AmountVisibilityProvider";
import LinkSourceAccountModal, { type ModalScreen } from "@/components/dashboard/LinkSourceAccountModal";
import { useCardLinkReturn } from "@/lib/card-link";
import { useCardPaymentReturn } from "@/lib/card-payment";
import PageHeader from "@/components/layout/PageHeader";
import { ActionTile } from "@/components/ui/action-tile";
import { RoundAction } from "@/components/ui/round-action";
import { ToggleTile } from "@/components/ui/toggle-tile";
import { ShareDetailsDialog } from "@/components/accounts/ShareDetailsDialog";
import { AccountDetailBody } from "@/components/states/PageSkeletons";

const BASELINE: readonly BaselineState[] = ["loading", "empty", "populated", "error"] as const;
const MINI_STATEMENT_SIZE = 10;

/* Dev Mode: each group overrides one thing on the account being shown. "real" leaves it as the data has it. */
type DevStatus = "real" | "Active" | "Dormant";
type DevOwnership = "real" | "sole" | "joint-either" | "joint-both";
type DevDefault = "real" | "default" | "not-default";
type DevBalance = "real" | "zero" | "low";

const DEV_STATUS: { id: DevStatus; label: string }[] = [
  { id: "real", label: "As is" },
  { id: "Active", label: "Active" },
  { id: "Dormant", label: "Dormant" },
];
const DEV_OWNERSHIP: { id: DevOwnership; label: string }[] = [
  { id: "real", label: "As is" },
  { id: "sole", label: "Sole holder" },
  { id: "joint-either", label: "Joint, either to sign" },
  { id: "joint-both", label: "Joint, both to sign" },
];
const DEV_DEFAULT: { id: DevDefault; label: string }[] = [
  { id: "real", label: "As is" },
  { id: "default", label: "Default account" },
  { id: "not-default", label: "Not the default" },
];
const DEV_BALANCE: { id: DevBalance; label: string }[] = [
  { id: "real", label: "As is" },
  { id: "zero", label: "Zero balance" },
  { id: "low", label: "Low balance (GHS 12.40)" },
];

export default function AccountDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const activeProfile = useSession((s) => s.activeProfile);
  const actor = useSession((s) => s.actor);
  // Default and reactivation live here, not in an Accounts row menu — both are
  // rare, and the list rows stay one-tap-one-destination.
  const { accounts: customerAccounts, defaultId } = useCustomerAccounts();
  // The customer's own copy first: it carries a wallet balance that moved in.
  const realAccount = customerAccounts.find((a) => a.id === id) ?? findAccount(id);
  const setDefaultAccount = useAccountPrefs((s) => s.setDefaultAccount);
  const [state, setState] = useState<BaselineState>("populated");
  const [devStatus, setDevStatus] = useState<DevStatus>("real");
  const [devOwnership, setDevOwnership] = useState<DevOwnership>("real");
  const [devDefault, setDevDefault] = useState<DevDefault>("real");
  const [devBalance, setDevBalance] = useState<DevBalance>("real");
  const devGroups = useMemo<DevStateGroup[] | undefined>(
    () =>
      SHOW_DEMO_TOOLS
        ? [
            { label: "Account status", states: DEV_STATUS, value: devStatus, onChange: (v) => setDevStatus(v as DevStatus) },
            { label: "Ownership", states: DEV_OWNERSHIP, value: devOwnership, onChange: (v) => setDevOwnership(v as DevOwnership) },
            { label: "Default", states: DEV_DEFAULT, value: devDefault, onChange: (v) => setDevDefault(v as DevDefault) },
            { label: "Balance", states: DEV_BALANCE, value: devBalance, onChange: (v) => setDevBalance(v as DevBalance) },
          ]
        : undefined,
    [devStatus, devOwnership, devDefault, devBalance],
  );
  const account = useMemo<Account | undefined>(() => {
    if (!realAccount) return realAccount;
    const next: Account = { ...realAccount };
    if (devStatus !== "real") next.status = devStatus;
    if (devOwnership === "sole") {
      next.isJoint = false;
      next.mandate = undefined;
    } else if (devOwnership !== "real") {
      next.isJoint = true;
      next.mandate = devOwnership === "joint-both" ? "Both to sign" : "Either to sign";
    }
    if (devBalance === "zero") {
      next.balance = 0;
      next.available = 0;
    } else if (devBalance === "low") {
      next.balance = 12.4;
      next.available = 12.4;
    }
    return next;
  }, [realAccount, devStatus, devOwnership, devBalance]);
  const [fundOpen, setFundOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [recentOpen, setRecentOpen] = useState(false);
  const [fundResume, setFundResume] = useState<{
    screen: ModalScreen;
    sourceId?: string;
    amount?: string;
    destinationId?: string;
  } | null>(null);

  // Back from the bank's 3-D Secure page after adding money from a linked card: the receipt, or the form again.
  useCardPaymentReturn("linked-source-fund", ({ status, payment }) => {
    const ctx = payment.context ?? {};
    setFundResume({
      screen: status === "approved" ? "funding_success" : "linked_source_select",
      sourceId: ctx.sourceId,
      amount: ctx.amount,
      destinationId: ctx.destinationId,
    });
    setFundOpen(true);
    if (status !== "approved") {
      toast("Payment not completed", { description: "Your bank didn’t approve it, so nothing was taken. You can try again." });
    }
  });

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
      <div className="mx-auto flex w-full max-w-[440px] flex-col gap-3">
        <PageHeader title="Account Not Found" backTo={{ href: "/accounts", label: "My Accounts" }} />
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
  const choosable =
    devDefault !== "real"
      ? !dormant
      : !dormant && customerAccounts.length > 1 && customerAccounts.some((a) => a.id === account.id);
  const isDefault = choosable && (devDefault === "real" ? account.id === defaultId : devDefault === "default");
  const canBeDefault = choosable && !isDefault;

  return (
    <div className="mx-auto flex w-full max-w-[440px] flex-col gap-10 sm:gap-12 lg:max-w-[1000px]">
      <PageHeader
        title={account.name}
        backTo={{ href: "/accounts", label: "My Accounts" }}
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

      {state === "loading" && <AccountDetailBody />}

      {state === "error" && (
        <div className="rounded-2xl border border-border bg-card">
          <ListErrorState
            onRetry={() => setState("populated")}
            description="We couldn't load this account. Your money hasn't moved — try again."
          />
        </div>
      )}

      {(state === "populated" || state === "empty") && (
        // Two columns from lg: the card and its two actions on the left, the options on the right. One column below.
        <div className="grid w-full gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start lg:gap-6">
          <div className="flex flex-col gap-6 lg:mx-auto lg:w-[78%]">
            <BalanceCard account={account} isDefault={isDefault} />
            <div className="flex w-full items-start justify-evenly">
              <RoundAction icon={Plus} label="Top Up" onClick={() => setFundOpen(true)} />
              <RoundAction icon={Share} label="Share Details" onClick={() => setShareOpen(true)} />
            </div>
          </div>

          {/* Most used first: what happened, then what to set up or ask for, then the one setting. Even spacing throughout. */}
          <nav aria-label="Account options" className="flex flex-col gap-4">
            <div className="flex flex-col gap-4">
              <ActionTile onClick={() => setRecentOpen(true)} icon={ArrowLeftRight} title="Last 10 Transactions" />
              <ActionTile href={`/accounts/${account.id}/expenses`} icon={PieChart} title="My Spends" />
            </div>
            <div className="flex flex-col gap-4">
              <ActionTile href="/payments/standing" icon={Repeat} title="Standing Orders" />
              <ActionTile
                href={`/accounts/${account.id}/requests`}
                icon={Files}
                title="Place a Request"
                description="Statements, cheque books, bank letters"
              />
            </div>
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
        </div>
      )}

      <div className="pt-2 opacity-40 transition-opacity hover:opacity-100">
        <StateSwitcher section="13.9 baseline" label="Screen state" states={BASELINE} value={state} onChange={setState} groups={devGroups} />
      </div>

      <LinkSourceAccountModal
        isOpen={fundOpen}
        onClose={() => {
          setFundOpen(false);
          setFundResume(null);
        }}
        initialScreen={fundResume?.screen}
        initialSourceId={fundResume?.sourceId}
        initialAmount={fundResume?.amount}
        initialDestinationId={fundResume?.destinationId}
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
  // Type and currency are already on the card, and "Active" is the expected state: only a status that needs attention is said.
  const needsAttention = account.status !== "Active";

  return (
    <section
      aria-label="Balance"
      className="relative flex min-h-[220px] flex-col justify-between gap-10 overflow-hidden rounded-xl border border-border bg-[var(--account-card)] p-6"
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

      {isDefault && <Badge variant="brand" className="absolute right-6 top-6">Default</Badge>}

      <div className="relative flex flex-col gap-2 text-[14px] leading-5 tracking-[-0.005em] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Landmark size={15} strokeWidth={1.8} aria-hidden="true" />
          {account.type}
          {needsAttention && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-warning-text">{account.status}</span>
            </>
          )}
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
          className="-ml-1 flex size-10 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-background/60 cursor-pointer"
          aria-label={showAmounts ? "Hide balance" : "Show balance"}
          aria-pressed={!showAmounts}
          title={showAmounts ? "Hide balance" : "Show balance"}
        >
          {showAmounts ? <Eye size={18} strokeWidth={1.8} /> : <EyeOff size={18} strokeWidth={1.8} />}
        </button>
      </div>
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
        className="flex items-center gap-4 rounded-xl px-3 py-3.5 sm:py-4 transition-colors hover:bg-tile-hover sm:px-4"
      >
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full",
            isCredit ? "bg-pill-success text-success" : "bg-tile text-muted-foreground",
          )}
        >
          {isCredit ? <ArrowDownLeft size={16} strokeWidth={2} /> : <ArrowUpRight size={16} strokeWidth={2} />}
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
            {formatMoney(t.amount, t.currency, true)}
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
            <TrueEmptyState illustration="empty-activity"
              title="No activity on this account yet"
              description="Money in and out of this account will show here."
            />
          ) : (
            <ul className="-mx-2 flex flex-col gap-0.5">
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

