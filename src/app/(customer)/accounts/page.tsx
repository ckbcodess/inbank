"use client";

/**
 * S06 Accounts — accounts and sources of funds, kept apart.
 *
 * Two sections, never one list:
 * 1. **My Accounts** — where money lives. Accounts aren't opened here:
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
  HandCoins,
  CheckCircle2,
  ChevronRight,
  Clock,
  Info,
  Landmark,
  MoreHorizontal,
  Plus,
  Trash2,
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
import OpenGcbAccountDialog from "@/components/accounts/OpenGcbAccountDialog";
import { useCustomerAccounts } from "@/lib/use-customer-accounts";
import PageHeader from "@/components/layout/PageHeader";
import { TileChip } from "@/components/ui/action-tile";
import { SourceMark } from "@/components/ui/source-mark";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { digitsOf, REGISTERED_WALLET, WalletTag, type OwnWallet } from "@/components/payments/flows/OwnWalletPicker";
import {
  ACCOUNTS_SCENARIOS,
  findScenario,
  useAccountsScenario,
  type AccountsScenarioId,
} from "@/lib/accounts-scenarios";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";
import LinkSourceAccountModal from "@/components/dashboard/LinkSourceAccountModal";
import { useCardLinkReturn } from "@/lib/card-link";
import { useCardPaymentReturn } from "@/lib/card-payment";
import { AccountsPageSkeleton } from "@/components/states/PageSkeletons";

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

function SectionHeading({
  id,
  title,
  hint,
  action,
}: {
  id: string;
  title: string;
  /** A short explanation of the section, shown from an info icon beside the title. */
  hint?: string;
  action?: React.ReactNode;
}) {
  const [hintOpen, setHintOpen] = useState(false);
  const iconButton =
    "-m-3 inline-flex cursor-pointer items-center justify-center rounded-full p-3 text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:text-foreground";

  return (
    <div className="flex min-h-7 items-center justify-between gap-3 px-1">
      <div className="flex items-center gap-2">
        <h2 id={id} className="text-[16px] font-medium tracking-[var(--ls-tight)] text-foreground">
          {title}
        </h2>
        {hint && (
          <>
            {/* A mouse hovers for a tooltip; a finger can't, so on a phone the same icon opens a bottom sheet. */}
            <Tooltip>
              <TooltipTrigger
                delay={0}
                render={<button type="button" aria-label={`About ${title}`} className={cn(iconButton, "max-sm:hidden")} />}
              >
                <Info size={15} strokeWidth={1.8} aria-hidden="true" />
              </TooltipTrigger>
              <TooltipContent side="bottom" align="start" className="w-64 whitespace-normal text-[12px] font-normal leading-relaxed">
                {hint}
              </TooltipContent>
            </Tooltip>
            <button
              type="button"
              aria-label={`About ${title}`}
              onClick={() => setHintOpen(true)}
              className={cn(iconButton, "sm:hidden")}
            >
              <Info size={15} strokeWidth={1.8} aria-hidden="true" />
            </button>
            <Dialog open={hintOpen} onOpenChange={setHintOpen}>
              <DialogContent size="sm" showCloseButton>
                <DialogHeader showCloseButton={false}>
                  <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <DialogBody>
                  <p className="text-[14px] leading-relaxed text-muted-foreground">{hint}</p>
                </DialogBody>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
      {action}
    </div>
  );
}

/** Section action: the system ghost button — no fill until hover. */
function SectionAction({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <Button type="button" variant="ghost" onClick={onClick} className="shrink-0">
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
        className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring"
      >
        <MoreHorizontal size={17} strokeWidth={1.8} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-45">
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
        className="group flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-item-hover sm:px-3"
      >
        <TileChip tone="onCard">
          {isWallet ? (
            <Wallet size={20} strokeWidth={1.8} aria-hidden="true" />
          ) : (
            <Landmark size={20} strokeWidth={1.8} aria-hidden="true" />
          )}
        </TileChip>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate text-[15px] font-medium tracking-[var(--ls-tight)] text-foreground">{account.name}</span>
            {showDefault && isDefault && <Badge variant="brand">Default</Badge>}
            {account.isJoint && <Badge variant="outline">Joint</Badge>}
            {dormant && <Badge variant="warning">Dormant</Badge>}
          </span>
          <span className="truncate text-[13px] text-muted-foreground tabular">
            {account.type} · {account.number}
            {account.isJoint && otherHolder ? ` · with ${otherHolder}` : ""}
          </span>
          {pending && (
            <span className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
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
          className="shrink-0 text-muted-foreground transition-transform duration-150 group-hover:text-foreground"
        />
      </Link>
    </li>
  );
}

/** The verified tick is only for the number registered with the bank; everything else the customer added is linked. */
function sourceTag(source: LinkedSource): OwnWallet["tag"] {
  return source.type === "momo" && digitsOf(source.maskedNumber) === digitsOf(REGISTERED_WALLET.phone) ? "Registered" : "Linked";
}

/** The row opens the source's details; Remove stays in the menu beside it too. */
function SourceRow({ source, onOpen, onRemove }: { source: LinkedSource; onOpen: () => void; onRemove: () => void }) {
  return (
    <li className="flex items-center rounded-xl pr-1 transition-colors hover:bg-item-hover sm:pr-2">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`View ${source.title}`}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-xl py-3 pl-2 text-left outline-none focus-visible:ring-1 focus-visible:ring-ring sm:pl-3"
      >
        <SourceMark type={source.type} operator={source.operator} title={source.title} />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-[15px] font-medium tracking-[var(--ls-tight)] text-foreground">{source.title}</span>
            <WalletTag tag={sourceTag(source)} />
          </span>
          <span className="truncate text-[13px] text-muted-foreground tabular">{source.subtitle}</span>
        </span>
      </button>
      <RowMenu label={`More actions for ${source.title}`}>
        <DropdownMenuItem onClick={onRemove} className="gap-2 text-[13px]">
          <Trash2 size={16} strokeWidth={1.8} className="shrink-0 text-muted-foreground" aria-hidden="true" />
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
  // Onboarding, step after linking: "You're almost there…" → fund now or skip.
  const [fundPrompt, setFundPrompt] = useState<LinkedSource | null>(null);
  const [fundWith, setFundWith] = useState<LinkedSource | null>(null);
  // The open flags are separate from the data, so a closing dialog keeps its content while it animates out.
  const [viewing, setViewing] = useState<LinkedSource | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  // Back from the bank's 3-D Secure page after adding money from a linked card: the receipt, or the form again.
  const [fundResume, setFundResume] = useState<{
    screen: "funding_success" | "linked_source_select";
    sourceId?: string;
    amount?: string;
    destinationId?: string;
  } | null>(null);
  useCardPaymentReturn("linked-source-fund", ({ status, payment }) => {
    const ctx = payment.context ?? {};
    setFundResume({
      screen: status === "approved" ? "funding_success" : "linked_source_select",
      sourceId: ctx.sourceId,
      amount: ctx.amount,
      destinationId: ctx.destinationId,
    });
    if (status !== "approved") {
      toast("Payment not completed", { description: "Your bank didn’t approve it, so nothing was taken. You can try again." });
    }
  });
  const [removing, setRemoving] = useState<LinkedSource | null>(null);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [selfieMatch, setSelfieMatch] = useState<"match" | "no-match">("match");
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [openGcbAccountOpen, setOpenGcbAccountOpen] = useState(false);
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
    if (result.status === "linked" && result.onboarding) {
      setFundPrompt(result.source);
      return;
    }
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
      [
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
                { id: "no-match", label: "Doesn't Match" },
              ],
              value: selfieMatch,
              onChange: (v: string) => setSelfieMatch(v as "match" | "no-match"),
            },
          ],
    [screenState, selfieMatch],
  );

  // Removing stops top-ups from that source, so it asks first; Undo stays as a safety net.
  function handleRemoveSource(source: LinkedSource) {
    setRemoveOpen(false);
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
    : scenario.migrated && !migratedDismissed
      ? scenario.migrated.amount
      : null;
  const multiple = accounts.length > 1;

  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-200">
      {/* Header */}
      {/* No Add money here — every account has its own Top up on Account Details. */}
      <PageHeader
        title="My Accounts"
        actions={
          screenState !== "loading" && screenState !== "error" ? (
            <Button
              type="button"
              onClick={() => {
                if (isWalletCustomer) {
                  setOpenGcbAccountOpen(true);
                } else {
                  setAddAccountOpen(true);
                }
              }}
              className="shrink-0"
            >
              <Plus size={15} strokeWidth={1.9} aria-hidden="true" />
              <span>{isWalletCustomer ? "Open a GCB Account" : "Add Account"}</span>
            </Button>
          ) : undefined
        }
      />

      <StateSwitcher
        section="S06"
        label="Customer"
        states={SCENARIO_IDS}
        value={scenario.id}
        onChange={applyScenario}
        labels={SCENARIO_LABEL}
        groups={devGroups}
      />

      {/* Just moved from wallet to a GCB account */}
      {migratedAmount !== null && defaultAccount && screenState === "populated" && (
        <div className="flex items-start gap-2 rounded-2xl border border-border bg-card p-3 sm:p-4" role="status">
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
            className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X size={16} strokeWidth={1.8} />
          </button>
        </div>
      )}

      {/* ── My accounts — the page title is the heading; Add Account sits with it ── */}
      <section aria-label="My accounts">
        <div className={LIST}>
          {screenState === "loading" && <ListSkeleton rows={Math.max(accounts.length, 2)} />}

          {screenState === "error" && (
            <ListErrorState
              onRetry={() => setScreenState("populated")}
              description="We couldn't load your accounts. Your money is safe — try again."
            />
          )}

          {screenState !== "loading" && screenState !== "error" && (
              <ul className="flex flex-col gap-0.5 p-2">
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
      {screenState !== "error" && (
        <section className="flex flex-col gap-3" aria-labelledby="sources-heading">
          <SectionHeading
            id="sources-heading"
            title="Other Funding Sources"
            hint="Mobile money wallets and bank cards you've linked, so you can add money to your accounts from them. Your money stays with them, and you can remove one any time."
            action={
              sources.length > 0 && screenState === "populated" ? (
                <SectionAction onClick={() => setLinkOpen(true)}>Link a Wallet or Card</SectionAction>
              ) : undefined
            }
          />

          {/* The empty state sits straight on the page, with no card behind it. */}
          <div className={screenState === "populated" && sources.length === 0 ? undefined : LIST}>
            {screenState === "loading" && <ListSkeleton rows={2} />}

            {screenState === "sources-error" && (
              <ListErrorState
                onRetry={() => setScreenState("populated")}
                description="We couldn't load your linked cards and wallets. Your accounts aren't affected."
              />
            )}

            {screenState === "populated" && sources.length === 0 && (
              <TrueEmptyState illustration="empty-sources"
                title="No cards or wallets linked"
                description="Link mobile money or a bank card to add money."
                action={
                  <Button onClick={() => setLinkOpen(true)}>
                    <Plus size={15} strokeWidth={1.9} aria-hidden="true" />
                    Link a Wallet or Card
                  </Button>
                }
              />
            )}

            {screenState === "populated" && sources.length > 0 && (
              <ul className="flex flex-col gap-0.5 p-2">
                {sources.map((source) => (
                  <SourceRow key={source.id} source={source} onOpen={() => {
                      setViewing(source);
                      setViewOpen(true);
                    }}
                    onRemove={() => {
                      setRemoving(source);
                      setRemoveOpen(true);
                    }} />
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
        onLinked={(source) => {
          if (linkOnboarding) {
            setFundPrompt(source);
            return;
          }
          toast.success(`${source.title} linked`, {
            description: defaultAccount ? `Use it to top up ${defaultAccount.name} any time.` : undefined,
          });
        }}
      />

      {/* Onboarding: after the first source is linked, offer a first deposit — skippable. */}
      <Dialog open={fundPrompt !== null} onOpenChange={(o) => !o && setFundPrompt(null)}>
        <DialogContent size="sm">
          <DialogBody>
            <div className="flex flex-col items-center gap-3 pt-3 text-center">
              <div className="flex size-21 items-center justify-center rounded-full bg-primary/15 text-foreground shadow-[0_0_60px_20px_color-mix(in_oklab,var(--primary)_18%,transparent)]">
                <HandCoins size={40} strokeWidth={1.5} aria-hidden="true" />
              </div>
              <DialogTitle className="text-[22px] tracking-[var(--ls-heading)]">You&apos;re Almost There…</DialogTitle>
              <p className="max-w-[320px] text-[14px] leading-relaxed text-muted-foreground">
                Deposit to unlock instant banking. Fund your account today for quick payments and everyday
                convenience.
              </p>
            </div>
          </DialogBody>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              type="button"
              onClick={() => {
                setFundWith(fundPrompt);
                setFundPrompt(null);
              }}
              className="h-10 w-full rounded-lg text-[14px]"
            >
              Fund My Account Now
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setFundPrompt(null)}
              className="h-10 w-full rounded-lg text-[14px]"
            >
              Skip For Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* "Fund My Account Now" — Add money on the default account, the new source preselected */}
      <LinkSourceAccountModal
        key={`fund-${fundWith?.id ?? "none"}-${fundResume?.screen ?? "none"}`}
        isOpen={fundWith !== null || fundResume !== null}
        onClose={() => {
          setFundWith(null);
          setFundResume(null);
        }}
        initialScreen={fundResume?.screen ?? "linked_source_select"}
        initialSourceId={fundResume?.sourceId ?? fundWith?.id}
        initialAmount={fundResume?.amount}
        initialDestinationId={fundResume?.destinationId}
        targetAccount={defaultAccount}
        accounts={accounts}
      />

      {/* A source's details: what it is, and a way to remove it */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent size="sm" showCloseButton>
          <DialogBody>
            <div className="flex flex-col items-center gap-6 pb-4 pt-5 text-center">
              {viewing && <SourceMark large type={viewing.type} operator={viewing.operator} title={viewing.title} />}
              <div className="flex flex-col items-center gap-2">
                <DialogTitle className="text-[18px] tracking-[var(--ls-heading)]">{viewing?.title}</DialogTitle>
                <p className="text-[14px] text-muted-foreground tabular">{viewing?.subtitle}</p>
              </div>
              {viewing && (
                <span className="flex items-center gap-2 text-[13px] text-foreground">
                  <WalletTag tag={sourceTag(viewing)} />
                  {sourceTag(viewing) === "Registered" ? "Verified Number" : viewing.type === "card" ? "Linked Card" : "Linked Wallet"}
                </span>
              )}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setRemoving(viewing);
                setRemoveOpen(true);
                setViewOpen(false);
              }}
              className="h-10 flex-1 rounded-lg text-[14px]"
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove a source of funds — warn first */}
      <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Remove {removing?.title}?</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="flex items-start gap-2">
              <AlertTriangle size={18} strokeWidth={1.8} aria-hidden="true" className="mt-0.5 shrink-0 text-warning" />
              <p className="text-[13.5px] leading-relaxed text-muted-foreground tabular">
                {removing?.type === "card"
                  ? `You will no longer be able to add money using card ending ${removing.subtitle.replace(/\D/g, "") || "1111"} until you link it again. Money already in your accounts will not be affected.`
                  : `You will no longer be able to add money from ${removing?.subtitle} until you link it again. Money already in your accounts will not be affected.`}
              </p>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRemoveOpen(false)} className="h-9 flex-1 rounded-lg text-[13.5px]">
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => removing && handleRemoveSource(removing)}
              className="h-9 flex-1 rounded-lg text-[13.5px]"
            >
              {removing?.type === "card" ? "Remove Card" : "Remove"}
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

      {/* Wallet customer: redirect to account opening portal */}
      <OpenGcbAccountDialog
        open={openGcbAccountOpen}
        onOpenChange={setOpenGcbAccountOpen}
      />
    </div>
  );
}

export default function AccountsPage() {
  return (
    <Suspense fallback={<AccountsPageSkeleton />}>
      <AccountsContent />
    </Suspense>
  );
}
