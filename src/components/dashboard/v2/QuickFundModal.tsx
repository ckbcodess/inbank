"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  CreditCard,
  PhoneCall,
  Smartphone,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import OtpInput from "@/components/auth/OtpInput";
import { AppLoader } from "@/components/ui/loader";
import { cn } from "@/lib/utils";

interface QuickFundModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (amount: number, method: "momo" | "card", details: { operator?: string; phone?: string; cardLast4?: string }) => void;
  accountName?: string;
}

export function QuickFundModal({
  open,
  onOpenChange,
  onSuccess,
  accountName = "Virtual Account",
}: QuickFundModalProps) {
  const [stage, setStage] = useState<"select" | "form" | "otp" | "ussd" | "success">("select");
  const [method, setMethod] = useState<"momo" | "card">("momo");
  const [operator, setOperator] = useState<"MTN" | "Telecel" | "AT">("MTN");
  const [phone, setPhone] = useState("024 123 4567");
  const [cardNumber, setCardNumber] = useState("4111 2222 3333 4444");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvv, setCardCvv] = useState("123");
  const [amount, setAmount] = useState("100");
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(6).fill(""));
  const [countdown, setCountdown] = useState(30);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setStage("select");
      setErrorMsg("");
      setBusy(false);
      setOtpDigits(Array(6).fill(""));
    }
  }, [open]);

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
        setOtpDigits(Array(6).fill(""));
        setCountdown(30);
        setStage("otp");
      }, 500);
    } else {
      // Direct card deposit simulation
      window.setTimeout(() => {
        setBusy(false);
        setStage("success");
      }, 800);
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
      phone: method === "momo" ? phone : undefined,
      cardLast4: method === "card" ? cardNumber.replace(/\s/g, "").slice(-4) : undefined,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md" className="p-0 overflow-hidden">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {stage !== "select" && stage !== "success" && (
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
            )}
            <DialogTitle>
              {stage === "select" && "Fund Your Virtual Account"}
              {stage === "form" && (method === "momo" ? "Fund with Mobile Money" : "Fund with a Card")}
              {stage === "otp" && "Confirm Mobile Number"}
              {stage === "ussd" && "Approve on Your Phone"}
              {stage === "success" && "Deposit Completed"}
            </DialogTitle>
          </div>
        </DialogHeader>

        <DialogBody className="px-6 pb-6 pt-4">
          {stage === "otp" && (
            <p className="text-[13.5px] text-muted-foreground mb-4 leading-relaxed">
              Enter the 6-digit verification code sent to +233 {phone.replace(/^0/, "")}.
            </p>
          )}
          {stage === "ussd" && (
            <p className="text-[13.5px] text-muted-foreground mb-4 leading-relaxed">
              Please check your phone for the network prompt to approve the transaction.
            </p>
          )}
          {stage === "success" && (
            <p className="text-[13.5px] text-muted-foreground mb-4 leading-relaxed">
              Your funds have been deposited and are available immediately.
            </p>
          )}
          {/* STAGE 0: SELECT PAYMENT METHOD */}
          {stage === "select" && (
            <div className="flex flex-col gap-3.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setErrorMsg("");
                  setMethod("momo");
                  setStage("form");
                }}
                className="group flex w-full items-center justify-between rounded-2xl border border-border/80 bg-card p-4 transition-all hover:border-primary/60 hover:bg-muted/30 cursor-pointer sm:p-5"
              >
                <div className="flex items-center gap-3.5 sm:gap-4">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shrink-0 shadow-xs">
                    <Smartphone size={20} strokeWidth={2} />
                  </div>
                  <span className="text-[14px] font-medium text-foreground tracking-[-0.01em] sm:text-[14.5px]">
                    Fund with Mobile Money Wallet
                  </span>
                </div>
                <ArrowRight size={16} strokeWidth={1.8} className="text-muted-foreground transition-transform group-hover:translate-x-0.5 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setErrorMsg("");
                  setMethod("card");
                  setStage("form");
                }}
                className="group flex w-full items-center justify-between rounded-2xl border border-border/80 bg-card p-4 transition-all hover:border-primary/60 hover:bg-muted/30 cursor-pointer sm:p-5"
              >
                <div className="flex items-center gap-3.5 sm:gap-4">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shrink-0 shadow-xs">
                    <CreditCard size={20} strokeWidth={2} />
                  </div>
                  <span className="text-[14px] font-medium text-foreground tracking-[-0.01em] sm:text-[14.5px]">
                    Fund with a Card
                  </span>
                </div>
                <ArrowRight size={16} strokeWidth={1.8} className="text-muted-foreground transition-transform group-hover:translate-x-0.5 shrink-0" />
              </button>
            </div>
          )}

          {/* STAGE 1: FORM */}
          {stage === "form" && (
            <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">

              {method === "momo" ? (
                <div className="flex flex-col gap-3.5">
                  {/* Phone Input with +233 */}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="quickFundPhone" className="text-[13px] text-foreground">
                      Mobile Number
                    </Label>
                    <div className="flex items-center rounded-xl border border-border/80 bg-card overflow-hidden focus-within:ring-2 focus-within:ring-ring">
                      <div className="flex items-center gap-1.5 px-3 py-2 bg-muted/30 border-r border-border/60 text-[13px] font-medium text-foreground select-none shrink-0">
                        <span className="text-[15px]">🇬🇭</span>
                        <span>+233</span>
                        <ChevronDown size={13} className="text-muted-foreground ml-0.5" />
                      </div>
                      <Input
                        id="quickFundPhone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="border-0 shadow-none focus-visible:ring-0 h-10 text-[14px] font-mono rounded-none"
                        required
                      />
                    </div>
                  </div>

                  {/* Telco Selector */}
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-[13px] text-foreground">Network Provider</Label>
                    <Select value={operator} onValueChange={(val) => setOperator(val as "MTN" | "Telecel" | "AT")}>
                      <SelectTrigger className="h-11 w-full bg-card">
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted/40">
                            {operator === "MTN" && (
                              <Image src="/mtn.svg" alt="MTN" width={24} height={24} className="size-6 object-contain" />
                            )}
                            {operator === "Telecel" && (
                              <Image src="/telecel.svg" alt="Telecel" width={24} height={24} className="size-6 object-contain" />
                            )}
                            {operator === "AT" && (
                              <Image src="/at.svg" alt="AT" width={24} height={24} className="size-6 object-contain" />
                            )}
                          </div>
                          <span className="text-[13.5px] text-foreground font-medium">
                            {operator === "MTN" && "MTN Mobile Money"}
                            {operator === "Telecel" && "Telecel Cash"}
                            {operator === "AT" && "AT Money"}
                          </span>
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MTN">
                          <div className="flex items-center gap-2.5 py-0.5">
                            <Image src="/mtn.svg" alt="MTN" width={22} height={22} className="size-5 object-contain" />
                            <span>MTN Mobile Money</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="Telecel">
                          <div className="flex items-center gap-2.5 py-0.5">
                            <Image src="/telecel.svg" alt="Telecel" width={22} height={22} className="size-5 object-contain" />
                            <span>Telecel Cash</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="AT">
                          <div className="flex items-center gap-2.5 py-0.5">
                            <Image src="/at.svg" alt="AT" width={22} height={22} className="size-5 object-contain" />
                            <span>AT Money</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="quickFundCard" className="text-[13px] text-foreground">Card number</Label>
                    <Input
                      id="quickFundCard"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="h-10 font-mono text-[14px]"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="quickFundExp" className="text-[13px] text-foreground">Expiry</Label>
                      <Input
                        id="quickFundExp"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        className="h-10 font-mono text-[14px]"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="quickFundCvv" className="text-[13px] text-foreground">CVV</Label>
                      <Input
                        id="quickFundCvv"
                        type="password"
                        maxLength={3}
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        className="h-10 font-mono text-[14px]"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Amount & Chips */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="quickFundAmt" className="text-[13px] text-foreground">Amount</Label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13.5px] font-mono text-muted-foreground">
                    GHS
                  </span>
                  <Input
                    id="quickFundAmt"
                    type="number"
                    min="1"
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="h-11 pl-14 text-[15px] font-medium bg-card"
                    required
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="flex items-start gap-2.5 rounded-xl bg-destructive/10 p-3 text-[13px] text-destructive">
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <Button
                type="submit"
                variant="default"
                size="lg"
                disabled={busy || !amount}
                className="mt-2 h-11 w-full text-[14px] cursor-pointer"
              >
                {busy ? (
                  <>
                    <AppLoader size={16} className="mr-2" />
                    <span>Processing…</span>
                  </>
                ) : (
                  <span>Continue</span>
                )}
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

              {errorMsg && (
                <div className="w-full flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-[13px] text-destructive">
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

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
                  {countdown > 0 ? `Resend in ${countdown}s` : "Resend code"}
                </button>
              </div>
            </div>
          )}

          {/* STAGE 3: USSD PROMPT */}
          {stage === "ussd" && (
            <div className="flex flex-col items-center text-center gap-4 py-4">
              <div className="relative flex size-20 items-center justify-center rounded-full bg-primary/15 text-foreground animate-pulse">
                <Smartphone size={34} strokeWidth={1.8} />
              </div>
              <div className="flex flex-col gap-1.5">
                <h4 className="text-[17px] text-foreground tracking-[-0.01em]">Approval Required</h4>
                <p className="text-[13px] text-muted-foreground max-w-[320px]">
                  A payment request of <span className="text-foreground font-medium">GHS {parseFloat(amount).toFixed(2)}</span> has been sent to your phone. Enter your Mobile Money PIN on your device to authorize.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-muted/50 px-4 py-2 text-[12.5px] text-muted-foreground">
                <AppLoader size={14} />
                <span>Waiting for your network authorization…</span>
              </div>
            </div>
          )}

          {/* STAGE 4: SUCCESS */}
          {stage === "success" && (
            <div className="flex flex-col items-center text-center gap-4 py-4">
              <div className="flex size-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={36} strokeWidth={1.9} />
              </div>

              <div className="flex flex-col gap-1">
                <h4 className="text-[18px] text-foreground tracking-[-0.01em]">
                  GHS {parseFloat(amount).toFixed(2)} Deposited!
                </h4>
                <p className="text-[13px] text-muted-foreground max-w-[320px]">
                  Your account is now funded and ready for all banking actions, transfers, and card payments.
                </p>
              </div>

              <Button
                type="button"
                variant="default"
                size="lg"
                onClick={handleFinish}
                className="mt-3 h-11 w-full text-[14px] cursor-pointer"
              >
                <span>Back to Dashboard</span>
                <ArrowRight size={16} strokeWidth={1.8} className="ml-1.5" />
              </Button>
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
