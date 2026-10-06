"use client";

/**
 * Cards (list) — BRD FR-33 / FR-34 & New Card Creation Flow.
 * Matches exact design layout from reference screenshot:
 * - Top header with "+ Create Card" action
 * - Filter pills: All Cards, Virtual Cards, Prepaid, Debit
 * - Clean cards list with thumbnail graphics
 * - Search bar removed
 */

import { CARD_SCHEMES, type CardScheme } from "@/lib/card-schemes";
import { toast } from "sonner";
import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Layers, Plus } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
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
import type { DevStateGroup } from "@/components/providers/DevStateProvider";
import {
  FilteredEmptyState,
  ListErrorState,
  PartialLoadFooter,
  TrueEmptyState,
} from "@/components/states/ListStates";
import { LIST_STATE_LABEL, type ListState } from "@/lib/states";
import {
  accountsForProfile,
  addCard,
  cardsForProfile,
  formatMoney,
  type PaymentCard,
} from "@/lib/mock-data";
import { useSession, useSessionHydrated } from "@/lib/session-store";
import { readyCache } from "@/lib/ready-cache";
import { useCardAssetsReady } from "@/components/cards/useCardAssetsReady";
import { CardsPageSkeleton, CardsSkeleton } from "@/components/cards/CardParts";
import { CardsEmptyIllustration } from "@/components/cards/CardsEmptyIllustration";
import { CardsStack } from "@/components/cards/layouts/CardsStack";
import { CardsCarousel } from "@/components/cards/layouts/CardsCarousel";
import { CardsGallery } from "@/components/cards/layouts/CardsGallery";
import { CardsSpotlight } from "@/components/cards/layouts/CardsSpotlight";
import { CardsList } from "@/components/cards/layouts/CardsList";
import {
  CARDS_LAYOUTS,
  CARDS_LAYOUT_KEY,
  CARDS_LAYOUT_LABELS,
  DEFAULT_CARDS_LAYOUT,
  type CardsLayout,
} from "@/lib/cards-layout";
import {
  CARD_SIMULATION_LABELS,
  getEffectiveCardsForProfile,
  useCardsDevStore,
  type CardSimulationPreset,
} from "@/lib/cards-dev-store";

const SIMULATION_STATES: readonly CardSimulationPreset[] = [
  "clean",
  "out_for_delivery",
  "ready_for_pickup",
  "delivered",
  "in_transit",
  "in_production",
  "blocked",
  "all",
] as const;

const LIST_STATES: readonly ListState[] = [
  "loading",
  "empty",
  "filtered-empty",
  "populated",
  "partial-load",
  "error",
] as const;

/** Dev Mode's layout pick survives a reload (per browser, a reviewing convenience). */
function readLayout(): CardsLayout {
  try {
    const stored =
      typeof window !== "undefined"
        ? localStorage.getItem(CARDS_LAYOUT_KEY)
        : null;
    return CARDS_LAYOUTS.includes(stored as CardsLayout)
      ? (stored as CardsLayout)
      : DEFAULT_CARDS_LAYOUT;
  } catch {
    return DEFAULT_CARDS_LAYOUT;
  }
}

function CardsPageContent() {
  const actor = useSession((s) => s.actor);
  const activeProfile = useSession((s) => s.activeProfile);
  const searchParams = useSearchParams();
  const devState = useCardsDevStore();

  const [state, setState] = useState<ListState>("populated");
  // The saved layout is read after mount (never during render), so the server's
  // markup and the first client paint agree and nothing swaps layouts underfoot.
  const [layout, setLayout] = useState<CardsLayout>(readyCache.layout ?? DEFAULT_CARDS_LAYOUT);
  const [layoutRead, setLayoutRead] = useState(readyCache.layout !== null);
  useEffect(() => {
    const saved = readLayout();
    readyCache.layout = saved;
    setLayout(saved);
    setLayoutRead(true);
  }, []);
  const sessionHydrated = useSessionHydrated();
  if (sessionHydrated) readyCache.session = true;
  const sessionReady = sessionHydrated || readyCache.session;

  useEffect(() => {
    if (searchParams.get("created") === "true") {
      const name = searchParams.get("name") || "New Card";
      toast.success(`Card "${name}" requested and issued successfully.`);
    }
  }, [searchParams]);

  // Card Creation Modal States
  const [createOpen, setCreateOpen] = useState(false);
  const [cardName, setCardName] = useState("");
  const [cardType, setCardType] = useState<"Prepaid" | "Debit" | "Virtual">(
    "Virtual",
  );
  const [cardScheme, setCardScheme] = useState<CardScheme>("Visa");
  const [linkedAccId, setLinkedAccId] = useState("");
  const [initialFund, setInitialFund] = useState("500");
  const [spendLimit, setSpendLimit] = useState("2500");
  const [isSingleUse, setIsSingleUse] = useState(false);

  // Filter state
  const [typeFilter, setTypeFilter] = useState<
    "all" | "Virtual" | "Debit" | "Prepaid"
  >("all");

  // Trigger state refresh on creation
  const [refreshCount, setRefreshCount] = useState(0);

  const availableAccounts = useMemo(
    () => (activeProfile ? accountsForProfile(activeProfile.kind) : []),
    [activeProfile],
  );

  const allCards = useMemo(() => {
    void refreshCount;
    return cardsForProfile(activeProfile?.kind);
  }, [activeProfile, refreshCount]);

  const { cards, activeSimulatedCard } = useMemo(() => {
    return getEffectiveCardsForProfile(
      activeProfile?.kind ?? "CORPORATE",
      allCards,
      devState,
    );
  }, [activeProfile, allCards, devState]);

  const devGroups = useMemo<DevStateGroup[]>(() => {
    const cardOptions = [
      { id: "auto", label: "Auto (Recommended card for stage)" },
      ...allCards.map((c) => ({
        id: c.id,
        label: `${c.name} (${c.type})`,
      })),
    ];

    const screenStateOptions = LIST_STATES.map((s) => ({
      id: s,
      label: LIST_STATE_LABEL[s] ?? s,
    }));

    return [
      {
        label: "Apply Stage To Card",
        states: cardOptions,
        value: devState.targetCardId || "auto",
        onChange: (val) =>
          devState.setTargetCardId(val === "auto" ? null : val),
      },
      {
        label: "Screen Baseline State",
        states: screenStateOptions,
        value: state,
        onChange: (val) => setState(val as ListState),
      },
      {
        label: "Cards layout",
        states: CARDS_LAYOUTS.map((id) => ({
          id,
          label: CARDS_LAYOUT_LABELS[id],
        })),
        value: layout,
        onChange: (val) => {
          setLayout(val as CardsLayout);
          readyCache.layout = val as CardsLayout;
          try {
            localStorage.setItem(CARDS_LAYOUT_KEY, val);
          } catch {
            // Storage blocked — the pick lasts for this visit only.
          }
        },
      },
    ];
  }, [devState, allCards, state, layout]);

  const filteredCards = useMemo(() => {
    if (typeFilter === "all") return cards;
    return cards.filter((c) => c.type === typeFilter);
  }, [cards, typeFilter]);

  // Hold everything back until session, saved layout and card artwork are all in.
  const assetsReady = useCardAssetsReady(cards);
  const ready = sessionReady && layoutRead && assetsReady;

  const effective: ListState = !ready
    ? "loading"
    : state === "populated" && typeFilter !== "all" && filteredCards.length === 0
      ? "filtered-empty"
      : state;

  const rows = effective === "partial-load" ? cards : filteredCards;

  function handleCreateCard() {
    if (!cardName.trim()) return;

    const account =
      availableAccounts.find((a) => a.id === linkedAccId) ??
      availableAccounts[0];
    const lastFour = String(Math.floor(1000 + Math.random() * 9000));
    const prefix = cardScheme === "Visa" ? "4532" : "5412";
    const fullNum = `${prefix} ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)} ${lastFour}`;
    const generatedCvv = String(Math.floor(100 + Math.random() * 900));

    const isPrepaid = cardType === "Prepaid";
    const isVirtualCard = cardType === "Virtual";
    const fundAmount =
      isPrepaid || isVirtualCard
        ? Number(initialFund.replace(/,/g, "")) || 0
        : null;
    const limitAmount = isVirtualCard
      ? Number(spendLimit.replace(/,/g, "")) || 2500
      : null;

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
    toast.success(
      isVirtualCard
        ? `Instant digital ${cardScheme} Virtual Card "${cardName}" created successfully.`
        : `New ${cardScheme} ${cardType} card "${cardName}" created successfully.`,
    );

    // Reset Form
    setCardName("");
    setInitialFund("500");
    setSpendLimit("2500");
    setIsSingleUse(false);
    setCreateOpen(false);
  }

  if (!ready) return <CardsPageSkeleton />;

  return (
    <div className="flex flex-col gap-8 w-full">
      {/* Dev Mode State Switcher (registers automatically to the top navbar) */}
      <StateSwitcher
        section="13.1"
        label="Card Lifecycle Simulator"
        states={SIMULATION_STATES}
        value={devState.simulation}
        onChange={(val) => devState.setSimulation(val as CardSimulationPreset)}
        labels={CARD_SIMULATION_LABELS}
        groups={devGroups}
      />

      {/* ── Page Header: Title & Action (no description underneath) ── */}
      <PageHeader
        title="Cards"
        actions={
          effective === "empty" ? null : (
            <Button
              nativeButton={false}
              render={<Link href="/cards/request" />}
              className="h-9 gap-1.5 px-3.5 text-[13px] font-medium rounded-lg shadow-xs shrink-0"
            >
              <Plus size={15} strokeWidth={1.9} aria-hidden="true" />
              <span>Request a Card</span>
            </Button>
          )
        }
      />

      {/* Dev Mode Status Notification Banners */}
      {devState.simulation !== "clean" &&
        devState.simulation !== "all" &&
        activeSimulatedCard && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-warning/40 bg-warning/5 px-4 py-2.5 text-[12.5px]">
            <div className="flex items-center gap-2 min-w-0">
              <Layers
                size={14}
                className="shrink-0 text-warning-text"
              />
              <span className="font-medium text-foreground">
                Dev Mode Simulation:
              </span>
              <span className="text-muted-foreground truncate">
                <strong className="font-medium text-foreground">
                  {activeSimulatedCard.name}
                </strong>{" "}
                is simulated as{" "}
                <strong className="font-medium text-foreground">
                  {CARD_SIMULATION_LABELS[devState.simulation]}
                </strong>
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Link
                href={`/cards/${activeSimulatedCard.id}`}
                className="text-[12px] font-medium text-foreground hover:underline"
              >
                View card details →
              </Link>
              <button
                type="button"
                onClick={() => devState.resetToClean()}
                className="text-[12px] text-muted-foreground hover:text-foreground cursor-pointer underline"
              >
                Reset to clean
              </button>
            </div>
          </div>
        )}

      {devState.simulation === "all" && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-warning/40 bg-warning/5 px-4 py-2.5 text-[12.5px]">
          <div className="flex items-center gap-2 min-w-0">
            <Layers
              size={14}
              className="shrink-0 text-warning-text"
            />
            <span className="text-muted-foreground">
              Dev Mode: Showing all <strong>{allCards.length}</strong> mock
              cards across all lifecycle stages.
            </span>
          </div>
          <button
            type="button"
            onClick={() => devState.resetToClean()}
            className="text-[12px] text-muted-foreground hover:text-foreground cursor-pointer underline shrink-0"
          >
            Reset to clean (3 cards)
          </button>
        </div>
      )}

      {/* Segmented Controls Filter (styled exactly like Payments Page) */}
      <div className="inline-flex w-fit max-w-full items-center overflow-x-auto no-scrollbar flex-nowrap rounded-xl bg-chip p-1">
        {(["all", "Virtual", "Debit", "Prepaid"] as const).map((t) => {
          const isActive = typeFilter === t;
          const label = t === "all" ? "All Cards" : t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(t)}
              aria-pressed={isActive}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 sm:px-4 sm:py-2 text-[12.5px] sm:text-[13px] whitespace-nowrap transition cursor-pointer ${
                isActive
                  ? "bg-chip-selected text-chip-selected-foreground shadow-sm font-medium"
                  : "text-chip-foreground hover:text-chip-selected-foreground"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {effective === "loading" && (
        <CardsSkeleton />
      )}

      {effective === "error" && (
        <ListErrorState
          onRetry={() => setState("populated")}
          description="We couldn't load your cards. Card status and balances are unaffected — try again."
        />
      )}

      {effective === "empty" && (
        <TrueEmptyState illustration="empty-cards"
          icon={<CardsEmptyIllustration />}
          title="No cards yet"
          description="Get a virtual card instantly, or request a debit or prepaid card and we'll deliver it. It will show up here."
          action={
            <Button
              nativeButton={false}
              render={<Link href="/cards/request" />}
              className="h-9 gap-1.5 rounded-lg px-3.5 text-[13px] shadow-xs"
            >
              <Plus size={15} strokeWidth={1.9} aria-hidden="true" />
              <span>Request a Card</span>
            </Button>
          }
        />
      )}

      {effective === "filtered-empty" && (
        <FilteredEmptyState
          onReset={() => {
            setTypeFilter("all");
            setState("populated");
          }}
          description={`You don't have any ${typeFilter.toLowerCase()} cards.`}
          action={
            <Link
              href="/cards/request"
              className="text-[13px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Request a card
            </Link>
          }
        />
      )}

      {(effective === "populated" || effective === "partial-load") &&
        rows.length > 0 && (
          <div className="flex flex-col gap-4">
            {layout === "stack" && <CardsStack cards={rows} />}
            {layout === "carousel" && <CardsCarousel cards={rows} />}
            {layout === "gallery" && <CardsGallery cards={rows} />}
            {layout === "spotlight" && <CardsSpotlight cards={rows} />}
            {layout === "list" && <CardsList cards={rows} />}
            {effective === "partial-load" && <PartialLoadFooter />}
          </div>
        )}

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
                  onValueChange={(val) =>
                    val && setCardType(val as "Virtual" | "Prepaid" | "Debit")
                  }
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Select card type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Virtual">
                      Virtual Card (Instant Digital)
                    </SelectItem>
                    <SelectItem value="Prepaid">Prepaid Card</SelectItem>
                    <SelectItem value="Debit">Debit Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Network Scheme</Label>
                <Select
                  value={cardScheme}
                  onValueChange={(val) =>
                    val && setCardScheme(val as CardScheme)
                  }
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Select scheme" />
                  </SelectTrigger>
                  <SelectContent>
                    {CARD_SCHEMES.map((scheme) => (
                      <SelectItem key={scheme} value={scheme}>
                        {scheme}
                      </SelectItem>
                    ))}
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
                      {acc.name} ({acc.number}) —{" "}
                      {formatMoney(acc.available, acc.currency)}
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
                      <SelectItem value="recurring">
                        Recurring / Subscription
                      </SelectItem>
                      <SelectItem value="single">
                        Single Use (Burner)
                      </SelectItem>
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!cardName.trim()}
              onClick={handleCreateCard}
            >
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
