"use client";

import { AlertToast } from "@/components/ui/alert-toast";
import { InlineError } from "@/components/ui/inline-error";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronLeft,
  CreditCard,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import OtpInput from "@/components/auth/OtpInput";
import { AppLoader } from "@/components/ui/loader";
import { PhoneInput } from "@/components/ui/phone-input";
import { displayGhanaMobile, toNationalDigits } from "@/lib/phone";
import { maskMobile } from "@/lib/auth-shared";
import { AmountInput, OperatorSelect } from "@/components/payments/flows/shared";
import { cardNetwork } from "@/lib/card-link";
import { useCardPayment } from "@/lib/card-payment";
import { ActionTile } from "@/components/ui/action-tile";

interface QuickFundModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (amount: number, method: "momo" | "card", details: { operator?: string; phone?: string; cardLast4?: string }) => void;
  accountName?: string;
  /** The number confirmed at sign-up. Pre-filled; using it needs no code, any other number is confirmed by SMS first. */
  registeredPhone?: string;
  /** Back from the bank's 3-D Secure page: open on the receipt, or on the card form after a cancel. */
  resume?: FundResume | null;
}

/** The money flows' field look (Send & Pay, Add money): rounded-2xl, 14px medium labels, the shared AmountInput. */
const FUND_FIELD = "h-13 rounded-2xl px-4 text-[15px]";
const FUND_LABEL = "text-[14px] font-medium text-foreground";

type FundDetails = { operator?: string; phone?: string; cardLast4?: string };

/** What the bank's page decided, when a card payment comes back to this flow. */
export type FundResume = { status: "approved" | "cancelled"; amount: number; cardLast4: string };

/** The dashboard's standalone top-up dialog. */
export function QuickFundModal({
  open,
  onOpenChange,
  onSuccess,
  registeredPhone,
  resume,
}: QuickFundModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md" className="p-0 overflow-hidden">
        {/* Mounted only while open, so every opening starts from the method picker. */}
        {open && (
          <QuickFundFlow
            variant="modal"
            registeredPhone={registeredPhone}
            resume={resume}
            onSuccess={onSuccess}
            onFinish={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * The top-up steps (method, details, confirm, done) without a dialog around them,
 * so the post-onboarding flow can run them inside its own persistent card.
 * Must render inside a Dialog (it uses DialogTitle).
 */
export function QuickFundFlow({
  variant,
  registeredPhone,
  resume,
  onSuccess,
  onFinish,
  onBack,
}: {
  /** "modal" brings its own header and padding; "split" or "inline" fits directly in cards/welcome flows. */
  variant: "modal" | "split" | "inline";
  registeredPhone?: string;
  /** Back from the bank's 3-D Secure page: open on the receipt, or on the card form after a cancel. */
  resume?: FundResume | null;
  onSuccess: (amount: number, method: "momo" | "card", details: FundDetails) => void;
  /** Called after onSuccess, when they tap Continue on the receipt. */
  onFinish: () => void;
  /** Optional back handler for when user is at the initial selection stage */
  onBack?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const startCardPayment = useCardPayment((s) => s.start);
  const [stage, setStage] = useState<"select" | "form" | "otp" | "ussd" | "success">(
    resume ? (resume.status === "approved" ? "success" : "form") : "select",
  );
  const [method, setMethod] = useState<"momo" | "card">(resume ? "card" : "momo");
  const [operator, setOperator] = useState<"MTN" | "Telecel" | "AT">("MTN");
  const [phone, setPhone] = useState(registeredPhone ?? "0241234567");
  const usingRegistered =
    !!registeredPhone && toNationalDigits(phone) === toNationalDigits(registeredPhone);
  const [cardNumber, setCardNumber] = useState("4111 2222 3333 4444");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvv, setCardCvv] = useState("123");
  const [amount, setAmount] = useState(resume ? String(resume.amount) : "100");
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(6).fill(""));
  const [countdown, setCountdown] = useState(30);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState(
    resume?.status === "cancelled" ? "Your bank didn’t approve this payment, so nothing was taken. You can try again." : "",
  );

  // Countdown timer for OTP
  useEffect(() => {
    if (stage !== "otp" || countdown <= 0) return;
    const t = window.setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [stage, countdown]);

  // USSD Auto-Approval simulation
  useEffect(() => {
    if (stage !== "ussd") return;
    const timer = window.setTimeout(() => {
      setStage("success");
    }, 2800);
    return () => window.clearTimeout(timer);
  }, [stage]);

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsedAmt = parseFloat(amount);
    if (!parsedAmt || parsedAmt <= 0) {
      setErrorMsg("Please enter an amount to fund.");
      return;
    }
    setErrorMsg("");
    setBusy(true);

    if (method === "momo") {
      window.setTimeout(() => {
        setBusy(false);
        if (usingRegistered) {
          // Already confirmed at sign-up: straight to the network approval.
          setStage("ussd");
          return;
        }
        setOtpDigits(Array(6).fill(""));
        setCountdown(30);
        setStage("otp");
      }, 500);
    } else {
      // The card's own bank approves it on its page (3-D Secure), then sends the customer back here.
      const digits = cardNumber.replace(/\D/g, "");
      startCardPayment({
        flow: "quick-fund",
        amount: parsedAmt,
        currency: "GHS",
        last4: digits.slice(-4),
        network: cardNetwork(digits),
        merchant: "GCB Bank PLC",
        description: "Fund your GCB account",
        returnTo: `${pathname}${window.location.search}`,
      });
      window.setTimeout(() => router.push("/card-verification"), 500);
    }
  }

  function handleOtpComplete(code: string) {
    if (code.length < 6 || busy) return;
    if (code === "000000") {
      setErrorMsg("The code entered is incorrect or expired. Please try again.");
      setOtpDigits(Array(6).fill(""));
      return;
    }
    setErrorMsg("");
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      setStage("ussd");
    }, 500);
  }

  function handleFinish() {
    const parsedAmt = parseFloat(amount) || 100;
    onSuccess(parsedAmt, method, {
      operator: method === "momo" ? operator : undefined,
      phone: method === "momo" ? displayGhanaMobile(phone) : undefined,
      cardLast4: method === "card" ? resume?.cardLast4 ?? cardNumber.replace(/\s/g, "").slice(-4) : undefined,
    });
    onFinish();
  }

  const back =
    stage !== "select" && stage !== "success" ? (
      <button
        type="button"
        onClick={() => {
          if (stage === "otp" || stage === "ussd") {
            setStage("form");
          } else {
            setStage("select");
          }
        }}
        className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer -ml-1 mr-1"
        aria-label="Back"
      >
        <ChevronLeft size={18} strokeWidth={2} />
      </button>
    ) : stage === "select" && onBack ? (
      <button
        type="button"
        onClick={onBack}
        className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer -ml-1 mr-1"
        aria-label="Back"
      >
        <ChevronLeft size={18} strokeWidth={2} />
      </button>
    ) : null;

  const title =
    stage === "select"
      ? "Fund account"
      : stage === "form"
        ? method === "momo"
          ? "Mobile Money"
          : "Card deposit"
        : stage === "otp"
          ? "Confirm mobile number"
          : stage === "ussd"
            ? "Approve on phone"
            : "Deposit completed";

  const body = (
    <>
          {stage === "otp" && (
            <p className="text-[13.5px] text-muted-foreground mb-4 leading-relaxed">
              Enter the 6-digit code sent to <span className="font-medium text-foreground">{maskMobile(displayGhanaMobile(phone))}</span>.
            </p>
          )}
          {/* STAGE 0: SELECT PAYMENT METHOD */}
          {stage === "select" && (
            <div className="flex flex-col gap-4 pt-1">
              <ActionTile
                icon={Smartphone}
                title="Fund with Mobile Money Wallet"
                onClick={() => {
                  setErrorMsg("");
                  setMethod("momo");
                  setStage("form");
                }}
              />
              <ActionTile
                icon={CreditCard}
                title="Fund with a Card"
                onClick={() => {
                  setErrorMsg("");
                  setMethod("card");
                  setStage("form");
                }}
              />
            </div>
          )}

          {/* STAGE 1: FORM */}
          {stage === "form" && (
            <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">

              {method === "momo" ? (
                <div className="flex flex-col gap-3.5">
                  {/* Phone Input with +233 */}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="quickFundPhone" className={FUND_LABEL}>
                      Mobile Number
                    </Label>
                    <PhoneInput id="quickFundPhone" value={phone} onValueChange={setPhone} className={FUND_FIELD} required />
                    {registeredPhone && (
                      <p className="px-0.5 text-[12.5px] text-muted-foreground">
                        {usingRegistered
                          ? "The number you registered with."
                          : "Not your registered number, so we'll text a code to confirm it's yours."}
                      </p>
                    )}
                  </div>

                  {/* Telco Selector */}
                  <div className="flex flex-col gap-1.5">
                    <Label className={FUND_LABEL}>Network Provider</Label>
                    <OperatorSelect value={operator} onChange={setOperator} />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="quickFundCard" className={FUND_LABEL}>Card number</Label>
                    <Input
                      id="quickFundCard"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className={FUND_FIELD}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="quickFundExp" className={FUND_LABEL}>Expiry</Label>
                      <Input
                        id="quickFundExp"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        className={FUND_FIELD}
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="quickFundCvv" className={FUND_LABEL}>CVV</Label>
                      <Input
                        id="quickFundCvv"
                        type="password"
                        maxLength={3}
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        className={FUND_FIELD}
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Amount & Chips */}
              <AmountInput value={amount} onChange={setAmount} currency="GHS" label="Amount" />

              <AlertToast when={errorMsg} message={errorMsg} />

              <Button
                type="submit"
                variant="default"
                size="lg"
                disabled={!amount} loading={busy}
                className="mt-2 h-11 w-full text-[14px] cursor-pointer"
              >
                <span>Continue</span>
              </Button>
            </form>
          )}

          {/* STAGE 2: OTP */}
          {stage === "otp" && (
            <div className="flex flex-col items-center gap-5 py-2">
              <OtpInput
                value={otpDigits}
                onChange={(next: string[]) => {
                  setOtpDigits(next);
                  if (errorMsg) setErrorMsg("");
                }}
                length={6}
                onComplete={handleOtpComplete}
                disabled={busy}
                invalid={!!errorMsg}
                autoFocus
              />

              {busy && (
                <div className="flex items-center justify-center gap-2 text-[13.5px] text-muted-foreground">
                  <AppLoader size={16} />
                  <span>Verifying code…</span>
                </div>
              )}

              <InlineError message={errorMsg} />

              <div className="flex items-center justify-between w-full pt-1 text-[13px]">
                <button
                  type="button"
                  onClick={() => setStage("form")}
                  className="text-muted-foreground hover:text-foreground underline underline-offset-4 cursor-pointer"
                >
                  Change details
                </button>
                <button
                  type="button"
                  disabled={countdown > 0}
                  onClick={() => setCountdown(30)}
                  className="text-muted-foreground hover:text-foreground underline underline-offset-4 cursor-pointer disabled:opacity-50"
                >
                  {countdown > 0 ? (
                    <>
                      Resend in <span className="tabular">{countdown}s</span>
                    </>
                  ) : (
                    "Resend code"
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STAGE 3: USSD PROMPT */}
          {stage === "ussd" && (
            <div className="flex flex-col items-center text-center gap-4 py-4">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-foreground shadow-2xs">
                <Smartphone size={24} strokeWidth={1.8} />
              </div>
              <div className="flex flex-col gap-1">
                <span className="tabular-nums text-[20px] font-medium tracking-tight text-foreground">
                  GHS {parseFloat(amount).toFixed(2)}
                </span>
                <p className="text-[13.5px] text-muted-foreground">
                  Enter your Mobile Money PIN on your phone to approve.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2 text-[12.5px] text-muted-foreground">
                <AppLoader size={14} />
                <span>Waiting for approval…</span>
              </div>
            </div>
          )}

          {/* STAGE 4: SUCCESS */}
          {stage === "success" && (
            <div className="flex flex-col items-center text-center gap-4 py-4">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-success/15 text-success-text shadow-2xs">
                <CheckCircle2 size={24} strokeWidth={1.9} />
              </div>

              <div className="flex flex-col gap-1">
                <h4 className="tabular-nums text-[20px] font-medium tracking-tight text-foreground">
                  GHS {parseFloat(amount).toFixed(2)} deposited
                </h4>
                <p className="text-[13.5px] text-muted-foreground">
                  Available in your account now.
                </p>
              </div>

              <Button
                type="button"
                variant="default"
                size="lg"
                onClick={handleFinish}
                className="mt-3 h-10.5 w-full text-[13.5px] active:scale-[0.96] transition-transform duration-150 cursor-pointer"
              >
                <span>Continue</span>
              </Button>
            </div>
          )}
    </>
  );

  if (variant === "split" || variant === "inline") {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-2">
          {back}
          <DialogTitle className="text-[20px] font-medium tracking-tight text-foreground sm:text-[22px]">{title}</DialogTitle>
        </div>
        <div>{body}</div>
      </div>
    );
  }

  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-2">
          {back}
          <DialogTitle>{title}</DialogTitle>
        </div>
      </DialogHeader>
      <DialogBody className="px-6 pb-6 pt-4">{body}</DialogBody>
    </>
  );
}
