"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Landmark,
  Plus,
  Smartphone,
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
import TransactionPinModal from "@/components/payments/TransactionPinModal";
import {
  FromAccountSelector,
  AmountInput,
  NarrationInput,
  ProceedButton,
} from "@/components/payments/flows/shared";

interface LinkSourceAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetAccount?: Account | null;
  initialScreen?: ModalScreen;
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
  | "link_new_card";

type NetworkOperator = "MTN" | "Telecel" | "AT";

interface LinkedSource {
  id: string;
  type: "momo" | "card";
  title: string;
  subtitle: string;
  operator?: NetworkOperator;
  maskedNumber: string;
}

const DEFAULT_LINKED_SOURCES: LinkedSource[] = [
  {
    id: "src-momo-1",
    type: "momo",
    title: "MTN Mobile Money",
    subtitle: "024 123 4567",
    operator: "MTN",
    maskedNumber: "024 123 4567",
  },
  {
    id: "src-momo-2",
    type: "momo",
    title: "Telecel Cash",
    subtitle: "020 987 6543",
    operator: "Telecel",
    maskedNumber: "020 987 6543",
  },
  {
    id: "src-card-1",
    type: "card",
    title: "Visa Debit Card",
    subtitle: "•••• 9102 · Exp 12/28",
    maskedNumber: "•••• 9102",
  },
];

export default function LinkSourceAccountModal({
  isOpen,
  onClose,
  targetAccount: targetAccountProp,
  initialScreen = "choice",
}: LinkSourceAccountModalProps) {
  const modalId = useId();
  const activeProfile = useSession((s) => s.activeProfile);
  const allAccounts = useMemo(
    () => accountsForProfile(activeProfile?.kind ?? "RETAIL"),
    [activeProfile?.kind]
  );

  // Resolved destination account
  const destinationAccount = targetAccountProp || allAccounts[0] || null;

  // Other available accounts for internal transfer
  const availableSourceAccounts = useMemo(
    () => allAccounts.filter((a) => a.id !== destinationAccount?.id),
    [allAccounts, destinationAccount?.id]
  );

  const [screen, setScreen] = useState<ModalScreen>(initialScreen);
  const [busy, setBusy] = useState(false);

  // ── Flow 1: Internal Transfer State ──
  const [selectedSourceAccountId, setSelectedSourceAccountId] = useState<string>(
    availableSourceAccounts[0]?.id || ""
  );
  const [internalAmount, setInternalAmount] = useState("500.00");
  const [internalRef, setInternalRef] = useState("Account top-up");

  const selectedSourceAccount = useMemo(
    () => allAccounts.find((a) => a.id === selectedSourceAccountId) || availableSourceAccounts[0],
    [allAccounts, selectedSourceAccountId, availableSourceAccounts]
  );

  // ── Flow 2: Linked Wallets / Cards State ──
  const [linkedSources, setLinkedSources] = useState<LinkedSource[]>(DEFAULT_LINKED_SOURCES);
  const [selectedSourceId, setSelectedSourceId] = useState<string>(DEFAULT_LINKED_SOURCES[0].id);
  const [linkedAmount, setLinkedAmount] = useState("250.00");

  // New MoMo form
  const [newMomoNumber, setNewMomoNumber] = useState("");
  const [newMomoOperator, setNewMomoOperator] = useState<NetworkOperator>("MTN");

  // New Card form
  const [newCardNumber, setNewCardNumber] = useState("");
  const [newCardExpiry, setNewCardExpiry] = useState("");
  const [newCardCvv, setNewCardCvv] = useState("");
  const [newCardName, setNewCardName] = useState("");

  // Simulated OTP
  const [threeDsCode, setThreeDsCode] = useState("");

  const activeLinkedSource = useMemo(
    () => linkedSources.find((s) => s.id === selectedSourceId) || linkedSources[0],
    [linkedSources, selectedSourceId]
  );

  const [isPinModalOpen, setIsPinModalOpen] = useState(false);

  // Reset helper when modal closes
  function handleClose() {
    setScreen("choice");
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

  function handleAddNewMomo(e: React.FormEvent) {
    e.preventDefault();
    if (!newMomoNumber.trim()) return;
    const newSource: LinkedSource = {
      id: `src-momo-${Date.now()}`,
      type: "momo",
      title: `${newMomoOperator} Mobile Money`,
      subtitle: newMomoNumber,
      operator: newMomoOperator,
      maskedNumber: newMomoNumber,
    };
    setLinkedSources((prev) => [newSource, ...prev]);
    setSelectedSourceId(newSource.id);
    setScreen("linked_source_select");
  }

  function handleAddNewCard(e: React.FormEvent) {
    e.preventDefault();
    if (!newCardNumber.trim()) return;
    const cleanNum = newCardNumber.replace(/\s+/g, "");
    const last4 = cleanNum.slice(-4) || "0000";
    const newSource: LinkedSource = {
      id: `src-card-${Date.now()}`,
      type: "card",
      title: "Visa Debit Card",
      subtitle: `•••• ${last4} · Exp ${newCardExpiry || "12/28"}`,
      maskedNumber: `•••• ${last4}`,
    };
    setLinkedSources((prev) => [newSource, ...prev]);
    setSelectedSourceId(newSource.id);
    setScreen("linked_source_select");
  }

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent size="md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              {screen !== "choice" &&
                screen !== "internal_success" &&
                screen !== "funding_success" && (
                  <button
                    type="button"
                    onClick={() => {
                      if (screen === "link_new_momo" || screen === "link_new_card") {
                        setScreen("linked_source_select");
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
                {screen === "choice" && "Fund account"}
                {screen === "internal_transfer" && "Transfer between accounts"}
                {screen === "internal_success" && "Transfer completed"}
                {screen === "linked_source_select" && "From linked wallet or card"}
                {screen === "momo_waiting" && "Mobile authorization"}
                {screen === "card_3ds" && "Card authorization"}
                {screen === "funding_success" && "Funding successful"}
                {screen === "link_new_momo" && "Link new mobile wallet"}
                {screen === "link_new_card" && "Link new bank card"}
              </DialogTitle>
            </div>
          </DialogHeader>

          <DialogBody>
            {/* ════════════════════════════════════════════════════════════════════
                SCREEN 1: CHOICE MENU (2 Main Options)
                ════════════════════════════════════════════════════════════════════ */}
            {screen === "choice" && (
              <div className="flex flex-col gap-4">
                {/* Destination Account Preview */}
                {destinationAccount && (
                  <div className="flex items-center justify-between rounded-2xl border border-border/80 bg-muted/30 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <Landmark size={17} strokeWidth={1.8} />
                      </span>
                      <div className="flex flex-col text-left">
                        <span className="text-[14px] font-medium text-foreground">
                          {destinationAccount.name}
                        </span>
                        <span className="text-[12px] text-muted-foreground font-mono tabular">
                          {destinationAccount.number}
                        </span>
                      </div>
                    </div>
                    <span className="text-[13.5px] font-medium text-foreground tabular">
                      {formatMoney(destinationAccount.available, destinationAccount.currency, true)}
                    </span>
                  </div>
                )}

                <div className="flex flex-col gap-3 pt-1">
                  {/* Option 1: Transfer between accounts */}
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
                {availableSourceAccounts.length === 0 ? (
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
                      accounts={availableSourceAccounts}
                      value={selectedSourceAccountId}
                      onChange={setSelectedSourceAccountId}
                      label="From Account"
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
                        disabled={!internalAmount || Number(internalAmount) <= 0 || busy}
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

                  {/* Add New Source Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setScreen("link_new_momo")}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2 px-3 text-[12.5px] text-muted-foreground hover:text-foreground hover:border-foreground/40 hover:bg-muted/20 transition-all cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>New MoMo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setScreen("link_new_card")}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2 px-3 text-[12.5px] text-muted-foreground hover:text-foreground hover:border-foreground/40 hover:bg-muted/20 transition-all cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>New Card</span>
                    </button>
                  </div>
                </div>

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
                    disabled={!linkedAmount || Number(linkedAmount) <= 0 || busy}
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
                    Enter your PIN on <strong className="text-foreground">{activeLinkedSource?.subtitle}</strong> to approve {formatMoney(Number(linkedAmount || 0), "GHS", true)}.
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
                    {formatMoney(Number(linkedAmount || 0), "GHS", true)} Deposited
                  </h3>
                  <p className="text-[13px] text-muted-foreground">
                    Funds added to {destinationAccount?.name}.
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
                  <div className="flex rounded-xl border border-border bg-card focus-within:ring-1 focus-within:ring-primary overflow-hidden">
                    <span className="flex items-center border-r border-border px-3 text-[13.5px] font-medium text-muted-foreground select-none">
                      +233
                    </span>
                    <input
                      id={`${modalId}-momoNum`}
                      type="tel"
                      value={newMomoNumber}
                      onChange={(e) => setNewMomoNumber(e.target.value)}
                      placeholder="24 123 4567"
                      className="h-11 w-full bg-transparent px-3 text-[14px] text-foreground focus:outline-hidden"
                      required
                    />
                  </div>
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
                  <Button type="submit" className="w-full h-11 rounded-xl">
                    Save & use wallet
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
                SCREEN 9: LINK NEW CARD
                ════════════════════════════════════════════════════════════════════ */}
            {screen === "link_new_card" && (
              <form onSubmit={handleAddNewCard} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={`${modalId}-cardName`} className="text-[13px] font-medium text-foreground">
                    Cardholder name
                  </label>
                  <input
                    id={`${modalId}-cardName`}
                    type="text"
                    value={newCardName}
                    onChange={(e) => setNewCardName(e.target.value)}
                    placeholder="Ama Serwaa"
                    className="h-11 w-full rounded-xl border border-border bg-card px-3 text-[14px] text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor={`${modalId}-cardNum`} className="text-[13px] font-medium text-foreground">
                    Card number
                  </label>
                  <input
                    id={`${modalId}-cardNum`}
                    type="text"
                    value={newCardNumber}
                    onChange={(e) => setNewCardNumber(e.target.value)}
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
                      value={newCardExpiry}
                      onChange={(e) => setNewCardExpiry(e.target.value)}
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
                      maxLength={4}
                      value={newCardCvv}
                      onChange={(e) => setNewCardCvv(e.target.value)}
                      placeholder="•••"
                      className="h-11 w-full rounded-xl border border-border bg-card px-3 tabular text-[14px] text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                      required
                    />
                  </div>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <Button type="submit" className="w-full h-11 rounded-xl">
                    Save & use card
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
