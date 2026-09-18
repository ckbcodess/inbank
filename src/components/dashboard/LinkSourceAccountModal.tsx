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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Account, accountsForProfile } from "@/lib/mock-data";
import { useSession } from "@/lib/session-store";
import { roundMoney } from "@/lib/money";

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

  // Reset helper when modal closes
  function handleClose() {
    setScreen("choice");
    setBusy(false);
    onClose();
  }

  // ── Handlers: Internal Transfer ──
  function handleInternalTransferSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      setScreen("internal_success");
    }, 750);
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
    }, 500);
  }

  function handleMomoApprove() {
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      setScreen("funding_success");
    }, 1100);
  }

  function handle3dsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      setScreen("funding_success");
    }, 900);
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
          {/* ════════════════════════════════════════════════════════════════════════
              SCREEN 1: CHOICE MENU (2 Main Options)
              ════════════════════════════════════════════════════════════════════════ */}
          {screen === "choice" && (
            <div className="flex flex-col gap-4">
              {/* Destination Account Preview */}
              {destinationAccount && (
                <div className="flex items-center justify-between rounded-xl border border-border/80 bg-muted/30 px-3.5 py-2.5">
                  <div className="flex flex-col">
                    <span className="text-[11.5px] uppercase tracking-wider text-muted-foreground font-medium">
                      Destination account
                    </span>
                    <span className="text-[13.5px] font-medium text-foreground">
                      {destinationAccount.name}
                    </span>
                  </div>
                  <span className="text-[12.5px] text-muted-foreground font-mono tabular">
                    {destinationAccount.number.replace(/\d(?=.*\d{4})/g, "•")}
                  </span>
                </div>
              )}

              <p className="text-[13px] text-muted-foreground leading-relaxed">
                Choose how you want to add funds to this account.
              </p>

              <div className="flex flex-col gap-3 pt-0.5">
                {/* OPTION 1: Transfer between accounts */}
                <button
                  type="button"
                  onClick={() => setScreen("internal_transfer")}
                  className="group flex items-center justify-between rounded-xl border border-border/80 bg-card p-4 text-left transition-all hover:bg-muted/40 hover:border-border cursor-pointer shadow-2xs"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground transition-colors group-hover:bg-muted/80">
                      <ArrowLeftRight size={19} strokeWidth={1.8} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-medium text-foreground">
                          Transfer between accounts
                        </span>
                        <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10.5px] font-medium text-emerald-700 dark:text-emerald-400">
                          Free · Instant
                        </span>
                      </div>
                      <span className="text-[12.5px] text-muted-foreground truncate mt-0.5">
                        Move money from your other GCB accounts with zero fees.
                      </span>
                    </div>
                  </div>

                  <ChevronRight
                    size={17}
                    strokeWidth={2}
                    className="text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground shrink-0 ml-2"
                  />
                </button>

                {/* OPTION 2: From an already linked mobile wallet or card */}
                <button
                  type="button"
                  onClick={() => setScreen("linked_source_select")}
                  className="group flex items-center justify-between rounded-xl border border-border/80 bg-card p-4 text-left transition-all hover:bg-muted/40 hover:border-border cursor-pointer shadow-2xs"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground transition-colors group-hover:bg-muted/80">
                      <Wallet size={19} strokeWidth={1.8} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[14px] font-medium text-foreground">
                        From linked mobile wallet or card
                      </span>
                      <span className="text-[12.5px] text-muted-foreground truncate mt-0.5">
                        Fund using your linked MTN MoMo, Telecel Cash, or Visa/Mastercard.
                      </span>
                    </div>
                  </div>

                  <ChevronRight
                    size={17}
                    strokeWidth={2}
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

          {/* ════════════════════════════════════════════════════════════════════════
              SCREEN 2: INTERNAL TRANSFER FORM
              ════════════════════════════════════════════════════════════════════════ */}
          {screen === "internal_transfer" && (
            <form onSubmit={handleInternalTransferSubmit} className="flex flex-col gap-4">
              {availableSourceAccounts.length === 0 ? (
                <div className="flex flex-col gap-3 py-4 text-center">
                  <p className="text-[13px] text-muted-foreground">
                    You do not have any other internal accounts under this profile to transfer from.
                  </p>
                  <Button
                    type="button"
                    onClick={() => setScreen("linked_source_select")}
                    className="w-full"
                  >
                    Fund from mobile wallet or card instead
                  </Button>
                </div>
              ) : (
                <>
                  {/* From Account Selector */}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`${modalId}-fromAccount`} className="text-[13px] font-medium text-foreground">
                      From account
                    </Label>
                    <select
                      id={`${modalId}-fromAccount`}
                      value={selectedSourceAccountId}
                      onChange={(e) => setSelectedSourceAccountId(e.target.value)}
                      className="h-10 w-full rounded-xl border border-border bg-card px-3 text-[13.5px] text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                    >
                      {availableSourceAccounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.number.slice(-4)}) — GHS {acc.available.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* To Account (Target) */}
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-[13px] font-medium text-foreground">
                      To account (Destination)
                    </Label>
                    <div className="flex items-center justify-between rounded-xl border border-border/80 bg-muted/40 px-3.5 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Landmark size={16} className="text-muted-foreground" />
                        <div className="flex flex-col">
                          <span className="text-[13.5px] font-medium text-foreground">
                            {destinationAccount?.name}
                          </span>
                          <span className="text-[11.5px] text-muted-foreground font-mono">
                            {destinationAccount?.number}
                          </span>
                        </div>
                      </div>
                      <span className="text-[12px] font-medium text-muted-foreground">
                        {destinationAccount?.currency}
                      </span>
                    </div>
                  </div>

                  {/* Transfer Amount */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`${modalId}-internalAmount`} className="text-[13px] font-medium text-foreground">
                        Amount
                      </Label>
                      {selectedSourceAccount && (
                        <span className="text-[11.5px] text-muted-foreground">
                          Available: GHS {selectedSourceAccount.available.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </div>
                    <div className="flex rounded-xl border border-border bg-card focus-within:ring-1 focus-within:ring-primary overflow-hidden">
                      <span className="flex items-center border-r border-border bg-muted/30 px-3 text-[13.5px] font-medium text-muted-foreground select-none">
                        GHS
                      </span>
                      <input
                        id={`${modalId}-internalAmount`}
                        type="number"
                        step="0.01"
                        min="1"
                        value={internalAmount}
                        onChange={(e) => setInternalAmount(e.target.value)}
                        placeholder="0.00"
                        className="h-10 w-full bg-transparent px-3 text-[14px] text-foreground focus:outline-hidden tabular"
                        required
                      />
                    </div>
                  </div>

                  {/* Reference */}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`${modalId}-internalRef`} className="text-[13px] font-medium text-foreground">
                      Reference / Description
                    </Label>
                    <Input
                      id={`${modalId}-internalRef`}
                      type="text"
                      value={internalRef}
                      onChange={(e) => setInternalRef(e.target.value)}
                      placeholder="e.g. Savings top up"
                      className="h-10"
                    />
                  </div>

                  {/* Transfer Summary */}
                  <div className="rounded-xl border border-border/80 bg-muted/20 p-3 text-[12.5px] text-muted-foreground flex items-center justify-between">
                    <span>Transfer fee</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                      Free · GHS 0.00
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="mt-2 flex flex-col gap-2">
                    <Button type="submit" disabled={busy} className="w-full">
                      {busy ? "Processing transfer…" : `Transfer GHS ${parseFloat(internalAmount || "0").toFixed(2)}`}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setScreen("choice")}
                      className="text-[13px] text-muted-foreground"
                    >
                      Back
                    </Button>

                    <div className="pt-2 text-center">
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

          {/* ════════════════════════════════════════════════════════════════════════
              SCREEN 3: INTERNAL TRANSFER SUCCESS
              ════════════════════════════════════════════════════════════════════════ */}
          {screen === "internal_success" && (
            <div className="flex flex-col items-center gap-4 text-center py-2">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={32} strokeWidth={1.8} />
              </div>

              <div className="flex flex-col gap-1">
                <h3 className="text-[16px] font-medium text-foreground">
                  GHS {parseFloat(internalAmount || "0").toFixed(2)} Transferred
                </h3>
                <p className="text-[13px] text-muted-foreground">
                  Your funds were moved instantly with zero transfer fees.
                </p>
              </div>

              <div className="w-full rounded-xl border border-border bg-muted/20 p-4 text-left text-[13px] flex flex-col gap-2">
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
                    GHS {parseFloat(internalAmount || "0").toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between py-0.5 text-muted-foreground">
                  <span>Reference:</span>
                  <span className="font-mono text-muted-foreground text-[12px]">{internalRef || "Account top-up"}</span>
                </div>
                <div className="flex justify-between py-0.5 text-muted-foreground">
                  <span>Status:</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">Completed</span>
                </div>
              </div>

              <Button type="button" onClick={handleClose} className="w-full mt-2">
                Done
              </Button>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════════
              SCREEN 4: LINKED SOURCE SELECT (Wallets & Cards)
              ════════════════════════════════════════════════════════════════════════ */}
          {screen === "linked_source_select" && (
            <form onSubmit={handleLinkedSourceSubmit} className="flex flex-col gap-4">
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                Select an already linked mobile wallet or bank card to fund <strong>{destinationAccount?.name}</strong>.
              </p>

              {/* List of Linked Sources */}
              <div className="flex flex-col gap-2">
                <Label className="text-[13px] font-medium text-foreground">
                  Linked payment methods
                </Label>
                <div className="flex flex-col gap-2">
                  {linkedSources.map((source) => {
                    const isSelected = selectedSourceId === source.id;
                    return (
                      <button
                        key={source.id}
                        type="button"
                        onClick={() => setSelectedSourceId(source.id)}
                        className={`flex items-center justify-between rounded-xl border p-3 text-left transition-all cursor-pointer ${
                          isSelected
                            ? "border-foreground bg-muted/60"
                            : "border-border/80 bg-card hover:bg-muted/30"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                            {source.type === "momo" ? (
                              <Smartphone size={17} strokeWidth={1.8} />
                            ) : (
                              <CreditCard size={17} strokeWidth={1.8} />
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[13.5px] font-medium text-foreground">
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

                {/* Option to link a new wallet or card */}
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

              {/* Amount Input */}
              <div className="flex flex-col gap-1.5 pt-1">
                <Label htmlFor={`${modalId}-linkedAmount`} className="text-[13px] font-medium text-foreground">
                  Deposit amount
                </Label>
                <div className="flex rounded-xl border border-border bg-card focus-within:ring-1 focus-within:ring-primary overflow-hidden">
                  <span className="flex items-center border-r border-border bg-muted/30 px-3 text-[13.5px] font-medium text-muted-foreground select-none">
                    GHS
                  </span>
                  <input
                    id={`${modalId}-linkedAmount`}
                    type="number"
                    step="0.01"
                    min="1"
                    value={linkedAmount}
                    onChange={(e) => setLinkedAmount(e.target.value)}
                    placeholder="0.00"
                    className="h-10 w-full bg-transparent px-3 text-[14px] text-foreground focus:outline-hidden tabular"
                    required
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="mt-2 flex flex-col gap-2">
                <Button type="submit" disabled={busy} className="w-full">
                  {busy ? "Connecting…" : `Proceed with ${activeLinkedSource?.title || "selected method"}`}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setScreen("choice")}
                  className="text-[13px] text-muted-foreground"
                >
                  Back
                </Button>
              </div>
            </form>
          )}

          {/* ════════════════════════════════════════════════════════════════════════
              SCREEN 5: MOMO WAITING FOR APPROVAL
              ════════════════════════════════════════════════════════════════════════ */}
          {screen === "momo_waiting" && (
            <div className="flex flex-col items-center gap-4 text-center py-2">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-muted text-foreground animate-pulse">
                <Smartphone size={28} strokeWidth={1.8} />
              </div>

              <div className="flex flex-col gap-1">
                <h3 className="text-[16px] font-medium text-foreground">
                  Mobile Money Prompt Sent
                </h3>
                <p className="text-[13px] leading-relaxed text-muted-foreground max-w-sm">
                  Please approve the payment request on your phone (
                  <strong className="text-foreground">{activeLinkedSource?.subtitle}</strong>) by entering your PIN.
                </p>
              </div>

              <div className="w-full rounded-xl border border-border bg-muted/30 p-3.5 text-[12.5px] text-muted-foreground">
                <div className="flex items-center justify-between pb-1 font-medium text-foreground">
                  <span>Amount to deposit:</span>
                  <span className="tabular">GHS {parseFloat(linkedAmount || "0").toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-[12px]">
                  <span>Status:</span>
                  <span className="text-muted-foreground font-medium animate-pulse">
                    Waiting for PIN approval…
                  </span>
                </div>
              </div>

              <div className="w-full flex flex-col gap-2 pt-2">
                <Button
                  type="button"
                  onClick={handleMomoApprove}
                  disabled={busy}
                  className="w-full"
                >
                  {busy ? "Confirming approval…" : "I have approved on my phone"}
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

          {/* ════════════════════════════════════════════════════════════════════════
              SCREEN 6: CARD 3D SECURE
              ════════════════════════════════════════════════════════════════════════ */}
          {screen === "card_3ds" && (
            <form onSubmit={handle3dsSubmit} className="flex flex-col gap-4">
              <div className="rounded-xl border border-border bg-muted/40 p-3 text-[12.5px] text-muted-foreground">
                <p className="font-medium text-foreground">Card 3D Secure Authentication</p>
                <p className="mt-0.5">
                  Enter your one-time code to authenticate this GHS {parseFloat(linkedAmount || "0").toFixed(2)} card payment.
                </p>
              </div>

              <div className="flex flex-col gap-1.5 py-1">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-muted-foreground">Merchant</span>
                  <span className="font-medium text-foreground">GCB Bank Digital</span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-muted-foreground">Card</span>
                  <span className="font-mono text-foreground">
                    {activeLinkedSource?.maskedNumber || "•••• 9102"}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${modalId}-otp3ds`} className="text-[13px] font-medium text-foreground">
                  One-time password (OTP)
                </Label>
                <Input
                  id={`${modalId}-otp3ds`}
                  type="password"
                  value={threeDsCode}
                  onChange={(e) => setThreeDsCode(e.target.value)}
                  placeholder="Enter 6-digit code (e.g. 123456)"
                  className="h-10 tabular font-mono"
                  required
                />
              </div>

              <div className="mt-2 flex flex-col gap-2">
                <Button type="submit" disabled={busy} className="w-full">
                  {busy ? "Authorizing card…" : "Submit & fund account"}
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

          {/* ════════════════════════════════════════════════════════════════════════
              SCREEN 7: LINKED FUNDING SUCCESS
              ════════════════════════════════════════════════════════════════════════ */}
          {screen === "funding_success" && (
            <div className="flex flex-col items-center gap-4 text-center py-2">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={32} strokeWidth={1.8} />
              </div>

              <div className="flex flex-col gap-1">
                <h3 className="text-[16px] font-medium text-foreground">
                  GHS {parseFloat(linkedAmount || "0").toFixed(2)} Deposited
                </h3>
                <p className="text-[13px] leading-relaxed text-muted-foreground max-w-sm">
                  Funds have been deposited into <strong>{destinationAccount?.name}</strong>.
                </p>
              </div>

              <div className="w-full rounded-xl border border-border bg-muted/20 p-4 text-left text-[13px] flex flex-col gap-2">
                <div className="flex justify-between py-0.5 text-muted-foreground">
                  <span>Source:</span>
                  <span className="font-medium text-foreground">{activeLinkedSource?.title}</span>
                </div>
                <div className="flex justify-between py-0.5 text-muted-foreground">
                  <span>Destination:</span>
                  <span className="font-medium text-foreground">{destinationAccount?.name}</span>
                </div>
                <div className="flex justify-between py-0.5 text-muted-foreground">
                  <span>Amount funded:</span>
                  <span className="font-medium text-foreground tabular">
                    GHS {parseFloat(linkedAmount || "0").toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between py-0.5 text-muted-foreground">
                  <span>Status:</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">Completed</span>
                </div>
              </div>

              <Button type="button" onClick={handleClose} className="w-full mt-2">
                Done
              </Button>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════════
              SCREEN 8: LINK NEW MOMO WALLET
              ════════════════════════════════════════════════════════════════════════ */}
          {screen === "link_new_momo" && (
            <form onSubmit={handleAddNewMomo} className="flex flex-col gap-4">
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                Add a new Mobile Money wallet to your saved payment methods.
              </p>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${modalId}-momoNum`} className="text-[13px] font-medium text-foreground">
                  Mobile number
                </Label>
                <div className="flex rounded-xl border border-border bg-muted/40 focus-within:ring-1 focus-within:ring-primary overflow-hidden">
                  <span className="flex items-center border-r border-border px-3 text-[13.5px] font-medium text-muted-foreground select-none">
                    +233
                  </span>
                  <input
                    id={`${modalId}-momoNum`}
                    type="tel"
                    value={newMomoNumber}
                    onChange={(e) => setNewMomoNumber(e.target.value)}
                    placeholder="24 123 4567"
                    className="h-10 w-full bg-transparent px-3 text-[14px] text-foreground focus:outline-hidden"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-[13px] font-medium text-foreground">
                  Network operator
                </Label>
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

              <div className="mt-2 flex flex-col gap-2">
                <Button type="submit" className="w-full">
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

          {/* ════════════════════════════════════════════════════════════════════════
              SCREEN 9: LINK NEW CARD
              ════════════════════════════════════════════════════════════════════════ */}
          {screen === "link_new_card" && (
            <form onSubmit={handleAddNewCard} className="flex flex-col gap-4">
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                Add a new debit or credit card to your saved payment methods.
              </p>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${modalId}-cardName`} className="text-[13px] font-medium text-foreground">
                  Cardholder name
                </Label>
                <Input
                  id={`${modalId}-cardName`}
                  type="text"
                  value={newCardName}
                  onChange={(e) => setNewCardName(e.target.value)}
                  placeholder="e.g. Ama Serwaa"
                  className="h-10"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${modalId}-cardNum`} className="text-[13px] font-medium text-foreground">
                  Card number
                </Label>
                <Input
                  id={`${modalId}-cardNum`}
                  type="text"
                  value={newCardNumber}
                  onChange={(e) => setNewCardNumber(e.target.value)}
                  placeholder="4000 1234 5678 9010"
                  className="h-10 font-mono tabular"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`${modalId}-cardExp`} className="text-[13px] font-medium text-foreground">
                    Expiry date
                  </Label>
                  <Input
                    id={`${modalId}-cardExp`}
                    type="text"
                    value={newCardExpiry}
                    onChange={(e) => setNewCardExpiry(e.target.value)}
                    placeholder="MM/YY"
                    className="h-10 tabular"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`${modalId}-cardCvv`} className="text-[13px] font-medium text-foreground">
                    CVV
                  </Label>
                  <Input
                    id={`${modalId}-cardCvv`}
                    type="password"
                    maxLength={4}
                    value={newCardCvv}
                    onChange={(e) => setNewCardCvv(e.target.value)}
                    placeholder="•••"
                    className="h-10 tabular"
                    required
                  />
                </div>
              </div>

              <div className="mt-2 flex flex-col gap-2">
                <Button type="submit" className="w-full">
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
  );
}
