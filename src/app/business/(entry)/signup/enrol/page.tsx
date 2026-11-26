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
import { Building2, CheckCircle2, ChevronDown, CreditCard, FileText, Mail, Printer, SearchX, User, Users } from "@/components/ui/icons";
import AuthLayout from "@/components/auth/AuthLayout";
import OtpInput, { OTP_LENGTH } from "@/components/auth/OtpInput";
import OpenGcbAccountDialog from "@/components/auth/OpenGcbAccountDialog";
import LetterUpload, { type AttachedFile } from "@/components/corporate/onboarding/LetterUpload";
import PeopleStep, { type PeopleView } from "@/components/corporate/onboarding/PeopleStep";
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
  roleActs,
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
import { SHOW_DEMO_TOOLS } from "@/lib/demo-tools";
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
    // Nothing chosen for them: the company picks each signatory's role, services and accounts. Only the limit starts
    // at the bank's default (designer, 2026-11-26).
    role: null,
    designation: s.designation,
    isFromMandate: true,
    limit: DEFAULT_USER_LIMIT,
    accountIds: [],
    services: [],
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
  const [showOpenAccount, setShowOpenAccount] = useState(false);

  // Account
  const [accountNumber, setAccountNumber] = useState<string>(ENROLMENT_DEMO_ACCOUNTS.default);
  const [company, setCompany] = useState<CorporateCompanyRecord | null>(null);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);

  // Applicant and code. Everyone gives the same four details; a signatory's mobile must be the one on the mandate.
  const [applicantChoice, setApplicantChoice] = useState<ApplicantChoice | null>(null);
  const [applicantName, setApplicantName] = useState("");
  const [applicantDesignation, setApplicantDesignation] = useState("");
  const [applicantMobile, setApplicantMobile] = useState("");
  const [applicantEmail, setApplicantEmail] = useState("");
  const [digits, setDigits] = useState<string[]>(() => Array<string>(OTP_LENGTH).fill(""));
  const [countdown, setCountdown] = useState(RESEND_SECONDS);

  // Users
  const [users, setUsers] = useState<CorporateUserDraft[]>([]);
  const [peopleView, setPeopleView] = useState<PeopleView>({ kind: "list" });

  // Whether the people on the mandate still sign
  // The company's address, phone and email on the check step, folded away: the question there is who signs.
  const [companyOpen, setCompanyOpen] = useState(false);
  // Which review sections are open. They start closed: each shows a one-line preview of what it holds.
  const [reviewOpen, setReviewOpen] = useState<Record<"accounts" | "people" | "applicant", boolean>>({
    accounts: false,
    people: false,
    applicant: false,
  });

  // Letter
  const [reference, setReference] = useState("");
  const [letter, setLetter] = useState<AttachedFile | null>(null);
  const [sendingLater, setSendingLater] = useState(false);

  const mobileError =
    applicantMobile && !isCompleteGhanaMobile(applicantMobile)
      ? "Enter a full Ghana mobile number."
      : "";
  // A signatory's name and position come from the mandate, so they give only mobile and email. Anyone else gives all four.
  const applicantReady =
    applicantEmail.includes("@") &&
    isCompleteGhanaMobile(applicantMobile) &&
    (applicantChoice === "signatory" || (applicantName.trim() !== "" && applicantDesignation.trim() !== ""));

  // Every update goes to the email they give here, signatory or not: there is no tracking page (2026-11-25). The
  // mandate's email can be old or shared, so it isn't used.
  const email = applicantEmail.trim();
  let applicant: CompanyApplicant | null = null;
  if (company && applicantChoice === "signatory" && applicantReady) {
    // Found by the number they hold on the mandate, never picked from a list: the names stay hidden until the code.
    const s = company.signatories.find((x) => toNationalDigits(x.mobile) === toNationalDigits(applicantMobile));
    if (s) applicant = { name: s.name, designation: s.designation, mobile: s.mobile, email, isSignatory: true };
  } else if (applicantChoice === "other" && applicantReady) {
    applicant = {
      name: applicantName.trim(),
      designation: applicantDesignation.trim(),
      mobile: applicantMobile,
      email,
      isSignatory: false,
    };
  }

  /** Demo only: fills in the details of the demo signatory or company secretary, unless they've typed their own. */
  function chooseApplicant(choice: ApplicantChoice) {
    setApplicantChoice(choice);
    setErrorMsg("");
    if (!SHOW_DEMO_TOOLS || !company) return;
    const signatory = company.signatories[0];
    const demos = [signatory?.name, NON_SIGNATORY_DEMO.name];
    if (applicantName && !demos.includes(applicantName)) return;
    const demo =
      choice === "signatory" && signatory
        ? { name: signatory.name, designation: signatory.designation, mobile: signatory.mobile, email: signatory.email }
        : { ...NON_SIGNATORY_DEMO, designation: NON_SIGNATORY_DEMO.designation ?? "" };
    setApplicantName(demo.name);
    setApplicantDesignation(demo.designation);
    setApplicantMobile(demo.mobile);
    setApplicantEmail(demo.email);
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
    setApplicantName("");
    setApplicantDesignation("");
    setApplicantMobile("");
    setApplicantEmail("");
    setPeopleView({ kind: "list" });
  }, []);

  /** Changing who can do what makes a letter that was already signed out of date, so it has to be uploaded again. */
  function changeUsers(next: CorporateUserDraft[] | ((prev: CorporateUserDraft[]) => CorporateUserDraft[])) {
    setUsers(next);
    setLetter(null);
  }

  /** Takes accounts no longer chosen off everyone. Nobody is given an account they weren't given by the company. */
  function applyAccounts(ids: string[]) {
    changeUsers((prev) => prev.map((u) => ({ ...u, accountIds: u.accountIds.filter((id) => ids.includes(id)) })));
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
      if (record) {
        loadCompany(record, ENROLMENT_DEMO_ACCOUNTS.default);
        const signatory = record.signatories[0];
        setApplicantChoice("signatory");
        setApplicantName(signatory.name);
        setApplicantDesignation(signatory.designation);
        setApplicantMobile(signatory.mobile);
        setApplicantEmail(signatory.email);
      }
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
    const signatory = record.signatories[0];
    const demo = scenario.nonSignatory
      ? { ...NON_SIGNATORY_DEMO, designation: NON_SIGNATORY_DEMO.designation ?? "" }
      : { name: signatory.name, designation: signatory.designation, mobile: signatory.mobile, email: signatory.email };
    setApplicantChoice(scenario.nonSignatory ? "other" : "signatory");
    setApplicantName(demo.name);
    setApplicantDesignation(demo.designation);
    setApplicantMobile(demo.mobile);
    setApplicantEmail(demo.email);
    if (scenario.step === "users" || scenario.step === "review" || scenario.step === "letter" || scenario.step === "submitted") {
      const ids = record.accounts.map((a) => a.id);
      setSelectedAccountIds(ids);
      // The demo company's third signatory is the Inputter, as on the invitation demo.
      const services = CORPORATE_SERVICES.map((c) => c.id);
      setUsers((prev) =>
        prev.map((u, i) =>
          i === 2
            ? { ...u, role: "Inputter", limit: 1_000_000, accountIds: ids.slice(0, 2), services }
            : { ...u, role: "Authoriser", limit: 1_000_000, accountIds: ids, services },
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
    if (applicantChoice === null || !applicantReady) return;
    if (!applicant) {
      setErrorMsg("Not a signatory's number on our records. Check it, or choose Someone Else.");
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
      setErrorMsg("Wrong or expired code. Try again, or resend it.");
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

  /** The answer is the button: Yes moves on, Someone Has Changed goes to update the mandate first. */
  function handleMandateContinue(answer: "yes" | "no") {
    if (!company) return;
    if (answer === "no") {
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
          description="Check the number, or open an account."
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
              onClick={() => setShowOpenAccount(true)}
            >
              Open an Account
            </Button>
            <Button
              variant="outline"
              size="md"
              className="w-full"
              onClick={() => router.push("/branches")}
            >
              Find a Branch
            </Button>
          </div>
        </AuthLayout>
        <OpenGcbAccountDialog open={showOpenAccount} onOpenChange={setShowOpenAccount} />
      </>
    );
  }

  if (outcome === "already-enrolled" && company) {
    const contact = company.relationshipManager?.name ?? "your branch";
    return (
      <AuthLayout
        title="Company Already Set Up"
        description={`To add users or change roles, contact ${contact}.`}
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
          description="Update your mandate at a branch, then apply again."
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
              <Button size="md" className="w-full" onClick={() => router.push("/branches")}>
                Find a Branch
              </Button>
              <Button variant="outline" size="md" className="w-full" onClick={() => router.push("/login?type=business")}>
                Back to Login
              </Button>
            </div>
          </div>
        </AuthLayout>
      </>
    );
  }

  if (step === "submitted" && company) {
    const reviewer = reviewerFor(company);
    const reviewerName = reviewer.type === "rm" ? `${reviewer.name}, your relationship manager,` : `Our ${reviewer.name}`;
    // There is no tracking page (designer, 2026-11-25): email is how they hear, so both addresses are shown. It goes to
    // the applicant and to the company's own address, so the signatories hear about it too. Listed one per line, not
    // run into the sentence, so a long address never breaks the paragraph.
    const updatesTo = applicant && applicant.email !== company.email ? [applicant.email, company.email] : [company.email];
    return (
      <AuthLayout
        title={sendingLater ? "Application Saved" : "Application Sent"}
        description={
          sendingLater
            ? `Email the signed letter to ${reviewer.email}, or bring it to a branch.`
            : `${reviewerName} will check the signatures.`
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
          <div className="flex flex-col items-center gap-1 text-center">
            <span className="text-caption text-muted-foreground">We&apos;ll email updates to</span>
            {updatesTo.map((email) => (
              <span key={email} className="break-all text-body text-foreground">
                {email}
              </span>
            ))}
          </div>
          <p className="text-center text-caption text-muted-foreground">
            Once approved, everyone gets login details by email and text.
          </p>
          <Button size="md" className="w-full" onClick={() => router.push("/login?type=business")}>
            Back to Login
          </Button>
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
        ? "Review Your List"
        : "Who Gets Access?"
      : step === "review"
      ? "Check Your Application"
      : "Sign Your Letter";

  const description =
    step === "account" ? (
      "Any GCB account your company holds."
    ) : step === "applicant" ? (
      "Signatories approve by signing the letter."
    ) : step === "otp" ? (
      <>
        Sent to {maskMobile(applicant?.mobile ?? "")}.
      </>
    ) : step === "mandate" ? (
      undefined
    ) : step === "accounts" ? (
      undefined
    ) : step === "users" ? (
      peopleView.kind === "details"
        ? "They confirm these when they first log in."
        : peopleView.kind === "access"
        ? peopleView.draft.role
          ? CORPORATE_ROLE_LINE[peopleView.draft.role]
          : "Set their role, services and accounts."
        : peopleView.kind === "file"
        ? "Nobody is added until you confirm."
        : "Signatories come from your mandate. Set up each person."
    ) : step === "review" ? (
      "This goes on your letter."
    ) : (
      "Print it on your letterhead and sign it as your mandate requires."
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

            {/* The company the number found, as a row: what it is, and a way to look up another. */}
            {company && (
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--tile)] text-[var(--tile-accent)]">
                  <Building2 size={18} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-medium text-foreground">{company.companyName}</span>
                  <span className="block truncate text-caption text-muted-foreground">{company.structure}</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setCompany(null);
                    setAccountNumber("");
                  }}
                  className="shrink-0 cursor-pointer text-body text-muted-foreground underline underline-offset-4 transition-colors duration-hover hover:text-foreground"
                >
                  Change
                </button>
              </div>
            )}

            <Button type="submit" size="md" loading={busy} className="w-full">
              {company ? "Continue" : "Find Company"}
            </Button>
          </form>
        )}

        {/* 2. Applicant: a signatory (code to the number the bank holds) or anyone else at the company (code to
            the number they give). Either way the signatories approve by signing the letter. */}
        {step === "applicant" && company && (
          <div className="flex flex-col gap-6">
            <RadioGroup
              aria-label="Who's applying"
              options={[
                { value: "signatory", label: "I'm a Signatory", description: "You're on the mandate" },
                { value: "other", label: "Someone Else", description: "Not on the mandate" },
              ]}
              value={applicantChoice}
              onChange={(v) => chooseApplicant(v)}
            />

            {applicantChoice !== null && (
              <div className="flex flex-col gap-4">
                {applicantChoice === "other" && (
                  <>
                    <Field label="Full Name" htmlFor="applicantName">
                      <Input
                        id="applicantName"
                        autoComplete="name"
                        value={applicantName}
                        onChange={(e) => setApplicantName(e.target.value)}
                        autoFocus
                      />
                    </Field>
                    <Field label="Position" htmlFor="applicantDesignation">
                      <Input
                        id="applicantDesignation"
                        placeholder="e.g. Company Secretary"
                        autoComplete="organization-title"
                        value={applicantDesignation}
                        onChange={(e) => setApplicantDesignation(e.target.value)}
                      />
                    </Field>
                  </>
                )}
                <Field
                  label={applicantChoice === "signatory" ? "Registered Mobile" : "Mobile Number"}
                  htmlFor="applicantMobile"
                  error={errorMsg || mobileError}
                >
                  <PhoneInput
                    id="applicantMobile"
                    autoFocus={applicantChoice === "signatory"}
                    value={applicantMobile}
                    onValueChange={(v) => {
                      setApplicantMobile(v);
                      if (errorMsg) setErrorMsg("");
                    }}
                  />
                </Field>
                <Field label="Email" htmlFor="applicantEmail">
                  <Input
                    id="applicantEmail"
                    type="email"
                    autoComplete="email"
                    placeholder="Updates go here"
                    value={applicantEmail}
                    onChange={(e) => setApplicantEmail(e.target.value)}
                  />
                </Field>
              </div>
            )}

            <Button
              size="md"
              loading={busy}
              disabled={applicantChoice === null || !applicantReady}
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
            {/* The company as one row; its details fold, because the question here is about who signs. */}
            <section className="flex flex-col gap-2">
              <button
                type="button"
                aria-expanded={companyOpen}
                onClick={() => setCompanyOpen((o) => !o)}
                className="-mx-2 flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors duration-hover hover:bg-muted/50"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--tile)] text-[var(--tile-accent)]">
                  <Building2 size={18} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-medium text-foreground">{company.companyName}</span>
                  <span className="block truncate text-caption text-muted-foreground">{company.structure}</span>
                </span>
                <ChevronDown
                  size={16}
                  aria-hidden="true"
                  className={`shrink-0 text-muted-foreground transition-transform duration-hover ${companyOpen ? "rotate-180" : ""}`}
                />
              </button>
              {companyOpen && (
                <div className="flex flex-col gap-2">
                  <StackedFact label="Address" value={company.address} />
                  <StackedFact label="Phone" value={company.phone} tabular />
                  <StackedFact label="Email" value={company.email} />
                </div>
              )}
            </section>

            <section className="flex flex-col gap-2">
              <div className="flex min-h-6 items-center justify-between gap-3">
                <h2 className="shrink-0 text-body font-medium text-foreground">Who Signs</h2>
                <span className="truncate text-caption text-muted-foreground">{company.mandate}</span>
              </div>
              {company.signatories.map((s) => (
                <div key={s.name} className="flex items-center gap-3 py-1">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-caption font-medium text-foreground">
                    {s.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-body text-foreground">{s.name}</span>
                    <span className="block truncate text-caption text-muted-foreground">{signatoryLabel(s)}</span>
                  </span>
                </div>
              ))}
            </section>

            <div className="flex flex-col gap-3">
              <h2 className="text-body font-medium text-foreground">Do they still sign?</h2>
              <Button size="md" onClick={() => handleMandateContinue("yes")} className="w-full">
                Yes, They Still Sign
              </Button>
              <Button variant="outline" size="md" onClick={() => handleMandateContinue("no")} className="w-full">
                Someone Has Changed
              </Button>
            </div>
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
                {`Payments above ${formatMoney(stall.release, "GHS", true)} can't be released.`}{" "}
                <button
                  type="button"
                  onClick={() => setStep("users")}
                  className="cursor-pointer underline underline-offset-4"
                >
                  Change limits
                </button>
              </p>
            )}

            {/* Three facts first (designer, 2026-11-26, review variation 3.3), then each part folds open. */}
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                [accounts.length, accounts.length === 1 ? "Account" : "Accounts"],
                [users.length, users.length === 1 ? "Person" : "People"],
                [users.filter((u) => u.role === "Authoriser").length, "Can approve"],
              ].map(([value, label]) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <span className="tabular text-body-lg text-foreground">{value}</span>
                  <span className="text-caption text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <ReviewFold
                icon={CreditCard}
                title="Accounts"
                preview={accounts.map((a) => lastFour(a.number)).join(", ")}
                open={reviewOpen.accounts}
                onToggle={() => setReviewOpen((o) => ({ ...o, accounts: !o.accounts }))}
                onEdit={() => setStep(company.accounts.length > 1 ? "accounts" : "mandate")}
              >
                {accounts.map((a) => (
                  <ReviewLine key={a.id} primary={a.name} secondary={lastFour(a.number)} tabular />
                ))}
              </ReviewFold>

              <ReviewFold
                icon={Users}
                title="People"
                preview={
                  users.length > 3
                    ? `${users.slice(0, 3).map((u) => u.name.split(" ")[0]).join(", ")} and ${users.length - 3} more`
                    : users.map((u) => u.name.split(" ")[0]).join(", ")
                }
                open={reviewOpen.people}
                onToggle={() => setReviewOpen((o) => ({ ...o, people: !o.people }))}
                onEdit={() => setStep("users")}
              >
                {users.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 py-1">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body text-foreground">{u.name}</span>
                      <span className="tabular block truncate text-caption text-muted-foreground">
                        {accounts
                          .filter((a) => u.accountIds.includes(a.id))
                          .map((a) => lastFour(a.number))
                          .join(", ")}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-caption">
                      <span className="block text-foreground">{u.role}</span>
                      {u.role && roleActs(u.role) && (
                        <span className="tabular block text-muted-foreground">{formatMoney(u.limit, "GHS", true)}</span>
                      )}
                    </span>
                  </div>
                ))}
              </ReviewFold>

              {applicant && (
                <ReviewFold
                  icon={User}
                  title="Applicant"
                  preview={applicant.designation ? `${applicant.name}, ${applicant.designation}` : applicant.name}
                  open={reviewOpen.applicant}
                  onToggle={() => setReviewOpen((o) => ({ ...o, applicant: !o.applicant }))}
                  onEdit={() => setStep("applicant")}
                >
                  {/* Label and value rows, the house pattern for details. */}
                  {[
                    ["Name", applicant.name, false],
                    ...(applicant.designation ? [["Position", applicant.designation, false] as const] : []),
                    ["Mobile", maskMobile(applicant.mobile), true],
                    ["Email", applicant.email, false],
                  ].map(([label, value, tabular]) => (
                    <div key={String(label)} className="flex items-baseline justify-between gap-4 py-1 text-body">
                      <span className="shrink-0 text-muted-foreground">{label}</span>
                      <span className={`min-w-0 truncate text-right text-foreground ${tabular ? "tabular" : ""}`}>{value}</span>
                    </div>
                  ))}
                </ReviewFold>
              )}
            </div>

            <Button size="md" onClick={goToLetter} className="w-full">
              Continue
            </Button>
          </div>
        )}

        {/* 8. The letter: we write it, they sign it */}
        {step === "letter" && company && (
          <div className="flex flex-col gap-6">
            {/* The letter to print, as a row that mirrors the signed letter coming back at the bottom. */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3 py-1">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center text-muted-foreground">
                    <FileText size={18} aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-body font-medium text-foreground">Request Letter</p>
                    <p className="tabular truncate text-caption text-muted-foreground">{`Reference ${reference}`}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="md"
                  className="shrink-0"
                  onClick={() => openRequestLetter({ reference, company, accounts, users, applicant })}
                >
                  <Printer size={15} aria-hidden="true" />
                  Print
                </Button>
              </div>
              <p className="text-caption text-muted-foreground">
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

            {/* The same signatory rows as the Check Company step. */}
            <section className="flex flex-col gap-2">
              <h2 className="text-body font-medium text-foreground">Signed By</h2>
              {company.signatories.map((s) => (
                <div key={s.name} className="flex items-center gap-3 py-1">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-caption font-medium text-foreground">
                    {s.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-body text-foreground">{s.name}</span>
                    <span className="block truncate text-caption text-muted-foreground">{signatoryLabel(s)}</span>
                  </span>
                </div>
              ))}
            </section>

            <LetterUpload id="enrol" file={letter} onChange={setLetter} />

            <div className="flex flex-col gap-3">
              {/* Until the letter is attached, the button says so itself, as on a person's set-up. */}
              <Button
                size="md"
                loading={busy && !sendingLater}
                disabled={!letter}
                onClick={() => handleSubmit(true)}
                className="w-full"
              >
                {letter ? "Submit Application" : "Upload the Signed Letter"}
              </Button>
              <Button
                variant="outline"
                size="md"
                loading={busy && sendingLater}
                onClick={() => handleSubmit(false)}
                className="w-full"
              >
                Send It Later
              </Button>
            </div>
          </div>
        )}
      </AuthLayout>
    </>
  );
}

/**
 * A review section that folds: an icon tile, a title and a one-line preview, opening to its contents and an Edit link.
 * A plain row with a hover inset, like the app's other lists; no tile behind it (designer, 2026-11-26).
 */
function ReviewFold({
  icon: Icon,
  title,
  preview,
  open,
  onToggle,
  onEdit,
  children,
}: {
  icon: typeof Users;
  title: string;
  preview: string;
  open: boolean;
  onToggle: () => void;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="-mx-2 flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors duration-hover hover:bg-muted/50"
      >
        <span className="flex size-10 shrink-0 items-center justify-center text-muted-foreground">
          <Icon size={18} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-body font-medium text-foreground">{title}</span>
          {!open && <span className="tabular block truncate text-caption text-muted-foreground">{preview}</span>}
        </span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`shrink-0 text-muted-foreground transition-transform duration-hover ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="flex flex-col gap-1 pb-3">
          {children}
          <button
            type="button"
            onClick={onEdit}
            className="mt-1 cursor-pointer self-end text-body text-muted-foreground underline underline-offset-4 transition-colors duration-hover hover:text-foreground"
          >
            Edit
          </button>
        </div>
      )}
    </section>
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

/** A label over its value, for long facts in a narrow column (an address on a phone). */
function StackedFact({ label, value, tabular }: { label: string; value: string; tabular?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-caption text-muted-foreground">{label}</span>
      <span className={`break-words text-body text-foreground ${tabular ? "tabular" : ""}`}>{value}</span>
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
