"use client";

/**
 * Corporate Internet Banking Enrolment Flow — /business/signup/enrol
 *
 * For companies that already bank with GCB.
 * Customer steps:
 *   1. Account (Lookup & account selection)
 *   2. You (Applicant info & OTP verification)
 *   3. Users & Roles (Mandate signatories & role assignments)
 *   4. Review (Summary of all details)
 *   5. Sign & Upload (Download request pack, get wet-ink signatures, upload)
 *   6. Submitted (Reference & link to status tracker)
 */

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Building2,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileCheck2,
  Plus,
  Trash2,
  UserCheck,
  Users,
} from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";
import OtpInput, { OTP_LENGTH } from "@/components/auth/OtpInput";
import { ReviewSection, Row, DocumentAttachRow } from "@/components/auth/BusinessFormShared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { PhoneInput } from "@/components/ui/phone-input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import DevStatePanel from "@/components/states/DevStatePanel";
import {
  CORPORATE_ENROLMENT_SCENARIOS,
  CORPORATE_ENROLMENT_SCENARIO_IDS,
  CORPORATE_ENROLMENT_SCENARIO_LABELS,
  CORPORATE_ROLE_EXPLANATIONS,
  findCorporateEnrolmentScenario,
  lookupCorporateAccount,
  type CorporateAppRole,
  type CorporateEnrolmentStep,
  type CorporateEnrolmentVariant,
  type CorporateUserDraft,
  type EnrolledAccountSummary,
  type MockCompanyLookupResult,
} from "@/lib/corporate-enrolment";
import { saveEnrolment, type EnrolmentApplication } from "@/lib/enrolment-store";
import { isCompleteGhanaMobile } from "@/lib/phone";
import { formatMoney } from "@/lib/mock-data";

const STEPS: CorporateEnrolmentStep[] = ["account", "contact", "users", "review", "sign", "submitted"];
const STEP_LABELS: Record<CorporateEnrolmentStep, string> = {
  account: "Account",
  contact: "You",
  users: "Users & Roles",
  review: "Review",
  sign: "Sign & Upload",
  submitted: "Submitted",
};

export default function CorporateEnrolmentPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-background animate-pulse" />}>
      <CorporateEnrolmentFlow />
    </Suspense>
  );
}

function CorporateEnrolmentFlow() {
  const searchParams = useSearchParams();
  const initialAccountParam = searchParams.get("account") || "";

  const [step, setStep] = useState<CorporateEnrolmentStep>("account");
  const [variant, setVariant] = useState<CorporateEnrolmentVariant>("default");
  const [busy, setBusy] = useState(false);

  // Step 1: Account
  const [accountNumber, setAccountNumber] = useState(initialAccountParam || "1001 2345 6789");
  const [lookupResult, setLookupResult] = useState<MockCompanyLookupResult | null>(null);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [accountError, setAccountError] = useState("");

  // Step 2: You (Applicant)
  const [applicantName, setApplicantName] = useState("Ransford Gyasi");
  const [applicantMobile, setApplicantMobile] = useState("0244123456");
  const [applicantEmail, setApplicantEmail] = useState("ransford.gyasi@adinkratextiles.com");
  const [applicantGhanaCard, setApplicantGhanaCard] = useState("GHA-012345678-9");
  const [contactSubstep, setContactSubstep] = useState<"details" | "otp">("details");
  const [otpDigits, setOtpDigits] = useState<string[]>(() => Array(OTP_LENGTH).fill(""));
  const [otpError, setOtpError] = useState("");
  const [countdown, setCountdown] = useState(30);

  // Step 3: Users & Roles
  const [users, setUsers] = useState<CorporateUserDraft[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserMobile, setNewUserMobile] = useState("");
  const [newUserRole, setNewUserRole] = useState<CorporateAppRole>("Maker");

  // Step 5: Sign & Upload
  const [packDownloaded, setPackDownloaded] = useState(false);
  const [attachedFileName, setAttachedFileName] = useState("");
  const [attachedFileSize, setAttachedFileSize] = useState("");

  // Reference for completed application
  const [reference, setReference] = useState("ENR-2026-0814");

  // Perform account lookup
  const runLookup = useCallback((accNum: string) => {
    setAccountError("");
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      const res = lookupCorporateAccount(accNum);
      if (!res.found) {
        setLookupResult(null);
        setAccountError("No account found matching this number. Try demo account: 1001 2345 6789 or 1001 8844 2200.");
        return;
      }
      setLookupResult(res);
      if (res.accounts) {
        setSelectedAccountIds(res.accounts.map((a) => a.id));
      }
      // Populate mandate signatories if users list is empty
      if (res.mandateSignatories && res.mandateSignatories.length > 0) {
        setUsers(
          res.mandateSignatories.map((sig, idx) => ({
            id: `u-mandate-${idx + 1}`,
            name: sig.name,
            email: sig.email,
            mobile: sig.mobile,
            role: idx === 0 ? "Corporate Admin" : idx === 1 ? "Approver" : "Maker",
            isFromMandate: true,
            inviteStatus: "pending",
          })),
        );
      }
    }, 400);
  }, []);

  // Initial account lookup if parameter was passed or on mount
  useEffect(() => {
    if (accountNumber) {
      runLookup(accountNumber);
    }
  }, [accountNumber, runLookup]);

  // Resend timer countdown
  useEffect(() => {
    if (contactSubstep !== "otp" || countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [contactSubstep, countdown]);

  // Dev mode scenario switcher
  const applyScenario = useCallback((id: string) => {
    const target = findCorporateEnrolmentScenario(id);
    if (!target) return;

    setStep(target.step);
    setVariant(target.variant);
    setBusy(false);

    if (target.variant === "notFound") {
      setAccountNumber("9999 0000 1111");
      setLookupResult(null);
      setAccountError("Account number not recognised. Please verify with your branch.");
      return;
    }

    if (target.variant === "alreadyEnrolled") {
      setAccountNumber("1001 9922 4411");
      runLookup("1001 9922 4411");
      return;
    }

    if (target.variant === "noRm") {
      setAccountNumber("1001 8844 2200");
      runLookup("1001 8844 2200");
      return;
    }

    if (target.variant === "multiAccount") {
      setAccountNumber("1001 2345 6789");
      runLookup("1001 2345 6789");
      return;
    }

    // Default scenario setup
    setAccountNumber("1001 2345 6789");
    runLookup("1001 2345 6789");
    if (target.step === "sign" || target.step === "submitted") {
      setPackDownloaded(true);
      setAttachedFileName("Signed_Mandate_Pack_Adinkra.pdf");
      setAttachedFileSize("2.4 MB");
    }
  }, [runLookup]);

  // Back button handler
  function handleBack() {
    setBusy(false);
    if (step === "sign") setStep("review");
    else if (step === "review") setStep("users");
    else if (step === "users") {
      setStep("contact");
      setContactSubstep("details");
    } else if (step === "contact") {
      if (contactSubstep === "otp") setContactSubstep("details");
      else setStep("account");
    } else if (step === "account") {
      // Handled by AuthLayout backHref to /business/signup
    }
  }

  // Handle OTP verification
  function handleVerifyOtp(incomingCode?: string) {
    const code = incomingCode ?? otpDigits.join("");
    if (code.length < OTP_LENGTH) return;
    setOtpError("");
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      setStep("users");
    }, 500);
  }

  // Handle adding custom user
  function handleAddUser() {
    if (!newUserName.trim() || !newUserEmail.trim()) return;
    const newEntry: CorporateUserDraft = {
      id: `u-custom-${Date.now()}`,
      name: newUserName.trim(),
      email: newUserEmail.trim(),
      mobile: newUserMobile.trim(),
      role: newUserRole,
      isFromMandate: false,
      inviteStatus: "pending",
    };
    setUsers((prev) => [...prev, newEntry]);
    setNewUserName("");
    setNewUserEmail("");
    setNewUserMobile("");
    setNewUserRole("Maker");
    setShowAddUser(false);
  }

  // Handle removing a user
  function handleRemoveUser(id: string) {
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }

  // Handle updating user role
  function handleUpdateUserRole(id: string, role: CorporateAppRole) {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
  }

  // Handle downloading pack
  function handleDownloadPack() {
    setPackDownloaded(true);
    // Simulate browser download trigger
    const link = document.createElement("a");
    link.href = "#";
    link.download = `GCB_Corporate_Enrolment_${lookupResult?.companyName?.replace(/\s+/g, "_") || "Pack"}.pdf`;
    // We keep state marked as downloaded
  }

  // Handle Final Submission
  function handleSubmitApplication() {
    if (!attachedFileName || !lookupResult) return;
    setBusy(true);

    const generatedRef = `ENR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    setReference(generatedRef);

    const selectedAccounts: EnrolledAccountSummary[] = (lookupResult.accounts || []).filter((a) =>
      selectedAccountIds.includes(a.id),
    );

    const application: EnrolmentApplication = {
      reference: generatedRef,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      companyName: lookupResult.companyName || "Adinkra Textiles Ltd",
      companyTin: lookupResult.tin || "C0012345678",
      accounts: selectedAccounts,
      applicant: {
        name: applicantName,
        mobile: applicantMobile,
        email: applicantEmail,
        ghanaCard: applicantGhanaCard,
      },
      users,
      mandate: lookupResult.mandate || "Both to sign",
      approvalRule: lookupResult.approvalRule || "Dual authorization required",
      pack: {
        downloadUrl: "#",
        uploadedFileName: attachedFileName,
        uploadedFileSize: attachedFileSize || "2.1 MB",
        uploadedAt: new Date().toISOString(),
      },
      status: "checking_signatures",
      assignedTo: lookupResult.relationshipManager
        ? {
            type: "rm",
            name: lookupResult.relationshipManager.name,
            email: lookupResult.relationshipManager.email,
            phone: lookupResult.relationshipManager.phone,
          }
        : {
            type: "operations",
            name: "Corporate Banking Team",
            email: "corporate.onboarding@gcb.com.gh",
          },
      signatureChecks: (lookupResult.mandateSignatories || []).map((s) => ({
        signatoryName: s.name,
        role: s.role,
        specimenUrl: s.specimenUrl,
        status: "unreviewed",
      })),
      verificationCall: {
        logged: false,
        calledNumber: applicantMobile,
        answeredBy: "",
        outcome: null,
      },
      returns: [],
      timeline: [
        {
          status: "received",
          label: "Application received",
          description: "Signed mandate pack uploaded and entered into staff queue.",
          timestamp: "Just now",
          done: true,
          current: false,
        },
        {
          status: "rm_review",
          label: lookupResult.relationshipManager
            ? `Assigned to ${lookupResult.relationshipManager.name}`
            : "Assigned to Corporate Banking Team",
          description: "Staff verification of company account standing.",
          timestamp: "Just now",
          done: true,
          current: false,
        },
        {
          status: "checking_signatures",
          label: "Checking wet signatures",
          description: "Comparing uploaded mandate signatures against cards on file.",
          timestamp: "In review",
          done: false,
          current: true,
        },
        {
          status: "call_verification",
          label: "Security callback verification",
          description: `We will call you on ${applicantMobile.slice(0, 3)} ••• ${applicantMobile.slice(-4)}. We will never ask for a code or password.`,
          timestamp: "Pending",
          done: false,
          current: false,
        },
        {
          status: "approved",
          label: "Approved & setup links sent",
          description: "Activation email invitations issued to all enrolled users.",
          timestamp: "Pending",
          done: false,
          current: false,
        },
      ],
    };

    saveEnrolment(application);

    setTimeout(() => {
      setBusy(false);
      setStep("submitted");
    }, 700);
  }

  const stepIndex = STEPS.indexOf(step);

  return (
    <>
      <StateSwitcher
        section="12.1"
        states={CORPORATE_ENROLMENT_SCENARIO_IDS}
        value={
          CORPORATE_ENROLMENT_SCENARIOS.find((s) => s.step === step && s.variant === variant)?.id ||
          "enrol-account"
        }
        onChange={applyScenario}
        labels={CORPORATE_ENROLMENT_SCENARIO_LABELS}
      />
      <DevStatePanel />

      <AuthLayout
        icon={
          step === "submitted"
            ? CheckCircle2
            : step === "sign"
            ? FileCheck2
            : step === "users"
            ? Users
            : step === "contact"
            ? UserCheck
            : Building2
        }
        title={
          step === "submitted"
            ? "Application Submitted"
            : step === "sign"
            ? "Sign & Upload Mandate"
            : step === "review"
            ? "Review Application"
            : step === "users"
            ? "Configure Users & Roles"
            : step === "contact"
            ? contactSubstep === "otp"
              ? "Verify Your Mobile"
              : "Applicant Information"
            : "Corporate Enrolment"
        }
        description={
          step === "submitted"
            ? "Your request pack has been received. Our team will verify signatures and call to confirm."
            : step === "sign"
            ? "Download the pre-filled mandate pack, obtain required wet-ink signatures, and upload."
            : step === "review"
            ? "Check all company accounts, designated corporate users, and mandate rules."
            : step === "users"
            ? "Assign user roles based on your company mandate. All users receive setup links on approval."
            : step === "contact"
            ? contactSubstep === "otp"
              ? `We sent a 6-digit code to ${applicantMobile}. Enter it to continue.`
              : "As the applicant, you will coordinate this request and receive the status callback."
            : "Set up Corporate Internet Banking for a company that already banks with GCB."
        }
        align={step === "submitted" ? "center" : "left"}
        onBack={step !== "submitted" && step !== "account" ? handleBack : undefined}
        backHref={step === "account" ? "/business/signup" : undefined}
        backLabel={step === "account" ? "Back to business options" : "Back to previous step"}
        width="wide"
        footer={
          step === "account" ? (
            <div className="mt-4 text-center">
              <p className="text-[13px] text-muted-foreground">
                Already set up?{" "}
                <Link
                  href="/login"
                  className="font-medium text-foreground underline underline-offset-4 hover:text-foreground"
                >
                  Login to Corporate Banking
                </Link>
              </p>
            </div>
          ) : null
        }
      >
        {/* Step progress bar */}
        {step !== "submitted" && (
          <ol className="mb-5 flex items-center gap-2">
            {(["account", "contact", "users", "review", "sign"] as CorporateEnrolmentStep[]).map(
              (s, i) => (
                <li key={s} className="flex flex-1 flex-col items-center gap-2">
                  <span
                    className={`h-1 w-full rounded-full ${
                      i <= stepIndex ? "bg-primary" : "bg-muted"
                    }`}
                    aria-hidden="true"
                  />
                  <span className="hidden text-[10px] text-muted-foreground sm:block">
                    {STEP_LABELS[s]}
                  </span>
                </li>
              ),
            )}
          </ol>
        )}

        {/* ── STEP 1: ACCOUNT ──────────────────────────────────────────────── */}
        {step === "account" && (
          <div className="flex flex-col gap-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                runLookup(accountNumber);
              }}
              className="flex flex-col gap-3"
            >
              <Field
                label="GCB Account Number"
                htmlFor="accountNumber"
                error={accountError}
                hint="Enter any active GCB account held by your company."
              >
                <div className="flex gap-2">
                  <Input
                    id="accountNumber"
                    value={accountNumber}
                    onChange={(e) => {
                      setAccountNumber(e.target.value);
                      if (accountError) setAccountError("");
                    }}
                    placeholder="1001 2345 6789"
                    className="tabular"
                    required
                  />
                  <Button type="submit" variant="outline" loading={busy}>
                    Look up
                  </Button>
                </div>
              </Field>
            </form>

            {/* Resolved company result */}
            {lookupResult && lookupResult.found && (
              <div className="flex flex-col gap-4 animate-in fade-in duration-reveal">
                {lookupResult.alreadyEnrolled ? (
                  <div className="rounded-2xl border border-warning/40 bg-warning/5 p-4 text-[13px] flex flex-col gap-2">
                    <p className="font-medium text-warning-text">
                      {lookupResult.companyName} is already enrolled
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      This company already has an active Corporate Internet Banking profile. Ask your
                      Corporate Admin to invite you from Administration, or sign in if you already have
                      credentials.
                    </p>
                    <div className="pt-2 flex gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        nativeButton={false}
                        render={<Link href="/login" />}
                      >
                        Go to login
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        nativeButton={false}
                        render={<Link href="/business/signup/status" />}
                      >
                        Check application status
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-2 border-b border-border pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
                            <Building2 size={18} strokeWidth={1.9} />
                          </span>
                          <div>
                            <p className="text-[15px] font-medium text-foreground">
                              {lookupResult.companyName}
                            </p>
                            <p className="text-[12px] text-muted-foreground tabular">
                              TIN: {lookupResult.tin}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline">{lookupResult.mandate}</Badge>
                      </div>

                      {lookupResult.relationshipManager && (
                        <div className="flex items-center justify-between text-[12px] text-muted-foreground pt-1">
                          <span>Relationship Manager:</span>
                          <span className="text-foreground font-medium">
                            {lookupResult.relationshipManager.name} ({lookupResult.relationshipManager.phone})
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Account selection if multiple accounts */}
                    {lookupResult.accounts && lookupResult.accounts.length > 0 && (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[13px] font-medium text-foreground">
                            Accounts to enrol ({selectedAccountIds.length} of {lookupResult.accounts.length})
                          </p>
                          <span className="text-[11.5px] text-muted-foreground">
                            Select all that apply
                          </span>
                        </div>

                        <div className="flex flex-col gap-2">
                          {lookupResult.accounts.map((acc) => {
                            const selected = selectedAccountIds.includes(acc.id);
                            return (
                              <label
                                key={acc.id}
                                className={`flex items-center justify-between gap-3 rounded-2xl border p-3.5 transition-all cursor-pointer ${
                                  selected
                                    ? "border-primary/50 bg-primary/5"
                                    : "border-border bg-card hover:bg-muted/30"
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <Checkbox
                                    checked={selected}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSelectedAccountIds((prev) => [...prev, acc.id]);
                                      } else {
                                        setSelectedAccountIds((prev) =>
                                          prev.filter((id) => id !== acc.id),
                                        );
                                      }
                                    }}
                                  />
                                  <div className="min-w-0">
                                    <p className="text-[13.5px] font-medium text-foreground truncate">
                                      {acc.name}
                                    </p>
                                    <p className="text-[12px] text-muted-foreground tabular">
                                      {acc.type} · {acc.number}
                                    </p>
                                  </div>
                                </div>
                                {acc.balance !== undefined && (
                                  <span className="text-[13px] font-medium text-foreground tabular shrink-0">
                                    {formatMoney(acc.balance, acc.currency)}
                                  </span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <Button
                      variant="default"
                      size="lg"
                      disabled={selectedAccountIds.length === 0}
                      onClick={() => setStep("contact")}
                      className="mt-2 h-10 w-full text-[14px]"
                    >
                      Confirm company & proceed
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: YOU (APPLICANT) ──────────────────────────────────────── */}
        {step === "contact" && (
          <div className="flex flex-col gap-4">
            {contactSubstep === "details" ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!applicantName.trim() || !isCompleteGhanaMobile(applicantMobile)) return;
                  setBusy(true);
                  setTimeout(() => {
                    setBusy(false);
                    setContactSubstep("otp");
                    setCountdown(30);
                  }, 500);
                }}
                className="flex flex-col gap-4"
              >
                <Field label="Full Name" htmlFor="applicantName" hint="As it appears on your official ID.">
                  <Input
                    id="applicantName"
                    value={applicantName}
                    onChange={(e) => setApplicantName(e.target.value)}
                    placeholder="Ransford Gyasi"
                    required
                  />
                </Field>

                <Field label="Mobile Number" htmlFor="applicantMobile" hint="We will send an OTP code here to verify possession.">
                  <PhoneInput
                    id="applicantMobile"
                    value={applicantMobile}
                    onValueChange={setApplicantMobile}
                    required
                  />
                </Field>

                <Field label="Work Email" htmlFor="applicantEmail" hint="Application updates and tracking links will be sent here.">
                  <Input
                    id="applicantEmail"
                    type="email"
                    value={applicantEmail}
                    onChange={(e) => setApplicantEmail(e.target.value)}
                    placeholder="ransford@company.com"
                    required
                  />
                </Field>

                <Field
                  label="Ghana Card Number"
                  htmlFor="applicantGhanaCard"
                  hint="(Optional) Speeds up customer identity verification."
                >
                  <Input
                    id="applicantGhanaCard"
                    value={applicantGhanaCard}
                    onChange={(e) => setApplicantGhanaCard(e.target.value)}
                    placeholder="GHA-012345678-9"
                    className="uppercase tabular"
                  />
                </Field>

                <Button
                  type="submit"
                  variant="default"
                  size="lg"
                  loading={busy}
                  disabled={!applicantName.trim() || !isCompleteGhanaMobile(applicantMobile) || !applicantEmail.trim()}
                  className="mt-2 h-10 w-full text-[14px]"
                >
                  Verify mobile number
                </Button>
              </form>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col items-center gap-2 py-2 text-center">
                  <p className="text-[13.5px] text-muted-foreground">
                    Enter the 6-digit verification code sent to
                  </p>
                  <p className="text-[15px] font-medium text-foreground tabular">
                    {applicantMobile}
                  </p>
                </div>

                <div className="flex justify-center py-2">
                  <OtpInput
                    length={OTP_LENGTH}
                    value={otpDigits}
                    onChange={(digits) => {
                      setOtpDigits(digits);
                      if (digits.every((d) => d !== "")) {
                        handleVerifyOtp(digits.join(""));
                      }
                    }}
                    invalid={Boolean(otpError)}
                    autoFocus
                  />
                </div>

                {otpError && (
                  <p className="text-center text-[12.5px] text-destructive">{otpError}</p>
                )}

                <p className="text-center text-[12px] text-muted-foreground">
                  Demo hint: enter any 6 digits (e.g. 123456)
                </p>

                <Button
                  variant="default"
                  size="lg"
                  loading={busy}
                  disabled={otpDigits.some((d) => d === "")}
                  onClick={() => handleVerifyOtp()}
                  className="h-10 w-full text-[14px]"
                >
                  Confirm & continue
                </Button>

                <div className="text-center pt-2">
                  {countdown > 0 ? (
                    <span className="text-[12.5px] text-muted-foreground">
                      Resend code in <span className="tabular">{countdown}s</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCountdown(30)}
                      className="text-[12.5px] font-medium text-foreground underline underline-offset-4 hover:text-foreground/80 cursor-pointer"
                    >
                      Resend one-time code
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3: USERS & ROLES ────────────────────────────────────────── */}
        {step === "users" && (
          <div className="flex flex-col gap-4">
            {/* Signing Mandate Rule notice */}
            <div className="rounded-2xl border border-border bg-card p-3.5 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-medium text-muted-foreground">Signing Mandate on File</span>
                <Badge variant="outline">{lookupResult?.mandate || "Both to sign"}</Badge>
              </div>
              <p className="text-[13px] text-foreground leading-relaxed">
                {lookupResult?.approvalRule || "Dual authorization: 1 Signatory A + 1 Signatory B required for payments."}
              </p>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <p className="text-[14px] font-medium text-foreground">
                  Corporate Users ({users.length})
                </p>
                <p className="text-[12px] text-muted-foreground">
                  Pre-filled with mandate signatories. All users receive setup links on approval.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddUser(true)}
                className="h-8 text-[12.5px]"
              >
                <Plus size={14} strokeWidth={2} className="mr-1" />
                Add someone else
              </Button>
            </div>

            {/* Inline add user modal/box */}
            {showAddUser && (
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 flex flex-col gap-3 animate-in fade-in">
                <p className="text-[13px] font-medium text-foreground">Add user to application</p>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <Input
                    placeholder="Full name"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                  />
                  <Input
                    type="email"
                    placeholder="Work email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                  />
                  <PhoneInput
                    placeholder="Mobile number"
                    value={newUserMobile}
                    onValueChange={setNewUserMobile}
                  />
                  <Select
                    value={newUserRole}
                    onValueChange={(v) => v && setNewUserRole(v as CorporateAppRole)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Maker">Maker</SelectItem>
                      <SelectItem value="Approver">Approver</SelectItem>
                      <SelectItem value="Corporate Admin">Corporate Admin</SelectItem>
                      <SelectItem value="Viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddUser(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={!newUserName.trim() || !newUserEmail.trim()}
                    onClick={handleAddUser}
                  >
                    Add user
                  </Button>
                </div>
              </div>
            )}

            {/* List of Users */}
            <div className="flex flex-col gap-2.5">
              {users.map((u) => {
                const explanation = CORPORATE_ROLE_EXPLANATIONS[u.role];
                return (
                  <div
                    key={u.id}
                    className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[13.5px] font-medium text-foreground truncate">
                            {u.name}
                          </p>
                          {u.isFromMandate && (
                            <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[10.5px] font-medium text-foreground">
                              Mandate Signatory
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] text-muted-foreground truncate">
                          {u.email} {u.mobile ? `· ${u.mobile}` : ""}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Select
                          value={u.role}
                          onValueChange={(val) => val && handleUpdateUserRole(u.id, val as CorporateAppRole)}
                        >
                          <SelectTrigger className="h-8 text-[12.5px] min-w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Maker">Maker</SelectItem>
                            <SelectItem value="Approver">Approver</SelectItem>
                            <SelectItem value="Corporate Admin">Corporate Admin</SelectItem>
                            <SelectItem value="Viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>

                        {!u.isFromMandate && (
                          <button
                            type="button"
                            onClick={() => handleRemoveUser(u.id)}
                            className="p-1.5 text-muted-foreground hover:text-destructive cursor-pointer transition-colors"
                            aria-label={`Remove ${u.name}`}
                          >
                            <Trash2 size={14} strokeWidth={1.8} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Role description tagline */}
                    <p className="text-[11.5px] text-muted-foreground bg-muted/30 rounded-lg px-2.5 py-1">
                      {explanation.tagline}
                    </p>
                  </div>
                );
              })}
            </div>

            <Button
              variant="default"
              size="lg"
              disabled={users.length === 0}
              onClick={() => setStep("review")}
              className="mt-2 h-10 w-full text-[14px]"
            >
              Proceed to review
            </Button>
          </div>
        )}

        {/* ── STEP 4: REVIEW ───────────────────────────────────────────────── */}
        {step === "review" && (
          <div className="flex flex-col gap-4">
            <ReviewSection title="Company & Accounts" onEdit={() => setStep("account")}>
              <dl className="grid grid-cols-1 gap-y-2 text-[13.5px]">
                <Row label="Company" value={lookupResult?.companyName} />
                <Row label="TIN" value={lookupResult?.tin} tabular />
                <Row
                  label="Accounts"
                  value={
                    <span className="tabular">
                      {selectedAccountIds.length} account{selectedAccountIds.length === 1 ? "" : "s"} selected
                    </span>
                  }
                />
                <Row label="Signing Mandate" value={lookupResult?.mandate} />
              </dl>
            </ReviewSection>

            <ReviewSection title="Primary Applicant" onEdit={() => setStep("contact")}>
              <dl className="grid grid-cols-1 gap-y-2 text-[13.5px]">
                <Row label="Name" value={applicantName} />
                <Row label="Mobile" value={applicantMobile} tabular />
                <Row label="Work Email" value={applicantEmail} />
                {applicantGhanaCard && <Row label="Ghana Card" value={applicantGhanaCard} tabular />}
              </dl>
            </ReviewSection>

            <ReviewSection title={`Users & Roles (${users.length})`} onEdit={() => setStep("users")}>
              <ul className="flex flex-col gap-2.5 text-[13px]">
                {users.map((u) => (
                  <li key={u.id} className="flex items-center justify-between gap-2 border-b border-border/50 pb-2 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium text-foreground">{u.name}</p>
                      <p className="text-[11.5px] text-muted-foreground">{u.email}</p>
                    </div>
                    <Badge variant="outline">{u.role}</Badge>
                  </li>
                ))}
              </ul>
            </ReviewSection>

            <div className="flex items-start gap-2.5 rounded-2xl bg-muted/40 p-3.5 text-[12.5px] leading-relaxed text-muted-foreground">
              <ClipboardCheck size={16} strokeWidth={1.8} className="mt-0.5 shrink-0 text-foreground" />
              <span>
                In the next step, you will download the pre-filled authorisation pack for physical
                wet-ink signing per your mandate, then upload the executed document.
              </span>
            </div>

            <Button
              variant="default"
              size="lg"
              onClick={() => setStep("sign")}
              className="mt-2 h-10 w-full text-[14px]"
            >
              Proceed to sign & upload
            </Button>
          </div>
        )}

        {/* ── STEP 5: SIGN & UPLOAD ────────────────────────────────────────── */}
        {step === "sign" && (
          <div className="flex flex-col gap-4">
            {/* Step A: Download pack */}
            <div className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[14px] font-medium text-foreground">
                    1. Download request pack
                  </p>
                  <p className="text-[12px] text-muted-foreground">
                    Pre-filled with company details, chosen accounts, and designated users.
                  </p>
                </div>
                {packDownloaded && (
                  <span className="flex items-center gap-1 text-[11.5px] text-emerald-600 font-medium dark:text-emerald-400">
                    <Check size={12} strokeWidth={2.5} />
                    Downloaded
                  </span>
                )}
              </div>

              <Button
                variant={packDownloaded ? "outline" : "default"}
                onClick={handleDownloadPack}
                className="h-10 text-[13.5px] w-full"
              >
                <Download size={15} strokeWidth={1.9} className="mr-2" />
                {packDownloaded ? "Download pack again" : "Download request pack (PDF)"}
              </Button>
            </div>

            {/* Step B: Who must sign */}
            <div className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-2.5">
              <p className="text-[14px] font-medium text-foreground">
                2. Required signatures
              </p>
              <p className="text-[12px] text-muted-foreground">
                Per the company signing mandate ({lookupResult?.mandate || "Both to sign"}), the following authorised signatories must sign the pack:
              </p>

              <ul className="flex flex-col gap-2 pt-1 text-[13px]">
                {(lookupResult?.mandateSignatories || []).map((s) => (
                  <li
                    key={s.name}
                    className="flex items-center justify-between rounded-xl bg-muted/30 px-3 py-2"
                  >
                    <span className="font-medium text-foreground">{s.name}</span>
                    <span className="text-[12px] text-muted-foreground">{s.role}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Step C: Upload signed pack */}
            <div className="flex flex-col gap-2">
              <p className="text-[14px] font-medium text-foreground">
                3. Upload signed & stamped document
              </p>
              <DocumentAttachRow
                id="mandate-pack"
                label="Executed Mandate Pack"
                description="Upload the scanned copy with physical wet-ink signatures and company seal/stamp."
                attachedFileName={attachedFileName}
                onAttach={(file) => {
                  setAttachedFileName(file.name);
                  setAttachedFileSize(`${(file.size / (1024 * 1024)).toFixed(1)} MB`);
                }}
              />
            </div>

            <Button
              variant="default"
              size="lg"
              loading={busy}
              disabled={!attachedFileName}
              onClick={handleSubmitApplication}
              className="mt-2 h-10 w-full text-[14px]"
            >
              Submit application
            </Button>
          </div>
        )}

        {/* ── STEP 6: SUBMITTED ────────────────────────────────────────────── */}
        {step === "submitted" && (
          <div className="flex flex-col gap-5">
            <div className="rounded-2xl border border-border bg-muted/30 p-5 text-center">
              <p className="text-[12px] font-medium uppercase tracking-[var(--ls-label)] text-muted-foreground">
                Application Reference
              </p>
              <p className="mt-2 text-[22px] font-medium text-foreground tabular">
                {reference}
              </p>
            </div>

            <div className="flex flex-col gap-3 text-[13.5px] leading-relaxed text-muted-foreground">
              <p>
                We have received your Corporate Internet Banking request pack for{" "}
                <span className="text-foreground font-medium">{lookupResult?.companyName}</span>.
              </p>
              <ul className="flex flex-col gap-2 rounded-2xl bg-card border border-border p-3.5 text-[12.5px]">
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    Our operations team will verify all physical wet signatures against specimen cards on file.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    A verification call will be placed to your mobile ({applicantMobile.slice(0, 3)} ••• {applicantMobile.slice(-4)}) to confirm request authorization.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    Upon approval, individual setup links will be emailed directly to every corporate user on the application.
                  </span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button
                variant="default"
                size="lg"
                nativeButton={false}
                render={<Link href={`/business/signup/status?ref=${encodeURIComponent(reference)}`} />}
                className="h-10 w-full text-[14px]"
              >
                Track application status
              </Button>
              <Button
                variant="outline"
                size="lg"
                nativeButton={false}
                render={<Link href="/login" />}
                className="h-10 w-full text-[14px]"
              >
                Back to login
              </Button>
            </div>

            <p className="text-center text-[12px] text-muted-foreground">
              A copy of this reference and a resume link has been sent to{" "}
              <span className="text-foreground">{applicantEmail}</span>.
            </p>
          </div>
        )}
      </AuthLayout>
    </>
  );
}
