"use client";

/**
 * A company that banks with GCB applies for internet banking online — /business/signup/enrol.
 *
 * The bank's process stays the same: a request letter signed per the mandate, checked against Flexcube, then
 * approved by the RM, branch or central team. What this saves the customer is the paperwork: the company and
 * its signatories come from the bank's records, the applicant is proved by a code to a number the bank already
 * holds, and we write the letter. They print it on their letterhead, sign it and upload it, or send it by email,
 * post or branch and the application waits for it. Model and steps: `lib/corporate-enrolment.ts`.
 */

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, CheckCircle2, FileText, Mail, Plus, SearchX, X } from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";
import OtpInput, { OTP_LENGTH } from "@/components/auth/OtpInput";
import FindBranchDialog from "@/components/corporate/FindBranchDialog";
import LetterUpload, { type AttachedFile } from "@/components/corporate/onboarding/LetterUpload";
import { openRequestLetter } from "@/components/corporate/onboarding/request-letter";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { GhanaCardInput } from "@/components/ui/ghana-card-input";
import { Input } from "@/components/ui/input";
import { AppLoader } from "@/components/ui/loader";
import { PhoneInput } from "@/components/ui/phone-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { maskMobile } from "@/lib/auth-shared";
import {
  CORPORATE_ROLE_LINE,
  ENROLMENT_DEMO_ACCOUNTS,
  ENROLMENT_PROGRESS_STEPS,
  findCorporateEnrolmentScenario,
  lastFour,
  lookupCorporateAccount,
  newEnrolmentReference,
  reviewerFor,
  rolesFor,
  signatoryLabel,
  usersReady,
  type CorporateAppRole,
  type CorporateCompanyRecord,
  type CorporateEnrolmentOutcome,
  type CorporateEnrolmentStep,
  type CorporateUserDraft,
} from "@/lib/corporate-enrolment";
import { submitEnrolment } from "@/lib/enrolment-store";
import { isCompleteGhanaCard } from "@/lib/ghana-card";
import { isCompleteGhanaMobile } from "@/lib/phone";

const RESEND_SECONDS = 30;
const DEMO_REFERENCE = "ENR-2026-0814";

type Step = CorporateEnrolmentStep;

/** Signatories start as Authorisers: they already approve for the company on the mandate. */
function usersFromMandate(company: CorporateCompanyRecord): CorporateUserDraft[] {
  return company.signatories.map((s, i) => ({
    id: `u-mandate-${i + 1}`,
    name: s.name,
    email: s.email,
    mobile: s.mobile,
    role: "Authoriser",
    designation: s.designation,
    isFromMandate: true,
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
  const [applicantIdx, setApplicantIdx] = useState<number | null>(null);
  const [digits, setDigits] = useState<string[]>(() => Array<string>(OTP_LENGTH).fill(""));
  const [countdown, setCountdown] = useState(RESEND_SECONDS);

  // Users
  const [users, setUsers] = useState<CorporateUserDraft[]>([]);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMobile, setNewMobile] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newGhanaCard, setNewGhanaCard] = useState("");
  const [newRole, setNewRole] = useState<CorporateAppRole>("Inputter");

  // Letter
  const [reference, setReference] = useState("");
  const [letter, setLetter] = useState<AttachedFile | null>(null);
  const [sendingLater, setSendingLater] = useState(false);

  const applicant = company && applicantIdx !== null ? company.signatories[applicantIdx] : null;
  const accounts = company ? company.accounts.filter((a) => selectedAccountIds.includes(a.id)) : [];
  const usersBlock = usersReady(users);

  const loadCompany = useCallback((record: CorporateCompanyRecord) => {
    setCompany(record);
    setSelectedAccountIds(record.accounts.map((a) => a.id));
    setUsers(usersFromMandate(record));
    setApplicantIdx(null);
  }, []);

  // `?scenario=` opens the flow on a given screen (the Demo hub links with it).
  const appliedScenario = useRef<string | null>(null);
  useEffect(() => {
    if (!scenarioParam || appliedScenario.current === scenarioParam) return;
    appliedScenario.current = scenarioParam;
    const scenario = findCorporateEnrolmentScenario(scenarioParam);
    if (!scenario) return;

    setBusy(false);
    setErrorMsg("");
    setAdding(false);
    setLetter(null);
    setSendingLater(false);

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
    loadCompany(record);
    if (scenario.step !== "applicant") setApplicantIdx(0);
    if (scenario.step === "users" || scenario.step === "review" || scenario.step === "letter" || scenario.step === "submitted") {
      // The demo company's third signatory is the Inputter, as on the invitation demo.
      setUsers((prev) => prev.map((u, i) => (i === 2 ? { ...u, role: "Inputter" } : u)));
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
      loadCompany(record);
    }, 500);
  }

  function handleSendCode() {
    if (applicantIdx === null) return;
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
      setStep("users");
    }, 600);
  }

  const newUserError =
    newMobile && !isCompleteGhanaMobile(newMobile)
      ? "Enter a full Ghana mobile number."
      : newGhanaCard && !isCompleteGhanaCard(newGhanaCard)
      ? "Enter all ten digits of the Ghana Card number."
      : "";
  const newUserReady =
    newName.trim() !== "" &&
    newEmail.includes("@") &&
    isCompleteGhanaMobile(newMobile) &&
    isCompleteGhanaCard(newGhanaCard);

  function resetNewUser() {
    setNewName("");
    setNewMobile("");
    setNewEmail("");
    setNewGhanaCard("");
    setNewRole("Inputter");
    setAdding(false);
  }

  function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    if (!newUserReady) return;
    setUsers((prev) => [
      ...prev,
      {
        id: `u-added-${Date.now()}`,
        name: newName.trim(),
        email: newEmail.trim(),
        mobile: newMobile,
        ghanaCard: newGhanaCard,
        role: newRole,
        isFromMandate: false,
      },
    ]);
    resetNewUser();
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
    if (outcome) {
      setOutcome(null);
      setCompany(null);
      setStep("account");
      return;
    }
    if (step === "letter") setStep("review");
    else if (step === "review") setStep("users");
    else if (step === "users") {
      resetNewUser();
      setStep("applicant");
    } else if (step === "otp") setStep("applicant");
    else if (step === "applicant") setStep("account");
    else router.push("/business/signup?type=company");
  }

  /* ── Off the happy path ──────────────────────────────────────────────────── */

  if (outcome === "not-found") {
    return (
      <>
        <AuthLayout
          title="We Couldn't Find That Account"
          description="Check the number and try again, or your branch can help."
          icon={SearchX}
          align="center"
          onBack={handleBack}
          backLabel="Back to account number"
          width="compact"
        >
          <div className="flex flex-col gap-3">
            <Button size="lg" className="h-10 w-full text-[14px]" onClick={handleBack}>
              Try Again
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-10 w-full text-[14px]"
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
            size="lg"
            className="h-10 w-full text-[14px]"
            onClick={() => router.push("/login?type=business")}
          >
            Go to Login
          </Button>
          <Button variant="outline" size="lg" className="h-10 w-full text-[14px]" onClick={handleBack}>
            Use Another Account
          </Button>
        </div>
      </AuthLayout>
    );
  }

  if (step === "submitted" && company) {
    const reviewer = reviewerFor(company);
    const reviewerName = reviewer.type === "rm" ? `${reviewer.name}, your relationship manager,` : `Our ${reviewer.name}`;
    return (
      <AuthLayout
        title={sendingLater ? "Application Saved" : "Application Sent"}
        description={
          sendingLater
            ? `Send the signed letter to ${reviewer.email}, post it, or bring it to any branch. Quote your reference.`
            : `${reviewerName} will check the signatures against our records. We'll email ${applicant?.email ?? "you"} as it moves.`
        }
        icon={sendingLater ? Mail : CheckCircle2}
        align="center"
        width="compact"
      >
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-1">
            <span className="text-[12px] text-muted-foreground">Your reference</span>
            <span className="tabular text-[22px] tracking-[var(--ls-heading)] text-foreground">{reference}</span>
          </div>
          <div className="flex flex-col gap-3">
            <Button
              size="lg"
              className="h-10 w-full text-[14px]"
              onClick={() => router.push(`/business/signup/status?ref=${encodeURIComponent(reference)}`)}
            >
              Track Your Application
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-10 w-full text-[14px]"
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
      : step === "users"
      ? "Who Will Use Internet Banking?"
      : step === "review"
      ? "Check Your Application"
      : "Sign Your Letter";

  const description =
    step === "account" ? (
      "Enter any GCB account number your company holds."
    ) : step === "applicant" ? (
      "We'll send a code to the number we hold for you."
    ) : step === "otp" ? (
      <>
        A 6-digit code has been sent to {maskMobile(applicant?.mobile ?? "")}.
        <br />
        Please enter the code below.
      </>
    ) : step === "users" ? (
      "Your signatories come from your mandate. Give each person a role."
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

            {company && (
              <div className="flex flex-col gap-3">
                <h2 className="text-[14px] font-medium text-foreground">{company.companyName}</h2>
                <div className="flex flex-col gap-1">
                  {company.accounts.map((acc) => {
                    const checked = selectedAccountIds.includes(acc.id);
                    return (
                      <label
                        key={acc.id}
                        className="-mx-2 flex cursor-pointer items-center justify-between gap-3 rounded-xl px-2 py-2 transition-colors duration-hover hover:bg-muted/50"
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(next) =>
                              setSelectedAccountIds((prev) =>
                                next ? [...prev, acc.id] : prev.filter((id) => id !== acc.id),
                              )
                            }
                          />
                          <span className="truncate text-[14px] text-foreground">{acc.name}</span>
                        </span>
                        <span className="tabular shrink-0 text-[13px] text-muted-foreground">{lastFour(acc.number)}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Button
                type="submit"
                size="lg"
                loading={busy}
                disabled={Boolean(company) && selectedAccountIds.length === 0}
                className="h-10 w-full text-[14px]"
              >
                {company ? "Continue" : "Find Company"}
              </Button>
              {company && selectedAccountIds.length === 0 && (
                <p className="text-center text-[12px] text-muted-foreground">Choose at least one account.</p>
              )}
            </div>
          </form>
        )}

        {/* 2. Applicant: a signatory, proved by a code to the number the bank holds */}
        {step === "applicant" && company && (
          <div className="flex flex-col gap-6">
            <div role="radiogroup" aria-label="Signatories" className="flex flex-col gap-2">
              {company.signatories.map((s, i) => {
                const selected = applicantIdx === i;
                return (
                  <button
                    key={s.name}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setApplicantIdx(i)}
                    className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors duration-hover ${
                      selected
                        ? "border-[var(--active-border)] bg-[var(--active-bg)]"
                        : "border-border bg-card hover:bg-muted/50"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] text-foreground">{s.name}</span>
                      <span className="block truncate text-[12px] text-muted-foreground">{signatoryLabel(s)}</span>
                    </span>
                    <span className="tabular shrink-0 text-[13px] text-muted-foreground">{maskMobile(s.mobile)}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-3">
              <Button
                size="lg"
                loading={busy}
                disabled={applicantIdx === null}
                onClick={handleSendCode}
                className="h-10 w-full text-[14px]"
              >
                Send Code
              </Button>
              <p className="text-center text-[12px] text-muted-foreground">
                Not a signatory? Ask one of them to start the application.
              </p>
            </div>
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
              <p role="alert" className="-mt-2 text-center text-[13px] text-destructive">
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
                className="cursor-pointer text-[13px] text-foreground underline underline-offset-4 transition-colors hover:text-foreground/80 disabled:cursor-default disabled:text-muted-foreground disabled:no-underline"
              >
                {countdown > 0 ? (
                  <>
                    Resend code in <span className="tabular">{countdown}s</span>
                  </>
                ) : (
                  "Resend code"
                )}
              </button>
              <p className="text-center text-[13px] text-muted-foreground">
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
              <div className="flex items-center justify-center gap-2 py-1 text-[13.5px] text-muted-foreground">
                <AppLoader size={16} />
                <span>Verifying code...</span>
              </div>
            )}
          </form>
        )}

        {/* 4. Users and roles */}
        {step === "users" && (
          <div className="flex flex-col gap-6">
            <ul className="flex flex-col gap-1">
              {users.map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] text-foreground">{u.name}</p>
                    <p className="truncate text-[12px] text-muted-foreground">
                      {u.isFromMandate ? u.designation : "Added by you"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Select
                      value={u.role}
                      onValueChange={(v) =>
                        v &&
                        setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role: v as CorporateAppRole } : x)))
                      }
                    >
                      <SelectTrigger aria-label={`Role for ${u.name}`} className="w-[132px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {rolesFor(Boolean(u.isFromMandate)).map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-10"
                      aria-label={`Remove ${u.name}`}
                      onClick={() => setUsers((prev) => prev.filter((x) => x.id !== u.id))}
                    >
                      <X size={16} strokeWidth={1.8} />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>

            {adding ? (
              <form onSubmit={handleAddUser} className="flex flex-col gap-4">
                <h2 className="text-[14px] font-medium text-foreground">Add a User</h2>
                <Field label="Full Name" htmlFor="newName">
                  <Input id="newName" autoComplete="off" value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
                </Field>
                <Field label="Mobile Number" htmlFor="newMobile">
                  <PhoneInput id="newMobile" value={newMobile} onValueChange={setNewMobile} />
                </Field>
                <Field label="Email" htmlFor="newEmail">
                  <Input id="newEmail" type="email" autoComplete="off" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                </Field>
                <Field
                  label="Ghana Card Number"
                  htmlFor="newGhanaCard"
                  hint="They confirm it when they activate."
                  error={newUserError}
                >
                  <GhanaCardInput id="newGhanaCard" value={newGhanaCard} onValueChange={setNewGhanaCard} />
                </Field>
                <Field label="Role" htmlFor="newRole" hint="Authorisers must be signatories on your mandate.">
                  <Select value={newRole} onValueChange={(v) => v && setNewRole(v as CorporateAppRole)}>
                    <SelectTrigger id="newRole" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {rolesFor(false).map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <div className="flex gap-3">
                  <Button type="button" variant="outline" size="lg" className="h-10 flex-1 text-[14px]" onClick={resetNewUser}>
                    Cancel
                  </Button>
                  <Button type="submit" size="lg" disabled={!newUserReady} className="h-10 flex-1 text-[14px]">
                    Add User
                  </Button>
                </div>
              </form>
            ) : (
              <Button variant="outline" size="lg" className="h-10 w-full text-[14px]" onClick={() => setAdding(true)}>
                <Plus size={16} strokeWidth={1.8} />
                Add a User
              </Button>
            )}

            <dl className="flex flex-col gap-1 text-[12px] text-muted-foreground">
              {(Object.keys(CORPORATE_ROLE_LINE) as CorporateAppRole[]).map((r) => (
                <div key={r} className="flex gap-1">
                  <dt className="text-foreground">{r}:</dt>
                  <dd>{CORPORATE_ROLE_LINE[r]}</dd>
                </div>
              ))}
            </dl>

            {!adding && (
              <div className="flex flex-col gap-2">
                <Button
                  size="lg"
                  disabled={Boolean(usersBlock)}
                  onClick={() => setStep("review")}
                  className="h-10 w-full text-[14px]"
                >
                  Continue
                </Button>
                {usersBlock && <p className="text-center text-[12px] text-muted-foreground">{usersBlock}</p>}
              </div>
            )}
          </div>
        )}

        {/* 5. Review */}
        {step === "review" && company && (
          <div className="flex flex-col gap-6">
            <ReviewGroup title="Company" onEdit={() => setStep("account")}>
              <ReviewLine primary={company.companyName} />
              {accounts.map((a) => (
                <ReviewLine key={a.id} primary={a.name} secondary={lastFour(a.number)} tabular />
              ))}
            </ReviewGroup>

            <ReviewGroup title="Applicant" onEdit={() => setStep("applicant")}>
              {applicant && <ReviewLine primary={applicant.name} secondary={maskMobile(applicant.mobile)} tabular />}
            </ReviewGroup>

            <ReviewGroup title="Users" onEdit={() => setStep("users")}>
              {users.map((u) => (
                <ReviewLine key={u.id} primary={u.name} secondary={u.role} />
              ))}
            </ReviewGroup>

            <Button size="lg" onClick={goToLetter} className="h-10 w-full text-[14px]">
              Continue
            </Button>
          </div>
        )}

        {/* 6. The letter: we write it, they sign it */}
        {step === "letter" && company && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <Button
                variant="outline"
                size="lg"
                className="h-10 w-full text-[14px]"
                onClick={() => openRequestLetter({ reference, company, accounts, users })}
              >
                <FileText size={16} strokeWidth={1.8} />
                Open Letter to Print
              </Button>
              <p className="tabular text-center text-[12px] text-muted-foreground">
                {`Your reference ${reference} is printed on it.`}
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
                  size="lg"
                  loading={busy && !sendingLater}
                  disabled={!letter}
                  onClick={() => handleSubmit(true)}
                  className="h-10 w-full text-[14px]"
                >
                  Submit Application
                </Button>
                {!letter && (
                  <p className="text-center text-[12px] text-muted-foreground">Upload the signed letter to submit.</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="lg"
                loading={busy && sendingLater}
                onClick={() => handleSubmit(false)}
                className="h-10 w-full text-[14px]"
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

function ReviewGroup({ title, onEdit, children }: { title: string; onEdit?: () => void; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex min-h-6 items-center justify-between">
        <h2 className="text-[14px] font-medium text-foreground">{title}</h2>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="cursor-pointer text-[13px] text-muted-foreground underline underline-offset-4 transition-colors duration-hover hover:text-foreground"
          >
            Edit
          </button>
        )}
      </div>
      <div className="flex flex-col gap-1">{children}</div>
    </section>
  );
}

function ReviewLine({ primary, secondary, tabular }: { primary: string; secondary?: string; tabular?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="truncate text-[13px] text-foreground">{primary}</span>
      {secondary && (
        <span className={`shrink-0 text-[13px] text-muted-foreground ${tabular ? "tabular" : ""}`}>{secondary}</span>
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
