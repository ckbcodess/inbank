"use client";

import { useState } from "react";
import Image from "next/image";
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  ShieldCheck,
  Smartphone,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const [screen, setScreen] = useState<ModalScreen>("choice");
  const [selectedMethod, setSelectedMethod] = useState<"momo" | "card">("momo");

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

  function handleChoiceProceed() {
    if (selectedMethod === "momo") {
      setScreen("momo_form");
    } else {
      setScreen("card_form");
    }
  }

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-[460px] overflow-hidden rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-2xl transition-all">
        {/* Top Header / Skip Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative h-6 w-7 shrink-0">
              <Image
                src="/images/gcb-logo.svg"
                alt="GCB Bank"
                fill
                className="object-contain"
              />
            </div>
            <span className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">
              Account Onboarding
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* SCREEN 1: Choice of Link Source */}
        {screen === "choice" && (
          <div className="mt-5 flex flex-col">
            <div className="mb-6 text-center">
              <h2 className="text-[21px] font-semibold tracking-tight text-foreground">
                Link Source Account
              </h2>
              <p className="mt-1.5 text-[13px] text-muted-foreground">
                Choose an account or payment method to link to your new account
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {/* Option: Mobile Money -> 1-tap route to momo_form */}
              <button
                type="button"
                onClick={() => {
                  setSelectedMethod("momo");
                  setScreen("momo_form");
                }}
                className="group flex items-center justify-between rounded-2xl border border-border/80 bg-card p-4 text-left transition-all duration-200 hover:border-[#E5A500] hover:bg-[#FFFBF0] dark:hover:bg-[#F2B200]/10 hover:shadow-md hover:shadow-[#F2B200]/10 active:scale-[0.96] cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#FEF3D6] text-[#B27B00] dark:bg-[#F2B200]/20 dark:text-[#F2B200] transition-colors group-hover:bg-[#E5A500] group-hover:text-white dark:group-hover:bg-[#F2B200] dark:group-hover:text-black">
                    <Smartphone size={20} strokeWidth={2} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[14.5px] font-semibold text-foreground">
                      Link Mobile Money Wallet
                    </span>
                    <span className="text-[12.5px] text-muted-foreground">
                      Link your mobile money wallet to start transacting.
                    </span>
                  </div>
                </div>

                <div className="flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground/60 transition-all duration-200 group-hover:translate-x-1 group-hover:text-[#E5A500] dark:group-hover:text-[#F2B200]">
                  <ArrowRight size={16} strokeWidth={2} />
                </div>
              </button>

              {/* Option: Bank Card -> 1-tap route to card_form */}
              <button
                type="button"
                onClick={() => {
                  setSelectedMethod("card");
                  setScreen("card_form");
                }}
                className="group flex items-center justify-between rounded-2xl border border-border/80 bg-card p-4 text-left transition-all duration-200 hover:border-[#E5A500] hover:bg-[#FFFBF0] dark:hover:bg-[#F2B200]/10 hover:shadow-md hover:shadow-[#F2B200]/10 active:scale-[0.96] cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#FEF3D6] text-[#B27B00] dark:bg-[#F2B200]/20 dark:text-[#F2B200] transition-colors group-hover:bg-[#E5A500] group-hover:text-white dark:group-hover:bg-[#F2B200] dark:group-hover:text-black">
                    <CreditCard size={20} strokeWidth={2} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[14.5px] font-semibold text-foreground">
                      Link a Bank Card
                    </span>
                    <span className="text-[12.5px] text-muted-foreground">
                      Link your debit or credit card securely.
                    </span>
                  </div>
                </div>

                <div className="flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground/60 transition-all duration-200 group-hover:translate-x-1 group-hover:text-[#E5A500] dark:group-hover:text-[#F2B200]">
                  <ArrowRight size={16} strokeWidth={2} />
                </div>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="mt-5 text-center text-[13px] font-medium text-muted-foreground hover:text-foreground active:scale-[0.96] cursor-pointer"
            >
              Skip for now
            </button>
          </div>
        )}

        {/* MOMO PATH 1: Enter Wallet Details */}
        {screen === "momo_form" && (
          <form onSubmit={handleMomoSubmit} className="mt-5 flex flex-col gap-4">
            <div className="text-center">
              <h2 className="text-[20px] font-semibold tracking-tight text-foreground">
                Let’s link your mobile wallet
              </h2>
              <p className="mt-1 text-[12.5px] text-muted-foreground">
                You will receive a prompt to enter your mobile money PIN. Confirm details below and proceed.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="momoNum" className="text-[13px] font-medium text-foreground">
                Enter Mobile Number
              </Label>
              <div className="flex rounded-xl border border-border bg-background focus-within:border-[#F2B200] focus-within:ring-1 focus-within:ring-[#F2B200]/20">
                <span className="flex items-center border-r border-border px-3 text-[13.5px] font-medium text-muted-foreground">
                  +233
                </span>
                <input
                  id="momoNum"
                  type="tel"
                  value={momoNumber}
                  onChange={(e) => setMomoNumber(e.target.value)}
                  placeholder="24 123 4567"
                  className="h-11 w-full bg-transparent px-3 text-[14px] text-foreground focus:outline-hidden"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-[13px] font-medium text-foreground">
                Network Operator
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {(["MTN", "Telecel", "AT"] as const).map((op) => (
                  <button
                    key={op}
                    type="button"
                    onClick={() => setOperator(op)}
                    className={`h-10 rounded-xl border text-[13px] font-semibold transition-all cursor-pointer ${
                      operator === op
                        ? "border-[#E5A500] bg-[#FEF3D6] text-[#B27B00] dark:border-[#F2B200] dark:bg-[#F2B200]/20 dark:text-[#F2B200]"
                        : "border-border/70 bg-card hover:bg-muted/40"
                    }`}
                  >
                    {op}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amt" className="text-[13px] font-medium text-foreground">
                Initial Deposit Amount (GHS)
              </Label>
              <Input
                id="amt"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-11 rounded-xl border-border bg-background px-3.5 text-[14px] focus-visible:border-[#F2B200]"
                required
              />
            </div>

            <div className="mt-2 flex flex-col gap-2">
              <Button
                type="submit"
                disabled={busy}
                className="h-11 w-full rounded-xl bg-[#F2B200] text-[14.5px] font-semibold text-black hover:bg-[#E0A300] cursor-pointer"
              >
                Proceed
              </Button>
              <button
                type="button"
                onClick={() => setScreen("choice")}
                className="text-center text-[13px] text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Back
              </button>
            </div>
          </form>
        )}

        {/* MOMO PATH 2: Waiting for USSD Mobile Approval */}
        {screen === "momo_waiting" && (
          <div className="mt-5 flex flex-col items-center gap-5 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-[#FEF3D6] text-[#B27B00] dark:bg-[#F2B200]/20 dark:text-[#F2B200] animate-pulse">
              <Smartphone size={32} strokeWidth={1.8} />
            </div>

            <div>
              <h2 className="text-[20px] font-semibold tracking-tight text-foreground">
                Continue on Your Mobile
              </h2>
              <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                Approve the payment prompt on your mobile device (<strong>{operator} {momoNumber}</strong>), then click below to complete your setup.
              </p>
            </div>

            <div className="w-full rounded-2xl border border-dashed border-[#F2B200]/40 bg-[#FFFBF0] dark:bg-[#F2B200]/5 p-4 text-[12.5px] text-muted-foreground">
              <div className="flex items-center justify-between pb-1 font-medium text-foreground">
                <span>Amount:</span>
                <span>GHS {parseFloat(amount || "0").toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-[12px]">
                <span>Status:</span>
                <span className="text-[#E5A500] font-medium animate-pulse">Waiting for MoMo PIN…</span>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleMomoApprove}
              disabled={busy}
              className="h-11 w-full rounded-xl bg-[#F2B200] text-[14.5px] font-semibold text-black hover:bg-[#E0A300] cursor-pointer"
            >
              {busy ? "Confirming Approval…" : "I Have Approved on Phone"}
            </Button>

            <button
              type="button"
              onClick={() => setScreen("momo_form")}
              className="text-[13px] text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Change Mobile Number
            </button>
          </div>
        )}

        {/* MOMO PATH 3: Success Confirmation */}
        {screen === "momo_success" && (
          <div className="mt-5 flex flex-col items-center gap-5 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
              <CheckCircle2 size={36} strokeWidth={2} />
            </div>

            <div>
              <h2 className="text-[21px] font-semibold tracking-tight text-foreground">
                Account Set Up Successfully!
              </h2>
              <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                Your <strong>{operator}</strong> wallet has been verified and linked to your GCB Internet Banking account.
              </p>
            </div>

            <div className="w-full rounded-2xl border border-border bg-muted/20 p-4 text-left text-[13px]">
              <div className="flex justify-between py-1 text-muted-foreground">
                <span>Linked Wallet:</span>
                <span className="font-semibold text-foreground">{momoNumber}</span>
              </div>
              <div className="flex justify-between py-1 text-muted-foreground">
                <span>Initial Balance Funded:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  GHS {parseFloat(amount || "0").toFixed(2)}
                </span>
              </div>
            </div>

            <Button
              type="button"
              onClick={onClose}
              className="h-11 w-full rounded-xl bg-[#F2B200] text-[14.5px] font-semibold text-black hover:bg-[#E0A300] cursor-pointer"
            >
              Done · View Accounts
            </Button>
          </div>
        )}

        {/* CARD PATH 1: Enter Card Details */}
        {screen === "card_form" && (
          <form onSubmit={handleCardSubmit} className="mt-5 flex flex-col gap-4">
            <div className="text-center">
              <h2 className="text-[20px] font-semibold tracking-tight text-foreground">
                Let’s verify your card details
              </h2>
              <p className="mt-1 text-[12.5px] text-muted-foreground">
                Please enter your bank card details to link and fund your account securely.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cName" className="text-[13px] font-medium text-foreground">
                Cardholder Name
              </Label>
              <Input
                id="cName"
                type="text"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                className="h-11 rounded-xl border-border bg-background px-3.5 text-[14px]"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cNum" className="text-[13px] font-medium text-foreground">
                Card Number
              </Label>
              <Input
                id="cNum"
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                placeholder="4000 1234 5678 9010"
                className="h-11 rounded-xl border-border bg-background px-3.5 text-[14px] font-mono"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="exp" className="text-[13px] font-medium text-foreground">
                  EXP Date
                </Label>
                <Input
                  id="exp"
                  type="text"
                  value={cardExpiry}
                  onChange={(e) => setCardExpiry(e.target.value)}
                  placeholder="MM/YY"
                  className="h-11 rounded-xl border-border bg-background px-3.5 text-[14px]"
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
                  className="h-11 rounded-xl border-border bg-background px-3.5 text-[14px]"
                  required
                />
              </div>
            </div>

            <div className="mt-2 flex flex-col gap-2">
              <Button
                type="submit"
                disabled={busy}
                className="h-11 w-full rounded-xl bg-[#F2B200] text-[14.5px] font-semibold text-black hover:bg-[#E0A300] cursor-pointer"
              >
                Verify Card Details
              </Button>
              <button
                type="button"
                onClick={() => setScreen("choice")}
                className="text-center text-[13px] text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Back
              </button>
            </div>
          </form>
        )}

        {/* CARD PATH 2: 3D Secure / Verified by Visa */}
        {screen === "card_3ds" && (
          <form onSubmit={handle3dsSubmit} className="mt-5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={18} className="text-blue-600 dark:text-blue-400" />
                <span className="text-[13px] font-semibold text-foreground">Verified by Visa</span>
              </div>
              <span className="text-[12px] text-muted-foreground">GCB 3D-Secure</span>
            </div>

            <div className="rounded-xl bg-muted/40 p-3 text-[12.5px] space-y-1">
              <div className="flex justify-between text-muted-foreground">
                <span>Merchant:</span>
                <span className="font-medium text-foreground">GCB Internet Banking</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Amount:</span>
                <span className="font-medium text-foreground">GHS 1.00 (Verification)</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Card Number:</span>
                <span className="font-mono text-foreground">•••• •••• •••• 9102</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="otp3ds" className="text-[13px] font-medium text-foreground">
                Enter One-Time Password / Bank Password
              </Label>
              <Input
                id="otp3ds"
                type="password"
                value={threeDsCode}
                onChange={(e) => setThreeDsCode(e.target.value)}
                placeholder="Enter password or OTP"
                className="h-11 rounded-xl border-border bg-background px-3.5 text-[14px]"
                required
              />
            </div>

            <div className="mt-2 flex flex-col gap-2">
              <Button
                type="submit"
                disabled={busy}
                className="h-11 w-full rounded-xl bg-[#F2B200] text-[14.5px] font-semibold text-black hover:bg-[#E0A300] cursor-pointer"
              >
                {busy ? "Authorizing Card…" : "Submit & Authorize"}
              </Button>
              <button
                type="button"
                onClick={() => setScreen("card_form")}
                className="text-center text-[13px] text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* CARD PATH 3: Card Linked Success */}
        {screen === "card_success" && (
          <div className="mt-5 flex flex-col items-center gap-5 text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
              <CheckCircle2 size={36} strokeWidth={2} />
            </div>

            <div>
              <h2 className="text-[21px] font-semibold tracking-tight text-foreground">
                Card Linked Successfully!
              </h2>
              <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                Your Visa Debit card (•••• 9102) has been authenticated and linked to your GCB Internet Banking account.
              </p>
            </div>

            <Button
              type="button"
              onClick={onClose}
              className="h-11 w-full rounded-xl bg-[#F2B200] text-[14.5px] font-semibold text-black hover:bg-[#E0A300] cursor-pointer"
            >
              Done · View Accounts
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
