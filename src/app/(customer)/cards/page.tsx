"use client";

/**
 * Cards (list) — BRD FR-33 / FR-34 & New Card Creation Flow.
 *
 * Allows viewing all linked prepaid/debit cards for the active relationship,
 * plus instant digital issuance of new Visa and Mastercard payment cards.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronRight, CreditCard, Plus, Search } from "lucide-react";
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
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  // Card Creation Modal States
  const [createOpen, setCreateOpen] = useState(false);
  const [cardName, setCardName] = useState("");
  const [cardType, setCardType] = useState<"Prepaid" | "Debit">("Prepaid");
  const [cardScheme, setCardScheme] = useState<"Visa" | "Mastercard">("Visa");
  const [linkedAccId, setLinkedAccId] = useState("");
  const [initialFund, setInitialFund] = useState("500");

  // Trigger state refresh on creation
  const [refreshCount, setRefreshCount] = useState(0);

  const availableAccounts = useMemo(
    () => (activeProfile ? accountsForProfile(activeProfile.kind) : []),
    [activeProfile],
  );

  const cards = useMemo(() => {
    // Reading cards from mock-data
    return cardsForProfile(activeProfile?.kind);
  }, [activeProfile, refreshCount]);

  const results = useMemo(() => {
    if (!query.trim()) return cards;
    const q = query.toLowerCase();
    return cards.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.holder.toLowerCase().includes(q) ||
        c.maskedNumber.includes(q.replace(/\s/g, "")),
    );
  }, [query, cards]);

  const effective: ListState =
    state === "populated" && query.trim() && results.length === 0 ? "filtered-empty" : state;

  const rows = effective === "partial-load" ? cards : results;

  function handleCreateCard() {
    if (!cardName.trim()) return;

    const account = availableAccounts.find((a) => a.id === linkedAccId) ?? availableAccounts[0];
    const lastFour = String(Math.floor(1000 + Math.random() * 9000));
    const isPrepaid = cardType === "Prepaid";
    const fundAmount = isPrepaid ? Number(initialFund.replace(/,/g, "")) || 0 : null;

    const newCard: PaymentCard = {
      id: `card-new-${Date.now()}`,
      name: cardName.trim(),
      maskedNumber: `•••• ${lastFour}`,
      type: cardType,
      scheme: cardScheme,
      currency: account?.currency ?? "GHS",
      balance: fundAmount,
      linkedAccountId: account?.id ?? "acc-001",
      holder: actor?.name ?? "Cardholder",
      expiry: "08/30",
      status: "Active",
      fundable: isPrepaid,
      profileKind: activeProfile?.kind ?? "CORPORATE",
    };

    addCard(newCard);
    setRefreshCount((c) => c + 1);
    setNotice(`New digital ${cardScheme} ${cardType} card "${cardName}" created successfully.`);
    setTimeout(() => setNotice(null), 5000);

    // Reset Form
    setCardName("");
    setInitialFund("500");
    setCreateOpen(false);
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Cards"
        description="Prepaid and debit cards linked to this relationship. Issue new cards instantly, fund eligible prepaid cards, or block cards."
        actions={
          <Button
            onClick={() => {
              setLinkedAccId(availableAccounts[0]?.id ?? "");
              setCreateOpen(true);
            }}
            className="gap-1.5 bg-primary text-primary-foreground shadow-xs"
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

      <StateSwitcher
        section="13.1"
        states={LIST_STATES}
        value={state}
        onChange={setState}
        labels={LIST_STATE_LABEL}
      />

      <div className="rounded-2xl border border-border bg-card">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
          <div className="relative min-w-[200px] flex-1">
            <Search
              size={15}
              strokeWidth={1.9}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by card name, holder or last four digits"
              className="pl-9"
              aria-label="Search cards"
            />
          </div>
        </div>

        {effective === "loading" && <ListSkeleton rows={4} columns={4} />}

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
            description="Prepaid and debit cards issued under this relationship will appear here once they are active."
          />
        )}

        {effective === "filtered-empty" && (
          <FilteredEmptyState
            onReset={() => {
              setQuery("");
              setState("populated");
            }}
            description="No cards match your search. Clear it to see every card on this relationship."
          />
        )}

        {(effective === "populated" || effective === "partial-load") && (
          <>
            <ul className="divide-y divide-border">
              {rows.map((card) => (
                <li key={card.id}>
                  <Link
                    href={`/cards/${card.id}`}
                    className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-muted/50 active:scale-[0.99] transition-transform"
                  >
                    <MiniCardThumbnail card={card} />

                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[13.5px] font-medium text-foreground">{card.name}</span>
                        {card.status !== "Active" && (
                          <Badge variant={STATUS_VARIANT[card.status]}>{card.status}</Badge>
                        )}
                      </div>
                      <span className="mt-0.5 text-[12px] text-muted-foreground tabular">
                        {card.scheme} {card.type} · {card.maskedNumber}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[13.5px] text-foreground tabular font-medium">
                        {card.type === "Prepaid" && card.balance !== null
                          ? formatMoney(card.balance, card.currency)
                          : "Debit Card"}
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
            <DialogTitle>Issue New Digital Card</DialogTitle>
            <DialogDescription>
              Create a new payment card instantly linked to your account.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="c-name">Card Name / Nickname</Label>
              <Input
                id="c-name"
                placeholder="e.g. Marketing Expense Card"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label>Card Type</Label>
                <select
                  value={cardType}
                  onChange={(e) => setCardType(e.target.value as "Prepaid" | "Debit")}
                  className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-[13px] text-foreground focus:outline-none"
                >
                  <option value="Prepaid">Prepaid Card</option>
                  <option value="Debit">Debit Card</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Network Scheme</Label>
                <select
                  value={cardScheme}
                  onChange={(e) => setCardScheme(e.target.value as "Visa" | "Mastercard")}
                  className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-[13px] text-foreground focus:outline-none"
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
                className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-[13px] text-foreground focus:outline-none"
              >
                {availableAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.number}) — {formatMoney(acc.available, acc.currency)}
                  </option>
                ))}
              </select>
            </div>

            {cardType === "Prepaid" && (
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
