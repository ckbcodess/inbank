"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { parseOnboardingStep, type OnboardingStep } from "@/lib/onboarding-steps";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  CreditCard,
  Landmark,
  Smartphone,
} from "lucide-react";
import { AppLoader } from "@/components/ui/loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AuthLayout from "@/components/auth/AuthLayout";
import OtpInput, { OTP_LENGTH } from "@/components/auth/OtpInput";
import SelfieCapture from "@/components/auth/SelfieCapture";
import { useSession } from "@/lib/session-store";
import { ACTORS } from "@/lib/mock-data";
import { type NetworkOperator } from "@/lib/accounts-store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  setFirstRun,
  setPendingFundingSource,
  clearPendingFundingSource,
  setPendingReferral,
  trustThisDevice,
  setHasSkippedFunding,
  clearHasSkippedFunding,
} from "@/lib/device-trust";
import { cn } from "@/lib/utils";

import NewPasswordFields, { newPasswordReady } from "@/components/auth/NewPasswordFields";
import { RememberDeviceRow } from "@/components/auth/RememberDeviceRow";

type Step = OnboardingStep;

const RESEND_SECONDS = 30;

function SignupContent() {
  const router = useRouter();
  const { signIn, selectProfile, verifyMfa } = useSession();

  const searchParams = useSearchParams();
  // `?step=` opens the flow on that step (the Demo hub jumps with it).
  const stepParam = parseOnboardingStep(searchParams.get("step"));
  const [step, setStep] = useState<Step>(stepParam ?? "ghana_card");
  useEffect(() => {
    if (!stepParam) return;
    setStep(stepParam);
    setErrorMsg("");
    setBusy(false);
  }, [stepParam]);
  const [ghanaCard, setGhanaCard] = useState("GHA-7890123456-1");
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // OTP State
  const [digits, setDigits] = useState<string[]>(() => Array<string>(OTP_LENGTH).fill(""));
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const [otpTarget, setOtpTarget] = useState<"sms" | "email">("sms");

  // Password & PIN State
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  // Asked alongside the password, where sign-in is being set up. Opt-in.
  const [rememberDevice, setRememberDevice] = useState(false);
  const [pinDigits, setPinDigits] = useState<string[]>(["", "", "", ""]);
  const [confirmPinDigits, setConfirmPinDigits] = useState<string[]>(["", "", "", ""]);
  const [errorMsg, setErrorMsg] = useState("");

  // Funding & Source of Funds State
  const [fundStage, setFundStage] = useState<"select" | "form" | "otp" | "ussd" | "success">("select");
  const [fundMethod, setFundMethod] = useState<"momo" | "card">("momo");
  const [momoOperator, setMomoOperator] = useState<NetworkOperator>("MTN");
  const [momoNumber, setMomoNumber] = useState("024 123 4567");
  const [cardNumber, setCardNumber] = useState("4111 2222 3333 4444");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvv, setCardCvv] = useState("123");
  const [fundAmount, setFundAmount] = useState("500");
  const [hasFundedAccount, setHasFundedAccount] = useState(false);
  const [fundOtpDigits, setFundOtpDigits] = useState<string[]>(() => Array<string>(6).fill(""));
  const [fundCountdown, setFundCountdown] = useState(30);


  // OTP Countdown
  useEffect(() => {
    if (step !== "otp" || countdown <= 0) return;
    const t = window.setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [step, countdown]);

  // Fund MoMo OTP Countdown
  useEffect(() => {
    if (step !== "fund_account" || fundStage !== "otp" || fundCountdown <= 0) return;
    const t = window.setTimeout(() => setFundCountdown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [step, fundStage, fundCountdown]);

  // Fund USSD Approval Auto-Transition (Simulation)
  useEffect(() => {
    if (step !== "fund_account" || fundStage !== "ussd") return;
    const timer = window.setTimeout(() => {
      setHasFundedAccount(true);
      setFundStage("success");
    }, 2800);
    return () => window.clearTimeout(timer);
  }, [step, fundStage]);

  function handleVerifyDetails() {
    setBusy(true);
    window.setTimeout(() => {
      setDigits(Array(OTP_LENGTH).fill(""));
      setBusy(false);
      setStep("otp");
      setCountdown(RESEND_SECONDS);
    }, 600);
  }

  function handleOtpSubmit(incomingCode?: string) {
    const code = incomingCode ?? digits.join("");
    if (code.length < OTP_LENGTH || busy) return;

    // Demo: 000000 triggers the invalid error state
    if (code === "000000") {
      setErrorMsg("The code entered is incorrect or has expired. Please try again or request a new code.");
      setDigits(Array(OTP_LENGTH).fill(""));
      return;
    }

    setErrorMsg("");
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      setStep("password");
    }, 700);
  }


  const stepNumberMap: Record<Step, number> = {
    ghana_card: 1,
    selfie: 2,
    review_details: 3,
    otp: 4,
    password: 5,
    virtual_account_ready: 6,
    fund_account: 6,
    pin: 7,
    confirm_pin: 8,
  };

  function handleGhanaCardSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ghanaCard.trim()) {
      setErrorMsg("Please enter your Ghana Card number");
      return;
    }
    setErrorMsg("");
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      setStep("selfie");
    }, 600);
  }

  function handleCaptureSelfie(imageDataUrl: string) {
    setSelfieImage(imageDataUrl);
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      setStep("review_details");
    }, 800);
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) {
      setErrorMsg("Please enter a password.");
      return;
    }
    // Demo: 00000 or 000000 triggers error state
    if (password === "00000" || password === "000000") {
      setErrorMsg("That password cannot be used. Choose another.");
      return;
    }
    if (!confirmPassword) {
      setErrorMsg("Please confirm your password.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    setErrorMsg("");
    // A short pause (with a spinner) so steps don't snap past each other.
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      setStep("virtual_account_ready");
    }, 600);
  }

  function handleFundSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fundAmount || parseFloat(fundAmount) <= 0) {
      setErrorMsg("Please enter an amount to fund.");
      return;
    }
    setErrorMsg("");
    setBusy(true);
    if (fundMethod === "momo") {
      window.setTimeout(() => {
        setBusy(false);
        setFundOtpDigits(Array(6).fill(""));
        setFundCountdown(30);
        setFundStage("otp");
      }, 500);
    } else {
      window.setTimeout(() => {
        setBusy(false);
        setHasFundedAccount(true);
        setFundStage("success");
      }, 800);
    }
  }

  function handleFundOtpSubmit(incomingCode?: string) {
    const code = incomingCode ?? fundOtpDigits.join("");
    if (code.length < 6 || busy) return;
    if (code === "000000") {
      setErrorMsg("The code entered is incorrect or expired. Please try again.");
      setFundOtpDigits(Array(6).fill(""));
      return;
    }
    setErrorMsg("");
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      setFundStage("ussd");
    }, 500);
  }

  function handleFundSuccessContinue() {
    setErrorMsg("");
    setPinDigits(["", "", "", ""]);
    setConfirmPinDigits(["", "", "", ""]);
    setStep("pin");
  }

  function handlePinSubmit(incomingPin?: string) {
    const pin = incomingPin ?? pinDigits.join("");
    if (pin.length < 4 || busy) {
      if (pin.length < 4) setErrorMsg("Please enter a 4-digit PIN");
      return;
    }
    setErrorMsg("");
    setConfirmPinDigits(["", "", "", ""]);
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      setStep("confirm_pin");
    }, 500);
  }

  function handleConfirmPinSubmit(incomingConfirmPin?: string) {
    const confirmPin = incomingConfirmPin ?? confirmPinDigits.join("");
    if (confirmPin.length < 4 || busy) {
      if (confirmPin.length < 4) setErrorMsg("Please confirm your 4-digit PIN");
      return;
    }
    const originalPin = pinDigits.join("");
    if (originalPin.length === 4 && confirmPin !== originalPin) {
      setErrorMsg("PINs do not match. Please try again.");
      setConfirmPinDigits(["", "", "", ""]);
      return;
    }
    setErrorMsg("");
    setBusy(true);

    // PIN confirmed! Complete onboarding into the dashboard (referral & source modals show over blurred dashboard)
    window.setTimeout(() => {
      if (hasFundedAccount) {
        clearHasSkippedFunding();
        setPendingFundingSource({
          type: fundMethod,
          operator: momoOperator,
          momoNumber,
          cardNumber,
        });
      } else {
        setHasSkippedFunding(true);
        clearPendingFundingSource();
      }
      setPendingReferral(true);
      setFirstRun("new");
      const actor = ACTORS[0]; // Log in as registered user
      signIn(actor);
      if (actor.profiles.length > 0) {
        selectProfile(actor.profiles[0]);
      }
      verifyMfa();
      if (rememberDevice) trustThisDevice(actor);
      router.push("/overview");
    }, 600);
  }

  function handleBackStep() {
    setErrorMsg("");
    setBusy(false);
    if (step === "confirm_pin") {
      setConfirmPinDigits(["", "", "", ""]);
      setStep("pin");
    } else if (step === "pin") {
      setPinDigits(["", "", "", ""]);
      if (hasFundedAccount) {
        setStep("fund_account");
        setFundStage("form");
      } else {
        setStep("virtual_account_ready");
      }
    } else if (step === "fund_account") {
      if (fundStage === "otp") {
        setFundStage("form");
      } else if (fundStage === "ussd" || fundStage === "success") {
        setFundStage("form");
      } else if (fundStage === "form") {
        setFundStage("select");
      } else {
        setStep("virtual_account_ready");
      }
    } else if (step === "virtual_account_ready") {
      setStep("password");
    } else if (step === "password") {
      setPassword("");
      setConfirmPassword("");
      setDigits(Array(OTP_LENGTH).fill(""));
      setCountdown(RESEND_SECONDS);
      setStep("otp");
    } else if (step === "otp") {
      setDigits(Array(OTP_LENGTH).fill(""));
      setStep("review_details");
    } else if (step === "review_details") {
      setSelfieImage(null);
      setStep("selfie");
    } else if (step === "selfie") {
      setStep("ghana_card");
    } else {
      router.push("/get-started");
    }
  }

  return (
    <AuthLayout
      title={
        step === "ghana_card"
          ? "Let's Verify Your Identity"
          : step === "selfie"
          ? "Selfie Match"
          : step === "review_details"
          ? "Review Your Details"
          : step === "otp"
          ? "Confirm Your Code"
          : step === "password"
          ? "Create Your Password"
          : step === "virtual_account_ready"
          ? undefined
          : step === "fund_account"
          ? fundStage === "select"
            ? "Fund Your Virtual Account"
            : fundStage === "form"
            ? fundMethod === "momo"
              ? "Fund with Mobile Money Wallet"
              : "Fund with a Card"
            : fundStage === "otp"
            ? "Confirm Phone Number"
            : undefined
          : step === "pin"
          ? "Set Your PIN"
          : "Confirm Your PIN"
      }
      description={
        step === "ghana_card"
          ? "We’ll securely verify you using your Ghana Card."
          : step === "selfie"
          ? "Center your face in the circle."
          : step === "review_details"
          ? "Confirm your details match your records."
          : step === "otp"
          ? otpTarget === "sms"
            ? "6-digit code sent to +233 24 *** *567."
            : "6-digit code sent to am•••••@example.com."
          : step === "password"
          ? "Choose a password you will remember."
          : step === "virtual_account_ready"
          ? undefined
          : step === "fund_account"
          ? fundStage === "select"
            ? "Choose a payment method to fund your account."
            : fundStage === "form"
            ? fundMethod === "momo"
              ? "Enter your mobile money number and amount to deposit."
              : "Enter your card details and amount to deposit."
            : fundStage === "otp"
            ? `Enter the 6-digit code sent to +233 ${momoNumber.replace(/^0/, "")} to verify your mobile money account.`
            : undefined
          : step === "pin"
          ? "Set a PIN for all your transactions in the app."
          : "Re-enter your 4-digit PIN to confirm."
      }
      onBack={handleBackStep}
      backLabel="Back to previous step"
      align={
        step === "virtual_account_ready" ||
        (step === "fund_account" && (fundStage === "ussd" || fundStage === "success"))
          ? "center"
          : "left"
      }
      stepProgress={{
        current: stepNumberMap[step],
        total: 8,
      }}
      width={step === "review_details" ? "default" : "compact"}
      animateHeight={true}
    >
      {/* STEP 1: Enter Ghana Card */}
      {step === "ghana_card" && (
        <form onSubmit={handleGhanaCardSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="ghanaCard" className="text-[13.5px] font-medium text-foreground">
              Ghana Card number
            </Label>
            <Input
              id="ghanaCard"
              type="text"
              placeholder="e.g GHA-0123456789-0"
              value={ghanaCard}
              onChange={(e) => setGhanaCard(e.target.value.toUpperCase())}
              className="h-11 font-mono text-[14.5px] uppercase tracking-wider"
              required
            />
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2.5 rounded-xl bg-destructive/10 p-3.5 text-[13px] text-destructive">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <Button
            type="submit"
            variant="default"
            size="lg"
            data-tour="signup-card"
            disabled={busy}
            className="mt-3.5 h-11 w-full text-[14px]"
          >
            {busy ? (
              <>
                <AppLoader size={16} />
                Verifying...
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </form>
      )}

      {/* STEP 2: Selfie / Photo Capture */}
      {step === "selfie" && (
        <SelfieCapture
          onCapture={handleCaptureSelfie}
          busy={busy}
          capturedImage={selfieImage}
          onRetake={() => {
            setSelfieImage(null);
          }}
          dataTour="signup-selfie"
        />
      )}

      {/* STEP 3: Review Details */}
      {step === "review_details" && (
        <div className="flex flex-col gap-5">
          <div className="rounded-2xl border border-border/80 bg-muted/20 p-5 divide-y divide-border/60">
            <div className="flex items-center justify-between pb-3.5">
              <span className="text-[13px] text-muted-foreground">Name</span>
              <span className="text-[14px] font-medium text-foreground">Tsotsoo Mills</span>
            </div>
            <div className="flex items-center justify-between py-3.5">
              <span className="text-[13px] text-muted-foreground">National ID</span>
              <span className="text-[14px] font-medium text-foreground">{ghanaCard}</span>
            </div>
            <div className="flex items-center justify-between py-3.5">
              <span className="text-[13px] text-muted-foreground">Mobile</span>
              <span className="text-[14px] font-medium text-foreground">+233 24 *** *567</span>
            </div>
            <div className="flex items-center justify-between pt-3.5">
              <span className="text-[13px] text-muted-foreground">Email</span>
              <span className="text-[14px] font-medium text-foreground">ts•••••@example.com</span>
            </div>
          </div>

          <Button
            type="button"
            variant="default"
            size="lg"
            data-tour="signup-review"
            onClick={handleVerifyDetails}
            disabled={busy}
            className="mt-3.5 h-11 w-full text-[14px]"
          >
            {busy ? (
              <>
                <AppLoader size={16} />
                Sending code...
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </div>
      )}

      {/* STEP 4: OTP Verification */}
      {step === "otp" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleOtpSubmit();
          }}
          className="flex flex-col gap-6"
        >
          <div data-tour="signup-otp">
            <OtpInput
              value={digits}
              onChange={(next) => {
                setDigits(next);
                if (errorMsg) setErrorMsg("");
              }}
              onComplete={(code) => handleOtpSubmit(code)}
              disabled={busy}
              invalid={!!errorMsg}
              autoFocus
            />
          </div>

          {busy && (
            <div className="flex items-center justify-center gap-2 py-1 text-[13.5px] text-muted-foreground">
              <AppLoader size={16} />
              <span>Verifying code...</span>
            </div>
          )}

          {errorMsg && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl bg-destructive/10 px-4 py-3.5 text-[13px] text-destructive"
            >
              <AlertCircle size={16} strokeWidth={1.9} aria-hidden="true" className="mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Recovery path */}
          <div className="mt-2 flex flex-col items-center gap-2 border-t border-border pt-4">
            <button
              type="button"
              disabled={countdown > 0}
              onClick={() => {
                setCountdown(RESEND_SECONDS);
                setErrorMsg("");
              }}
              className="text-[13px] text-foreground underline-offset-4 hover:underline disabled:text-muted-foreground disabled:no-underline cursor-pointer"
            >
              {countdown > 0 ? (
                <>
                  Resend code in <span className="tabular">{countdown}s</span>
                </>
              ) : (
                "Resend code"
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setOtpTarget(otpTarget === "sms" ? "email" : "sms");
                setCountdown(RESEND_SECONDS);
                setErrorMsg("");
              }}
              className="text-center text-[12.5px] text-muted-foreground transition-colors hover:text-foreground underline underline-offset-4 cursor-pointer"
            >
              Send to {otpTarget === "sms" ? "email instead" : "SMS instead"}
            </button>
          </div>
        </form>
      )}

      {/* STEP 5: Set up Password — same fields, rules and remember-device offer as activation */}
      {step === "password" && (
        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-5">
          <NewPasswordFields
            password={password}
            confirm={confirmPassword}
            onPasswordChange={(v) => {
              setPassword(v);
              if (errorMsg) setErrorMsg("");
            }}
            onConfirmChange={(v) => {
              setConfirmPassword(v);
              if (errorMsg) setErrorMsg("");
            }}
            autoFocus
          />

          <RememberDeviceRow checked={rememberDevice} onCheckedChange={setRememberDevice} />

          {errorMsg && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl bg-destructive/10 px-4 py-3.5 text-[13px] text-destructive"
            >
              <AlertCircle size={16} strokeWidth={1.9} aria-hidden="true" className="mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <Button
            type="submit"
            variant="default"
            size="lg"
            data-tour="signup-password"
            disabled={busy || !newPasswordReady(password, confirmPassword)}
            className="mt-2 h-11 w-full text-[14px]"
          >
            {busy ? (
              <>
                <AppLoader size={16} className="mr-2" />
                Saving…
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </form>
      )}

      {/* STEP 6: Virtual Account Ready */}
      {step === "virtual_account_ready" && (
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-6 flex size-24 items-center justify-center rounded-full bg-primary/15 text-foreground shadow-[0_0_60px_20px_color-mix(in_oklch,var(--primary)_18%,transparent)]">
            <Landmark size={40} strokeWidth={1.5} aria-hidden="true" />
            <span className="absolute -bottom-0.5 -right-0.5 flex size-7 items-center justify-center rounded-full border-2 border-background bg-success text-white">
              <Check size={14} strokeWidth={2.4} aria-hidden="true" />
            </span>
          </div>

          <h2 className="text-[22px] tracking-[-0.02em] text-foreground sm:text-[24px]">
            Your Virtual Account is Ready
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground max-w-[340px]">
            Fund your virtual account to keep it ready for transactions anytime.
          </p>

          <div className="mt-8 flex w-full flex-col gap-3">
            <Button
              type="button"
              variant="default"
              size="lg"
              onClick={() => {
                setErrorMsg("");
                setFundStage("select");
                setStep("fund_account");
              }}
              className="h-11 w-full text-[14px]"
            >
              Fund Virtual Account
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => {
                setErrorMsg("");
                setHasFundedAccount(false);
                setPinDigits(["", "", "", ""]);
                setStep("pin");
              }}
              className="h-11 w-full text-[14px]"
            >
              Skip &amp; Proceed
            </Button>
          </div>
        </div>
      )}

      {/* STEP 6a: Fund Virtual Account - Method Selection */}
      {step === "fund_account" && fundStage === "select" && (
        <div className="flex flex-col gap-3.5">
          <button
            type="button"
            onClick={() => {
              setErrorMsg("");
              setFundMethod("momo");
              setFundStage("form");
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
            <ArrowRight size={16} strokeWidth={1.8} className="text-muted-foreground transition-transform shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => {
              setErrorMsg("");
              setFundMethod("card");
              setFundStage("form");
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
            <ArrowRight size={16} strokeWidth={1.8} className="text-muted-foreground transition-transform shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => {
              setErrorMsg("");
              setHasFundedAccount(false);
              setPinDigits(["", "", "", ""]);
              setStep("pin");
            }}
            className="mt-2 text-center text-[13px] text-muted-foreground transition-colors hover:text-foreground underline underline-offset-4 cursor-pointer"
          >
            Skip funding for now
          </button>
        </div>
      )}

      {/* STEP 6b: Fund Virtual Account - Form */}
      {step === "fund_account" && fundStage === "form" && (
        <form onSubmit={handleFundSubmit} className="flex flex-col gap-5">
          {fundMethod === "momo" ? (
            <div className="flex flex-col gap-4">
              {/* Mobile Number with Ghana Country Code */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="momoPhone" className="text-[13px] font-medium text-foreground">
                  Mobile Number
                </Label>
                <div className="flex items-center rounded-xl border border-border/80 bg-card overflow-hidden focus-within:ring-2 focus-within:ring-ring">
                  <div className="flex items-center gap-1.5 px-3 py-2.5 bg-muted/30 border-r border-border/60 text-[13.5px] font-medium text-foreground select-none shrink-0">
                    <span className="text-[16px]">🇬🇭</span>
                    <span>+233</span>
                    <ChevronDown size={14} className="text-muted-foreground ml-0.5" />
                  </div>
                  <Input
                    id="momoPhone"
                    type="tel"
                    placeholder="024 123 4567"
                    value={momoNumber}
                    onChange={(e) => setMomoNumber(e.target.value)}
                    className="border-0 shadow-none focus-visible:ring-0 h-11 text-[14.5px] font-mono rounded-none"
                    required
                  />
                </div>
              </div>

              {/* Network Provider Dropdown */}
              <div className="flex flex-col gap-2">
                <Label className="text-[13px] font-medium text-foreground">
                  Network Provider
                </Label>
                <Select
                  value={momoOperator}
                  onValueChange={(val) => val && setMomoOperator(val as NetworkOperator)}
                >
                  <SelectTrigger className="h-12 w-full rounded-xl border border-border/80 bg-card px-3.5 text-left shadow-none flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="relative size-6 shrink-0 flex items-center justify-center rounded-full overflow-hidden">
                        <Image
                          src={
                            momoOperator === "MTN"
                              ? "/mtn.svg"
                              : momoOperator === "Telecel"
                              ? "/telecel.svg"
                              : "/at.svg"
                          }
                          alt={momoOperator}
                          width={24}
                          height={24}
                          className="object-contain"
                        />
                      </span>
                      <span className="text-[14px] font-medium text-foreground">{momoOperator}</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      { id: "MTN", name: "MTN", logo: "/mtn.svg" },
                      { id: "Telecel", name: "Telecel", logo: "/telecel.svg" },
                      { id: "AT", name: "AT", logo: "/at.svg" },
                    ].map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        <div className="flex items-center gap-2.5">
                          <span className="relative size-6 shrink-0 flex items-center justify-center rounded-full overflow-hidden">
                            <Image
                              src={item.logo}
                              alt={item.name}
                              width={24}
                              height={24}
                              className="object-contain"
                            />
                          </span>
                          <span>{item.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-2">
                <Label htmlFor="cardNumber" className="text-[13px] font-medium text-foreground">
                  Card number
                </Label>
                <Input
                  id="cardNumber"
                  type="text"
                  placeholder="4123 •••• •••• 4444"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="h-11 font-mono text-[14px]"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="cardExpiry" className="text-[13px] font-medium text-foreground">
                    Expiry date
                  </Label>
                  <Input
                    id="cardExpiry"
                    type="text"
                    placeholder="MM/YY"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    className="h-11 font-mono text-[14px]"
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="cardCvv" className="text-[13px] font-medium text-foreground">
                    CVV
                  </Label>
                  <Input
                    id="cardCvv"
                    type="password"
                    maxLength={3}
                    placeholder="•••"
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value)}
                    className="h-11 font-mono text-[14px]"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Amount Field */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="fundAmount" className="text-[13px] font-medium text-foreground">
              Amount
            </Label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] font-mono text-muted-foreground">
                GHS
              </span>
              <Input
                id="fundAmount"
                type="number"
                min="1"
                step="any"
                placeholder="0.00"
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
                className="h-12 pl-14 text-[15px] font-medium bg-card"
                required
              />
            </div>
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2.5 rounded-xl bg-destructive/10 p-3.5 text-[13px] text-destructive">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="mt-2 flex flex-col gap-3">
            <Button
              type="submit"
              variant="default"
              size="lg"
              disabled={busy || !fundAmount}
              className="h-11 w-full text-[14px]"
            >
              {busy ? (
                <>
                  <AppLoader size={16} className="mr-2" />
                  Processing…
                </>
              ) : (
                "Continue"
              )}
            </Button>
            <button
              type="button"
              onClick={() => {
                setErrorMsg("");
                setHasFundedAccount(false);
                setPinDigits(["", "", "", ""]);
                setStep("pin");
              }}
              className="text-center text-[13px] text-muted-foreground transition-colors hover:text-foreground underline underline-offset-4 cursor-pointer"
            >
              Skip funding for now
            </button>
          </div>
        </form>
      )}

      {/* STEP 6c: MoMo Verification Code (OTP) */}
      {step === "fund_account" && fundStage === "otp" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleFundOtpSubmit();
          }}
          className="flex flex-col gap-6"
        >
          <div className="w-full flex justify-center">
            <OtpInput
              value={fundOtpDigits}
              onChange={(next) => {
                setFundOtpDigits(next);
                if (errorMsg) setErrorMsg("");
              }}
              length={6}
              mask={false}
              onComplete={(code) => handleFundOtpSubmit(code)}
              disabled={busy}
              invalid={!!errorMsg}
              autoFocus
            />
          </div>

          {busy && (
            <div className="flex items-center justify-center gap-2 py-1 text-[13.5px] text-muted-foreground">
              <AppLoader size={16} />
              <span>Verifying code…</span>
            </div>
          )}

          {errorMsg && (
            <div
              role="alert"
              className="w-full flex items-start gap-2.5 rounded-xl bg-destructive/10 px-4 py-3.5 text-[13px] text-destructive"
            >
              <AlertCircle size={16} strokeWidth={1.9} aria-hidden="true" className="mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              disabled={fundCountdown > 0}
              onClick={() => {
                setFundCountdown(30);
                setFundOtpDigits(Array(6).fill(""));
                setErrorMsg("");
              }}
              className="text-[13px] text-foreground underline-offset-4 hover:underline disabled:text-muted-foreground disabled:no-underline cursor-pointer"
            >
              {fundCountdown > 0 ? (
                <>
                  Resend code in <span className="tabular-nums">{fundCountdown}s</span>
                </>
              ) : (
                "Resend code"
              )}
            </button>
          </div>

          <Button
            type="submit"
            variant="default"
            size="lg"
            disabled={busy || fundOtpDigits.join("").length < 6}
            className="h-11 w-full text-[14px]"
          >
            Continue
          </Button>
        </form>
      )}

      {/* STEP 6d: USSD Prompt / Approval Required Screen */}
      {step === "fund_account" && fundStage === "ussd" && (
        <div className="flex flex-col items-center text-center py-4">
          <div className="flex size-14 items-center justify-center text-muted-foreground mb-4">
            <AppLoader size={34} />
          </div>

          <h2 className="text-[22px] tracking-[-0.02em] text-foreground sm:text-[24px]">
            Approval Required
          </h2>
          <p className="mt-2.5 text-[14px] leading-relaxed text-muted-foreground max-w-[340px]">
            You will recieve a USSD prompt to enter your MoMo PIN to complete the transaction.
          </p>

          <div className="mt-8 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setHasFundedAccount(true);
                setFundStage("success");
              }}
              className="text-[12.5px] text-muted-foreground hover:text-foreground underline underline-offset-4 cursor-pointer"
            >
              Simulate approval now
            </button>
          </div>
        </div>
      )}

      {/* STEP 6e: Funds Added Success Screen */}
      {step === "fund_account" && fundStage === "success" && (
        <div className="flex flex-col items-center text-center py-2">
          {/* Confetti & Success Badge Container */}
          <div className="relative mb-5 flex size-32 items-center justify-center">
            {/* SVG Confetti Sprinkles */}
            <svg
              className="absolute inset-0 size-full pointer-events-none select-none"
              viewBox="0 0 128 128"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Confetti ticks / pills */}
              <line x1="24" y1="36" x2="30" y2="30" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="42" y1="22" x2="46" y2="28" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="88" y1="20" x2="94" y2="27" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="108" y1="24" x2="114" y2="33" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="24" y1="60" x2="24" y2="68" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="40" y1="78" x2="46" y2="72" stroke="#6ee7b7" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="106" y1="64" x2="110" y2="58" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
              {/* Confetti dots */}
              <circle cx="12" cy="85" r="3" fill="#22c55e" />
              <circle cx="36" cy="106" r="3" fill="#eab308" />
              <circle cx="95" cy="92" r="3" fill="#10b981" />
              <circle cx="124" cy="86" r="3" fill="#eab308" />
            </svg>

            {/* Central Badge */}
            <div className="relative flex size-20 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/20 shadow-sm animate-in zoom-in-90 duration-300">
              <div className="flex size-11 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md">
                <Check size={24} strokeWidth={2.5} />
              </div>
            </div>
          </div>

          <h2 className="text-[22px] tracking-[-0.02em] text-foreground sm:text-[24px]">
            Funds Added
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground max-w-[340px]">
            You have successfully added{" "}
            <span className="font-medium text-foreground">
              GHS{parseFloat(fundAmount || "0").toFixed(2)}
            </span>{" "}
            to your virtual account.
          </p>

          <div className="mt-8 flex w-full flex-col gap-3">
            <Button
              type="button"
              variant="default"
              size="lg"
              onClick={handleFundSuccessContinue}
              className="h-11 w-full text-[14px]"
            >
              Continue
            </Button>
          </div>
        </div>
      )}

      {/* STEP 7: Set PIN */}
      {step === "pin" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handlePinSubmit();
          }}
          className="flex flex-col items-center gap-6"
        >
          <div className="w-full" data-tour="signup-pin">
            <OtpInput
              value={pinDigits}
              onChange={(next) => {
                setPinDigits(next);
                if (errorMsg) setErrorMsg("");
              }}
              length={4}
              mask
              onComplete={(pin) => handlePinSubmit(pin)}
              disabled={busy}
              invalid={!!errorMsg}
              autoFocus
            />
          </div>

          {busy && (
            <div className="flex items-center justify-center gap-2 py-1 text-[13.5px] text-muted-foreground">
              <AppLoader size={16} />
              <span>Saving your PIN…</span>
            </div>
          )}

          {errorMsg && (
            <div
              role="alert"
              className="w-full flex items-start gap-2.5 rounded-xl bg-destructive/10 px-4 py-3.5 text-[13px] text-destructive"
            >
              <AlertCircle size={16} strokeWidth={1.9} aria-hidden="true" className="mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </form>
      )}

      {/* STEP 8: Confirm PIN */}
      {step === "confirm_pin" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleConfirmPinSubmit();
          }}
          className="flex flex-col items-center gap-6"
        >
          <div className="w-full" data-tour="signup-confirm-pin">
            <OtpInput
              value={confirmPinDigits}
              onChange={(next) => {
                setConfirmPinDigits(next);
                if (errorMsg) setErrorMsg("");
              }}
              length={4}
              mask
              onComplete={(pin) => handleConfirmPinSubmit(pin)}
              disabled={busy}
              invalid={!!errorMsg}
              autoFocus
            />
          </div>

          {busy && (
            <div className="flex items-center justify-center gap-2 py-1 text-[13.5px] text-muted-foreground">
              <AppLoader size={16} />
              <span>Setting up account...</span>
            </div>
          )}

          {errorMsg && (
            <div
              role="alert"
              className="w-full flex items-start gap-2.5 rounded-xl bg-destructive/10 px-4 py-3.5 text-[13px] text-destructive"
            >
              <AlertCircle size={16} strokeWidth={1.9} aria-hidden="true" className="mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </form>
      )}

    </AuthLayout>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-background" />}>
      <SignupContent />
    </Suspense>
  );
}
