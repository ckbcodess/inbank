"use client";

import { useState } from "react";
import {
  ChevronRight,
  CheckCircle2,
  CreditCard,
  Smartphone,
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

interface LinkSourceAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ModalScreen =
  | "choice"
  | "momo_form"
  | "momo_waiting"
  | "momo_success"
  | "card_form"
  | "card_3ds"
  | "card_success";

type NetworkOperator = "MTN" | "Telecel" | "AT";

export default function LinkSourceAccountModal({
  isOpen,
  onClose,
}: LinkSourceAccountModalProps) {
  const [screen, setScreen] = useState<ModalScreen>("momo_form");

  // MoMo Form State
  const [momoNumber, setMomoNumber] = useState("024 123 4567");
  const [operator, setOperator] = useState<NetworkOperator>("MTN");
  const [amount, setAmount] = useState("100.00");

  // Card Form State
  const [cardNumber, setCardNumber] = useState("4123 4567 8901 9102");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvv, setCardCvv] = useState("321");
  const [cardName, setCardName] = useState("Tsotsoo Mills");
  const [threeDsCode, setThreeDsCode] = useState("");

  const [busy, setBusy] = useState(false);

  if (!isOpen) return null;

  function handleMomoSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      setScreen("momo_waiting");
    }, 600);
  }

  function handleMomoApprove() {
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      setScreen("momo_success");
    }, 1200);
  }

  function handleCardSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      setScreen("card_3ds");
    }, 700);
  }

  function handle3dsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      setScreen("card_success");
    }, 900);
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>
            {screen === "choice" && "Link source account"}
            {screen === "momo_form" && "Link mobile wallet"}
            {screen === "momo_waiting" && "Mobile authorization"}
            {screen === "momo_success" && "Account linked"}
            {screen === "card_form" && "Link bank card"}
            {screen === "card_3ds" && "Card authorization"}
            {screen === "card_success" && "Card linked"}
          </DialogTitle>
        </DialogHeader>

        <DialogBody>
          {/* SCREEN 1: Choice of Link Source */}
          {screen === "choice" && (
            <div className="flex flex-col gap-4">
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                Choose an account or payment method to link to your new account.
              </p>

              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => setScreen("momo_form")}
                  className="group flex items-center justify-between rounded-xl border border-border bg-card p-4 text-left transition-all hover:bg-muted/40 cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary transition-colors">
                      <Smartphone size={20} strokeWidth={1.8} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[14px] font-medium text-foreground">
                        Link Mobile Money Wallet
                      </span>
                      <span className="text-[12.5px] text-muted-foreground">
                        Link your mobile money wallet to start transacting.
                      </span>
                    </div>
                  </div>

                  <ChevronRight
                    size={18}
                    strokeWidth={2}
                    className="text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                  />
                </button>

                <button
                  type="button"
                  onClick={() => setScreen("card_form")}
                  className="group flex items-center justify-between rounded-xl border border-border bg-card p-4 text-left transition-all hover:bg-muted/40 cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary transition-colors">
                      <CreditCard size={20} strokeWidth={1.8} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[14px] font-medium text-foreground">
                        Link a Bank Card
                      </span>
                      <span className="text-[12.5px] text-muted-foreground">
                        Link your debit or credit card securely.
                      </span>
                    </div>
                  </div>

                  <ChevronRight
                    size={18}
                    strokeWidth={2}
                    className="text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                  />
                </button>
              </div>

              <div className="pt-2 flex justify-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-[13px] text-muted-foreground hover:text-foreground"
                >
                  Skip for now
                </Button>
              </div>
            </div>
          )}

          {/* MOMO PATH 1: Enter Wallet Details */}
          {screen === "momo_form" && (
            <form onSubmit={handleMomoSubmit} className="flex flex-col gap-4">
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                You will receive a prompt to enter your mobile money PIN. Confirm details below and proceed.
              </p>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="momoNum" className="text-[13px] font-medium text-foreground">
                  Mobile number
                </Label>
                <div className="flex rounded-xl border border-border bg-muted/40 focus-within:ring-1 focus-within:ring-primary">
                  <span className="flex items-center border-r border-border px-3 text-[13.5px] font-medium text-muted-foreground">
                    +233
                  </span>
                  <input
                    id="momoNum"
                    type="tel"
                    value={momoNumber}
                    onChange={(e) => setMomoNumber(e.target.value)}
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
                      onClick={() => setOperator(op)}
                      className={`h-10 rounded-xl border text-[13px] font-medium transition-all cursor-pointer ${
                        operator === op
                          ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          : "border-border bg-card hover:bg-muted/40"
                      }`}
                    >
                      {op}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="amt" className="text-[13px] font-medium text-foreground">
                  Initial deposit amount (GHS)
                </Label>
                <Input
                  id="amt"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-10 tabular"
                  required
                />
              </div>

              <div className="mt-2 flex flex-col gap-2">
                <Button
                  type="submit"
                  disabled={busy}
                  className="w-full"
                >
                  {busy ? "Processing…" : "Proceed"}
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

          {/* MOMO PATH 2: Waiting for USSD Mobile Approval */}
          {screen === "momo_waiting" && (
            <div className="flex flex-col items-center gap-4 text-center py-2">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 animate-pulse">
                <Smartphone size={28} strokeWidth={1.8} />
              </div>

              <p className="text-[13px] leading-relaxed text-muted-foreground max-w-sm">
                Approve the payment prompt on your mobile device (<strong>{operator} {momoNumber}</strong>), then click below to complete your setup.
              </p>

              <div className="w-full rounded-xl border border-border bg-muted/30 p-3.5 text-[12.5px] text-muted-foreground">
                <div className="flex items-center justify-between pb-1 font-medium text-foreground">
                  <span>Amount:</span>
                  <span className="tabular">GHS {parseFloat(amount || "0").toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-[12px]">
                  <span>Status:</span>
                  <span className="text-amber-600 dark:text-amber-400 font-medium animate-pulse">Waiting for MoMo PIN…</span>
                </div>
              </div>

              <div className="w-full flex flex-col gap-2 pt-2">
                <Button
                  type="button"
                  onClick={handleMomoApprove}
                  disabled={busy}
                  className="w-full"
                >
                  {busy ? "Confirming approval…" : "I have approved on phone"}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setScreen("momo_form")}
                  className="text-[13px] text-muted-foreground"
                >
                  Change mobile number
                </Button>
              </div>
            </div>
          )}

          {/* MOMO PATH 3: Success Confirmation */}
          {screen === "momo_success" && (
            <div className="flex flex-col items-center gap-4 text-center py-2">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={32} strokeWidth={1.8} />
              </div>

              <p className="text-[13px] leading-relaxed text-muted-foreground max-w-sm">
                Your <strong>{operator}</strong> wallet has been verified and linked to your GCB Internet Banking account.
              </p>

              <div className="w-full rounded-xl border border-border bg-muted/20 p-4 text-left text-[13px]">
                <div className="flex justify-between py-1 text-muted-foreground">
                  <span>Linked wallet:</span>
                  <span className="font-medium text-foreground">{momoNumber}</span>
                </div>
                <div className="flex justify-between py-1 text-muted-foreground">
                  <span>Initial balance funded:</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400 tabular">
                    GHS {parseFloat(amount || "0").toFixed(2)}
                  </span>
                </div>
              </div>

              <Button
                type="button"
                onClick={onClose}
                className="w-full mt-2"
              >
                Done · View accounts
              </Button>
            </div>
          )}

          {/* CARD PATH 1: Enter Card Details */}
          {screen === "card_form" && (
            <form onSubmit={handleCardSubmit} className="flex flex-col gap-4">
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                Please enter your bank card details to link and fund your account securely.
              </p>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cName" className="text-[13px] font-medium text-foreground">
                  Cardholder name
                </Label>
                <Input
                  id="cName"
                  type="text"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  className="h-10"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cNum" className="text-[13px] font-medium text-foreground">
                  Card number
                </Label>
                <Input
                  id="cNum"
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="4000 1234 5678 9010"
                  className="h-10 font-mono tabular"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="exp" className="text-[13px] font-medium text-foreground">
                    Expiry date
                  </Label>
                  <Input
                    id="exp"
                    type="text"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    placeholder="MM/YY"
                    className="h-10 tabular"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cvv" className="text-[13px] font-medium text-foreground">
                    CVV
                  </Label>
                  <Input
                    id="cvv"
                    type="password"
                    maxLength={4}
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value)}
                    placeholder="•••"
                    className="h-10 tabular"
                    required
                  />
                </div>
              </div>

              <div className="mt-2 flex flex-col gap-2">
                <Button
                  type="submit"
                  disabled={busy}
                  className="w-full"
                >
                  {busy ? "Processing…" : "Next: 3D Secure / OTP"}
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

          {/* SCREEN 3: Card 3D Secure Simulator */}
          {screen === "card_3ds" && (
            <form onSubmit={handle3dsSubmit} className="flex flex-col gap-4">
              <div className="rounded-xl border border-border bg-muted/40 p-3 text-[12.5px] text-muted-foreground">
                <p className="font-medium text-foreground">Simulated 3D Secure Verification</p>
                <p className="mt-0.5">
                  Enter any 6-digit test code (e.g. 123456) to verify card authorization.
                </p>
              </div>

              <div className="flex flex-col gap-1.5 py-1">
                <div className="flex items-center justify-between text-[13px]">
                  <Label className="font-medium text-foreground">Merchant</Label>
                  <span className="text-muted-foreground">GCB Bank Digital</span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <Label className="font-medium text-foreground">Card ending in</Label>
                  <span className="font-mono text-muted-foreground">
                    •••• {cardNumber.replace(/\s+/g, "").slice(-4) || "0000"}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="otp3ds" className="text-[13px] font-medium text-foreground">
                  One-time password (OTP)
                </Label>
                <Input
                  id="otp3ds"
                  type="password"
                  value={threeDsCode}
                  onChange={(e) => setThreeDsCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  className="h-10 tabular"
                  required
                />
              </div>

              <div className="mt-2 flex flex-col gap-2">
                <Button
                  type="submit"
                  disabled={busy}
                  className="w-full"
                >
                  {busy ? "Authorizing card…" : "Submit & authorize"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setScreen("card_form")}
                  className="text-[13px] text-muted-foreground"
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {/* CARD PATH 3: Card Linked Success */}
          {screen === "card_success" && (
            <div className="flex flex-col items-center gap-4 text-center py-2">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={32} strokeWidth={1.8} />
              </div>

              <p className="text-[13px] leading-relaxed text-muted-foreground max-w-sm">
                Your Visa Debit card (•••• 9102) has been authenticated and linked to your GCB Internet Banking account.
              </p>

              <Button
                type="button"
                onClick={onClose}
                className="w-full mt-2"
              >
                Done · View accounts
              </Button>
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
