"use client";

import { InlineError } from "@/components/ui/inline-error";
import { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  CheckCircle2,
  ChevronLeft,
  CreditCard,
  ShieldCheck,
  Smartphone,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Account, accountsForProfile, formatMoney } from "@/lib/mock-data";
import { useSession } from "@/lib/session-store";
import { useLinkedSources, type LinkedSource, type NetworkOperator } from "@/lib/accounts-store";
import TransactionOtpModal from "@/components/payments/TransactionOtpModal";
import {
  FromAccountSelector,
  AmountInput,
  NarrationInput,
  OperatorSelect,
} from "@/components/payments/flows/shared";
import { PhoneInput } from "@/components/ui/phone-input";
import OtpInput, { OTP_LENGTH } from "@/components/auth/OtpInput";
import { AppLoader } from "@/components/ui/loader";
import { displayGhanaMobile, displayLocalMobile, isCompleteGhanaMobile } from "@/lib/phone";
import { ActionTile } from "@/components/ui/action-tile";
import { cardNetwork, useCardLink } from "@/lib/card-link";
import { useCardPayment } from "@/lib/card-payment";
import { OPERATORS } from "@/lib/operators";
import { SourceMark } from "@/components/ui/source-mark";
import { CheckBadge } from "@/components/ui/check-badge";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field } from "@/components/ui/field";
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
  /** Back from the bank's page after a card payment: the amount that was being added. */
  initialAmount?: string;
  /** Back from the bank's page after a card payment: the account the money was going to. */
  initialDestinationId?: string;
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
  | "funding_success"
  | "link_new_momo"
  | "link_momo_pending"
  | "link_momo_code"
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
  initialAmount,
  initialDestinationId,
  onboarding = false,
}: LinkSourceAccountModalProps) {
  const router = useRouter();
  const pathname = usePathname();
  const startCardLink = useCardLink((s) => s.start);
  const startCardPayment = useCardPayment((s) => s.start);
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
    initialDestinationId ?? targetAccountProp?.id ?? fundableAccounts[0]?.id ?? ""
  );
  useEffect(() => {
    if (isOpen) setDestinationId(initialDestinationId ?? targetAccountProp?.id ?? fundableAccounts[0]?.id ?? "");
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
  const [momoCode, setMomoCode] = useState<string[]>(() => Array(OTP_LENGTH).fill(""));
  const [momoCodeError, setMomoCodeError] = useState(false);

  function handleMomoCode(code: string) {
    if (busy) return;
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      // Demo: 000000 is the wrong-code state.
      if (code === "000000") {
        setMomoCodeError(true);
        setMomoCode(Array(OTP_LENGTH).fill(""));
        return;
      }
      confirmNewMomo();
    }, 700);
  }

  // New Card form
  const [newCardNumber, setNewCardNumber] = useState("");
  const [newCardExpiry, setNewCardExpiry] = useState("");
  const [newCardCvv, setNewCardCvv] = useState("");
  const cardDigits = newCardNumber.replace(/\D/g, "");
  const cardComplete =
    cardDigits.length >= 15 && /^(0[1-9]|1[0-2])\/\d{2}$/.test(newCardExpiry) && newCardCvv.length >= 3;

  // Reopening after the bank's card page lands on the requested screen with the
  // new card selected, instead of wherever the modal was left.
  useEffect(() => {
    if (!isOpen) return;
    setScreen(startScreen);
    if (initialSourceId) setSelectedSourceId(initialSourceId);
    if (initialAmount) setLinkedAmount(initialAmount);
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
        startLinkedCardPayment();
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

  // A linked card is charged by the card's own bank on its page (3-D Secure), which sends the customer back to
  // whichever page opened this. That page reopens the modal on the receipt (or on this form after a cancel),
  // using what travels in `context`. Only the last four digits make the trip.
  function startLinkedCardPayment() {
    if (!activeLinkedSource || !destinationAccount) return;
    const digits = activeLinkedSource.maskedNumber?.replace(/\D/g, "") ?? "";
    const amount = Number(linkedAmount) || 0;
    startCardPayment({
      flow: "linked-source-fund",
      amount,
      currency: "GHS",
      last4: digits.slice(-4),
      network: /union/i.test(activeLinkedSource.title)
        ? "UnionPay"
        : /master/i.test(activeLinkedSource.title)
          ? "Mastercard"
          : /visa/i.test(activeLinkedSource.title)
            ? "Visa"
            : cardNetwork(digits),
      merchant: "GCB Bank PLC",
      description: `Top up ${destinationAccount.name}`,
      returnTo: `${pathname}${window.location.search}`,
      context: { sourceId: activeLinkedSource.id, destinationId: destinationAccount.id, amount: linkedAmount },
    });
    router.push("/card-verification");
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
      // New to GCB: the number is confirmed with a 6-digit code instead — the
      // "approve on your phone" prompt comes later, when they actually fund.
      if (onboarding) {
        setMomoCode(Array(OTP_LENGTH).fill(""));
        setMomoCodeError(false);
        setScreen("link_momo_code");
      } else {
        setScreen("link_momo_pending");
      }
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
      title: OPERATORS[newMomoOperator].wallet,
      subtitle: displayLocalMobile(newMomoNumber),
      operator: newMomoOperator,
      maskedNumber: displayLocalMobile(newMomoNumber),
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
      onboarding,
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
                      if (screen === "link_momo_pending" || screen === "link_momo_code") {
                        setScreen("link_new_momo");
                      } else if (screen === "link_new_momo" || screen === "link_new_card") {
                        setScreen(linkBackScreen);
                      } else if (screen === "momo_waiting") {
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
                {screen === "choice" && "Add Money"}
                {screen === "link_choice" && (onboarding ? "Link Source Account" : "Link a Card or Wallet")}
                {screen === "internal_transfer" && "Transfer Between Accounts"}
                {screen === "internal_success" && "Transfer Completed"}
                {screen === "linked_source_select" && "From Linked Wallet or Card"}
                {screen === "momo_waiting" && "Mobile Authorization"}
                {screen === "funding_success" && "Money Added"}
                {(screen === "link_new_momo" || screen === "link_momo_pending") && "Link New Mobile Wallet"}
                {screen === "link_momo_code" && "Confirm Your Code"}
                {screen === "link_new_card" && "Link New Bank Card"}
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
                      icon: Smartphone,
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
                    <ActionTile key={opt.to} icon={opt.icon} title={opt.title} description={opt.hint} onClick={() => setScreen(opt.to)} />
                  ))}
                </div>
              </div>
            )}

            {screen === "link_choice" && !onboarding && (
              <div className="flex flex-col gap-4">
                {([
                  { to: "link_new_momo", icon: Smartphone, title: "Mobile money wallet", hint: "MTN MoMo, Telecel Cash, AT Money, GhanaPay or G-Money" },
                  { to: "link_new_card", icon: CreditCard, title: "Bank card", hint: "Visa, Mastercard or UnionPay" },
                ] as const).map((opt) => (
                  <ActionTile key={opt.to} icon={opt.icon} title={opt.title} description={opt.hint} onClick={() => setScreen(opt.to)} />
                ))}
              </div>
            )}

            {screen === "choice" && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-4 pt-1">
                  {/* Transfer between accounts: only with another account to move from */}
                  {canTransferBetween && (
                    <ActionTile
                      icon={ArrowLeftRight}
                      title="Transfer between accounts"
                      description="Move money from your other GCB accounts instantly."
                      onClick={() => setScreen("internal_transfer")}
                    />
                  )}
                  <ActionTile
                    icon={Wallet}
                    title="From linked mobile wallet or card"
                    description="Fund using your linked MTN MoMo, Telecel Cash, or Visa/Mastercard."
                    onClick={() => setScreen("linked_source_select")}
                  />
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
                    <div className="pt-2">
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
                <div className="flex size-14 items-center justify-center rounded-2xl bg-success/10 text-success-text">
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
                    <span className="font-medium text-success-text">Completed</span>
                  </div>
                </div>

              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════════
                SCREEN 4: LINKED SOURCE SELECT (Wallets & Cards)
                ════════════════════════════════════════════════════════════════════ */}
            {screen === "linked_source_select" && (
              <form onSubmit={handleLinkedSourceSubmit} className="flex flex-col gap-5">
                {/* List of Saved Methods */}
                <div className="flex flex-col gap-2.5">
                  <Label>
                    Payment Method
                  </Label>
                  <div className="flex flex-col gap-2">
                    {linkedSources.map((source) => {
                      const isSelected = selectedSourceId === source.id;
                      return (
                        <button
                          key={source.id}
                          type="button"
                          onClick={() => setSelectedSourceId(source.id)}
                          className={`flex items-center justify-between rounded-2xl border p-3.5 text-left transition cursor-pointer ${
                            isSelected
                              ? "border-[var(--active-border)] bg-[var(--active-bg)]"
                              : "border-border bg-card hover:bg-muted/50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <SourceMark type={source.type} operator={source.operator} title={source.title} />
                            <div className="flex flex-col">
                              <span className="text-[14px] font-medium text-foreground">
                                {source.title}
                              </span>
                              <span className="text-[12px] text-muted-foreground">
                                {source.subtitle}
                              </span>
                            </div>
                          </div>

                          {isSelected && (
                            <CheckBadge />
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
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════════
                SCREEN 7: LINKED FUNDING SUCCESS
                ════════════════════════════════════════════════════════════════════ */}
            {screen === "funding_success" && (
              <div className="flex flex-col items-center gap-4 text-center py-2">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-success/10 text-success-text">
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
                    <span className="font-medium text-success-text">Completed</span>
                  </div>
                </div>

              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════════
                SCREEN 8: LINK NEW MOMO WALLET
                ════════════════════════════════════════════════════════════════════ */}
            {screen === "link_new_momo" && (
              <form id={`${modalId}-momo-form`} onSubmit={handleAddNewMomo} className="flex flex-col gap-5">
                <Field label="Mobile Number" htmlFor={`${modalId}-momoNum`}>
                  <PhoneInput
                    id={`${modalId}-momoNum`}
                    value={newMomoNumber}
                    onValueChange={setNewMomoNumber}
                    required
                  />
</Field>

                <Field label="Network Operator">
                  <OperatorSelect value={newMomoOperator} onChange={setNewMomoOperator} />
</Field>
              </form>
            )}

            {/* ════════════════════════════════════════════════════════════════════
                SCREEN 8b: NEW MOMO — WAITING FOR APPROVAL ON THE PHONE
                ════════════════════════════════════════════════════════════════════ */}
            {screen === "link_momo_code" && (
              <div className="flex flex-col items-center gap-5 py-2 text-center">
                <p className="text-[13.5px] leading-relaxed text-muted-foreground">
                  Enter the 6-digit code sent to{" "}
                  <span className="text-foreground tabular">{displayGhanaMobile(newMomoNumber)}</span>.
                </p>
                <OtpInput
                  value={momoCode}
                  onChange={(next) => {
                    setMomoCode(next);
                    setMomoCodeError(false);
                  }}
                  onComplete={handleMomoCode}
                  disabled={busy}
                  invalid={momoCodeError}
                />
                {busy && (
                  <div className="flex items-center gap-2 text-[13.5px] text-muted-foreground">
                    <AppLoader size={16} />
                    <span>Verifying code…</span>
                  </div>
                )}
                <InlineError message={momoCodeError && "That code didn’t match. Check the latest SMS and try again."} />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy || momoResent}
                  onClick={() => setMomoResent(true)}
                  className="text-[13px] text-muted-foreground"
                >
                  {momoResent ? "Code sent again" : "Didn't get it? Send again"}
                </Button>
              </div>
            )}

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
              </div>
            )}

            {/* ════════════════════════════════════════════════════════════════════
                SCREEN 9: LINK NEW CARD
                ════════════════════════════════════════════════════════════════════ */}
            {screen === "link_new_card" && (
              <form id={`${modalId}-card-form`} onSubmit={handleAddNewCard} className="flex flex-col gap-5">
                <Field label="Card Number" htmlFor={`${modalId}-cardNum`}>
                  <Input
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
                    className="tabular"
                    required
                  />
</Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Expiry Date" htmlFor={`${modalId}-cardExp`}>
                    <Input
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
                      className="tabular"
                      required
                    />
</Field>
                  <Field label="CVV" htmlFor={`${modalId}-cardCvv`}>
                    <Input
                      id={`${modalId}-cardCvv`}
                      type="password"
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      maxLength={4}
                      value={newCardCvv}
                      onChange={(e) => setNewCardCvv(e.target.value.replace(/\D/g, ""))}
                      placeholder="•••"
                      className="tabular"
                      required
                    />
</Field>
                </div>

                <p className="flex items-start gap-2 text-[12px] leading-relaxed text-muted-foreground">
                  <ShieldCheck size={14} strokeWidth={1.8} className="mt-0.5 shrink-0" aria-hidden="true" />
                  Your bank will ask you to confirm it&apos;s you, then bring you back here.
                </p>
              </form>
            )}
          </DialogBody>

          {screen === "choice" && (
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
            </DialogFooter>
          )}
          {screen === "internal_transfer" && (
            <DialogFooter>
              <Button
                type="button"
                disabled={!selectedSourceAccount || !destinationAccount || !internalAmount || Number(internalAmount) <= 0}
                loading={busy}
                onClick={() => setIsPinModalOpen(true)}
              >
                {`Transfer ${formatMoney(Number(internalAmount || 0), "GHS", true)}`}
              </Button>
            </DialogFooter>
          )}
          {(screen === "internal_success" || screen === "funding_success") && (
            <DialogFooter>
              <Button type="button" onClick={handleClose}>
                Done
              </Button>
            </DialogFooter>
          )}
          {screen === "linked_source_select" && (
            <DialogFooter>
              <Button
                type="button"
                disabled={!activeLinkedSource || !destinationAccount || !linkedAmount || Number(linkedAmount) <= 0 || busy}
                loading={busy}
                onClick={() => {
                  setBusy(true);
                  setTimeout(() => {
                    setBusy(false);
                    if (activeLinkedSource?.type === "momo") {
                      setScreen("momo_waiting");
                    } else {
                      startLinkedCardPayment();
                    }
                  }, 400);
                }}
              >
                {`Proceed with ${activeLinkedSource?.title || "selected method"}`}
              </Button>
            </DialogFooter>
          )}
          {screen === "momo_waiting" && (
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setScreen("linked_source_select")}>
                Back to payment methods
              </Button>
              <Button type="button" onClick={handleMomoApprove} loading={busy}>
                I have approved on my phone
              </Button>
            </DialogFooter>
          )}
          {screen === "link_momo_pending" && (
            <DialogFooter>
              <Button type="button" variant="ghost" disabled={busy || momoResent} onClick={() => setMomoResent(true)}>
                {momoResent ? "Request sent again" : "Didn't get it? Send again"}
              </Button>
              <Button type="button" onClick={handleMomoLinkApproved} loading={busy}>
                I&apos;ve approved it
              </Button>
            </DialogFooter>
          )}

          {screen === "link_new_momo" && (
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setScreen(linkBackScreen)}>
                Cancel
              </Button>
              <Button type="submit" form={`${modalId}-momo-form`} disabled={!isCompleteGhanaMobile(newMomoNumber)} loading={busy}>
                {mode === "link" ? "Link wallet" : "Save & use wallet"}
              </Button>
            </DialogFooter>
          )}
          {screen === "link_new_card" && (
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setScreen(linkBackScreen)}>
                Cancel
              </Button>
              <Button type="submit" form={`${modalId}-card-form`} disabled={!cardComplete} loading={busy}>
                {mode === "link" ? "Link card" : "Save & use card"}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Transaction PIN Authorization Gate */}
      <TransactionOtpModal
        open={isPinModalOpen}
        onOpenChange={setIsPinModalOpen}
        onSuccess={handlePinSuccess}
        title="Authorise Transfer"
      />
    </>
  );
}
