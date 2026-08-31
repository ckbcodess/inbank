"use client";

/**
 * Cards (list) — BRD FR-33 / FR-34 & New Card Creation Flow.
 * Matches exact design layout from reference screenshot:
 * - Top header with "+ Create Card" action
 * - Filter pills: All Cards, Virtual Cards, Prepaid, Debit
 * - Clean cards list with thumbnail graphics
 * - Search bar removed
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronRight, CreditCard, Plus } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import {
  FilteredEmptyState,
  ListErrorState,
  ListSkeleton,
  PartialLoadFooter,
  TrueEmptyState,
} from "@/components/states/ListStates";
import { LIST_STATE_LABEL, type ListState } from "@/lib/states";
import {
  accountsForProfile,
  addCard,
  cardsForProfile,
  formatMoney,
  type CardStatus,
  type PaymentCard,
} from "@/lib/mock-data";
import { useSession } from "@/lib/session-store";
import { MiniCardThumbnail } from "@/components/cards/MiniCardThumbnail";
import { useAmountVisibility, RevealingAmount } from "@/components/providers/AmountVisibilityProvider";

const LIST_STATES: readonly ListState[] = [
  "loading",
  "empty",
  "filtered-empty",
  "populated",
  "partial-load",
  "error",
] as const;

const STATUS_VARIANT: Record<CardStatus, "success" | "destructive" | "secondary"> = {
  Active: "success",
  Blocked: "destructive",
  Expired: "secondary",
};

export default function CardsPage() {
  const actor = useSession((s) => s.actor);
  const activeProfile = useSession((s) => s.activeProfile);

  const [state, setState] = useState<ListState>("populated");
  const [notice, setNotice] = useState<string | null>(null);

  // Card Creation Modal States
  const [createOpen, setCreateOpen] = useState(false);
  const [cardName, setCardName] = useState("");
  const [cardType, setCardType] = useState<"Prepaid" | "Debit" | "Virtual">("Virtual");
  const [cardScheme, setCardScheme] = useState<"Visa" | "Mastercard">("Visa");
  const [linkedAccId, setLinkedAccId] = useState("");
  const [initialFund, setInitialFund] = useState("500");
  const [spendLimit, setSpendLimit] = useState("2500");
  const [isSingleUse, setIsSingleUse] = useState(false);

  // Filter state
  const [typeFilter, setTypeFilter] = useState<"all" | "Virtual" | "Prepaid" | "Debit">("all");

  // Trigger state refresh on creation
  const [refreshCount, setRefreshCount] = useState(0);

  const availableAccounts = useMemo(
    () => (activeProfile ? accountsForProfile(activeProfile.kind) : []),
    [activeProfile],
  );

  const cards = useMemo(() => {
    void refreshCount;
    return cardsForProfile(activeProfile?.kind);
  }, [activeProfile, refreshCount]);

  const filteredCards = useMemo(() => {
    if (typeFilter === "all") return cards;
    return cards.filter((c) => c.type === typeFilter);
  }, [cards, typeFilter]);

  const effective: ListState =
    state === "populated" && typeFilter !== "all" && filteredCards.length === 0 ? "filtered-empty" : state;

  const rows = effective === "partial-load" ? cards : filteredCards;

  function handleCreateCard() {
    if (!cardName.trim()) return;

    const account = availableAccounts.find((a) => a.id === linkedAccId) ?? availableAccounts[0];
    const lastFour = String(Math.floor(1000 + Math.random() * 9000));
    const prefix = cardScheme === "Visa" ? "4532" : "5412";
    const fullNum = `${prefix} ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)} ${lastFour}`;
    const generatedCvv = String(Math.floor(100 + Math.random() * 900));

    const isPrepaid = cardType === "Prepaid";
    const isVirtualCard = cardType === "Virtual";
    const fundAmount = isPrepaid || isVirtualCard ? Number(initialFund.replace(/,/g, "")) || 0 : null;
    const limitAmount = isVirtualCard ? Number(spendLimit.replace(/,/g, "")) || 2500 : null;

    const newCard: PaymentCard = {
      id: `card-new-${Date.now()}`,
      name: cardName.trim(),
      maskedNumber: `•••• ${lastFour}`,
      fullNumber: fullNum,
      cvv: generatedCvv,
      type: cardType,
      scheme: cardScheme,
      currency: account?.currency ?? "GHS",
      balance: fundAmount,
      spendLimit: limitAmount,
      linkedAccountId: account?.id ?? "acc-001",
      holder: actor?.name ?? "Cardholder",
      expiry: "08/30",
      status: "Active",
      fundable: isPrepaid || isVirtualCard,
      isVirtual: isVirtualCard,
      singleUse: isVirtualCard ? isSingleUse : false,
      profileKind: activeProfile?.kind ?? "CORPORATE",
    };

    addCard(newCard);
    setRefreshCount((c) => c + 1);
    setNotice(
      isVirtualCard
        ? `Instant digital ${cardScheme} Virtual Card "${cardName}" created successfully.`
        : `New ${cardScheme} ${cardType} card "${cardName}" created successfully.`
    );
    setTimeout(() => setNotice(null), 5000);

    // Reset Form
    setCardName("");
    setInitialFund("500");
    setSpendLimit("2500");
    setIsSingleUse(false);
    setCreateOpen(false);
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Dev Mode State Switcher (registers automatically to the top navbar) */}
      <StateSwitcher
        section="13.1"
        states={LIST_STATES}
        value={state}
        onChange={setState}
        labels={LIST_STATE_LABEL}
      />

      {/* Page Header */}
      <PageHeader
        title="Cards"
        description="Prepaid and debit cards linked here. Instantly issue, fund, or block cards."
        actions={
          <Button
            onClick={() => {
              setLinkedAccId(availableAccounts[0]?.id ?? "");
              setCreateOpen(true);
            }}
            className="gap-1.5 bg-[#1570d1] hover:bg-[#125db0] text-white rounded-xl h-10 px-4 text-[13.5px] font-medium shadow-xs cursor-pointer"
          >
            <Plus size={15} />
            <span>Create Card</span>
          </Button>
        }
      />

      {notice && (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3 text-[13px] text-foreground">
          <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
          <span>{notice}</span>
        </div>
      )}

      {/* Segmented Controls Filter (styled exactly like Payments Page) */}
      <div className="inline-flex w-fit flex-wrap rounded-xl bg-muted p-1">
        {(["all", "Virtual", "Prepaid", "Debit"] as const).map((t) => {
          const isActive = typeFilter === t;
          const label = t === "all" ? "All Cards" : t === "Virtual" ? "Virtual Cards" : t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(t)}
              aria-pressed={isActive}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] transition-all cursor-pointer ${
                isActive
                  ? "bg-background text-foreground shadow-sm font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Cards List Box Container */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {effective === "loading" && <ListSkeleton rows={4} columns={3} />}

        {effective === "error" && (
          <ListErrorState
            onRetry={() => setState("populated")}
            description="We couldn't load your cards. Card status and balances are unaffected — try again."
          />
        )}

        {effective === "empty" && (
          <TrueEmptyState
            icon={<CreditCard size={20} strokeWidth={1.7} aria-hidden="true" />}
            title="No cards issued yet"
            description="Prepaid, debit and virtual cards issued under this relationship will appear here once active."
          />
        )}

        {effective === "filtered-empty" && (
          <FilteredEmptyState
            onReset={() => {
              setTypeFilter("all");
              setState("populated");
            }}
            description="No cards match your selected filter. Clear it to see every card on this relationship."
          />
        )}

        {(effective === "populated" || effective === "partial-load") && (
          <>
            <ul className="divide-y divide-border">
              {rows.map((card) => (
                <li key={card.id} className="group relative">
                  <Link
                    href={`/cards/${card.id}`}
                    className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/40 active:scale-[0.995] transition-transform"
                  >
                    <MiniCardThumbnail card={card} />

                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[14px] font-medium text-foreground">{card.name}</span>
                        {card.status !== "Active" && (
                          <Badge variant={STATUS_VARIANT[card.status]}>{card.status}</Badge>
                        )}
                      </div>
                      <span className="mt-0.5 text-[12px] text-muted-foreground tabular">
                        {card.scheme} {card.type} · {card.maskedNumber}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[13.5px] text-foreground tabular font-medium">
                        {(card.type === "Prepaid" || card.type === "Virtual") && card.balance !== null ? (
                          <RevealingAmount amount={card.balance} currency={card.currency} />
                        ) : (
                          "Debit Card"
                        )}
                      </span>
                      <ChevronRight size={16} strokeWidth={1.8} className="text-muted-foreground" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            {effective === "partial-load" && <PartialLoadFooter />}
          </>
        )}
      </div>

      {/* CREATE NEW CARD MODAL DIALOG */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Issue New Digital / Virtual Card</DialogTitle>
            <DialogDescription>
              Create a new payment or virtual card instantly linked to your account.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="c-name">Card Name / Nickname</Label>
              <Input
                id="c-name"
                placeholder="e.g. AWS Subscription / Google Ads"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label>Card Type</Label>
                <select
                  value={cardType}
                  onChange={(e) => setCardType(e.target.value as "Virtual" | "Prepaid" | "Debit")}
                  className="flex h-10 w-full rounded-xl border border-border bg-background pl-3 pr-10 py-2 text-[13px] text-foreground focus:outline-none cursor-pointer"
                >
                  <option value="Virtual">Virtual Card (Instant Digital)</option>
                  <option value="Prepaid">Prepaid Card</option>
                  <option value="Debit">Debit Card</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Network Scheme</Label>
                <select
                  value={cardScheme}
                  onChange={(e) => setCardScheme(e.target.value as "Visa" | "Mastercard")}
                  className="flex h-10 w-full rounded-xl border border-border bg-background pl-3 pr-10 py-2 text-[13px] text-foreground focus:outline-none cursor-pointer"
                >
                  <option value="Visa">Visa</option>
                  <option value="Mastercard">Mastercard</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Linked Account</Label>
              <select
                value={linkedAccId}
                onChange={(e) => setLinkedAccId(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-border bg-background pl-3 pr-10 py-2 text-[13px] text-foreground focus:outline-none cursor-pointer"
              >
                {availableAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.number}) — {formatMoney(acc.available, acc.currency)}
                  </option>
                ))}
              </select>
            </div>

            {cardType === "Virtual" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="c-limit">Monthly Spend Limit</Label>
                  <Input
                    id="c-limit"
                    value={spendLimit}
                    onChange={(e) => setSpendLimit(e.target.value)}
                    placeholder="2500.00"
                    className="tabular"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Usage Mode</Label>
                  <select
                    value={isSingleUse ? "single" : "recurring"}
                    onChange={(e) => setIsSingleUse(e.target.value === "single")}
                    className="flex h-10 w-full rounded-xl border border-border bg-background pl-3 pr-10 py-2 text-[13px] text-foreground focus:outline-none cursor-pointer"
                  >
                    <option value="recurring">Recurring / Subscription</option>
                    <option value="single">Single Use (Burner)</option>
                  </select>
                </div>
              </div>
            )}

            {(cardType === "Prepaid" || cardType === "Virtual") && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="c-fund">Initial Funding Amount</Label>
                <Input
                  id="c-fund"
                  value={initialFund}
                  onChange={(e) => setInitialFund(e.target.value)}
                  placeholder="500.00"
                  className="tabular"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!cardName.trim()} onClick={handleCreateCard}>
              Issue Card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

