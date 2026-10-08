"use client";

import { AlertToast } from "@/components/ui/alert-toast";
import Image from "next/image";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { parseOnboardingStep, type OnboardingStep } from "@/lib/onboarding-steps";
import {
  Check,
  User,
  Users,
} from "lucide-react";
import { AppLoader } from "@/components/ui/loader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AuthLayout from "@/components/auth/AuthLayout";
import { maskEmail, maskMobile } from "@/lib/auth-shared";
import OtpInput, { OTP_LENGTH } from "@/components/auth/OtpInput";
import SelfieCapture from "@/components/auth/SelfieCapture";
import NewPasswordFields, { newPasswordReady } from "@/components/auth/NewPasswordFields";
import { useSession } from "@/lib/session-store";
import { setFirstRun, setPendingReferral } from "@/lib/device-trust";
import { ACTORS } from "@/lib/mock-data";
import {
  ACTIVATION_PERSONAS,
  getPersonaByGhanaCard,
  type ActivationPersonaConfig,
} from "@/lib/activation";

import { Field } from "@/components/ui/field";
import { GhanaCardInput } from "@/components/ui/ghana-card-input";
import { isCompleteGhanaCard } from "@/lib/ghana-card";
type Step = OnboardingStep;

const RESEND_SECONDS = 30;

function ActivateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const personaParam = searchParams.get("persona") as
    | "single"
    | "multi"
    | "joint"
    | "mobile_sync"
    | null;

  const [activePersonaKey, setActivePersonaKey] = useState<
    "single" | "multi" | "joint" | "mobile_sync"
  >(personaParam && ACTIVATION_PERSONAS[personaParam] ? personaParam : "multi");

  const activePersona: ActivationPersonaConfig = ACTIVATION_PERSONAS[activePersonaKey];
  const isJoint = activePersona.isJoint ?? false;
  const isMobileSync = activePersona.mobileAppLinked ?? false;
  const isMultiAccount = activePersona.accounts.length > 1;

  const { signIn, selectProfile, verifyMfa } = useSession();

  // `?step=` opens the flow on that step (the Demo hub jumps with it).
  const stepParam = parseOnboardingStep(searchParams.get("step"));
  const [step, setStep] = useState<Step>(stepParam ?? "ghana_card");
  useEffect(() => {
    if (!stepParam) return;
    setStep(stepParam);
    setErrorMsg("");
    setBusy(false);
  }, [stepParam]);
  const [ghanaCard, setGhanaCard] = useState(activePersona.ghanaCard);
  const [selectedPrimaryAccountId, setSelectedPrimaryAccountId] = useState<string>(
    activePersona.accounts.length > 1 ? "" : activePersona.accounts[0]?.id ?? ""
  );

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
  const [pinDigits, setPinDigits] = useState<string[]>(["", "", "", ""]);
  const [confirmPinDigits, setConfirmPinDigits] = useState<string[]>(["", "", "", ""]);
  const [errorMsg, setErrorMsg] = useState("");
  // PIN confirmation: one retry on a mismatch, then back to the start.
  const [pinMisses, setPinMisses] = useState(0);
  const [pinNote, setPinNote] = useState("");

  // Sync state when persona parameter or selection changes
  const applyPersona = (key: "single" | "multi" | "joint" | "mobile_sync") => {
    setActivePersonaKey(key);
    const config = ACTIVATION_PERSONAS[key];
    setGhanaCard(config.ghanaCard);
    setSelectedPrimaryAccountId(config.accounts.length > 1 ? "" : config.accounts[0]?.id ?? "");
    setErrorMsg("");
  };

  useEffect(() => {
    if (personaParam && ACTIVATION_PERSONAS[personaParam]) {
      applyPersona(personaParam);
    }
  }, [personaParam]);

  // OTP Countdown
  useEffect(() => {
    if (step !== "otp" || countdown <= 0) return;
    const t = window.setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [step, countdown]);

  function handleVerifyDetails() {
    if (isMultiAccount && !selectedPrimaryAccountId) {
      setErrorMsg("Please select your default account");
      return;
    }
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
    }, 600);
  }

  // Step Progress Index (out of 7)
  const stepNumberMap: Record<Step, number> = {
    ghana_card: 1,
    selfie: 2,
    review_details: 3,
    otp: 4,
    password: 5,
    pin: 6,
    confirm_pin: 7,
  };

  function handleGhanaCardSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isCompleteGhanaCard(ghanaCard)) {
      setErrorMsg("Enter all ten digits of your Ghana Card number: nine, then the check digit.");
      return;
    }

    // Auto-detect persona if card matches known demo pattern
    const detected = getPersonaByGhanaCard(ghanaCard);
    if (detected.id !== activePersonaKey) {
      setActivePersonaKey(detected.id);
      setSelectedPrimaryAccountId(detected.accounts.length > 1 ? "" : detected.accounts[0]?.id ?? "");
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
    setPinDigits(["", "", "", ""]);
    setConfirmPinDigits(["", "", "", ""]);
    // A short pause (with a spinner) so steps don't snap past each other.
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      setStep("pin");
    }, 600);
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

  function restartPin(note = "") {
    setPinMisses(0);
    setPinDigits(["", "", "", ""]);
    setConfirmPinDigits(["", "", "", ""]);
    setErrorMsg("");
    setPinNote(note);
    setStep("pin");
  }

  function handleConfirmPinSubmit(incomingConfirmPin?: string) {
    const confirmPin = incomingConfirmPin ?? confirmPinDigits.join("");
    if (confirmPin.length < 4 || busy) {
      if (confirmPin.length < 4) setErrorMsg("Please confirm your 4-digit PIN");
      return;
    }
    const originalPin = pinDigits.join("");
    if (originalPin.length === 4 && confirmPin !== originalPin) {
      if (pinMisses + 1 >= 2) {
        restartPin("Those didn’t match twice, so let’s start again. Choose a PIN you’ll remember.");
        return;
      }
      setPinMisses(pinMisses + 1);
      setErrorMsg("PINs don’t match. Try again.");
      setConfirmPinDigits(["", "", "", ""]);
      return;
    }
    setErrorMsg("");
    setBusy(true);

    // Finalize onboarding and log user into appropriate dashboard profile
    setTimeout(() => {
      const actor = ACTORS.find((a) => a.id === activePersona.actorId) || ACTORS[0];
      signIn(actor);
      if (actor.profiles.length > 0) {
        selectProfile(actor.profiles[0]);
      }
      verifyMfa();
      // First time in internet banking: the dashboard opens with a short welcome,
      // and offers the referral code there (same as new-to-GCB), not mid-flow.
      setPendingReferral(true);
      setFirstRun("new");
      router.push("/overview");
    }, 800);
  }

  function handleBackStep() {
    setErrorMsg("");
    setBusy(false);
    if (step === "confirm_pin") {
      setConfirmPinDigits(["", "", "", ""]);
      setStep("pin");
    } else if (step === "pin") {
      setPinDigits(["", "", "", ""]);
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

  const selectedPrimaryAccount =
    activePersona.accounts.find((a) => a.id === selectedPrimaryAccountId) ??
    (isMultiAccount ? undefined : activePersona.accounts[0]);

  return (
    <AuthLayout
      title={
        step === "ghana_card"
          ? "Let's Verify Your Identity"
          : step === "selfie"
          ? "Selfie Match"
          : step === "review_details"
          ? isMultiAccount
            ? "Select Your Default Account"
            : isJoint
            ? "Review Joint Account Details"
            : "Review Your Details"
          : step === "otp"
          ? "Confirm Your Code"
          : step === "password"
          ? "Create Your Password"
          : step === "pin"
          ? "Set Your PIN"
          : "Confirm Your PIN"
      }
      description={
        step === "ghana_card"
          ? "We’ll securely verify you using your Ghana Card."
          : step === "selfie"
          ? "Center your face in the frame."
          : step === "review_details"
          ? isMultiAccount
            ? "Select your default account for everyday banking."
            : isJoint
            ? "Confirm your joint account details."
            : isMobileSync
            ? "Confirm your details to link internet banking."
            : "Confirm your details match your account records."
          : step === "otp"
          ? isJoint
            ? <>A 6-digit code has been sent to {maskMobile(activePersona.phone)}.<br />Please enter the code below. A notice has also gone to {maskMobile(activePersona.coSignatoryPhone ?? "")}.</>
            : <>A 6-digit code has been sent to {otpTarget === "sms" ? maskMobile(activePersona.phone) : maskEmail(activePersona.email)}.<br />Please enter the code below.</>
          : step === "password"
          ? "Choose a password you will remember."
          : step === "pin"
          ? "Set a PIN for all your transactions in the app."
          : "Re-enter your 4-digit PIN to confirm."
      }
      onBack={handleBackStep}
      backLabel="Back to previous step"
      align="left"
      stepProgress={{
        current: stepNumberMap[step],
        total: 7,
      }}
      width="compact"
      animateHeight={true}
    >
      {/* STEP 1: Enter Ghana Card */}
      {step === "ghana_card" && (
        <form onSubmit={handleGhanaCardSubmit} className="flex flex-col gap-5">
          {/* Demo persona picker — dev only, never in the live build */}
          {process.env.NODE_ENV !== "production" && (
          <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3.5 py-2.5 text-[12.5px] text-muted-foreground">
            <span className="font-medium text-foreground">Interactive Demo Mode</span>
            <div className="flex items-center gap-1.5">
              {(["single", "multi", "joint", "mobile_sync"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyPersona(key)}
                  className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors cursor-pointer ${
                    activePersonaKey === key
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {key === "single"
                    ? "Single"
                    : key === "multi"
                    ? "Multi"
                    : key === "joint"
                    ? "Joint"
                    : "Mobile Sync"}
                </button>
              ))}
            </div>
          </div>
          )}

          {/* Card Input Field */}
          <Field label="Ghana Card Number" htmlFor="ghana-card">
            <GhanaCardInput
              id="ghana-card"
              value={ghanaCard}
              onValueChange={setGhanaCard}
              required
            />
</Field>

          <AlertToast when={errorMsg} message={errorMsg} />

          <div className="mt-4 flex flex-col gap-4">
            <Button
              type="submit"
              variant="default"
              size="lg"
              data-tour="activate-card"
              loading={busy}
              className="h-11 w-full text-[14px]"
            >
              Proceed
            </Button>
            <p className="text-center text-[12.5px] leading-5 text-muted-foreground">
              By continuing, you agree to our{" "}
              <a href="#" className="text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground">Terms</a>{" "}
              and{" "}
              <a href="#" className="text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground">Privacy Policy</a>.
            </p>
          </div>

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
          dataTour="activate-selfie"
        />
      )}

      {/* STEP 3: Review Details & Primary Account Picker */}
      {step === "review_details" && (
        <div className="flex flex-col gap-5">
          {/* Verified Customer Header Info */}
          <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-muted/15 px-4 py-3.5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary overflow-hidden">
                {selfieImage ? (
                  <Image src={selfieImage} alt={activePersona.holderName} width={36} height={36} unoptimized className="size-full object-cover" />
                ) : isJoint ? (
                  <Users size={16} />
                ) : (
                  <User size={16} />
                )}
              </div>
              <div className="min-w-0">
                <span className="text-[14px] font-medium text-foreground block truncate">
                  {activePersona.holderName}
                </span>
                <span className="text-[12px] text-muted-foreground">
                  {activePersona.ghanaCard}
                </span>
              </div>
            </div>

            <span className="inline-flex items-center gap-1 rounded-full bg-pill-success px-2 py-0.5 text-[11px] font-medium text-pill-success-text shrink-0">
              <Check size={12} strokeWidth={2.5} />
              Verified
            </span>
          </div>

          {/* CASE A: Multi-Account Dropdown Selection */}
          {isMultiAccount && (
            <div className="space-y-2">
              <Label htmlFor="primary-account-select">
                Default Account
              </Label>

              <div data-tour="activate-account-picker">
                <Select
                  value={selectedPrimaryAccountId || null}
                  onValueChange={(val) => val && setSelectedPrimaryAccountId(val)}
                >
                  <SelectTrigger
                    id="primary-account-select"
                    className="min-h-11 text-left cursor-pointer flex items-center justify-between"
                  >
                    <SelectValue placeholder="Select default account">
                      {selectedPrimaryAccount ? (
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-medium text-foreground truncate">
                            {selectedPrimaryAccount.name}
                          </span>
                          <span className="text-muted-foreground text-[12.5px] shrink-0">
                            •••• {selectedPrimaryAccount.number.slice(-4)}
                          </span>
                          {selectedPrimaryAccount.isJoint && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-primary/15 px-1.5 py-0.2 text-[10px] font-medium text-foreground shrink-0">
                              <Users size={10} className="text-primary" />
                              Joint
                            </span>
                          )}
                        </div>
                      ) : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {activePersona.accounts.map((acc) => (
                      <SelectItem
                        key={acc.id}
                        value={acc.id}
                        label={`${acc.name} · •••• ${acc.number.slice(-4)}`}
                      >
                        <div className="flex items-center justify-between w-full gap-3 py-0.5">
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-medium text-foreground truncate">{acc.name}</span>
                            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10.5px] text-muted-foreground shrink-0">
                              {acc.type}
                            </span>
                            {acc.isJoint && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-primary/15 px-1.5 py-0.5 text-[10.5px] font-medium text-foreground shrink-0">
                                <Users size={11} className="text-primary" />
                                Joint
                              </span>
                            )}
                          </div>
                          <span className="text-[12px] text-muted-foreground shrink-0">
                            •••• {acc.number.slice(-4)}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Dynamic Mandate Disclosure if selected account is Joint */}
              {selectedPrimaryAccount?.isJoint && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-left animate-in fade-in duration-200">
                  <div className="flex items-start gap-2.5">
                    <Users size={15} className="text-primary mt-0.5 shrink-0" />
                    <div>
                      <span className="text-[12.5px] font-medium text-foreground block">
                        Joint Mandate: {selectedPrimaryAccount.mandate || "Both Signatures Required"}
                      </span>
                      <p className="text-[11.5px] text-muted-foreground mt-0.5 leading-relaxed">
                        Alerts will be sent to both signatories upon activation.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CASE B: Single Account Display */}
          {!isMultiAccount && (
            <div className="rounded-xl border border-border/80 bg-muted/20 p-4 divide-y divide-border/60">
              <div className="flex items-center justify-between pb-3">
                <span className="text-[13px] text-muted-foreground">Default Account</span>
                <div className="text-right">
                  <span className="text-[14px] font-medium text-foreground block">
                    {activePersona.accounts[0]?.name}
                  </span>
                  <span className="text-[12.5px] text-muted-foreground">
                    •••• {activePersona.accounts[0]?.number.slice(-4)}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-[13px] text-muted-foreground">Registered Phone</span>
                <span className="text-[13.5px] font-medium text-foreground">{activePersona.phone}</span>
              </div>
              <div className="flex items-center justify-between pt-3">
                <span className="text-[13px] text-muted-foreground">Registered Email</span>
                <span className="text-[13.5px] font-medium text-foreground">{activePersona.email}</span>
              </div>
            </div>
          )}

          <Button
            type="button"
            variant="default"
            size="lg"
            data-tour="activate-review"
            onClick={handleVerifyDetails}
            disabled={(isMultiAccount && !selectedPrimaryAccountId)} loading={busy}
            className="mt-1 h-11 w-full text-[14px]"
          >
            Proceed
          </Button>

          <button
            type="button"
            onClick={() => setStep("ghana_card")}
            className="text-center text-[12.5px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer py-1"
          >
            Use a different Ghana Card
          </button>
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
          <div data-tour="activate-otp">
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

          {errorMsg && (
            <p role="alert" className="-mt-3 text-center text-[13px] text-destructive">
              {errorMsg}
            </p>
          )}

          {/* Recovery path */}
          <div className="flex flex-col items-center gap-5">
            <button
              type="button"
              disabled={countdown > 0}
              onClick={() => {
                setCountdown(RESEND_SECONDS);
                setErrorMsg("");
              }}
              className="text-[13px] text-foreground underline underline-offset-4 transition-colors hover:text-foreground/80 disabled:text-muted-foreground disabled:no-underline disabled:cursor-default cursor-pointer"
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
              className="text-center text-[13px] text-foreground underline underline-offset-4 transition-colors hover:text-foreground/80 disabled:text-muted-foreground disabled:no-underline disabled:cursor-default cursor-pointer"
            >
              Send to {otpTarget === "sms" ? "email instead" : "SMS instead"}
            </button>
          </div>

          {isJoint && (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5 text-[12.5px] text-muted-foreground">
              <span className="font-medium text-foreground">Joint mandate notice:</span> Notice sent to co-holder Esther ({activePersona.coSignatoryPhone}).
            </div>
          )}

          {busy && (
            <div className="flex items-center justify-center gap-2 py-1 text-[13.5px] text-muted-foreground">
              <AppLoader size={16} />
              <span>Verifying code...</span>
            </div>
          )}


        </form>
      )}

      {/* STEP 5: Password Creation */}
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

          <AlertToast when={errorMsg} message={errorMsg} />

          <Button
            type="submit"
            variant="default"
            size="lg"
            data-tour="activate-password"
            disabled={!newPasswordReady(password, confirmPassword)}
            loading={busy}
            className="mt-2 h-11 w-full text-[14px]"
          >
            Proceed
          </Button>
        </form>
      )}

      {/* STEP 6: 4-digit PIN */}
      {step === "pin" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handlePinSubmit();
          }}
          className="flex flex-col items-center gap-6"
        >
          <div className="w-full" data-tour="activate-pin">
            <OtpInput
              value={pinDigits}
              onChange={(next) => {
                setPinDigits(next);
                if (errorMsg) setErrorMsg("");
                if (pinNote) setPinNote("");
              }}
              length={4}
              mask
              onComplete={(pin) => handlePinSubmit(pin)}
              disabled={busy}
              invalid={!!errorMsg}
              autoFocus
            />
          </div>

          {errorMsg && (
            <p role="alert" className="-mt-3 text-center text-[13px] text-destructive">
              {errorMsg}
            </p>
          )}
          {!errorMsg && pinNote && (
            <p className="-mt-3 text-center text-[13px] text-muted-foreground">{pinNote}</p>
          )}

          {busy && (
            <div className="flex items-center justify-center gap-2 py-1 text-[13.5px] text-muted-foreground">
              <AppLoader size={16} />
              <span>Saving your PIN…</span>
            </div>
          )}

        </form>
      )}

      {/* STEP 7: Confirm 4-digit PIN */}
      {step === "confirm_pin" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleConfirmPinSubmit();
          }}
          className="flex flex-col items-center gap-6"
        >
          <div className="w-full" data-tour="activate-confirm-pin">
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

          {errorMsg && (
            <p role="alert" className="-mt-3 text-center text-[13px] text-destructive">
              {errorMsg}
            </p>
          )}

          {busy && (
            <div className="flex items-center justify-center gap-2 py-1 text-[13.5px] text-muted-foreground">
              <AppLoader size={16} />
              <span>Activating...</span>
            </div>
          )}

        </form>
      )}
    </AuthLayout>
  );
}

export default function ActivatePage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-background animate-pulse" />}>
      <ActivateContent />
    </Suspense>
  );
}

