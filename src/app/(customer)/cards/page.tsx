"use client";

/**
 * Cards (list) — BRD FR-33 / FR-34 & New Card Creation Flow.
 * Matches exact design layout from reference screenshot:
 * - Top header with "+ Create Card" action
 * - Filter pills: All Cards, Virtual Cards, Prepaid, Debit
 * - Clean cards list with thumbnail graphics
 * - Search bar removed
 */

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, ChevronRight, CreditCard, Plus } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  findAccount,
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
  Inactive: "secondary",
};

function CardsPageContent() {
  const actor = useSession((s) => s.actor);
  const activeProfile = useSession((s) => s.activeProfile);
  const searchParams = useSearchParams();

  const [state, setState] = useState<ListState>("populated");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("created") === "true") {
      const name = searchParams.get("name") || "New Card";
      setNotice(`Card "${name}" requested and issued successfully.`);
      const timer = setTimeout(() => setNotice(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

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
  const [typeFilter, setTypeFilter] = useState<"all" | "Virtual" | "Debit" | "Prepaid">("all");

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

      {/* ── Page Header: Title & Action (no description underneath) ── */}
      <PageHeader
        title="Cards"
        actions={
          <Button
            nativeButton={false}
            render={<Link href="/cards/request" />}
            className="h-9 gap-1.5 px-3.5 text-[13px] font-medium rounded-lg shadow-xs shrink-0"
          >
            <Plus size={15} strokeWidth={1.9} aria-hidden="true" />
            <span>Request a Card</span>
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
      <div className="inline-flex w-fit max-w-full items-center overflow-x-auto no-scrollbar flex-nowrap rounded-xl bg-muted p-1">
        {(["all", "Virtual", "Debit", "Prepaid"] as const).map((t) => {
          const isActive = typeFilter === t;
          const label = t === "all" ? "All Cards" : t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(t)}
              aria-pressed={isActive}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 sm:px-4 sm:py-2 text-[12.5px] sm:text-[13px] whitespace-nowrap transition-all cursor-pointer ${
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
                <li key={card.id}>
                    <Link
                      href={`/cards/${card.id}`}
                      className="flex items-center justify-between gap-3 sm:gap-4 px-3.5 sm:px-5 py-3.5 sm:py-4 transition-colors hover:bg-muted/40 group"
                    >
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                        <MiniCardThumbnail card={card} />

                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="truncate text-[14px] font-medium text-foreground">{card.name}</span>
                            {card.deliveryStatus ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-medium text-foreground border border-border">
                                {card.deliveryStatus === "ready_for_pickup"
                                  ? "Ready for Pickup"
                                  : card.deliveryStatus === "in_transit"
                                  ? "In Transit"
                                  : card.deliveryStatus === "delivered"
                                  ? card.status === "Inactive"
                                    ? "Needs Activation"
                                    : "Delivered"
                                  : "In Production"}
                              </span>
                            ) : (
                              card.status !== "Active" && (
                                <Badge variant={STATUS_VARIANT[card.status]}>
                                  {card.status === "Inactive" ? "Needs Activation" : card.status}
                                </Badge>
                              )
                            )}
                          </div>
                          <span className="mt-0.5 text-[12px] text-muted-foreground tabular">
                            {card.type} · {card.maskedNumber}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        <span className="text-[13.5px] text-foreground tabular font-medium">
                          {card.balance !== null ? (
                            <RevealingAmount amount={card.balance} currency={card.currency} />
                          ) : (
                            (() => {
                              const linked = availableAccounts.find((a) => a.id === card.linkedAccountId) ?? findAccount(card.linkedAccountId);
                              return linked ? (
                                <RevealingAmount amount={linked.balance} currency={linked.currency} />
                              ) : null;
                            })()
                          )}
                        </span>
                        <ChevronRight size={16} strokeWidth={1.8} className="text-muted-foreground group-hover:text-foreground transition-colors" />
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
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Issue New Card</DialogTitle>
          </DialogHeader>

          <DialogBody>
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
                <Select
                  value={cardType}
                  onValueChange={(val) => val && setCardType(val as "Virtual" | "Prepaid" | "Debit")}
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Select card type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Virtual">Virtual Card (Instant Digital)</SelectItem>
                    <SelectItem value="Prepaid">Prepaid Card</SelectItem>
                    <SelectItem value="Debit">Debit Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Network Scheme</Label>
                <Select
                  value={cardScheme}
                  onValueChange={(val) => val && setCardScheme(val as "Visa" | "Mastercard")}
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Select scheme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Visa">Visa</SelectItem>
                    <SelectItem value="Mastercard">Mastercard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Linked Account</Label>
              <Select
                value={linkedAccId}
                onValueChange={(val) => val && setLinkedAccId(val)}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="Select linked account" />
                </SelectTrigger>
                <SelectContent>
                  {availableAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} ({acc.number}) — {formatMoney(acc.available, acc.currency)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  <Select
                    value={isSingleUse ? "single" : "recurring"}
                    onValueChange={(val) => setIsSingleUse(val === "single")}
                  >
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue placeholder="Select mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recurring">Recurring / Subscription</SelectItem>
                      <SelectItem value="single">Single Use (Burner)</SelectItem>
                    </SelectContent>
                  </Select>
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
          </DialogBody>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" disabled={!cardName.trim()} onClick={handleCreateCard}>
              Issue Card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CardsPage() {
  return (
    <Suspense fallback={null}>
      <CardsPageContent />
    </Suspense>
  );
}


