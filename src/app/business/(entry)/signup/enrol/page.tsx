"use client";

/**
 * A company that banks with GCB applies for internet banking online — /business/signup/enrol.
 *
 * The bank's process stays the same: a request letter signed per the mandate, checked against Flexcube, then
 * approved by the RM, branch or central team. What this saves the customer is the paperwork: the company and
 * its signatories come from the bank's records, the applicant proves their number with a code, and we write the
 * letter. They print it on their letterhead, sign it and upload it, or send it by email, post or branch and the
 * application waits for it. Anyone at the company can apply; someone who isn't a signatory (a company secretary)
 * gives their own details, and the signatories approve by signing the letter.
 *
 * The signatories are checked before anything is filled in: a letter signed by people who no longer sign is the
 * commonest reason an application comes back. Model, steps and sources: `lib/corporate-enrolment.ts`.
 */

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, CheckCircle2, FileText, Mail, SearchX, Users } from "@/components/ui/icons";
import AuthLayout from "@/components/auth/AuthLayout";
import OtpInput, { OTP_LENGTH } from "@/components/auth/OtpInput";
import FindBranchDialog from "@/components/corporate/FindBranchDialog";
import LetterUpload, { type AttachedFile } from "@/components/corporate/onboarding/LetterUpload";
import PeopleStep, { accessLine, type PeopleView } from "@/components/corporate/onboarding/PeopleStep";
import { openRequestLetter } from "@/components/corporate/onboarding/request-letter";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { AppLoader } from "@/components/ui/loader";
import { PhoneInput } from "@/components/ui/phone-input";
import { RadioGroup } from "@/components/ui/radio-group";
import { maskMobile } from "@/lib/auth-shared";
import {
  CORPORATE_ROLE_LINE,
  CORPORATE_SERVICES,
  DEFAULT_USER_LIMIT,
  ENROLMENT_DEMO_ACCOUNTS,
  ENROLMENT_PROGRESS_STEPS,
  cleanAccountNumber,
  findCorporateEnrolmentScenario,
  lastFour,
  limitsStall,
  lookupCorporateAccount,
  newEnrolmentReference,
  NON_SIGNATORY_DEMO,
  reviewerFor,
  signatoryLabel,
  TERMS_URL,
  type CompanyApplicant,
  type CorporateCompanyRecord,
  type CorporateEnrolmentOutcome,
  type CorporateEnrolmentStep,
  type CorporateUserDraft,
} from "@/lib/corporate-enrolment";
import { submitEnrolment } from "@/lib/enrolment-store";
import { formatMoney } from "@/lib/mock-data";
import { isCompleteGhanaMobile, toNationalDigits } from "@/lib/phone";

const RESEND_SECONDS = 30;
const DEMO_REFERENCE = "ENR-2026-0814";

type Step = CorporateEnrolmentStep;

/** Someone who signs for the company, or anyone else who works there. */
type ApplicantChoice = "signatory" | "other";

/**
 * Signatories start as Authorisers, because they already approve for the company on the mandate, at the bank's
 * default limit. Their accounts are filled in once the company has chosen which ones to put online.
 */
function usersFromMandate(company: CorporateCompanyRecord): CorporateUserDraft[] {
  return company.signatories.map((s, i) => ({
    id: `u-mandate-${i + 1}`,
    name: s.name,
    email: s.email,
    mobile: s.mobile,
    role: "Authoriser",
    designation: s.designation,
    isFromMandate: true,
    limit: DEFAULT_USER_LIMIT,
    accountIds: [],
    services: CORPORATE_SERVICES.map((c) => c.id),
  }));
}

function CorporateEnrolmentFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scenarioParam = searchParams.get("scenario");

  const [step, setStep] = useState<Step>("account");
  const [outcome, setOutcome] = useState<CorporateEnrolmentOutcome | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showBranchDialog, setShowBranchDialog] = useState(false);

  // Account
  const [accountNumber, setAccountNumber] = useState<string>(ENROLMENT_DEMO_ACCOUNTS.default);
  const [company, setCompany] = useState<CorporateCompanyRecord | null>(null);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);

  // Applicant and code
  const [applicantChoice, setApplicantChoice] = useState<ApplicantChoice | null>(null);
  const [signatoryMobile, setSignatoryMobile] = useState("");
  const [otherName, setOtherName] = useState("");
  const [otherDesignation, setOtherDesignation] = useState("");
  const [otherMobile, setOtherMobile] = useState("");
  const [otherEmail, setOtherEmail] = useState("");
  const [digits, setDigits] = useState<string[]>(() => Array<string>(OTP_LENGTH).fill(""));
  const [countdown, setCountdown] = useState(RESEND_SECONDS);

  // Users
  const [users, setUsers] = useState<CorporateUserDraft[]>([]);
  const [peopleView, setPeopleView] = useState<PeopleView>({ kind: "list" });

  // Whether the people on the mandate still sign
  const [stillSign, setStillSign] = useState<"yes" | "no" | null>(null);

  // Letter
  const [reference, setReference] = useState("");
  const [letter, setLetter] = useState<AttachedFile | null>(null);
  const [sendingLater, setSendingLater] = useState(false);

  const otherError =
    otherMobile && !isCompleteGhanaMobile(otherMobile)
      ? "Enter a full Ghana mobile number."
      : "";
  const otherReady =
    otherName.trim() !== "" &&
    otherDesignation.trim() !== "" &&
    otherEmail.includes("@") &&
    isCompleteGhanaMobile(otherMobile);

  let applicant: CompanyApplicant | null = null;
  if (company && applicantChoice === "signatory") {
    // Found by the number they hold on the mandate, never picked from a list: the names stay hidden until the code.
    const s = company.signatories.find((x) => toNationalDigits(x.mobile) === toNationalDigits(signatoryMobile));
    if (s) {
      applicant = { name: s.name, mobile: s.mobile, email: s.email, designation: s.designation, isSignatory: true };
    }
  } else if (applicantChoice === "other") {
    applicant = {
      name: otherName.trim(),
      designation: otherDesignation.trim(),
      mobile: otherMobile,
      email: otherEmail.trim(),
      isSignatory: false,
    };
  }
  const accounts = company ? company.accounts.filter((a) => selectedAccountIds.includes(a.id)) : [];
  const stall = limitsStall(users);
  // Someone who isn't a signatory isn't a user yet; offer to add them, with what they already typed.
  const self =
    applicant && !applicant.isSignatory && !users.some((u) => u.mobile === applicant.mobile)
      ? { name: applicant.name, email: applicant.email, mobile: applicant.mobile, designation: applicant.designation }
      : null;

  /** Starts with the account they entered. Others are theirs to add (the bank shows only what's on the form). */
  const loadCompany = useCallback((record: CorporateCompanyRecord, number: string) => {
    const entered = record.accounts.find((a) => a.number === cleanAccountNumber(number)) ?? record.accounts[0];
    setCompany(record);
    setSelectedAccountIds([entered.id]);
    setUsers(usersFromMandate(record));
    setApplicantChoice(null);
    setSignatoryMobile(record.signatories[0]?.mobile ?? "");
    setStillSign(null);
    setPeopleView({ kind: "list" });
  }, []);

  /** Changing who can do what makes a letter that was already signed out of date, so it has to be uploaded again. */
  function changeUsers(next: CorporateUserDraft[] | ((prev: CorporateUserDraft[]) => CorporateUserDraft[])) {
    setUsers(next);
    setLetter(null);
  }

  /** Puts the chosen accounts on everyone. Someone already narrowed to fewer keeps those that are still chosen. */
  function applyAccounts(ids: string[]) {
    changeUsers((prev) =>
      prev.map((u) => {
        const kept = u.accountIds.filter((id) => ids.includes(id));
        return { ...u, accountIds: kept.length > 0 ? kept : ids };
      }),
    );
  }

  // `?scenario=` opens the flow on a given screen (the Demo hub links with it).
  const appliedScenario = useRef<string | null>(null);
  useEffect(() => {
    if (!scenarioParam || appliedScenario.current === scenarioParam) return;
    appliedScenario.current = scenarioParam;
    const scenario = findCorporateEnrolmentScenario(scenarioParam);
    if (!scenario) return;

    setBusy(false);
    setErrorMsg("");
    setPeopleView({ kind: "list" });
    setLetter(null);
    setSendingLater(false);

    if (scenario.outcome === "mandate-outdated") {
      const record = lookupCorporateAccount(ENROLMENT_DEMO_ACCOUNTS.default);
      if (record) loadCompany(record, ENROLMENT_DEMO_ACCOUNTS.default);
      setApplicantChoice("signatory");
      setStillSign("no");
      setStep("mandate");
      setOutcome("mandate-outdated");
      return;
    }
    if (scenario.outcome) {
      const number =
        scenario.outcome === "not-found" ? ENROLMENT_DEMO_ACCOUNTS.notFound : ENROLMENT_DEMO_ACCOUNTS.alreadyEnrolled;
      setAccountNumber(number);
      setCompany(lookupCorporateAccount(number));
      setOutcome(scenario.outcome);
      return;
    }

    const number = scenario.account ?? ENROLMENT_DEMO_ACCOUNTS.default;
    const record = lookupCorporateAccount(number);
    setOutcome(null);
    setAccountNumber(number);
    if (scenario.step === "account" || !record) {
      setCompany(null);
      setStep("account");
      return;
    }
    loadCompany(record, number);
    if (scenario.nonSignatory) {
      setApplicantChoice("other");
      setOtherName(NON_SIGNATORY_DEMO.name);
      setOtherDesignation(NON_SIGNATORY_DEMO.designation ?? "");
      setOtherMobile(NON_SIGNATORY_DEMO.mobile);
      setOtherEmail(NON_SIGNATORY_DEMO.email);
    } else {
      setApplicantChoice("signatory");
    }
    if (scenario.step && ENROLMENT_PROGRESS_STEPS.indexOf(scenario.step) > ENROLMENT_PROGRESS_STEPS.indexOf("mandate")) {
      setStillSign("yes");
    }
    if (scenario.step === "users" || scenario.step === "review" || scenario.step === "letter" || scenario.step === "submitted") {
      const ids = record.accounts.map((a) => a.id);
      setSelectedAccountIds(ids);
      // The demo company's third signatory is the Inputter, as on the invitation demo.
      setUsers((prev) =>
        prev.map((u, i) =>
          i === 2
            ? { ...u, role: "Inputter", limit: 1_000_000, accountIds: ids.slice(0, 2) }
            : { ...u, limit: 1_000_000, accountIds: ids },
        ),
      );
    }
    if (scenario.step === "letter" || scenario.step === "submitted") setReference(DEMO_REFERENCE);
    if (scenario.step === "otp") {
      setDigits(Array(OTP_LENGTH).fill(""));
      setCountdown(RESEND_SECONDS);
    }
    setStep(scenario.step ?? "account");
  }, [scenarioParam, loadCompany]);

  useEffect(() => {
    if (step !== "otp" || countdown <= 0) return;
    const t = window.setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [step, countdown]);

  function handleFindCompany(e: React.FormEvent) {
    e.preventDefault();
    if (company) {
      setStep("applicant");
      return;
    }
    if (accountNumber.replace(/\D/g, "").length < 10) {
      setErrorMsg("Enter the full account number.");
      return;
    }
    setErrorMsg("");
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      const record = lookupCorporateAccount(accountNumber);
      if (!record) {
        setOutcome("not-found");
        return;
      }
      if (record.alreadyEnrolled) {
        setCompany(record);
        setOutcome("already-enrolled");
        return;
      }
      loadCompany(record, accountNumber);
    }, 500);
  }

  function handleSendCode() {
    if (applicantChoice === null || (applicantChoice === "other" && !otherReady)) return;
    if (!applicant) {
      setErrorMsg("That isn't a signatory's number on our records. Check it, or choose Someone Else.");
      return;
    }
    setErrorMsg("");
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      setDigits(Array(OTP_LENGTH).fill(""));
      setCountdown(RESEND_SECONDS);
      setErrorMsg("");
      setStep("otp");
    }, 500);
  }

  function handleOtpSubmit(incomingCode?: string) {
    const code = incomingCode ?? digits.join("");
    if (code.length < OTP_LENGTH || busy) return;
    if (code === "000000") {
      setErrorMsg("The code entered is incorrect or has expired. Please try again or request a new code.");
      setDigits(Array(OTP_LENGTH).fill(""));
      return;
    }
    setErrorMsg("");
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      setStep("mandate");
    }, 600);
  }

  function handleMandateContinue() {
    if (!company) return;
    if (stillSign === "no") {
      setOutcome("mandate-outdated");
      return;
    }
    // One account leaves nothing to choose.
    if (company.accounts.length === 1) {
      applyAccounts(company.accounts.map((a) => a.id));
      setStep("users");
      return;
    }
    setStep("accounts");
  }

  function goToLetter() {
    if (!reference) setReference(newEnrolmentReference());
    setStep("letter");
  }

  function handleSubmit(withLetter: boolean) {
    if (!company || !applicant) return;
    if (withLetter && !letter) return;
    setSendingLater(!withLetter);
    setBusy(true);
    window.setTimeout(() => {
      submitEnrolment({
        reference,
        company,
        accounts,
        applicant,
        users,
        letter: withLetter && letter ? { fileName: letter.name, fileSize: letter.size } : undefined,
      });
      setBusy(false);
      setStep("submitted");
    }, 700);
  }

  function handleBack() {
    setErrorMsg("");
    setBusy(false);
    if (outcome === "mandate-outdated") {
      setOutcome(null);
      setStillSign(null);
      return;
    }
    if (outcome) {
      setOutcome(null);
      setCompany(null);
      setStep("account");
      return;
    }
    if (step === "users" && peopleView.kind !== "list") {
      setPeopleView(
        peopleView.kind === "access" && peopleView.isNew
          ? { kind: "details", draft: peopleView.draft }
          : { kind: "list" },
      );
      return;
    }
    if (step === "letter") setStep("review");
    else if (step === "review") setStep("users");
    else if (step === "users") setStep(company && company.accounts.length > 1 ? "accounts" : "mandate");
    else if (step === "accounts") setStep("mandate");
    // The code has been used; going back starts again from who's applying.
    else if (step === "mandate" || step === "otp") setStep("applicant");
    else if (step === "applicant") setStep("account");
    else router.push("/business/signup?type=company");
  }

  /* ── Off the happy path ──────────────────────────────────────────────────── */

  if (outcome === "not-found") {
    return (
      <>
        <AuthLayout
          title="We Couldn't Find That Account"
          description="Check the number and try again. If your company doesn't bank with GCB yet, we'll call you to open an account."
          icon={SearchX}
          align="center"
          onBack={handleBack}
          backLabel="Back to account number"
          width="compact"
        >
          <div className="flex flex-col gap-3">
            <Button size="md" className="w-full" onClick={handleBack}>
              Try Again
            </Button>
            <Button
              variant="outline"
              size="md"
              className="w-full"
              onClick={() => router.push("/business/signup/new-to-gcb?type=company")}
            >
              Open an Account
            </Button>
            <Button
              variant="outline"
              size="md"
              className="w-full"
              onClick={() => setShowBranchDialog(true)}
            >
              Find a Branch
            </Button>
          </div>
        </AuthLayout>
        <FindBranchDialog open={showBranchDialog} onOpenChange={setShowBranchDialog} />
      </>
    );
  }

  if (outcome === "already-enrolled" && company) {
    const contact = company.relationshipManager?.name ?? "your branch";
    return (
      <AuthLayout
        title="Your Company Is Already Set Up"
        description={`${company.companyName} already uses internet banking. To add users or change roles, contact ${contact}.`}
        icon={Building2}
        align="center"
        onBack={handleBack}
        backLabel="Back to account number"
        width="compact"
      >
        <div className="flex flex-col gap-3">
          <Button
            size="md"
            className="w-full"
            onClick={() => router.push("/login?type=business")}
          >
            Go to Login
          </Button>
          <Button variant="outline" size="md" className="w-full" onClick={handleBack}>
            Use Another Account
          </Button>
        </div>
      </AuthLayout>
    );
  }

  if (outcome === "mandate-outdated" && company) {
    const manager = company.relationshipManager;
    return (
      <>
        <AuthLayout
          title="Update Who Signs First"
          description="The bank checks the letter against the signatures on your mandate, so a change there comes first. Once it's updated, apply again and your new signatories will be here."
          icon={Users}
          align="center"
          onBack={handleBack}
          backLabel="Back to your company"
          width="compact"
        >
          <div className="flex flex-col gap-6">
            {manager && (
              <ReviewGroup title="Your Relationship Manager">
                <ReviewLine primary={manager.name} secondary={manager.phone} tabular />
              </ReviewGroup>
            )}
            <div className="flex flex-col gap-3">
              <Button size="md" className="w-full" onClick={() => setShowBranchDialog(true)}>
                Find a Branch
              </Button>
              <Button variant="outline" size="md" className="w-full" onClick={() => router.push("/login?type=business")}>
                Back to Login
              </Button>
            </div>
          </div>
        </AuthLayout>
        <FindBranchDialog open={showBranchDialog} onOpenChange={setShowBranchDialog} />
      </>
    );
  }

  if (step === "submitted" && company) {
    const reviewer = reviewerFor(company);
    const reviewerName = reviewer.type === "rm" ? `${reviewer.name}, your relationship manager,` : `Our ${reviewer.name}`;
    // Updates go to the applicant and to the company's own address, so the signatories hear about it too.
    const updatesTo = applicant ? `${applicant.email} and ${company.email}` : company.email;
    return (
      <AuthLayout
        title={sendingLater ? "Application Saved" : "Application Sent"}
        description={
          sendingLater
            ? `Send the signed letter to ${reviewer.email}, post it, or bring it to any branch. Quote your reference. We've emailed the details to ${updatesTo}.`
            : `${reviewerName} will check the signatures against our records. We'll email ${updatesTo} as it moves.`
        }
        icon={sendingLater ? Mail : CheckCircle2}
        align="center"
        width="compact"
      >
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-1">
            <span className="text-caption text-muted-foreground">Your reference</span>
            <span className="tabular text-h1 tracking-[var(--ls-heading)] text-foreground">{reference}</span>
          </div>
          <div className="flex flex-col gap-3">
            <Button
              size="md"
              className="w-full"
              onClick={() => router.push(`/business/signup/status?ref=${encodeURIComponent(reference)}`)}
            >
              Track Your Application
            </Button>
            <Button
              variant="outline"
              size="md"
              className="w-full"
              onClick={() => router.push("/login?type=business")}
            >
              Back to Login
            </Button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  /* ── The steps ───────────────────────────────────────────────────────────── */

  const title =
    step === "account"
      ? "Find Your Company"
      : step === "applicant"
      ? "Who's Applying?"
      : step === "otp"
      ? "Confirm Your Code"
      : step === "mandate"
      ? "Check Your Company"
      : step === "accounts"
      ? "Choose Accounts"
      : step === "users"
      ? peopleView.kind === "details"
        ? "Add a Person"
        : peopleView.kind === "access"
        ? peopleView.draft.name
        : peopleView.kind === "file"
        ? "Add Many People"
        : "Who Will Use Internet Banking?"
      : step === "review"
      ? "Check Your Application"
      : "Sign Your Letter";

  const description =
    step === "account" ? (
      "Enter any GCB account number your company holds."
    ) : step === "applicant" ? (
      "Anyone at the company can apply. Your signatories approve by signing the letter."
    ) : step === "otp" ? (
      <>
        A 6-digit code has been sent to {maskMobile(applicant?.mobile ?? "")}.
        <br />
        Please enter the code below.
      </>
    ) : step === "mandate" ? (
      "This is what GCB holds for your company."
    ) : step === "accounts" ? (
      "Only the accounts you choose will be on internet banking."
    ) : step === "users" ? (
      peopleView.kind === "details"
        ? "They'll confirm these details when they set up their login."
        : peopleView.kind === "access"
        ? CORPORATE_ROLE_LINE[peopleView.draft.role]
        : peopleView.kind === "file"
        ? "Fill in one row for each person. Each can prepare payments or view; only signatories review or authorise."
        : "Your signatories come from your mandate. Choose what each person can do."
    ) : step === "review" ? (
      "This is what goes on your request letter."
    ) : (
      `We've written your request letter. Print it on your letterhead and have ${company?.signingRule ?? "your signatories"} sign it.`
    );

  return (
    <>
      <AuthLayout
        title={title}
        description={description}
        onBack={handleBack}
        backLabel={step === "account" ? "Back to business options" : "Back to previous step"}
        stepProgress={{ current: ENROLMENT_PROGRESS_STEPS.indexOf(step) + 1, total: ENROLMENT_PROGRESS_STEPS.length }}
        width="compact"
        animateHeight
      >
        {/* 1. Account: the company resolves from the number */}
        {step === "account" && (
          <form onSubmit={handleFindCompany} className="flex flex-col gap-6">
            <Field label="Account Number" htmlFor="accountNumber" error={errorMsg}>
              <Input
                id="accountNumber"
                inputMode="numeric"
                autoComplete="off"
                className="tabular"
                value={accountNumber}
                onChange={(e) => {
                  setAccountNumber(e.target.value);
                  // A new number makes the company found for the old one stale.
                  if (company) setCompany(null);
                  if (errorMsg) setErrorMsg("");
                }}
              />
            </Field>

            {company && <p className="text-body font-medium text-foreground">{company.companyName}</p>}

            <Button type="submit" size="md" loading={busy} className="w-full">
              {company ? "Continue" : "Find Company"}
            </Button>
          </form>
        )}

        {/* 2. Applicant: a signatory (code to the number the bank holds) or anyone else at the company (code to
            the number they give). Either way the signatories approve by signing the letter. */}
        {step === "applicant" && company && (
          <div className="flex flex-col gap-6">
            <div role="radiogroup" aria-label="Who's applying" className="flex flex-col gap-2">
              <ApplicantOption
                selected={applicantChoice === "signatory"}
                onSelect={() => {
                  setApplicantChoice("signatory");
                  setErrorMsg("");
                }}
                primary="I Sign for the Company"
                secondary="You're on the mandate"
              />
              <ApplicantOption
                selected={applicantChoice === "other"}
                onSelect={() => {
                  setApplicantChoice("other");
                  setErrorMsg("");
                }}
                primary="Someone Else"
                secondary="Not on the mandate, such as a company secretary"
              />
            </div>

            {applicantChoice === "signatory" && (
              <Field label="Mobile Number GCB Holds for You" htmlFor="signatoryMobile" error={errorMsg}>
                <PhoneInput
                  id="signatoryMobile"
                  value={signatoryMobile}
                  onValueChange={(v) => {
                    setSignatoryMobile(v);
                    if (errorMsg) setErrorMsg("");
                  }}
                />
              </Field>
            )}

            {applicantChoice === "other" && (
              <div className="flex flex-col gap-4">
                <Field label="Full Name" htmlFor="otherName">
                  <Input id="otherName" autoComplete="name" value={otherName} onChange={(e) => setOtherName(e.target.value)} autoFocus />
                </Field>
                <Field label="Position" htmlFor="otherDesignation">
                  <Input
                    id="otherDesignation"
                    placeholder="For example, Company Secretary"
                    autoComplete="organization-title"
                    value={otherDesignation}
                    onChange={(e) => setOtherDesignation(e.target.value)}
                  />
                </Field>
                <Field label="Mobile Number" htmlFor="otherMobile" error={otherError}>
                  <PhoneInput id="otherMobile" value={otherMobile} onValueChange={setOtherMobile} />
                </Field>
                <Field label="Email" htmlFor="otherEmail">
                  <Input
                    id="otherEmail"
                    type="email"
                    autoComplete="email"
                    value={otherEmail}
                    onChange={(e) => setOtherEmail(e.target.value)}
                  />
                </Field>
              </div>
            )}

            <Button
              size="md"
              loading={busy}
              disabled={
                applicantChoice === null ||
                (applicantChoice === "other" ? !otherReady : !isCompleteGhanaMobile(signatoryMobile))
              }
              onClick={handleSendCode}
              className="w-full"
            >
              Send Code
            </Button>
          </div>
        )}

        {/* 3. Code */}
        {step === "otp" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleOtpSubmit();
            }}
            className="flex flex-col gap-5"
          >
            <OtpInput
              value={digits}
              onChange={(next) => {
                setDigits(next);
                if (errorMsg) setErrorMsg("");
              }}
              onComplete={(code) => handleOtpSubmit(code)}
              disabled={busy}
              invalid={Boolean(errorMsg)}
              autoFocus
            />

            {errorMsg && (
              <p role="alert" className="-mt-2 text-center text-body text-destructive">
                {errorMsg}
              </p>
            )}

            <div className="flex flex-col items-center gap-4">
              <button
                type="button"
                disabled={countdown > 0}
                onClick={() => {
                  setCountdown(RESEND_SECONDS);
                  setErrorMsg("");
                }}
                className="cursor-pointer text-body text-foreground underline underline-offset-4 transition-colors hover:text-foreground/80 disabled:cursor-default disabled:text-muted-foreground disabled:no-underline"
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
                Dial{" "}
                <a
                  href="tel:*422*11%23"
                  className="tabular font-medium text-foreground underline underline-offset-4 hover:text-foreground/80"
                >
                  *422*11#
                </a>{" "}
                to retrieve your code
              </p>
            </div>

            {busy && (
              <div className="flex items-center justify-center gap-2 py-1 text-body text-muted-foreground">
                <AppLoader size={16} />
                <span>Verifying code...</span>
              </div>
            )}
          </form>
        )}

        {/* 4. What the bank holds, and whether the people who sign have changed */}
        {step === "mandate" && company && (
          <div className="flex flex-col gap-6">
            <ReviewGroup title={company.companyName}>
              <FactLine label="Set up as" value={company.structure} />
              <FactLine label="Address" value={company.address} />
              <FactLine label="Phone" value={company.phone} tabular />
              <FactLine label="Email" value={company.email} />
            </ReviewGroup>

            <ReviewGroup title="Who Signs">
              {company.signatories.map((s) => (
                <ReviewLine key={s.name} primary={s.name} secondary={signatoryLabel(s)} />
              ))}
              <FactLine label="Signing rule" value={company.mandate} />
            </ReviewGroup>

            <div className="flex flex-col gap-3">
              <h2 className="text-body font-medium text-foreground">Do these people still sign for the company?</h2>
              <RadioGroup
                aria-label="Do these people still sign for the company?"
                options={[
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" },
                ]}
                value={stillSign}
                onChange={(v) => setStillSign(v)}
              />
            </div>

            <Button size="md" disabled={stillSign === null} onClick={handleMandateContinue} className="w-full">
              Continue
            </Button>
          </div>
        )}

        {/* 5. Accounts */}
        {step === "accounts" && company && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              {company.accounts.map((acc) => (
                <label
                  key={acc.id}
                  className="-mx-2 flex cursor-pointer items-center justify-between gap-3 rounded-xl px-2 py-2 transition-colors duration-hover hover:bg-muted/50"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <Checkbox
                      checked={selectedAccountIds.includes(acc.id)}
                      onCheckedChange={(next) =>
                        setSelectedAccountIds((prev) =>
                          next ? [...prev, acc.id] : prev.filter((id) => id !== acc.id),
                        )
                      }
                    />
                    <span className="truncate text-body text-foreground">{acc.name}</span>
                  </span>
                  <span className="tabular shrink-0 text-body text-muted-foreground">{lastFour(acc.number)}</span>
                </label>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <Button
                size="md"
                disabled={selectedAccountIds.length === 0}
                onClick={() => {
                  applyAccounts(selectedAccountIds);
                  setStep("users");
                }}
                className="w-full"
              >
                Continue
              </Button>
              {selectedAccountIds.length === 0 && (
                <p className="text-center text-caption text-muted-foreground">Choose at least one account.</p>
              )}
            </div>
          </div>
        )}

        {/* 6. People: role, limit, what they can do and accounts for each */}
        {step === "users" && (
          <PeopleStep
            view={peopleView}
            onViewChange={setPeopleView}
            users={users}
            onUsersChange={changeUsers}
            accounts={accounts}
            self={self}
            onContinue={() => setStep("review")}
          />
        )}

        {/* 7. Review */}
        {step === "review" && company && (
          <div className="flex flex-col gap-6">
            {stall && (
              <p className="text-body text-warning-text">
                {`Payments above ${formatMoney(stall.release, "GHS", true)} can be prepared but not released. Raise an Authoriser's limit, or lower the Inputter's.`}{" "}
                <button
                  type="button"
                  onClick={() => setStep("users")}
                  className="cursor-pointer underline underline-offset-4"
                >
                  Change limits
                </button>
              </p>
            )}

            <ReviewGroup title={company.companyName} onEdit={() => setStep(company.accounts.length > 1 ? "accounts" : "mandate")}>
              {accounts.map((a) => (
                <ReviewLine key={a.id} primary={a.name} secondary={lastFour(a.number)} tabular />
              ))}
            </ReviewGroup>

            <ReviewGroup title="Applicant" onEdit={() => setStep("applicant")}>
              {applicant && (
                <>
                  <ReviewLine primary={applicant.name} secondary={maskMobile(applicant.mobile)} tabular />
                  {!applicant.isSignatory && applicant.designation && <ReviewLine primary={applicant.designation} />}
                </>
              )}
            </ReviewGroup>

            <ReviewGroup title="People" onEdit={() => setStep("users")}>
              {users.map((u) => (
                <div key={u.id} className="py-1">
                  <p className="truncate text-body text-foreground">{u.name}</p>
                  <p className="tabular text-caption text-muted-foreground">
                    {`${accessLine(u)} · ${accounts
                      .filter((a) => u.accountIds.includes(a.id))
                      .map((a) => lastFour(a.number))
                      .join(", ")}`}
                  </p>
                </div>
              ))}
            </ReviewGroup>

            <Button size="md" onClick={goToLetter} className="w-full">
              Continue
            </Button>
          </div>
        )}

        {/* 8. The letter: we write it, they sign it */}
        {step === "letter" && company && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <Button
                variant="outline"
                size="md"
                className="w-full"
                onClick={() => openRequestLetter({ reference, company, accounts, users, applicant })}
              >
                <FileText size={16} />
                Open Letter to Print
              </Button>
              <p className="tabular text-center text-caption text-muted-foreground">
                {`Your reference ${reference} is printed on it.`}
              </p>
              <p className="text-center text-body text-muted-foreground">
                By signing, they accept the{" "}
                <a
                  href={TERMS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground underline underline-offset-4 hover:text-foreground/80"
                >
                  Terms &amp; Conditions
                </a>
              </p>
            </div>

            <ReviewGroup title="Signed By">
              {company.signatories.map((s) => (
                <ReviewLine key={s.name} primary={s.name} secondary={signatoryLabel(s)} />
              ))}
            </ReviewGroup>

            <LetterUpload id="enrol" file={letter} onChange={setLetter} />

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <Button
                  size="md"
                  loading={busy && !sendingLater}
                  disabled={!letter}
                  onClick={() => handleSubmit(true)}
                  className="w-full"
                >
                  Submit Application
                </Button>
                {!letter && (
                  <p className="text-center text-caption text-muted-foreground">Upload the signed letter to submit.</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="md"
                loading={busy && sendingLater}
                onClick={() => handleSubmit(false)}
                className="w-full"
              >
                I&apos;ll Email, Post or Bring It In
              </Button>
            </div>
          </div>
        )}
      </AuthLayout>
      <FindBranchDialog open={showBranchDialog} onOpenChange={setShowBranchDialog} />
    </>
  );
}

function ApplicantOption({
  selected,
  onSelect,
  primary,
  secondary,
  meta,
}: {
  selected: boolean;
  onSelect: () => void;
  primary: string;
  secondary: string;
  meta?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors duration-hover ${
        selected ? "border-[var(--active-border)] bg-[var(--active-bg)]" : "border-border bg-card hover:bg-muted/50"
      }`}
    >
      <span className="min-w-0">
        <span className="block truncate text-body text-foreground">{primary}</span>
        <span className="block truncate text-caption text-muted-foreground">{secondary}</span>
      </span>
      {meta && <span className="tabular shrink-0 text-body text-muted-foreground">{meta}</span>}
    </button>
  );
}

function ReviewGroup({ title, onEdit, children }: { title: string; onEdit?: () => void; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex min-h-6 items-center justify-between">
        <h2 className="text-body font-medium text-foreground">{title}</h2>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="cursor-pointer text-body text-muted-foreground underline underline-offset-4 transition-colors duration-hover hover:text-foreground"
          >
            Edit
          </button>
        )}
      </div>
      <div className="flex flex-col gap-1">{children}</div>
    </section>
  );
}

/** A label and its value, for facts too long to sit beside a name (an address, an email). */
function FactLine({ label, value, tabular }: { label: string; value: string; tabular?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-6 py-1 text-body">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className={`min-w-0 break-words text-right text-foreground ${tabular ? "tabular" : ""}`}>{value}</span>
    </div>
  );
}

function ReviewLine({ primary, secondary, tabular }: { primary: string; secondary?: string; tabular?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="truncate text-body text-foreground">{primary}</span>
      {secondary && (
        <span className={`shrink-0 text-body text-muted-foreground ${tabular ? "tabular" : ""}`}>{secondary}</span>
      )}
    </div>
  );
}

export default function CorporateEnrolmentPage() {
  return (
    <Suspense fallback={null}>
      <CorporateEnrolmentFlow />
    </Suspense>
  );
}
