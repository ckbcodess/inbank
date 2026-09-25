"use client";

/**
 * S06 Accounts — accounts and sources of funds, kept apart.
 *
 * Two sections, never one list:
 * 1. **Your Accounts** — where money lives. Accounts aren't opened here:
 *    "Add Account" brings on one the customer already holds (selfie match to
 *    the Ghana Card → pick from the accounts in their name). The default shows
 *    as a badge; it's changed on Account Details. No balances on this list.
 * 2. **Sources of Funds** — linked MoMo wallets and cards money comes in from.
 *    We never show their balances. Remove is their only action (row menu).
 *
 * Section actions are quiet pills, not primary buttons — nothing on this page
 * outranks the list itself. Lists are the same white card as the Cards page,
 * with the shared `TileChip` in its muted `onCard` tone.
 *
 * GCB customers never see a wallet: linking a source creates one in the
 * backend, but it only passes money through to the account. Customers who
 * onboarded with MoMo or a card see the wallet as their account.
 *
 * Dev Mode toggles the customer configuration and the screen state separately.
 */

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  Landmark,
  MoreHorizontal,
  Plus,
  Smartphone,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import { ListErrorState, ListSkeleton, TrueEmptyState } from "@/components/states/ListStates";
import type { DevStateGroup } from "@/components/providers/DevStateProvider";
import { formatMoney, type Account } from "@/lib/mock-data";
import { useAccountPrefs, useLinkedSources, type LinkedSource } from "@/lib/accounts-store";
import AddAccountDialog from "@/components/accounts/AddAccountDialog";
import { useCustomerAccounts } from "@/lib/use-customer-accounts";
import PageHeader from "@/components/layout/PageHeader";
import { TileChip } from "@/components/ui/action-tile";
import {
  ACCOUNTS_SCENARIOS,
  findScenario,
  useAccountsScenario,
  type AccountsScenarioId,
} from "@/lib/accounts-scenarios";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";
import LinkSourceAccountModal from "@/components/dashboard/LinkSourceAccountModal";
import { useCardLinkReturn } from "@/lib/card-link";

type ScreenState = "populated" | "loading" | "error" | "sources-error";

const SCREEN_STATES: readonly ScreenState[] = ["populated", "loading", "error", "sources-error"] as const;
const SCREEN_STATE_LABEL: Record<ScreenState, string> = {
  populated: "Populated",
  loading: "Loading",
  error: "Accounts failed to load",
  "sources-error": "Linked sources failed to load",
};

const SCENARIO_IDS = ACCOUNTS_SCENARIOS.map((s) => s.id);
const SCENARIO_LABEL = Object.fromEntries(ACCOUNTS_SCENARIOS.map((s) => [s.id, s.label])) as Record<
  AccountsScenarioId,
  string
>;

/* ── Small pieces ─────────────────────────────────────────────────────────── */

function SectionHeading({ id, title, action }: { id: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex min-h-8 items-center justify-between gap-4 px-1">
      <h2 id={id} className="text-[16px] font-medium tracking-[-0.01em] text-foreground">
        {title}
      </h2>
      {action}
    </div>
  );
}

/** Section action: the system ghost button — no fill until hover. */
function SectionAction({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <Button type="button" variant="ghost" size="sm" onClick={onClick} className="h-8 shrink-0 gap-1.5 text-[13px]">
      <Plus size={15} strokeWidth={1.8} aria-hidden="true" />
      {children}
    </Button>
  );
}

/** Same white list card as the Cards page. */
const LIST = "overflow-hidden rounded-2xl border border-border bg-card";

function RowMenu({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={label}
        className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <MoreHorizontal size={17} strokeWidth={1.8} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AccountRow({
  account,
  isDefault,
  showDefault,
  pending,
}: {
  account: Account;
  isDefault: boolean;
  /** Only meaningful when there's more than one account to choose between. */
  showDefault: boolean;
  pending?: { amount: number; from: string };
}) {
  const isWallet = account.type === "Wallet";
  const dormant = account.status === "Dormant";
  const otherHolder = account.jointHolders?.find((h) => h !== account.jointHolders?.[0]) ?? account.jointHolders?.[0];

  return (
    <li>
      <Link
        href={`/accounts/${account.id}`}
        className="group flex items-center gap-4 px-4 py-4 transition-colors hover:bg-muted/40 sm:px-5"
      >
        <TileChip tone="onCard">
          {isWallet ? (
            <Wallet size={20} strokeWidth={1.8} aria-hidden="true" />
          ) : (
            <Landmark size={20} strokeWidth={1.8} aria-hidden="true" />
          )}
        </TileChip>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="truncate text-[15px] font-medium tracking-[-0.01em] text-foreground">{account.name}</span>
            {showDefault && isDefault && <Badge>Default</Badge>}
            {account.isJoint && <Badge variant="outline">Joint</Badge>}
            {dormant && <Badge variant="warning">Dormant</Badge>}
          </span>
          <span className="truncate text-[13px] text-muted-foreground tabular">
            {account.type} · {account.number}
            {account.isJoint && otherHolder ? ` · with ${otherHolder}` : ""}
          </span>
          {pending && (
            <span className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
              <Clock size={13} strokeWidth={1.8} className="shrink-0 text-warning" aria-hidden="true" />
              <span className="tabular">
                {formatMoney(pending.amount, "GHS", true)} from {pending.from} on its way · usually arrives within minutes
              </span>
            </span>
          )}
        </span>
        <ChevronRight
          size={20}
          strokeWidth={1.8}
          aria-hidden="true"
          className="shrink-0 text-[#737373] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-foreground dark:text-[#999999]"
        />
      </Link>
    </li>
  );
}

function SourceRow({ source, onRemove }: { source: LinkedSource; onRemove: () => void }) {
  return (
    <li className="flex items-center gap-4 py-4 pl-4 pr-2 sm:pl-5 sm:pr-3">
      <TileChip tone="onCard">
        {source.type === "momo" ? (
          <Smartphone size={20} strokeWidth={1.8} aria-hidden="true" />
        ) : (
          <CreditCard size={20} strokeWidth={1.8} aria-hidden="true" />
        )}
      </TileChip>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-[15px] font-medium tracking-[-0.01em] text-foreground">{source.title}</span>
        <span className="truncate text-[13px] text-muted-foreground tabular">{source.subtitle}</span>
      </span>
      <RowMenu label={`More actions for ${source.title}`}>
        <DropdownMenuItem onClick={onRemove} className="text-[13px]">
          Remove
        </DropdownMenuItem>
      </RowMenu>
    </li>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────── */

function AccountsContent() {
  useAmountVisibility();
  const searchParams = useSearchParams();
  const {
    accounts,
    defaultId,
    defaultAccount,
    isRetail,
    isWalletCustomer,
    ghanaCardAccountIds,
    walletMigration,
    scenario,
  } = useCustomerAccounts();
  const dismissWalletMigration = useAccountPrefs((s) => s.dismissWalletMigration);
  const setScenarioId = useAccountsScenario((s) => s.setScenarioId);

  const sources = useLinkedSources((s) => s.sources);
  const setSources = useLinkedSources((s) => s.setSources);
  const removeSource = useLinkedSources((s) => s.removeSource);
  const restoreSource = useLinkedSources((s) => s.restoreSource);

  const [screenState, setScreenState] = useState<ScreenState>("populated");
  const [linkOpen, setLinkOpen] = useState(false);
  // Opened by sign-up (not the pill) → the onboarding version of the link choice.
  const [linkOnboarding, setLinkOnboarding] = useState(false);
  const [removing, setRemoving] = useState<LinkedSource | null>(null);
  const [selfieMatch, setSelfieMatch] = useState<"match" | "no-match">("match");
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const clearAddedAccounts = useAccountPrefs((s) => s.clearAddedAccounts);
  const [migratedDismissed, setMigratedDismissed] = useState(false);

  useEffect(() => {
    // Signup lands here with ?link_source=true to link the first source.
    if (searchParams.get("link_source") === "true") {
      setLinkOnboarding(true);
      setLinkOpen(true);
    }
  }, [searchParams]);

  // Back from the bank's card page: confirm, or reopen Add money with the card.
  // Back from the bank's card page after "Link a Wallet or Card".
  useCardLinkReturn((result) => {
    if (result.status === "linked") {
      toast.success(`${result.source.title} linked`, {
        description: defaultAccount ? `Use it to top up ${defaultAccount.name} any time.` : undefined,
      });
      return;
    }
    toast("Card not linked", {
      description: "Nothing was saved. You can try again whenever you're ready.",
      action: { label: "Try again", onClick: () => setLinkOpen(true) },
    });
  });

  /* Dev Mode: customer configuration seeds linked sources; screen state is separate. */
  const applyScenario = useCallback(
    (id: string) => {
      const next = findScenario(id as AccountsScenarioId);
      setScenarioId(next.id);
      setSources(next.sources);
      clearAddedAccounts();
      setMigratedDismissed(false);
      setScreenState("populated");
    },
    [setScenarioId, setSources, clearAddedAccounts],
  );

  const devGroups = useMemo<DevStateGroup[] | undefined>(
    () =>
      isRetail
        ? [
            {
              label: "Screen state",
              states: SCREEN_STATES.map((s) => ({ id: s, label: SCREEN_STATE_LABEL[s] })),
              value: screenState,
              onChange: (v: string) => setScreenState(v as ScreenState),
            },
            {
              label: "Add Account selfie",
              states: [
                { id: "match", label: "Matches Ghana Card" },
                { id: "no-match", label: "Doesn't match" },
              ],
              value: selfieMatch,
              onChange: (v: string) => setSelfieMatch(v as "match" | "no-match"),
            },
          ]
        : undefined,
    [isRetail, screenState, selfieMatch],
  );

  // Removing stops top-ups from that source, so it asks first; Undo stays as a safety net.
  function handleRemoveSource(source: LinkedSource) {
    setRemoving(null);
    const index = sources.findIndex((s) => s.id === source.id);
    removeSource(source.id);
    toast(`${source.title} removed`, {
      description: "You can link it again any time.",
      action: { label: "Undo", onClick: () => restoreSource(source, index) },
    });
  }

  const migratedAmount = walletMigration
    ? walletMigration.dismissed
      ? null
      : walletMigration.amount
    : isRetail && scenario.migrated && !migratedDismissed
      ? scenario.migrated.amount
      : null;
  const multiple = accounts.length > 1;

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-200">
      {/* Header */}
      {/* No Add money here — every account has its own Top up on Account Details. */}
      <PageHeader title="Accounts" />

      {isRetail ? (
        <StateSwitcher
          section="S06"
          label="Customer"
          states={SCENARIO_IDS}
          value={scenario.id}
          onChange={applyScenario}
          labels={SCENARIO_LABEL}
          groups={devGroups}
        />
      ) : (
        <StateSwitcher
          section="S06"
          states={SCREEN_STATES}
          value={screenState}
          onChange={setScreenState}
          labels={SCREEN_STATE_LABEL}
        />
      )}

      {/* Just moved from wallet to a GCB account */}
      {migratedAmount !== null && defaultAccount && screenState === "populated" && (
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 sm:p-5" role="status">
          <CheckCircle2 size={18} strokeWidth={1.8} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="text-[14.5px] text-foreground">Your GCB account is ready</p>
            <p className="text-[13px] leading-relaxed text-muted-foreground tabular">
              {formatMoney(migratedAmount, "GHS", true)} moved from your wallet to {defaultAccount.name}. Your linked
              wallets and cards now top up this account.
            </p>
          </div>
          <button
            type="button"
            onClick={() => (walletMigration ? dismissWalletMigration() : setMigratedDismissed(true))}
            aria-label="Dismiss"
            className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X size={16} strokeWidth={1.8} />
          </button>
        </div>
      )}

      {/* ── Your accounts ── */}
      <section className="flex flex-col gap-3" aria-labelledby="accounts-heading">
        <SectionHeading
          id="accounts-heading"
          title={multiple ? "Your Accounts" : "Your Account"}
          action={
            isRetail && screenState !== "loading" && screenState !== "error" ? (
              <SectionAction onClick={() => setAddAccountOpen(true)}>Add Account</SectionAction>
            ) : undefined
          }
        />

        <div className={LIST}>
          {screenState === "loading" && <ListSkeleton rows={Math.max(accounts.length, 2)} columns={3} />}

          {screenState === "error" && (
            <ListErrorState
              onRetry={() => setScreenState("populated")}
              description="We couldn't load your accounts. Your money is safe — try again."
            />
          )}

          {screenState !== "loading" && screenState !== "error" && (
              <ul className="divide-y divide-border">
                {accounts.map((account) => (
                  <AccountRow
                    key={account.id}
                    account={account}
                    isDefault={account.id === defaultId}
                    showDefault={multiple}
                    pending={account.id === defaultId ? scenario.pending : undefined}
                  />
                ))}
              </ul>
          )}
        </div>
      </section>

      {/* ── Sources of funds (linked wallets & cards) ── */}
      {isRetail && screenState !== "error" && (
        <section className="flex flex-col gap-3" aria-labelledby="sources-heading">
          <SectionHeading
            id="sources-heading"
            title="Sources of Funds"
            action={
              sources.length > 0 && screenState === "populated" ? (
                <SectionAction onClick={() => setLinkOpen(true)}>Link a Wallet or Card</SectionAction>
              ) : undefined
            }
          />

          <div className={LIST}>
            {screenState === "loading" && <ListSkeleton rows={2} columns={3} />}

            {screenState === "sources-error" && (
              <ListErrorState
                onRetry={() => setScreenState("populated")}
                description="We couldn't load your linked cards and wallets. Your accounts aren't affected."
              />
            )}

            {screenState === "populated" && sources.length === 0 && (
              <TrueEmptyState
                icon={<Smartphone size={20} strokeWidth={1.7} aria-hidden="true" />}
                title="No cards or wallets linked"
                description={
                  defaultAccount
                    ? `Link mobile money or a bank card to top up ${defaultAccount.name}.`
                    : "Link mobile money or a bank card to top up your account."
                }
                action={
                  <Button size="sm" onClick={() => setLinkOpen(true)} className="gap-1.5 rounded-lg text-[13px]">
                    <Plus size={15} strokeWidth={1.9} aria-hidden="true" />
                    Link a Wallet or Card
                  </Button>
                }
              />
            )}

            {screenState === "populated" && sources.length > 0 && (
              <ul className="divide-y divide-border">
                {sources.map((source) => (
                  <SourceRow key={source.id} source={source} onRemove={() => setRemoving(source)} />
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {/* Link only — same store, so the new source appears in the list above */}
      <LinkSourceAccountModal
        key={`link-${scenario.id}`}
        mode="link"
        isOpen={linkOpen}
        onboarding={linkOnboarding}
        onClose={() => {
          setLinkOpen(false);
          setLinkOnboarding(false);
        }}
        accounts={accounts}
        onLinked={(source) =>
          toast.success(`${source.title} linked`, {
            description: defaultAccount ? `Use it to top up ${defaultAccount.name} any time.` : undefined,
          })
        }
      />

      {/* Remove a source of funds — warn first */}
      <Dialog open={removing !== null} onOpenChange={(o) => !o && setRemoving(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Remove {removing?.title}?</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} strokeWidth={1.8} aria-hidden="true" className="mt-0.5 shrink-0 text-warning" />
              <p className="text-[13.5px] leading-relaxed text-muted-foreground tabular">
                You won&apos;t be able to add money from {removing?.subtitle} until you link it again. Money already in
                your accounts isn&apos;t affected.
              </p>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRemoving(null)} className="h-10 flex-1 rounded-lg text-[13.5px]">
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => removing && handleRemoveSource(removing)}
              className="h-10 flex-1 rounded-lg text-[13.5px]"
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add an account the customer already holds — selfie, then pick one */}
      <AddAccountDialog
        key={`add-${scenario.id}`}
        open={addAccountOpen}
        onOpenChange={setAddAccountOpen}
        existingIds={accounts.map((a) => a.id)}
        ghanaCardAccountIds={ghanaCardAccountIds}
        selfieMatches={selfieMatch === "match"}
        wallet={
          isWalletCustomer && defaultAccount
            ? { balance: defaultAccount.available, sourceTitles: sources.map((src) => src.title) }
            : undefined
        }
      />
    </div>
  );
}

export default function AccountsPage() {
  return (
    <Suspense fallback={<div className="min-h-[400px] animate-pulse rounded-2xl bg-muted/20" />}>
      <AccountsContent />
    </Suspense>
  );
}
