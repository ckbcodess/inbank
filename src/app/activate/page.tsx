"use client";

import { AlertToast } from "@/components/ui/alert-toast";
import Image from "next/image";
import Link from "next/link";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { parseOnboardingStep, type OnboardingStep } from "@/lib/onboarding-steps";
import {


  Check,
  IdCard,
  Passport,
  User,
  Users,
} from "@/components/ui/icons";
import { AppLoader } from "@/components/ui/loader";
import { Button } from "@/components/ui/button";
import { KeyboardDock } from "@/components/ui/keyboard-dock";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AuthLayout from "@/components/auth/AuthLayout";
import { hasConsecutiveDigits, hasRepeatingDigits, maskMobile } from "@/lib/auth-shared";
import OtpInput, { OTP_LENGTH } from "@/components/auth/OtpInput";
import PinRequirements from "@/components/auth/PinRequirements";
import SelfieCapture from "@/components/auth/SelfieCapture";
import NewPasswordFields, { newPasswordReady } from "@/components/auth/NewPasswordFields";
import { useSession } from "@/lib/session-store";
import { homePathForActor } from "@/lib/navigation";
import { setFirstRun, setPendingReferral } from "@/lib/device-trust";
import { ACTORS } from "@/lib/mock-data";
import {
  ACTIVATION_PERSONAS,
  PASSPORT_PERSONA,
  getPersonaByGhanaCard,
  getPersonaByPassport,
  type ActivationPersonaConfig,
} from "@/lib/activation";

import { Field } from "@/components/ui/field";
import { GhanaCardInput } from "@/components/ui/ghana-card-input";
import {
  NIA_SELFIE_OUTCOME_LABELS,
  NIA_SELFIE_OUTCOMES,
  isCompleteGhanaCard,
  type NiaSelfieOutcome,
} from "@/lib/ghana-card";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import PassportVerifyModal from "@/components/auth/PassportVerifyModal";
import ChoiceRow from "@/components/auth/ChoiceRow";
import IdentityPartnerWindow from "@/components/auth/IdentityPartnerWindow";
import {
  fetchPartnerStatus,
  maskPassport,
  newPartnerSessionId,
  recordPartnerOutcome,
  type PartnerProgress,
  type PartnerResult,
} from "@/lib/identity-partner";
type Step = OnboardingStep;

const RESEND_SECONDS = 30;
/** Where a customer abroad gets help. The bank's own site until a diaspora contact channel is agreed (WORKING_LOG). */
const GCB_HELP_URL = "https://www.gcbbank.com.gh";
/** Where an existing GCB account is linked to a Ghana Card (the ePay portal). */
const LINK_ACCOUNT_URL = "https://epay.gcbltd.com:200/";
/** Where a new GCB account is opened. */
const OPEN_ACCOUNT_URL = "https://accountopeningportal.gcbltd.com/get-started";

/** What the Ghana Card step shows on screen. */
type GhanaCardView = "idle" | "not_found";
/** What the registry check returns when the customer presses Continue. Dev Mode picks it under Screen states. */
type GhanaCardOutcome = "verified" | "not_found";
const GHANA_CARD_OUTCOMES: readonly GhanaCardOutcome[] = ["verified", "not_found"];
const GHANA_CARD_OUTCOME_LABELS: Record<GhanaCardOutcome, string> = {
  verified: "Passes",
  not_found: "No record found",
};

/**
 * The passport path's second step, in place of our selfie: the identity partner's window is open, was closed early,
 * passed and waits for the customer to confirm here, or we're matching its passport to an account.
 */
type PassportState =
  | "waiting"
  | "closed"
  | "ready"
  | "checking"
  | "pending"
  | "failed"
  | "expired"
  | "matching"
  | "no_account";

const linkClass =
  "inline-flex min-h-8 cursor-pointer items-center text-body text-foreground underline decoration-border underline-offset-4 transition-colors duration-hover hover:decoration-foreground";

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

  // Passport path: the customer has no Ghana Card. The identity partner reads the passport; we match the account.
  const [idMethod, setIdMethod] = useState<"ghana_card" | "passport">("ghana_card");
  const [passportModalOpen, setPassportModalOpen] = useState(false);
  const [partnerOpen, setPartnerOpen] = useState(false);
  const [partnerSession, setPartnerSession] = useState(0);
  const [partnerFlash, setPartnerFlash] = useState(0);
  const [, setPartnerProgress] = useState<PartnerProgress>("opening");
  const [passportState, setPassportState] = useState<PassportState>("waiting");
  const [passportNumber, setPassportNumber] = useState("");
  const [passportExpiry, setPassportExpiry] = useState("");
  const [passportPersona, setPassportPersona] = useState<ActivationPersonaConfig | null>(null);
  // Which window session an account match belongs to, so a late match can't land after the person has moved on.
  const matchSession = useRef(0);
  useEffect(() => {
    matchSession.current = partnerSession;
  }, [partnerSession]);
  const isPassport = idMethod === "passport";

  const activePersona: ActivationPersonaConfig = passportPersona ?? ACTIVATION_PERSONAS[activePersonaKey];
  const isJoint = activePersona.isJoint ?? false;
  const isMobileSync = activePersona.mobileAppLinked ?? false;
  const isMultiAccount = activePersona.accounts.length > 1;
  // Everyone picks a default account on this step, even with one account (it is preselected). Joint and
  // mobile-linked customers keep their own review screens.
  const showAccountPicker = isMultiAccount || (!isJoint && !isMobileSync);

  const { signIn, selectProfile, verifyMfa } = useSession();

  // `?step=` opens the flow on that step (the Demo hub jumps with it).
  const stepParam = parseOnboardingStep(searchParams.get("step"));
  // The flow opens on a choice: which ID the account was opened with. A `?step=` jump skips it.
  const [choosingId, setChoosingId] = useState(!stepParam);
  const [step, setStep] = useState<Step>(stepParam ?? "ghana_card");
  useEffect(() => {
    if (!stepParam) return;
    setChoosingId(false);
    setStep(stepParam);
    setErrorMsg("");
    setBusy(false);
  }, [stepParam]);
  const [ghanaCard, setGhanaCard] = useState(activePersona.ghanaCard);
  // What the Ghana Card check found on the last attempt. "idle" shows the number field; the checking itself
  // runs on the Continue button (its loading state).
  const [ghanaCardState, setGhanaCardState] = useState<GhanaCardView>("idle");
  const [ghanaCardOutcome, setGhanaCardOutcome] = useState<GhanaCardOutcome>("verified");
  const [selectedPrimaryAccountId, setSelectedPrimaryAccountId] = useState<string>(
    activePersona.accounts.length > 1 ? "" : activePersona.accounts[0]?.id ?? ""
  );

  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // The selfie goes to NIA and the result comes back on the selfie screen. A photo that doesn't match asks to try again.
  const [niaOutcome, setNiaOutcome] = useState<NiaSelfieOutcome>("matched");
  const [selfieMismatch, setSelfieMismatch] = useState(false);

  // OTP State
  const [digits, setDigits] = useState<string[]>(() => Array<string>(OTP_LENGTH).fill(""));
  const [countdown, setCountdown] = useState(RESEND_SECONDS);

  // Password & PIN State
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  // Asked alongside the password, where login is being set up. Opt-in.
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

    setErrorMsg("");
    setGhanaCardState("idle");
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      // The registry check and the account lookup, simulated by the result picked in Dev Mode. Only a pass moves on.
      const check = ghanaCardOutcome;
      if (check === "not_found") {
        setGhanaCardState("not_found");
        return;
      }
      // Auto-detect persona if card matches known demo pattern
      const detected = getPersonaByGhanaCard(ghanaCard);
      if (detected.id !== "diaspora" && detected.id !== activePersonaKey) {
        setActivePersonaKey(detected.id);
        setSelectedPrimaryAccountId(detected.accounts.length > 1 ? "" : detected.accounts[0]?.id ?? "");
      }
      setStep("selfie");
    }, 900);
  }

  /** Opens (or reopens) the identity partner's window. Each opening is a fresh session. */
  function openPartner() {
    setChoosingId(false);
    setPassportModalOpen(false);
    setIdMethod("passport");
    setPassportState("waiting");
    setPartnerProgress("opening");
    setPartnerSession(newPartnerSessionId());
    setPartnerFlash(0);
    setPartnerOpen(true);
    setErrorMsg("");
    setStep("selfie");
  }

  function handlePartnerClosed() {
    setPartnerOpen(false);
    setPassportState("closed");
  }

  function handlePartnerResult(result: PartnerResult) {
    setPartnerOpen(false);
    // The partner keeps the outcome for this session. Nothing is shown or used here until the customer confirms.
    recordPartnerOutcome(partnerSession, result);
    setPassportState("ready");
  }

  /**
   * The customer says they've finished. We ask for this session's status and act only on that answer:
   * pending shows "still checking", a failure shows its error, and a pass goes on to find the account.
   */
  async function confirmPassportVerification() {
    const session = partnerSession;
    setPassportState("checking");
    const status = await fetchPartnerStatus(session);
    // The person may have left the passport path (Back, Use Ghana Card) or started again meanwhile.
    if (matchSession.current !== session) return;
    if (status.state === "pending") {
      setPassportState("pending");
      return;
    }
    if (status.state === "failed") {
      setPassportExpiry(status.expiry ?? "");
      setPassportState(status.reason === "expired" ? "expired" : "failed");
      return;
    }
    setPassportNumber(status.passportNumber);
    setPassportState("matching");
    window.setTimeout(() => {
      if (matchSession.current !== session) return;
      const match = getPersonaByPassport(status.passportNumber);
      if (!match) {
        setPassportState("no_account");
        return;
      }
      setPassportPersona(match);
      setSelectedPrimaryAccountId(match.accounts.length > 1 ? "" : match.accounts[0]?.id ?? "");
      setStep("review_details");
    }, 900);
  }

  /** Leaves the passport path for the Ghana Card field, forgetting what the partner returned. */
  function switchToGhanaCard() {
    matchSession.current = -1;
    setChoosingId(false);
    setPassportModalOpen(false);
    setPartnerOpen(false);
    setIdMethod("ghana_card");
    setPassportPersona(null);
    setPassportNumber("");
    setPassportExpiry("");
    setSelectedPrimaryAccountId(
      ACTIVATION_PERSONAS[activePersonaKey].accounts.length > 1 ? "" : ACTIVATION_PERSONAS[activePersonaKey].accounts[0]?.id ?? ""
    );
    setErrorMsg("");
    setGhanaCardState("idle");
    setStep("ghana_card");
  }

  function handleCaptureSelfie(imageDataUrl: string) {
    setSelfieImage(imageDataUrl);
    setSelfieMismatch(false);
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      if (niaOutcome === "no_match") {
        // The photo stays on screen with a red cross; Try Again retakes it.
        setSelfieMismatch(true);
        return;
      }
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
    if (hasConsecutiveDigits(pin)) {
      setErrorMsg("PIN cannot contain consecutive numbers.");
      return;
    }
    if (hasRepeatingDigits(pin)) {
      setErrorMsg("PIN cannot contain repeating numbers.");
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
      router.push(homePathForActor(actor));
    }, 800);
  }

  function handleBackStep() {
    setErrorMsg("");
    setBusy(false);
    if (choosingId) {
      router.push("/get-started");
      return;
    }
    // On the passport path, the partner's check stands in for steps 1 and 2, so Back from either returns to the choice.
    if (isPassport && (step === "selfie" || step === "review_details")) {
      switchToGhanaCard();
      setChoosingId(true);
      return;
    }
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
      setSelfieMismatch(false);
      setStep("ghana_card");
    } else {
      setChoosingId(true);
    }
  }

  const selectedPrimaryAccount =
    activePersona.accounts.find((a) => a.id === selectedPrimaryAccountId) ??
    (isMultiAccount ? undefined : activePersona.accounts[0]);

  const passportLastFour = maskPassport(passportNumber);
  const passportExpiryText = passportExpiry
    ? new Date(passportExpiry).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : "";
  const passportCopy: Record<PassportState, { title: string; description: string }> = {
    waiting: {
      title: "Finish in the Verification Window",
      description: "Finish on your phone. When you’re done, come back here and confirm.",
    },
    closed: {
      title: "Verification Not Finished",
      description: "The verification window was closed. If you finished on your phone, confirm below. Otherwise, resume.",
    },
    checking: {
      title: "Checking Your Verification",
      description: "This takes a few seconds.",
    },
    pending: {
      title: "Still Checking",
      description: "Your check isn’t finished yet. Check again in a moment, or verify again if you haven’t finished.",
    },
    failed: {
      title: "We Couldn’t Verify Your Passport",
      description: "We couldn’t match your selfie to the photo page. This is usually glare, a blurred photo or low light.",
    },
    expired: {
      title: "This Passport Has Expired",
      description: passportExpiryText
        ? `The passport you used expired on ${passportExpiryText}. Activate with a valid passport. If you’ve renewed it, the bank needs the new one on your account first.`
        : "Activate with a valid passport. If you’ve renewed it, the bank needs the new one on your account first.",
    },
    ready: {
      title: "Select The Option To Proceed",
      description: "Confirm below so we can find your account.",
    },
    matching: {
      title: "Finding Your Account",
      description: `Passport ${passportLastFour} is verified. We’re looking for the account it was used to open.`,
    },
    no_account: {
      title: "No Account Found With This Passport",
      description: `Passport ${passportLastFour} was verified, but no GCB account was opened with it.`,
    },
  };

  return (
    <AuthLayout
      title={
        choosingId
          ? "How Will You Like To Proceed?"
          : step === "ghana_card"
          ? ghanaCardState === "not_found"
            ? "No Record Found"
            : "Verify Your Identity"
          : step === "selfie"
          ? isPassport
            ? passportCopy[passportState].title
            : "Selfie Match"
          : step === "review_details"
          ? showAccountPicker
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
        choosingId
          ? "Choose the ID required to access your account."
          : step === "ghana_card"
          ? ghanaCardState === "not_found"
            ? "We could not find this Ghana Card in our records. Please check the number and try again, or link your existing account to this Ghana Card."
            : "We will securely verify your identity using your Ghana Card."
          : step === "selfie"
          ? isPassport
            ? passportCopy[passportState].description
            : "Center your face in the frame."
          : step === "review_details"
          ? showAccountPicker
            ? "Select your default account for everyday banking."
            : isJoint
            ? "Confirm your joint account details."
            : isMobileSync
            ? "Confirm your details to link internet banking."
            : "Confirm your details match your account records."
          : step === "otp"
          ? isJoint
            ? <>A 6-digit code has been sent to {maskMobile(activePersona.phone)}.<br />Please enter the code below. A notice has also gone to {maskMobile(activePersona.coSignatoryPhone ?? "")}.</>
            : <>A 6-digit code has been sent to {maskMobile(activePersona.phone)}.<br />Please enter the code below.</>
          : step === "password"
          ? "Choose a password you will remember."
          : step === "pin"
          ? "Set a 4-digit PIN for secure access."
          : "Re-enter your 4-digit PIN to confirm."
      }
      onBack={handleBackStep}
      backLabel="Back to previous step"
      align={choosingId ? "center" : "left"}
      stepProgress={choosingId ? undefined : { current: stepNumberMap[step], total: 7 }}
      width="compact"
      animateHeight={true}
    >

      {/* Before step 1: which ID the account was opened with. Passport explains itself in a modal first. */}
      {choosingId && (
        <div className="flex flex-col gap-2">
          <ChoiceRow
            dataTour="activate-with-ghana-card"
            icon={<IdCard size={18} />}
            title="With Ghana Card"
            description="I opened my account with my Ghana Card."
            onClick={() => {
              setChoosingId(false);
              setGhanaCardState("idle");
              setStep("ghana_card");
            }}
          />
          <ChoiceRow
            dataTour="activate-with-passport"
            icon={<Passport size={18} />}
            title="With Passport"
            description="For Link2Home accounts and diplomats only."
            onClick={() => setPassportModalOpen(true)}
          />
          <p className="mt-3 text-center text-body text-muted-foreground">
            Already registered?{" "}
            <Link href="/login" className="font-medium text-foreground underline underline-offset-4 hover:text-foreground/80">
              Login
            </Link>
          </p>
        </div>
      )}

      {/* STEP 1: Enter Ghana Card */}
      {/* Dev Mode: the result the check returns when Continue is pressed. The screen only changes after that. */}
      {!choosingId && step === "ghana_card" && (
        <StateSwitcher
          states={GHANA_CARD_OUTCOMES}
          labels={GHANA_CARD_OUTCOME_LABELS}
          value={ghanaCardOutcome}
          onChange={setGhanaCardOutcome}
          section="Ghana Card"
          label="Check result"
        />
      )}

      {!choosingId && step === "ghana_card" && ghanaCardState === "idle" && (
        <form onSubmit={handleGhanaCardSubmit} className="flex flex-col gap-4">

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

          <div className="mt-3 flex flex-col gap-3">
            <KeyboardDock>
              <Button
                type="submit"
                variant="default"
                size="md"
                data-tour="activate-card"
                loading={busy}
                className="w-full"
              >
                Continue
              </Button>
            </KeyboardDock>
            <p className="text-center text-caption leading-5 text-muted-foreground">
              By continuing, you agree to our{" "}
              <a href="#" className="text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground">Terms</a>{" "}
              and{" "}
              <a href="#" className="text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground">Privacy Policy</a>.
            </p>
          </div>

        </form>
      )}

      {/* STEP 1, when the number isn't in the registry: link an existing account to this card, or try the number again. */}
      {!choosingId && step === "ghana_card" && ghanaCardState === "not_found" && (
        <div className="flex flex-col items-center gap-3">
          <Button type="button" size="xl" className="w-full" onClick={() => setGhanaCardState("idle")}>
            Try Again
          </Button>
          <Button
            variant="outline"
            size="xl"
            className="w-full"
            nativeButton={false}
            render={<a href={LINK_ACCOUNT_URL} target="_blank" rel="noreferrer" />}
          >
            Link Account
          </Button>
          <a href={OPEN_ACCOUNT_URL} target="_blank" rel="noreferrer" className={linkClass}>
            Open a GCB account
          </a>
        </div>
      )}

      {/* STEP 2 (passport): the identity partner's window stands in for our selfie */}
      {step === "selfie" && isPassport && (
        <div className="flex flex-col gap-4">
          {(passportState === "waiting" || passportState === "checking" || passportState === "matching") && (
            <div className="flex items-start gap-3 border-y border-border py-4" role="status">
              <AppLoader size={16} />
              <span className="text-body text-foreground">
                {passportState === "matching"
                  ? "Looking for your account"
                  : passportState === "checking"
                  ? "Checking your verification"
                  : "Waiting for verification"}
              </span>
            </div>
          )}

          {passportState === "ready" && (
            <div className="flex flex-col items-center gap-3">
              <Button type="button" size="xl" className="w-full" onClick={confirmPassportVerification}>
                I Have Completed My Verification
              </Button>
              <Button type="button" variant="outline" size="xl" className="w-full" onClick={openPartner}>
                Verify Again
              </Button>
              <button
                type="button"
                onClick={switchToGhanaCard}
                className="inline-flex min-h-8 cursor-pointer items-center text-body text-foreground underline decoration-foreground underline-offset-4 transition-colors duration-hover hover:decoration-muted-foreground"
              >
                Cancel
              </button>
            </div>
          )}

          {passportState === "waiting" && (
            <div className="flex flex-col items-center gap-2">
              <button type="button" onClick={() => setPartnerFlash((n) => n + 1)} className={linkClass}>
                Can’t see the window? Show it again
              </button>
              <button type="button" onClick={switchToGhanaCard} className={linkClass}>
                Cancel
              </button>
            </div>
          )}

          {passportState === "closed" && (
            <div className="flex flex-col items-center gap-3">
              <Button type="button" size="xl" className="w-full" onClick={openPartner}>
                Resume Verification
              </Button>
              <Button type="button" variant="outline" size="xl" className="w-full" onClick={confirmPassportVerification}>
                I’ve Already Finished
              </Button>
              <button type="button" onClick={switchToGhanaCard} className={linkClass}>
                Use Ghana Card instead
              </button>
            </div>
          )}

          {passportState === "pending" && (
            <div className="flex flex-col items-center gap-3">
              <Button type="button" size="xl" className="w-full" onClick={confirmPassportVerification}>
                Check Again
              </Button>
              <Button type="button" variant="outline" size="xl" className="w-full" onClick={openPartner}>
                Verify Again
              </Button>
              <button type="button" onClick={switchToGhanaCard} className={linkClass}>
                Cancel
              </button>
            </div>
          )}

          {passportState === "failed" && (
            <div className="flex flex-col items-center gap-3">
              <Button type="button" size="xl" className="w-full" onClick={openPartner}>
                Try Again
              </Button>
              <Button type="button" variant="outline" size="xl" className="w-full" onClick={switchToGhanaCard}>
                Use a Ghana Card instead
              </Button>
              <a href={GCB_HELP_URL} target="_blank" rel="noreferrer" className={linkClass}>
                Still stuck? Talk to us
              </a>
            </div>
          )}

          {passportState === "expired" && (
            <div className="flex flex-col items-center gap-3">
              <Button
                size="xl"
                className="w-full"
                nativeButton={false}
                render={<a href={GCB_HELP_URL} target="_blank" rel="noreferrer" />}
              >
                Talk to Us
              </Button>
              <button type="button" onClick={switchToGhanaCard} className={linkClass}>
                Use Ghana Card instead
              </button>
            </div>
          )}

          {passportState === "no_account" && (
            <>
              <div className="flex flex-col">
                <div className="flex flex-col gap-1 border-b border-border py-3">
                  <span className="text-body font-medium text-foreground">Renewed your passport since opening the account?</span>
                  <span className="text-body leading-relaxed text-muted-foreground">
                    The bank still has your old one on record. Talk to us and we’ll update it, then you can activate.
                  </span>
                </div>
                <div className="flex flex-col gap-1 py-3">
                  <span className="text-body font-medium text-foreground">Opened your account with a Ghana Card?</span>
                  <span className="text-body leading-relaxed text-muted-foreground">Activate with your Ghana Card instead.</span>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <Button
                  size="xl"
                  className="w-full"
                  nativeButton={false}
                  render={<a href={GCB_HELP_URL} target="_blank" rel="noreferrer" />}
                >
                  Talk to Us
                </Button>
                <Button type="button" variant="outline" size="xl" className="w-full" onClick={switchToGhanaCard}>
                  Use Ghana Card
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* STEP 2: Selfie / Photo Capture */}
      {step === "selfie" && !isPassport && (
        <StateSwitcher
          states={NIA_SELFIE_OUTCOMES}
          labels={NIA_SELFIE_OUTCOME_LABELS}
          value={niaOutcome}
          onChange={setNiaOutcome}
          section="NIA"
          label="Selfie match result"
        />
      )}

      {step === "selfie" && !isPassport && (
        <SelfieCapture
          onCapture={handleCaptureSelfie}
          busy={busy}
          capturedImage={selfieImage}
          onRetake={() => {
            // Back to the normal selfie screen: no message, "Take photo".
            setSelfieImage(null);
            setSelfieMismatch(false);
          }}
          dataTour="activate-selfie"
          failed={selfieMismatch}
          notice={selfieMismatch ? "The Ghana Card and the selfie do not match." : null}
          captureLabel={selfieMismatch ? "Try Again" : "Take photo"}
        />
      )}

      {/* STEP 3: Review Details & Primary Account Picker */}
      {step === "review_details" && (
        <div className="flex flex-col gap-4">
          {/* Verified Customer Header Info */}
          <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-muted/15 px-3 py-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary overflow-hidden">
                {selfieImage ? (
                  <Image src={selfieImage} alt={activePersona.holderName} width={36} height={36} unoptimized className="size-full object-cover" />
                ) : isJoint ? (
                  <Users size={16} />
                ) : (
                  <User size={16} />
                )}
              </div>
              <div className="min-w-0">
                <span className="text-body font-medium text-foreground block truncate">
                  {activePersona.holderName}
                </span>
                <span className="tabular text-caption text-muted-foreground">
                  {isPassport ? `Passport ${passportLastFour}` : activePersona.ghanaCard}
                </span>
              </div>
            </div>

            <span className="inline-flex items-center gap-1 rounded-full bg-pill-success px-2 py-0.5 text-caption font-medium text-pill-success-text shrink-0">
              <Check size={12} />
              Verified
            </span>
          </div>

          {/* CASE A: Multi-Account Dropdown Selection */}
          {showAccountPicker && (
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
                    className="min-h-10 text-left cursor-pointer flex items-center justify-between"
                  >
                    <SelectValue placeholder="Select default account">
                      {selectedPrimaryAccount ? (
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-medium text-foreground truncate">
                            {selectedPrimaryAccount.name}
                          </span>
                          <span className="text-muted-foreground text-caption shrink-0">
                            **** {selectedPrimaryAccount.number.slice(-4)}
                          </span>
                          {selectedPrimaryAccount.isJoint && (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-primary/15 px-2 py-0.2 text-caption font-medium text-foreground shrink-0">
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
                        label={`${acc.name} · ∗∗∗∗ ${acc.number.slice(-4)}`}
                      >
                        <div className="flex items-center justify-between w-full gap-2 py-0.5">
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-medium text-foreground truncate">{acc.name}</span>
                            <span className="rounded-lg bg-muted px-2 py-0.5 text-caption text-muted-foreground shrink-0">
                              {acc.type}
                            </span>
                            {acc.isJoint && (
                              <span className="inline-flex items-center gap-1 rounded-lg bg-primary/15 px-2 py-0.5 text-caption font-medium text-foreground shrink-0">
                                <Users size={11} className="text-primary" />
                                Joint
                              </span>
                            )}
                          </div>
                          <span className="text-caption text-muted-foreground shrink-0">
                            **** {acc.number.slice(-4)}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Dynamic Mandate Disclosure if selected account is Joint */}
              {selectedPrimaryAccount?.isJoint && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-2 text-left animate-in fade-in duration-200">
                  <div className="flex items-start gap-2">
                    <Users size={15} className="text-primary mt-0.5 shrink-0" />
                    <div>
                      <span className="text-caption font-medium text-foreground block">
                        Joint Mandate: {selectedPrimaryAccount.mandate || "Both Signatures Required"}
                      </span>
                      <p className="text-caption text-muted-foreground mt-0.5 leading-relaxed">
                        Alerts will be sent to both signatories upon activation.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CASE B: Single Account Display */}
          {!showAccountPicker && (
            <div className="rounded-xl border border-border/80 bg-muted/20 p-3 divide-y divide-border/60">
              <div className="flex items-center justify-between pb-2">
                <span className="text-body text-muted-foreground">Default Account</span>
                <div className="text-right">
                  <span className="text-body font-medium text-foreground block">
                    {activePersona.accounts[0]?.name}
                  </span>
                  <span className="text-caption text-muted-foreground">
                    **** {activePersona.accounts[0]?.number.slice(-4)}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-body text-muted-foreground">Registered Phone</span>
                <span className="text-body font-medium text-foreground">{activePersona.phone}</span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-body text-muted-foreground">Registered Email</span>
                <span className="text-body font-medium text-foreground">{activePersona.email}</span>
              </div>
            </div>
          )}

          <Button
            type="button"
            variant="default"
            size="md"
            data-tour="activate-review"
            onClick={handleVerifyDetails}
            disabled={(isMultiAccount && !selectedPrimaryAccountId)} loading={busy}
            className="mt-1 w-full"
          >
            Proceed
          </Button>

          {!isPassport && (
            <button
              type="button"
              onClick={() => setStep("ghana_card")}
              className="text-center text-caption text-muted-foreground hover:text-foreground transition-colors cursor-pointer py-1"
            >
              Use a different Ghana Card
            </button>
          )}
        </div>
      )}

      {/* STEP 4: OTP Verification */}
      {step === "otp" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleOtpSubmit();
          }}
          className="flex flex-col gap-5"
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
            <p role="alert" className="-mt-2 text-center text-body text-destructive">
              {errorMsg}
            </p>
          )}

          {/* Recovery path */}
          <div className="flex flex-col items-center gap-4">
            <button
              type="button"
              disabled={countdown > 0}
              onClick={() => {
                setCountdown(RESEND_SECONDS);
                setErrorMsg("");
              }}
              className="text-body text-foreground underline underline-offset-4 transition-colors hover:text-foreground/80 disabled:text-muted-foreground disabled:no-underline disabled:cursor-default cursor-pointer"
            >
              {countdown > 0 ? (
                <>
                  Resend code in <span className="tabular">{countdown}s</span>
                </>
              ) : (
                "Resend code"
              )}
            </button>

            <p className="text-center text-body text-muted-foreground">
              Dial <a href="tel:*422*11%23" className="tabular font-medium text-foreground underline underline-offset-4 hover:text-foreground/80">*422*11#</a> to retrieve your code
            </p>
          </div>

          {isJoint && (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3 text-caption text-muted-foreground">
              <span className="font-medium text-foreground">Joint mandate notice:</span> Notice sent to co-holder Esther ({activePersona.coSignatoryPhone}).
            </div>
          )}

          {busy && (
            <div className="flex items-center justify-center gap-2 py-1 text-body text-muted-foreground">
              <AppLoader size={16} />
              <span>Verifying code...</span>
            </div>
          )}


        </form>
      )}

      {/* STEP 5: Password Creation */}
      {step === "password" && (
        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
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

          <KeyboardDock>
            <Button
              type="submit"
              variant="default"
              size="md"
              data-tour="activate-password"
              disabled={!newPasswordReady(password, confirmPassword)}
              loading={busy}
              className="mt-2 w-full"
            >
              Proceed
            </Button>
          </KeyboardDock>
        </form>
      )}

      {/* STEP 6: 4-digit PIN */}
      {step === "pin" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handlePinSubmit();
          }}
          className="flex flex-col items-center gap-5"
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

          <PinRequirements pin={pinDigits.join("")} />

          {errorMsg && (
            <p role="alert" className="-mt-2 text-center text-body text-destructive">
              {errorMsg}
            </p>
          )}
          {!errorMsg && pinNote && (
            <p className="-mt-2 text-center text-body text-muted-foreground">{pinNote}</p>
          )}

          {busy && (
            <div className="flex items-center justify-center gap-2 py-1 text-body text-muted-foreground">
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
          className="flex flex-col items-center gap-5"
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
            <p role="alert" className="-mt-2 text-center text-body text-destructive">
              {errorMsg}
            </p>
          )}

          {busy && (
            <div className="flex items-center justify-center gap-2 py-1 text-body text-muted-foreground">
              <AppLoader size={16} />
              <span>Activating...</span>
            </div>
          )}

        </form>
      )}

      <PassportVerifyModal
        open={passportModalOpen}
        onOpenChange={setPassportModalOpen}
        onContinue={openPartner}
        onUseGhanaCard={switchToGhanaCard}
      />
      <IdentityPartnerWindow
        key={partnerSession}
        open={partnerOpen}
        knownPassport={PASSPORT_PERSONA.passport}
        flashKey={partnerFlash}
        onProgress={setPartnerProgress}
        onResult={handlePartnerResult}
        onClose={handlePartnerClosed}
      />
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

