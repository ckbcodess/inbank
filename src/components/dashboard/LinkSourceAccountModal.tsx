"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Smartphone,
  UserCheck,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Account, accountsForProfile, formatMoney } from "@/lib/mock-data";
import { useSession } from "@/lib/session-store";
import { useLinkedSources, type LinkedSource, type NetworkOperator } from "@/lib/accounts-store";
import TransactionPinModal from "@/components/payments/TransactionPinModal";
import {
  FromAccountSelector,
  AmountInput,
  NarrationInput,
  ProceedButton,
} from "@/components/payments/flows/shared";
import { PhoneInput } from "@/components/ui/phone-input";
import { displayGhanaMobile, isCompleteGhanaMobile } from "@/lib/phone";
import { cardNetwork, useCardLink } from "@/lib/card-link";

interface LinkSourceAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetAccount?: Account | null;
  initialScreen?: ModalScreen;
  /** Accounts to transfer between; defaults to the signed-in profile's. */
  accounts?: Account[];
  /**
   * `fund` (default) adds money to an account. `link` only links a new MoMo
   * wallet or card, then closes — used by "Link a card or wallet" on /accounts.
   */
  mode?: "fund" | "link";
  onLinked?: (source: LinkedSource) => void;
  /** Preselect this source on open — the card just linked via the bank's page. */
  initialSourceId?: string;
  /**
   * Straight after new-to-GCB sign-up: the link choice reads "Link Source
   * Account" with the mobile app's tiles (yellow icon, title, two-line hint).
   */
  onboarding?: boolean;
}

export type ModalScreen =
  | "choice"
  | "internal_transfer"
  | "internal_success"
  | "linked_source_select"
  | "momo_waiting"
  | "card_3ds"
  | "funding_success"
  | "link_new_momo"
  | "link_momo_pending"
  | "link_new_card"
  | "link_choice";

export default function LinkSourceAccountModal({
  isOpen,
  onClose,
  targetAccount: targetAccountProp,
  initialScreen,
  accounts: accountsProp,
  mode = "fund",
  onLinked,
  initialSourceId,
  onboarding = false,
}: LinkSourceAccountModalProps) {
  const router = useRouter();
  const pathname = usePathname();
  const startCardLink = useCardLink((s) => s.start);
  const modalId = useId();
  const activeProfile = useSession((s) => s.activeProfile);
  const allAccounts = useMemo(
    () => accountsProp ?? accountsForProfile(activeProfile?.kind ?? "RETAIL"),
    [accountsProp, activeProfile?.kind]
  );
  const startScreen: ModalScreen = initialScreen ?? (mode === "link" ? "link_choice" : "choice");
  const linkBackScreen: ModalScreen = mode === "link" ? "link_choice" : "linked_source_select";

  // Accounts money can be added to: active cedi accounts. Mobile money and
  // local cards settle in GHS, and Send & Pay's own-account list excludes
  // foreign-currency accounts the same way.
  const fundableAccounts = useMemo(
    () => allAccounts.filter((a) => a.status === "Active" && a.currency === "GHS"),
    [allAccounts]
  );

  // Where the money lands. Preselected from where Add money was opened (that
  // account, or the default), and changeable in each form with the same
  // "To Account" dropdown Send & Pay uses.
  const [destinationId, setDestinationId] = useState<string>(
    targetAccountProp?.id ?? fundableAccounts[0]?.id ?? ""
  );
  useEffect(() => {
    if (isOpen) setDestinationId(targetAccountProp?.id ?? fundableAccounts[0]?.id ?? "");
    // Re-seed only when the modal opens or the entry point changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, targetAccountProp?.id]);
  const destinationAccount =
    fundableAccounts.find((a) => a.id === destinationId) ?? fundableAccounts[0] ?? null;

  const [screen, setScreen] = useState<ModalScreen>(startScreen);
  const [busy, setBusy] = useState(false);

  // ── Flow 1: Internal Transfer State ──
  const [selectedSourceAccountId, setSelectedSourceAccountId] = useState<string>("");
  const [internalAmount, setInternalAmount] = useState("500.00");
  const [internalRef, setInternalRef] = useState("Account top-up");

  // From and To can never be the same account: each list leaves out the
  // other's pick, and From falls back to the first other account.
  const selectedSourceAccount = useMemo(
    () =>
      fundableAccounts.find((a) => a.id === selectedSourceAccountId && a.id !== destinationAccount?.id) ??
      fundableAccounts.find((a) => a.id !== destinationAccount?.id),
    [fundableAccounts, selectedSourceAccountId, destinationAccount?.id]
  );
  const canTransferBetween = fundableAccounts.length > 1;

  // ── Flow 2: Linked Wallets / Cards State ──
  // Shared with the Accounts page — a source linked here shows up there too.
  const linkedSources = useLinkedSources((s) => s.sources);
  const addSource = useLinkedSources((s) => s.addSource);
  const [selectedSourceId, setSelectedSourceId] = useState<string>(linkedSources[0]?.id ?? "");
  const [linkedAmount, setLinkedAmount] = useState("250.00");

  // New MoMo form
  const [newMomoNumber, setNewMomoNumber] = useState("");
  const [newMomoOperator, setNewMomoOperator] = useState<NetworkOperator>("MTN");
  const [momoResent, setMomoResent] = useState(false);

  // New Card form
  const [newCardNumber, setNewCardNumber] = useState("");
  const [newCardExpiry, setNewCardExpiry] = useState("");
  const [newCardCvv, setNewCardCvv] = useState("");
  const cardDigits = newCardNumber.replace(/\D/g, "");
  const cardComplete =
    cardDigits.length >= 15 && /^(0[1-9]|1[0-2])\/\d{2}$/.test(newCardExpiry) && newCardCvv.length >= 3;

  // Simulated OTP
  const [threeDsCode, setThreeDsCode] = useState("");

  // Reopening after the bank's card page lands on the requested screen with the
  // new card selected, instead of wherever the modal was left.
  useEffect(() => {
    if (!isOpen) return;
    setScreen(startScreen);
    if (initialSourceId) setSelectedSourceId(initialSourceId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const activeLinkedSource = useMemo(
    () => linkedSources.find((s) => s.id === selectedSourceId) || linkedSources[0],
    [linkedSources, selectedSourceId]
  );

  const [isPinModalOpen, setIsPinModalOpen] = useState(false);

  // Reset helper when modal closes
  function handleClose() {
    setScreen(startScreen);
    setBusy(false);
    setIsPinModalOpen(false);
    onClose();
  }

  // ── Handlers: Internal Transfer ──
  function handleInternalTransferSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsPinModalOpen(true);
  }

  function handlePinSuccess() {
    setIsPinModalOpen(false);
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      setScreen("internal_success");
    }, 450);
  }

  // ── Handlers: Linked Source Funding ──
  function handleLinkedSourceSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      if (activeLinkedSource?.type === "momo") {
        setScreen("momo_waiting");
      } else {
        setScreen("card_3ds");
      }
    }, 400);
  }

  function handleMomoApprove() {
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      setScreen("funding_success");
    }, 900);
  }

  function handle3dsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      setScreen("funding_success");
    }, 700);
  }

  // The operator sends an approval prompt to the phone; linking waits for the
  // customer to come back and say they've approved it.
  function handleAddNewMomo(e: React.FormEvent) {
    e.preventDefault();
    if (!isCompleteGhanaMobile(newMomoNumber)) return;
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      setMomoResent(false);
      setScreen("link_momo_pending");
    }, 600);
  }

  function handleMomoLinkApproved() {
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      confirmNewMomo();
    }, 900);
  }

  function confirmNewMomo() {
    const newSource: LinkedSource = {
      id: `src-momo-${Date.now()}`,
      type: "momo",
      title: `${newMomoOperator} Mobile Money`,
      subtitle: displayGhanaMobile(newMomoNumber),
      operator: newMomoOperator,
      maskedNumber: displayGhanaMobile(newMomoNumber),
    };
    finishLinking(newSource);
  }

  function finishLinking(newSource: LinkedSource) {
    addSource(newSource);
    if (mode === "link") {
      setNewMomoNumber("");
      setNewCardNumber("");
      setNewCardExpiry("");
      setNewCardCvv("");
      onLinked?.(newSource);
      handleClose();
      return;
    }
    setSelectedSourceId(newSource.id);
    setScreen("linked_source_select");
  }

  // Cards are verified by the customer's own bank on its page (3-D Secure),
  // which sends them back here. Only the last four digits make the trip.
  function handleAddNewCard(e: React.FormEvent) {
    e.preventDefault();
    if (!cardComplete) return;
    setBusy(true);
    startCardLink({
      last4: cardDigits.slice(-4),
      expiry: newCardExpiry,
      network: cardNetwork(cardDigits),
      returnTo: pathname,
      resumeAddMoney: mode === "fund",
    });
    setTimeout(() => router.push("/card-verification"), 700);
  }

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent size="md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              {screen !== "choice" &&
                screen !== "link_choice" &&
                screen !== "internal_success" &&
                screen !== "funding_success" && (
                  <button
                    type="button"
                    onClick={() => {
                      if (screen === "link_momo_pending") {
                        setScreen("link_new_momo");
                      } else if (screen === "link_new_momo" || screen === "link_new_card") {
                        setScreen(linkBackScreen);
                      } else if (screen === "momo_waiting" || screen === "card_3ds") {
                        setScreen("linked_source_select");
                      } else {
                        setScreen("choice");
                      }
                    }}
                    className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer -ml-1 mr-1"
                    aria-label="Back"
                  >
                    <ChevronLeft size={18} strokeWidth={2} />
                  </button>
                )}
              <DialogTitle>
                {screen === "choice" && "Add money"}
                {screen === "link_choice" && (onboarding ? "Link Source Account" : "Link a card or wallet")}
                {screen === "internal_transfer" && "Transfer between accounts"}
                {screen === "internal_success" && "Transfer completed"}
                {screen === "linked_source_select" && "From linked wallet or card"}
                {screen === "momo_waiting" && "Mobile authorization"}
                {screen === "card_3ds" && "Card authorization"}
                {screen === "funding_success" && "Money added"}
                {(screen === "link_new_momo" || screen === "link_momo_pending") && "Link new mobile wallet"}
                {screen === "link_new_card" && "Link new bank card"}
              </DialogTitle>
            </div>
          </DialogHeader>

          <DialogBody>
            {/* ════════════════════════════════════════════════════════════════════
                SCREEN 1: CHOICE MENU (2 Main Options)
                ════════════════════════════════════════════════════════════════════ */}
            {screen === "link_choice" && onboarding && (
              <div className="flex flex-col gap-6">
                <p className="text-[15px] leading-relaxed text-muted-foreground">
                  Choose an account or payment method to link to your new account.
                </p>
                <div className="flex flex-col gap-4">
                  {([
                    {
                      to: "link_new_momo",
                      icon: UserCheck,
                      title: "Link Mobile Money Wallet",
                      hint: "Link your mobile money wallet to get started quickly and securely.",
                    },
                    {
                      to: "link_new_card",
                      icon: CreditCard,
                      title: "Link a Card",
                      hint: "Link your bank card to get started quickly and securely.",
                    },
                  ] as const).map((opt) => (
                    <button
                      key={opt.to}
                      type="button"
                      onClick={() => setScreen(opt.to)}
                      className="group flex items-center gap-4 rounded-2xl bg-[var(--tile)] p-4 text-left transition-colors hover:bg-[var(--tile-hover)] cursor-pointer"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <opt.icon size={17} strokeWidth={1.9} aria-hidden="true" />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="text-[16px] font-medium tracking-[-0.01em] text-foreground">{opt.title}</span>
                        <span className="text-[14px] leading-snug text-muted-foreground">{opt.hint}</span>
                      </span>
                      <ChevronRight
                        size={20}
                        strokeWidth={2}
                        aria-hidden="true"
                        className="shrink-0 text-foreground transition-transform group-hover:translate-x-0.5"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {screen === "link_choice" && !onboarding && (
              <div className="flex flex-col gap-3">
                {([
                  { to: "link_new_momo", icon: Smartphone, title: "Mobile money wallet", hint: "MTN MoMo, Telecel Cash or AT Money" },
                  { to: "link_new_card", icon: CreditCard, title: "Bank card", hint: "A Visa or Mastercard debit card from any bank" },
                ] as const).map((opt) => (
                  <button
                    key={opt.to}
                    type="button"
                    onClick={() => setScreen(opt.to)}
                    className="group flex items-center justify-between rounded-2xl border border-border/80 bg-card p-4 text-left transition-all hover:bg-muted/40 cursor-pointer shadow-xs"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
                        <opt.icon size={18} strokeWidth={1.8} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[14.5px] font-medium text-foreground">{opt.title}</span>
                        <span className="text-[12.5px] text-muted-foreground truncate mt-0.5">{opt.hint}</span>
                      </div>
                    </div>
                    <ChevronRight size={18} strokeWidth={1.8} className="text-muted-foreground/60 shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            )}

            {screen === "choice" && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 pt-1">
                  {/* Option 1: Transfer between accounts — only with another account to move from */}
                  {canTransferBetween && (
                  <button
                    type="button"
                    onClick={() => setScreen("internal_transfer")}
                    className="group flex items-center justify-between rounded-2xl border border-border/80 bg-card p-4 text-left transition-all hover:bg-muted/40 cursor-pointer shadow-xs"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground transition-transform group-hover:scale-105">
                        <ArrowLeftRight size={19} strokeWidth={1.8} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[14.5px] font-medium text-foreground">
                          Transfer between accounts
                        </span>
                        <span className="text-[12.5px] text-muted-foreground truncate mt-0.5">
                          Move money from your other GCB accounts instantly.
                        </span>
                      </div>
                    </div>

                    <ChevronRight
                      size={18}
                      strokeWidth={1.8}
                      className="text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground shrink-0 ml-2"
                    />
                  </button>
                  )}

                  {/* Option 2: From linked mobile wallet or card */}
                  <button
                    type="button"
                    onClick={() => setScreen("linked_source_select")}
                    className="group flex items-center justify-between rounded-2xl border border-border/80 bg-card p-4 text-left transition-all hover:bg-muted/40 cursor-pointer shadow-xs"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground transition-transform group-hover:scale-105">
                        <Wallet size={19} strokeWidth={1.8} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[14.5px] font-medium text-foreground">
                          From linked mobile wallet or card
                        </span>
                        <span className="text-[12.5px] text-muted-foreground truncate mt-0.5">
                          Fund using your linked MTN MoMo, Telecel Cash, or Visa/Mastercard.
                        </span>
                      </div>
                    </div>

                    <ChevronRight
                      size={18}
                      strokeWidth={1.8}
                      className="text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground shrink-0 ml-2"
                    />
                  </button>
                </div>

                <div className="pt-2 flex justify-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClose}
                    className="text-[13px] text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════════
                SCREEN 2: INTERNAL TRANSFER FORM (Standardized Fields)
                ════════════════════════════════════════════════════════════════════ */}
            {screen === "internal_transfer" && (
              <form onSubmit={handleInternalTransferSubmit} className="flex flex-col gap-5">
                {!canTransferBetween ? (
                  <div className="flex flex-col gap-3 py-4 text-center">
                    <p className="text-[13px] text-muted-foreground">
                      No other internal accounts available to transfer from.
                    </p>
                    <Button
                      type="button"
                      onClick={() => setScreen("linked_source_select")}
                      className="w-full"
                    >
                      Fund from mobile wallet or card
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Standard System From Account Selector */}
                    <FromAccountSelector
                      accounts={fundableAccounts.filter((a) => a.id !== destinationAccount?.id)}
                      value={selectedSourceAccount?.id ?? ""}
                      onChange={setSelectedSourceAccountId}
                      label="From Account"
                    />

                    <FromAccountSelector
                      accounts={fundableAccounts.filter((a) => a.id !== selectedSourceAccount?.id)}
                      value={destinationAccount?.id ?? ""}
                      onChange={setDestinationId}
                      label="To Account"
                      placeholder="Select destination account"
                    />

                    {/* Standard System Amount Input with Live Formatting */}
                    <AmountInput
                      value={internalAmount}
                      onChange={setInternalAmount}
                      currency="GHS"
                      label="Amount"
                    />

                    {/* Standard System Narration Input */}
                    <NarrationInput
                      value={internalRef}
                      onChange={setInternalRef}
                      label="Narration"
                      placeholder="Account top-up"
                    />

                    {/* Submit CTA with PIN Authorization Gate */}
                    <div className="pt-2 flex flex-col gap-2.5">
                      <ProceedButton
                        disabled={!selectedSourceAccount || !destinationAccount || !internalAmount || Number(internalAmount) <= 0 || busy}
                        onClick={() => setIsPinModalOpen(true)}
                        label={busy ? "Processing…" : `Transfer ${formatMoney(Number(internalAmount || 0), "GHS", true)}`}
                      />

                      <div className="text-center pt-1">
                        <Link
                          href={`/payments/send?rail=bank&returnUrl=/accounts/${destinationAccount?.id || ""}`}
                          onClick={handleClose}
                          className="text-[12px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Need a standing order or scheduled transfer? <span className="underline underline-offset-2">Use Full Payments</span>
                        </Link>
                      </div>
                    </div>
                  </>
                )}
              </form>
            )}

            {/* ════════════════════════════════════════════════════════════════════
                SCREEN 3: INTERNAL TRANSFER SUCCESS
                ════════════════════════════════════════════════════════════════════ */}
            {screen === "internal_success" && (
              <div className="flex flex-col items-center gap-4 text-center py-2">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={32} strokeWidth={1.8} />
                </div>

                <div className="flex flex-col gap-1">
                  <h3 className="text-[17px] font-medium text-foreground">
                    {formatMoney(Number(internalAmount || 0), "GHS", true)} Transferred
                  </h3>
                  <p className="text-[13px] text-muted-foreground">
                    Transfer completed successfully.
                  </p>
                </div>

                <div className="w-full rounded-2xl border border-border/80 bg-muted/20 p-4 text-left text-[13px] flex flex-col gap-2">
                  <div className="flex justify-between py-0.5 text-muted-foreground">
                    <span>From:</span>
                    <span className="font-medium text-foreground">{selectedSourceAccount?.name}</span>
                  </div>
                  <div className="flex justify-between py-0.5 text-muted-foreground">
                    <span>To:</span>
                    <span className="font-medium text-foreground">{destinationAccount?.name}</span>
                  </div>
                  <div className="flex justify-between py-0.5 text-muted-foreground">
                    <span>Amount:</span>
                    <span className="font-medium text-foreground tabular">
                      {formatMoney(Number(internalAmount || 0), "GHS", true)}
                    </span>
                  </div>
                  <div className="flex justify-between py-0.5 text-muted-foreground">
                    <span>Narration:</span>
                    <span className="text-foreground">{internalRef || "Account top-up"}</span>
                  </div>
                  <div className="flex justify-between py-0.5 text-muted-foreground">
                    <span>Status:</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">Completed</span>
                  </div>
                </div>

                <Button type="button" onClick={handleClose} className="w-full mt-2 h-11 rounded-xl">
                  Done
                </Button>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════════
                SCREEN 4: LINKED SOURCE SELECT (Wallets & Cards)
                ════════════════════════════════════════════════════════════════════ */}
            {screen === "linked_source_select" && (
              <form onSubmit={handleLinkedSourceSubmit} className="flex flex-col gap-5">
                {/* List of Saved Methods */}
                <div className="flex flex-col gap-2.5">
                  <label className="text-[14px] font-medium text-foreground">
                    Payment Method
                  </label>
                  <div className="flex flex-col gap-2">
                    {linkedSources.map((source) => {
                      const isSelected = selectedSourceId === source.id;
                      return (
                        <button
                          key={source.id}
                          type="button"
                          onClick={() => setSelectedSourceId(source.id)}
                          className={`flex items-center justify-between rounded-2xl border p-3.5 text-left transition-all cursor-pointer ${
                            isSelected
                              ? "border-foreground bg-muted/60"
                              : "border-border/80 bg-card hover:bg-muted/30"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
                              {source.type === "momo" ? (
                                <Smartphone size={17} strokeWidth={1.8} />
                              ) : (
                                <CreditCard size={17} strokeWidth={1.8} />
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[14px] font-medium text-foreground">
                                {source.title}
                              </span>
                              <span className="text-[12px] text-muted-foreground font-mono">
                                {source.subtitle}
                              </span>
                            </div>
                          </div>

                          {isSelected && (
                            <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                              <Check size={12} strokeWidth={2.5} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Only sources already linked can fund an account here; linking lives on Accounts. */}
                  {linkedSources.length === 0 && (
                    <p className="rounded-2xl border border-border/80 bg-muted/20 px-4 py-3.5 text-[13px] text-muted-foreground">
                      You haven&apos;t linked a wallet or card yet.{" "}
                      <Link
                        href="/accounts?link_source=true"
                        onClick={handleClose}
                        className="text-foreground underline underline-offset-4 hover:no-underline"
                      >
                        Link one on Accounts
                      </Link>
                    </p>
                  )}
                </div>

                <FromAccountSelector
                  accounts={fundableAccounts}
                  value={destinationAccount?.id ?? ""}
                  onChange={setDestinationId}
                  label="To Account"
                  placeholder="Select destination account"
                />

                {/* Standard System Amount Input */}
                <AmountInput
                  value={linkedAmount}
                  onChange={setLinkedAmount}
                  currency="GHS"
                  label="Amount"
                />

                {/* Actions */}
                <div className="pt-2 flex flex-col gap-2">
                  <ProceedButton
                    disabled={!activeLinkedSource || !destinationAccount || !linkedAmount || Number(linkedAmount) <= 0 || busy}
                    onClick={() => {
                      setBusy(true);
                      setTimeout(() => {
                        setBusy(false);
                        if (activeLinkedSource?.type === "momo") {
                          setScreen("momo_waiting");
                        } else {
                          setScreen("card_3ds");
                        }
                      }, 400);
                    }}
                    label={busy ? "Connecting…" : `Proceed with ${activeLinkedSource?.title || "selected method"}`}
                  />
                </div>
              </form>
            )}

            {/* ════════════════════════════════════════════════════════════════════
                SCREEN 5: MOMO WAITING FOR APPROVAL
                ════════════════════════════════════════════════════════════════════ */}
            {screen === "momo_waiting" && (
              <div className="flex flex-col items-center gap-4 text-center py-2">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-muted text-foreground animate-pulse">
                  <Smartphone size={28} strokeWidth={1.8} />
                </div>

                <div className="flex flex-col gap-1">
                  <h3 className="text-[17px] font-medium text-foreground">
                    Mobile Money Prompt Sent
                  </h3>
                  <p className="text-[13px] text-muted-foreground">
                    Enter your PIN on <strong className="text-foreground">{activeLinkedSource?.subtitle}</strong> to add {formatMoney(Number(linkedAmount || 0), "GHS", true)} to {destinationAccount?.name}.
                  </p>
                </div>

                <div className="w-full flex flex-col gap-2 pt-3">
                  <Button
                    type="button"
                    onClick={handleMomoApprove}
                    disabled={busy}
                    className="w-full h-11 rounded-xl"
                  >
                    {busy ? "Confirming…" : "I have approved on my phone"}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setScreen("linked_source_select")}
                    className="text-[13px] text-muted-foreground"
                  >
                    Back to payment methods
                  </Button>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════════
                SCREEN 6: CARD 3D SECURE
                ════════════════════════════════════════════════════════════════════ */}
            {screen === "card_3ds" && (
              <form onSubmit={handle3dsSubmit} className="flex flex-col gap-4">
                <div className="rounded-2xl border border-border/80 bg-muted/30 p-3.5 text-[12.5px] text-muted-foreground">
                  <p className="font-medium text-foreground">Card 3D Secure Authentication</p>
                  <p className="mt-0.5">
                    Enter test code (e.g. 123456) to authenticate {formatMoney(Number(linkedAmount || 0), "GHS", true)}.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor={`${modalId}-otp3ds`} className="text-[13px] font-medium text-foreground">
                    One-time password (OTP)
                  </label>
                  <input
                    id={`${modalId}-otp3ds`}
                    type="password"
                    value={threeDsCode}
                    onChange={(e) => setThreeDsCode(e.target.value)}
                    placeholder="123456"
                    className="h-11 w-full rounded-xl border border-border bg-card px-3.5 font-mono text-[14px] text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <Button type="submit" disabled={busy} className="w-full h-11 rounded-xl">
                    {busy ? "Authorizing…" : "Submit & fund account"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setScreen("linked_source_select")}
                    className="text-[13px] text-muted-foreground"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}

            {/* ════════════════════════════════════════════════════════════════════
                SCREEN 7: LINKED FUNDING SUCCESS
                ════════════════════════════════════════════════════════════════════ */}
            {screen === "funding_success" && (
              <div className="flex flex-col items-center gap-4 text-center py-2">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={32} strokeWidth={1.8} />
                </div>

                <div className="flex flex-col gap-1">
                  <h3 className="text-[17px] font-medium text-foreground">
                    {formatMoney(Number(linkedAmount || 0), "GHS", true)} added to {destinationAccount?.name}
                  </h3>
                  <p className="text-[13px] text-muted-foreground">
                    From {activeLinkedSource?.title}. It&apos;s in your balance now.
                  </p>
                </div>

                <div className="w-full rounded-2xl border border-border/80 bg-muted/20 p-4 text-left text-[13px] flex flex-col gap-2">
                  <div className="flex justify-between py-0.5 text-muted-foreground">
                    <span>Source:</span>
                    <span className="font-medium text-foreground">{activeLinkedSource?.title}</span>
                  </div>
                  <div className="flex justify-between py-0.5 text-muted-foreground">
                    <span>Destination:</span>
                    <span className="font-medium text-foreground">{destinationAccount?.name}</span>
                  </div>
                  <div className="flex justify-between py-0.5 text-muted-foreground">
                    <span>Amount:</span>
                    <span className="font-medium text-foreground tabular">
                      {formatMoney(Number(linkedAmount || 0), "GHS", true)}
                    </span>
                  </div>
                  <div className="flex justify-between py-0.5 text-muted-foreground">
                    <span>Status:</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">Completed</span>
                  </div>
                </div>

                <Button type="button" onClick={handleClose} className="w-full mt-2 h-11 rounded-xl">
                  Done
                </Button>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════════
                SCREEN 8: LINK NEW MOMO WALLET
                ════════════════════════════════════════════════════════════════════ */}
            {screen === "link_new_momo" && (
              <form onSubmit={handleAddNewMomo} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={`${modalId}-momoNum`} className="text-[13px] font-medium text-foreground">
                    Mobile number
                  </label>
                  <PhoneInput
                    id={`${modalId}-momoNum`}
                    value={newMomoNumber}
                    onValueChange={setNewMomoNumber}
                    className="rounded-xl border-border bg-card"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-medium text-foreground">
                    Network operator
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["MTN", "Telecel", "AT"] as const).map((op) => (
                      <button
                        key={op}
                        type="button"
                        onClick={() => setNewMomoOperator(op)}
                        className={`h-10 rounded-xl border text-[13px] font-medium transition-all cursor-pointer ${
                          newMomoOperator === op
                            ? "border-foreground bg-muted text-foreground"
                            : "border-border bg-card text-muted-foreground hover:bg-muted/40"
                        }`}
                      >
                        {op}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <Button
                    type="submit"
                    disabled={!isCompleteGhanaMobile(newMomoNumber) || busy}
                    className="w-full h-11 rounded-xl"
                  >
                    {busy ? "Sending request…" : mode === "link" ? "Link wallet" : "Save & use wallet"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setScreen(linkBackScreen)}
                    className="text-[13px] text-muted-foreground"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}

            {/* ════════════════════════════════════════════════════════════════════
                SCREEN 8b: NEW MOMO — WAITING FOR APPROVAL ON THE PHONE
                ════════════════════════════════════════════════════════════════════ */}
            {screen === "link_momo_pending" && (
              <div className="flex flex-col items-center gap-4 text-center py-2">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-muted text-foreground animate-pulse">
                  <Smartphone size={28} strokeWidth={1.8} aria-hidden="true" />
                </div>

                <div className="flex flex-col gap-1.5" role="status">
                  <h3 className="text-[17px] text-foreground tracking-[-0.01em]">Approve on your phone</h3>
                  <p className="text-[13px] leading-relaxed text-muted-foreground tabular">
                    We&apos;ve sent a request to {displayGhanaMobile(newMomoNumber)}. Approve it with your{" "}
                    {newMomoOperator} MoMo PIN, then come back here to confirm.
                  </p>
                </div>

                <div className="w-full flex flex-col gap-2 pt-2">
                  <Button
                    type="button"
                    onClick={handleMomoLinkApproved}
                    disabled={busy}
                    className="w-full h-11 rounded-xl"
                  >
                    {busy ? "Checking…" : "I've approved it"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={busy || momoResent}
                    onClick={() => setMomoResent(true)}
                    className="text-[13px] text-muted-foreground"
                  >
                    {momoResent ? "Request sent again" : "Didn't get it? Send again"}
                  </Button>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════════
                SCREEN 9: LINK NEW CARD
                ════════════════════════════════════════════════════════════════════ */}
            {screen === "link_new_card" && (
              <form onSubmit={handleAddNewCard} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={`${modalId}-cardNum`} className="text-[13px] font-medium text-foreground">
                    Card number
                  </label>
                  <input
                    id={`${modalId}-cardNum`}
                    type="text"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    value={newCardNumber}
                    onChange={(e) =>
                      setNewCardNumber(
                        e.target.value.replace(/\D/g, "").slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 ")
                      )
                    }
                    placeholder="4000 1234 5678 9010"
                    className="h-11 w-full rounded-xl border border-border bg-card px-3 font-mono tabular text-[14px] text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor={`${modalId}-cardExp`} className="text-[13px] font-medium text-foreground">
                      Expiry date
                    </label>
                    <input
                      id={`${modalId}-cardExp`}
                      type="text"
                      inputMode="numeric"
                      autoComplete="cc-exp"
                      value={newCardExpiry}
                      onChange={(e) => {
                        const d = e.target.value.replace(/\D/g, "").slice(0, 4);
                        setNewCardExpiry(d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d);
                      }}
                      placeholder="MM/YY"
                      className="h-11 w-full rounded-xl border border-border bg-card px-3 tabular text-[14px] text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor={`${modalId}-cardCvv`} className="text-[13px] font-medium text-foreground">
                      CVV
                    </label>
                    <input
                      id={`${modalId}-cardCvv`}
                      type="password"
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      maxLength={4}
                      value={newCardCvv}
                      onChange={(e) => setNewCardCvv(e.target.value.replace(/\D/g, ""))}
                      placeholder="•••"
                      className="h-11 w-full rounded-xl border border-border bg-card px-3 tabular text-[14px] text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                      required
                    />
                  </div>
                </div>

                <p className="text-[12.5px] text-muted-foreground">
                  Your bank will ask you to confirm it&apos;s you, then bring you back here.
                </p>

                <div className="flex flex-col gap-2">
                  <Button type="submit" disabled={!cardComplete || busy} className="w-full h-11 rounded-xl">
                    {busy ? "Taking you to your bank…" : mode === "link" ? "Link card" : "Save & use card"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setScreen(linkBackScreen)}
                    className="text-[13px] text-muted-foreground"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* Transaction PIN Authorization Gate */}
      <TransactionPinModal
        open={isPinModalOpen}
        onOpenChange={setIsPinModalOpen}
        onSuccess={handlePinSuccess}
        title="Authorise Transfer"
      />
    </>
  );
}
