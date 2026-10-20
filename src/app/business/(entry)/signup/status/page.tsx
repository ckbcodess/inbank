"use client";

/**
 * Corporate Enrolment Status Tracker — /business/signup/status
 *
 * Allows applicants to track their application status using their reference number
 * and mobile number verification, before any login credentials exist.
 *
 * Reads directly from `enrolment-store.ts`.
 * Features:
 *   - Honest timeline of progress
 *   - Security callback disclosure
 *   - In-place re-upload for returned applications
 *   - Setup invite link tracking & resend actions after approval
 */

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Building2,
  Check,
  CheckCircle2,
  ExternalLink,
  FileText,
  RotateCcw,
  UserCheck,
} from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";
import OtpInput, { OTP_LENGTH } from "@/components/auth/OtpInput";
import { DocumentAttachRow } from "@/components/auth/BusinessFormShared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { PhoneInput } from "@/components/ui/phone-input";
import { Badge } from "@/components/ui/badge";
import {
  getEnrolment,
  resendUserInvite,
  resubmitReturnedEnrolment,
  type EnrolmentApplication,
} from "@/lib/enrolment-store";

export default function CorporateStatusTrackerPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-background animate-pulse" />}>
      <StatusTrackerContent />
    </Suspense>
  );
}

function StatusTrackerContent() {
  const searchParams = useSearchParams();
  const initialRef = searchParams.get("ref") || "";

  // Lookup state
  const [reference, setReference] = useState(initialRef || "ENR-2026-0814");
  const [mobile, setMobile] = useState("0244123456");
  const [stage, setStage] = useState<"search" | "otp" | "tracking">(initialRef ? "tracking" : "search");
  const [otpDigits, setOtpDigits] = useState<string[]>(() => Array(OTP_LENGTH).fill(""));
  const [errorMsg, setErrorMsg] = useState("");
  const [busy, setBusy] = useState(false);

  // Loaded application
  const [application, setApplication] = useState<EnrolmentApplication | null>(null);

  // Return re-upload state
  const [reuploadFile, setReuploadFile] = useState<File | null>(null);
  const [reuploadBusy, setReuploadBusy] = useState(false);
  const [reuploadSuccess, setReuploadSuccess] = useState(false);

  // Invite resend feedback
  const [resendStatus, setResendStatus] = useState<Record<string, string>>({});

  // Load application on initial load if ref provided
  useEffect(() => {
    if (initialRef) {
      const app = getEnrolment(initialRef);
      if (app) {
        setApplication(app);
        setStage("tracking");
      }
    }
  }, [initialRef]);

  // Handle Search Submit
  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    const app = getEnrolment(reference);
    if (!app) {
      setErrorMsg("Application reference not found. Please check your confirmation email.");
      return;
    }
    setApplication(app);
    setStage("otp");
  }

  // Handle OTP Verify
  function handleOtpSubmit(incomingCode?: string) {
    const code = incomingCode ?? otpDigits.join("");
    if (code.length < OTP_LENGTH) return;
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      setStage("tracking");
    }, 400);
  }

  // Quick switch demo reference
  function pickDemoReference(ref: string) {
    setReference(ref);
    setErrorMsg("");
    const app = getEnrolment(ref);
    if (app) {
      setApplication(app);
      setStage("tracking");
      setReuploadFile(null);
      setReuploadSuccess(false);
    }
  }

  // Handle In-Place Re-upload for returned applications
  function handleReuploadSubmit() {
    if (!reuploadFile || !application) return;
    setReuploadBusy(true);
    setTimeout(() => {
      const sizeStr = `${(reuploadFile.size / (1024 * 1024)).toFixed(1)} MB`;
      const updated = resubmitReturnedEnrolment(application.reference, reuploadFile.name, sizeStr);
      setReuploadBusy(false);
      if (updated) {
        setApplication(updated);
        setReuploadSuccess(true);
      }
    }, 600);
  }

  // Handle Resending Invite
  function handleResend(userId: string) {
    if (!application) return;
    setResendStatus((prev) => ({ ...prev, [userId]: "sending" }));
    setTimeout(() => {
      const updated = resendUserInvite(application.reference, userId);
      if (updated) setApplication(updated);
      setResendStatus((prev) => ({ ...prev, [userId]: "sent" }));
      setTimeout(() => {
        setResendStatus((prev) => {
          const next = { ...prev };
          delete next[userId];
          return next;
        });
      }, 3000);
    }, 500);
  }

  return (
    <AuthLayout
      icon={stage === "tracking" ? Building2 : FileText}
      title={
        stage === "tracking" && application
          ? application.companyName
          : stage === "otp"
          ? "Verify Mobile"
          : "Track Application"
      }
      description={
        stage === "tracking" && application
          ? `Reference: ${application.reference} · Submitted on ${new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(application.createdAt))}`
          : stage === "otp"
          ? `Enter the 6-digit verification code sent to ${mobile}.`
          : "Check the review progress of your Corporate Internet Banking application."
      }
      align="left"
      onBack={
        stage === "otp"
          ? () => setStage("search")
          : stage === "tracking" && !initialRef
          ? () => setStage("search")
          : undefined
      }
      backHref={stage === "search" || initialRef ? "/business/signup" : undefined}
      backLabel="Back to business options"
      width="wide"
    >
      {/* ── STAGE 1: SEARCH LOOKUP ────────────────────────────────────────── */}
      {stage === "search" && (
        <form onSubmit={handleSearchSubmit} className="flex flex-col gap-4">
          <Field
            label="Application Reference"
            htmlFor="reference"
            error={errorMsg}
            hint="Format: ENR-2026-XXXX from your confirmation email."
          >
            <Input
              id="reference"
              value={reference}
              onChange={(e) => {
                setReference(e.target.value);
                if (errorMsg) setErrorMsg("");
              }}
              placeholder="ENR-2026-0814"
              className="tabular uppercase"
              required
            />
          </Field>

          <Field
            label="Applicant Mobile Number"
            htmlFor="mobile"
            hint="The registered mobile number entered during enrolment."
          >
            <PhoneInput
              id="mobile"
              value={mobile}
              onValueChange={setMobile}
              required
            />
          </Field>

          <Button
            type="submit"
            variant="default"
            size="lg"
            className="mt-2 h-10 w-full text-[14px]"
          >
            Check status
          </Button>

          {/* Quick Demo Switcher Presets */}
          <div className="rounded-2xl border border-dashed border-border p-3.5 mt-2 flex flex-col gap-2">
            <span className="text-[12px] font-medium text-muted-foreground">Demo Status Scenarios</span>
            <div className="grid grid-cols-2 gap-2 text-[12px]">
              <button
                type="button"
                onClick={() => pickDemoReference("ENR-2026-0814")}
                className="rounded-lg border border-border bg-card p-2 text-left hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <p className="font-medium text-foreground">Signature Check</p>
                <p className="text-muted-foreground text-[11px] tabular">ENR-2026-0814</p>
              </button>
              <button
                type="button"
                onClick={() => pickDemoReference("ENR-2026-0812")}
                className="rounded-lg border border-border bg-card p-2 text-left hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <p className="font-medium text-foreground">Callback Pending</p>
                <p className="text-muted-foreground text-[11px] tabular">ENR-2026-0812</p>
              </button>
              <button
                type="button"
                onClick={() => pickDemoReference("ENR-2026-0790")}
                className="rounded-lg border border-border bg-card p-2 text-left hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <p className="font-medium text-foreground">Returned for Fix</p>
                <p className="text-muted-foreground text-[11px] tabular">ENR-2026-0790</p>
              </button>
              <button
                type="button"
                onClick={() => pickDemoReference("ENR-2026-0720")}
                className="rounded-lg border border-border bg-card p-2 text-left hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <p className="font-medium text-foreground">Approved & Invites</p>
                <p className="text-muted-foreground text-[11px] tabular">ENR-2026-0720</p>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ── STAGE 2: OTP VERIFICATION ────────────────────────────────────── */}
      {stage === "otp" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-1 text-center py-2">
            <p className="text-[13px] text-muted-foreground">
              To view this application, enter the 6-digit code sent to
            </p>
            <p className="text-[14px] font-medium text-foreground tabular">{mobile}</p>
          </div>

          <div className="flex justify-center py-2">
            <OtpInput
              length={OTP_LENGTH}
              value={otpDigits}
              onChange={(digits) => {
                setOtpDigits(digits);
                if (digits.every((d) => d !== "")) {
                  handleOtpSubmit(digits.join(""));
                }
              }}
              autoFocus
            />
          </div>

          <p className="text-center text-[12px] text-muted-foreground">
            Demo code: enter any 6 digits
          </p>

          <Button
            variant="default"
            size="lg"
            loading={busy}
            disabled={otpDigits.some((d) => d === "")}
            onClick={() => handleOtpSubmit()}
            className="h-10 w-full text-[14px]"
          >
            View application status
          </Button>
        </div>
      )}

      {/* ── STAGE 3: TRACKER TIMELINE VIEW ───────────────────────────────── */}
      {stage === "tracking" && application && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-reveal">
          {/* Top Quick Status Pill & Switcher */}
          <div className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-card p-3">
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-muted-foreground">Status:</span>
              <Badge
                variant={
                  application.status === "approved"
                    ? "success"
                    : application.status === "returned"
                    ? "warning"
                    : application.status === "rejected"
                    ? "destructive"
                    : "outline"
                }
              >
                {application.status === "approved"
                  ? "Approved · Invites Sent"
                  : application.status === "returned"
                  ? "Returned for Clarification"
                  : application.status === "rejected"
                  ? "Declined"
                  : application.status === "checking_signatures"
                  ? "Checking Signatures"
                  : application.status === "call_verification"
                  ? "Callback In Progress"
                  : "In Review"}
              </Badge>
            </div>

            <button
              type="button"
              onClick={() => setStage("search")}
              className="text-[12px] font-medium text-foreground underline underline-offset-4 hover:text-foreground/80 cursor-pointer"
            >
              Switch application
            </button>
          </div>

          {/* Assigned Staff Notice */}
          <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/20 p-3.5 text-[13px]">
            <span className="flex size-8 items-center justify-center rounded-xl bg-primary/15 text-primary shrink-0 mt-0.5">
              <UserCheck size={16} strokeWidth={1.9} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground">
                Assigned to: {application.assignedTo.name}
              </p>
              <p className="text-[12px] text-muted-foreground leading-relaxed">
                {application.assignedTo.type === "rm"
                  ? `Your dedicated Relationship Manager is managing this application.`
                  : `GCB Corporate Operations Desk is processing this application.`}
              </p>
            </div>
          </div>

          {/* RETURNED STATE: SPECIFIC ACTIONABLE RETURN CARD */}
          {application.status === "returned" && application.returns.length > 0 && (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4 flex flex-col gap-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle size={18} strokeWidth={2} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[14px] font-medium text-amber-800 dark:text-amber-300">
                    Action Required: {application.returns[0].reason}
                  </p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-amber-900/90 dark:text-amber-200/90">
                    {application.returns[0].details}
                  </p>
                </div>
              </div>

              {application.returns[0].flaggedItems.length > 0 && (
                <div className="rounded-xl bg-background/60 p-3 text-[12px] flex flex-col gap-1 border border-border/50">
                  <span className="font-medium text-foreground">Flagged items to correct:</span>
                  <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                    {application.returns[0].flaggedItems.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Re-upload in place */}
              <div className="flex flex-col gap-2 pt-2 border-t border-border/40">
                <p className="text-[13px] font-medium text-foreground">
                  Re-upload corrected request pack
                </p>
                <DocumentAttachRow
                  id="reupload-pack"
                  label="Corrected Mandate Pack"
                  description="Upload the newly signed and stamped request pack."
                  attachedFileName={reuploadFile ? reuploadFile.name : undefined}
                  onAttach={(file) => setReuploadFile(file)}
                />

                <Button
                  variant="default"
                  disabled={!reuploadFile || reuploadBusy}
                  loading={reuploadBusy}
                  onClick={handleReuploadSubmit}
                  className="mt-1 h-9 text-[13px] w-full"
                >
                  <RotateCcw size={14} className="mr-1.5" />
                  Submit corrected document
                </Button>
              </div>
            </div>
          )}

          {reuploadSuccess && (
            <div className="flex items-center gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-[12.5px] text-emerald-800 dark:text-emerald-300">
              <Check size={15} strokeWidth={2.5} />
              Corrected pack submitted! Your application is now back in review with operations.
            </div>
          )}

          {/* APPROVED STATE: USER INVITE MANAGEMENT */}
          {application.status === "approved" && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} strokeWidth={2} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <p className="text-[14px] font-medium text-emerald-800 dark:text-emerald-300">
                  Application Approved · Setup Links Issued
                </p>
              </div>
              <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                All approved corporate users have been emailed an invitation link to set up their credentials.
              </p>

              {/* Users list with invite status and resend button */}
              <div className="flex flex-col gap-2 pt-1">
                <span className="text-[12px] font-medium text-foreground">Corporate Users & Setup Status:</span>
                <div className="flex flex-col gap-2">
                  {application.users.map((u) => {
                    const status = u.inviteStatus || "sent";
                    const isSending = resendStatus[u.id] === "sending";
                    const isSent = resendStatus[u.id] === "sent";

                    return (
                      <div
                        key={u.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[13px] font-medium text-foreground">{u.name}</span>
                            <Badge variant="outline" className="text-[11px] py-0">
                              {u.role}
                            </Badge>
                          </div>
                          <p className="text-[11.5px] text-muted-foreground truncate">{u.email}</p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {status === "used" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-[11px] font-medium">
                              <Check size={11} strokeWidth={2.5} /> Active
                            </span>
                          ) : status === "expired" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 px-2 py-0.5 text-[11px] font-medium">
                              Expired
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-[11px] font-medium">
                              Link sent
                            </span>
                          )}

                          {status !== "used" && (
                            <Button
                              variant="outline"
                              size="xs"
                              disabled={isSending}
                              loading={isSending}
                              onClick={() => handleResend(u.id)}
                              className="text-[11.5px] h-7"
                            >
                              <RotateCcw size={12} className="mr-1" />
                              {isSent ? "Sent!" : "Resend"}
                            </Button>
                          )}

                          {/* Demo shortcut to test /activate directly */}
                          <Link
                            href={`/activate?invite=1&user=${u.id}`}
                            title="Test user activation"
                            className="p-1 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                          >
                            <ExternalLink size={13} />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="default"
                  nativeButton={false}
                  render={<Link href="/login" />}
                  className="w-full h-9 text-[13px]"
                >
                  Go to Corporate Banking login
                </Button>
              </div>
            </div>
          )}

          {/* TIMELINE SECTION */}
          <div className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3">
            <p className="text-[14px] font-medium text-foreground">Application Timeline</p>

            <ol className="relative border-l border-border/80 ml-3 space-y-4 py-1">
              {application.timeline.map((item, idx) => (
                <li key={idx} className="ml-4">
                  <span
                    className={`absolute -left-2 flex size-4 items-center justify-center rounded-full ring-4 ring-background ${
                      item.done
                        ? "bg-emerald-500 text-white"
                        : item.current
                        ? "bg-primary animate-pulse text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {item.done && <Check size={10} strokeWidth={3} />}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className={`text-[13.5px] font-medium ${item.current ? "text-foreground" : item.done ? "text-foreground" : "text-muted-foreground"}`}>
                        {item.label}
                      </p>
                      <span className="text-[11.5px] text-muted-foreground tabular">{item.timestamp}</span>
                    </div>
                    <p className="text-[12px] text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Enrolled Accounts Card */}
          <div className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-2">
            <p className="text-[13px] font-medium text-foreground">Enrolled Accounts</p>
            <div className="divide-y divide-border/50 text-[12.5px]">
              {application.accounts.map((acc) => (
                <div key={acc.id} className="flex items-center justify-between py-2">
                  <div>
                    <span className="font-medium text-foreground">{acc.name}</span>
                    <span className="text-muted-foreground text-[11.5px] ml-1.5 tabular">
                      {acc.type} · {acc.number}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10.5px]">
                    {acc.currency}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
