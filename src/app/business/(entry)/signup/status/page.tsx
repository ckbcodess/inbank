"use client";

/**
 * Where a company follows its internet banking application — /business/signup/status.
 *
 * Before anyone has sign-in details, the reference plus a code to the applicant's number on file is the key.
 * The page answers one question, "where is it and what's next?", and puts the one thing the customer can do
 * right where they need it: upload the signed letter if it's still to come, send a corrected one if it was
 * returned, or resend a user's sign-in details once approved. Reads and writes `lib/enrolment-store.ts`.
 */

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { AlertCircle, Check, FileText } from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";
import OtpInput, { OTP_LENGTH } from "@/components/auth/OtpInput";
import LetterUpload, { type AttachedFile } from "@/components/corporate/onboarding/LetterUpload";
import { openRequestLetter } from "@/components/corporate/onboarding/request-letter";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { maskMobile } from "@/lib/auth-shared";
import { lookupCorporateAccount } from "@/lib/corporate-enrolment";
import { SHOW_DEMO_TOOLS } from "@/lib/demo-tools";
import {
  getEnrolment,
  resendUserInvite,
  resubmitReturnedEnrolment,
  uploadEnrolmentLetter,
  type EnrolmentApplication,
} from "@/lib/enrolment-store";

type Stage = "search" | "otp" | "tracking";

const RESEND_SECONDS = 30;

function statusLine(app: EnrolmentApplication): string {
  switch (app.status) {
    case "awaiting_letter":
      return "Waiting for your signed letter.";
    case "returned":
      return "Returned to you. One thing to fix.";
    case "rejected":
      return "This application was declined.";
    case "approved":
      return "Approved. Sign-in details sent.";
    case "call_verification":
      return "Signatures checked. We'll call to confirm.";
    default:
      return "We're checking the signatures.";
  }
}

function StatusContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refParam = searchParams.get("ref");

  const [stage, setStage] = useState<Stage>("search");
  const [reference, setReference] = useState("");
  const [application, setApplication] = useState<EnrolmentApplication | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [digits, setDigits] = useState<string[]>(() => Array<string>(OTP_LENGTH).fill(""));
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const [letter, setLetter] = useState<AttachedFile | null>(null);

  // Arriving from the application (or a Demo hub link) with a reference: the applicant has just proved who they are.
  useEffect(() => {
    if (!refParam) return;
    const app = getEnrolment(refParam);
    if (app) {
      setReference(app.reference);
      setApplication(app);
      setLetter(null);
      setStage("tracking");
    }
  }, [refParam]);

  useEffect(() => {
    if (stage !== "otp" || countdown <= 0) return;
    const t = window.setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [stage, countdown]);

  function handleFind(e: React.FormEvent) {
    e.preventDefault();
    const app = getEnrolment(reference.trim());
    if (!app) {
      setErrorMsg("We couldn't find that reference. It starts with ENR and is on your letter.");
      return;
    }
    setErrorMsg("");
    setApplication(app);
    setDigits(Array(OTP_LENGTH).fill(""));
    setCountdown(RESEND_SECONDS);
    setStage("otp");
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
      setStage("tracking");
    }, 500);
  }

  function handleSendLetter() {
    if (!application || !letter) return;
    setBusy(true);
    window.setTimeout(() => {
      const updated =
        application.status === "returned"
          ? resubmitReturnedEnrolment(application.reference, letter.name, letter.size)
          : uploadEnrolmentLetter(application.reference, letter.name, letter.size);
      setBusy(false);
      if (updated) {
        setApplication(updated);
        setLetter(null);
        toast.success("Letter sent", { description: "We're checking the signatures again." });
      }
    }, 600);
  }

  function handleResend(userId: string, name: string) {
    if (!application) return;
    const updated = resendUserInvite(application.reference, userId);
    if (updated) {
      setApplication(updated);
      toast.success(`Sign-in details sent to ${name}`);
    }
  }

  function handleBack() {
    setErrorMsg("");
    if (stage === "otp") setStage("search");
    else if (stage === "tracking" && !refParam) setStage("search");
    else router.push("/business/signup?type=company");
  }

  if (stage === "search") {
    return (
      <AuthLayout
        title="Track Your Application"
        description="Enter the reference on your request letter."
        onBack={handleBack}
        backLabel="Back to business options"
        width="compact"
      >
        <form onSubmit={handleFind} className="flex flex-col gap-6">
          <Field label="Reference" htmlFor="reference" error={errorMsg}>
            <Input
              id="reference"
              autoComplete="off"
              placeholder="ENR-2026-0000"
              className="tabular"
              value={reference}
              onChange={(e) => {
                setReference(e.target.value.toUpperCase());
                if (errorMsg) setErrorMsg("");
              }}
            />
          </Field>
          <Button type="submit" size="lg" disabled={!reference.trim()} className="h-10 w-full text-[14px]">
            Continue
          </Button>
        </form>
      </AuthLayout>
    );
  }

  if (stage === "otp" && application) {
    return (
      <AuthLayout
        title="Confirm Your Code"
        description={
          <>
            A 6-digit code has been sent to {maskMobile(application.applicant.mobile)}.
            <br />
            Please enter the code below.
          </>
        }
        onBack={handleBack}
        backLabel="Back to reference"
        width="compact"
      >
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
          <button
            type="button"
            disabled={countdown > 0}
            onClick={() => setCountdown(RESEND_SECONDS)}
            className="cursor-pointer self-center text-[13px] text-foreground underline underline-offset-4 transition-colors hover:text-foreground/80 disabled:cursor-default disabled:text-muted-foreground disabled:no-underline"
          >
            {countdown > 0 ? (
              <>
                Resend code in <span className="tabular">{countdown}s</span>
              </>
            ) : (
              "Resend code"
            )}
          </button>
        </form>
      </AuthLayout>
    );
  }

  if (!application) return null;

  const app = application;
  const company = lookupCorporateAccount(app.accounts[0]?.number ?? "");
  const reviewer = app.assignedTo;
  const openReturn = app.status === "returned" ? app.returns.find((r) => !r.resolved) ?? app.returns[0] : null;
  const needsLetter = app.status === "awaiting_letter" || app.status === "returned";

  return (
    <AuthLayout
      title={app.companyName}
      description={
        <>
          <span className="tabular">{app.reference}</span> · {statusLine(app)}
        </>
      }
      onBack={handleBack}
      backLabel={refParam ? "Back to business options" : "Back to reference"}
      width="compact"
    >
      <div className="flex flex-col gap-10">
        {/* The one thing to do now */}
        {openReturn && (
          <section className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} strokeWidth={1.8} className="shrink-0 text-warning-text" aria-hidden="true" />
              <h2 className="text-[14px] font-medium text-foreground">{openReturn.reason}</h2>
            </div>
            <p className="text-[13px] leading-relaxed text-muted-foreground">{openReturn.details}</p>
          </section>
        )}

        {needsLetter && (
          <section className="flex flex-col gap-4">
            {app.status === "awaiting_letter" && (
              <div className="flex flex-col gap-3">
                <h2 className="text-[14px] font-medium text-foreground">Upload Your Signed Letter</h2>
                {company && (
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-10 w-full text-[14px]"
                    onClick={() =>
                      openRequestLetter({ reference: app.reference, company, accounts: app.accounts, users: app.users })
                    }
                  >
                    <FileText size={16} strokeWidth={1.8} />
                    Open Letter to Print
                  </Button>
                )}
              </div>
            )}
            <LetterUpload
              id="status"
              label={app.status === "returned" ? "Corrected Letter" : "Signed Letter"}
              file={letter}
              onChange={setLetter}
            />
            <Button size="lg" loading={busy} disabled={!letter} onClick={handleSendLetter} className="h-10 w-full text-[14px]">
              Send Letter
            </Button>
            <p className="text-center text-[12px] text-muted-foreground">
              {`Or email it to ${reviewer.email ?? "your relationship manager"}, post it, or bring it to any branch.`}
            </p>
          </section>
        )}

        {app.status === "rejected" && (
          <section className="flex flex-col gap-2">
            <h2 className="text-[14px] font-medium text-foreground">Why It Was Declined</h2>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              {app.rejectionReason ?? "The bank couldn't approve this application."}
            </p>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              {`${reviewer.name} can tell you what to do next.`}
              {reviewer.phone && <span className="tabular"> {reviewer.phone}</span>}
            </p>
          </section>
        )}

        {app.status === "approved" && (
          <section className="flex flex-col gap-3">
            <h2 className="text-[14px] font-medium text-foreground">Users</h2>
            <ul className="flex flex-col gap-1">
              {app.users.map((u) => {
                const used = u.inviteStatus === "used";
                const expired = u.inviteStatus === "expired";
                return (
                  <li key={u.id} className="flex items-center justify-between gap-3 py-1">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] text-foreground">{u.name}</p>
                      <p className="truncate text-[12px] text-muted-foreground">
                        {u.role} · {used ? "Signed in" : expired ? "Link expired" : "Details sent"}
                      </p>
                    </div>
                    {!used && (
                      <div className="flex shrink-0 items-center gap-1">
                        {SHOW_DEMO_TOOLS && (
                          <Button
                            variant="ghost"
                            size="lg"
                            nativeButton={false}
                            render={<Link href="/business/activate" />}
                          >
                            Activate
                          </Button>
                        )}
                        <Button variant="outline" size="lg" onClick={() => handleResend(u.id, u.name)}>
                          Resend
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="text-[12px] text-muted-foreground">
              Each person gets their username by SMS and a link to set their password by email.
            </p>
          </section>
        )}

        {/* Where it is */}
        <section className="flex flex-col gap-3">
          <h2 className="text-[14px] font-medium text-foreground">Progress</h2>
          <ol className="flex flex-col">
            {app.timeline.map((item, i) => {
              const last = i === app.timeline.length - 1;
              return (
                <li key={`${item.status}-${i}`} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full ${
                        item.done
                          ? "bg-pill-success text-pill-success-text"
                          : item.current
                          ? "border-2 border-primary bg-background"
                          : "border border-border bg-background"
                      }`}
                      aria-hidden="true"
                    >
                      {item.done && <Check size={10} strokeWidth={3} />}
                    </span>
                    {!last && <span className="w-px flex-1 bg-border" aria-hidden="true" />}
                  </div>
                  <div className={`flex min-w-0 flex-1 flex-col gap-0.5 ${last ? "" : "pb-5"}`}>
                    <div className="flex items-baseline justify-between gap-3">
                      <p className={`text-[14px] ${item.done || item.current ? "text-foreground" : "text-muted-foreground"}`}>
                        {item.label}
                        <span className="sr-only">{item.done ? " (done)" : item.current ? " (now)" : " (to come)"}</span>
                      </p>
                      <span className="tabular shrink-0 text-[12px] text-muted-foreground">{item.timestamp}</span>
                    </div>
                    <p className="text-[12px] leading-relaxed text-muted-foreground">{item.description}</p>
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="text-[12px] text-muted-foreground">
            {reviewer.type === "rm" ? `${reviewer.name}, your relationship manager, is handling this.` : `Our ${reviewer.name} is handling this.`}
            {reviewer.email ? ` ${reviewer.email}` : ""}
          </p>
        </section>

        {app.status === "approved" && (
          <Button
            size="lg"
            className="h-10 w-full text-[14px]"
            onClick={() => router.push("/login?type=business")}
          >
            Go to Login
          </Button>
        )}
      </div>
    </AuthLayout>
  );
}

export default function CorporateStatusPage() {
  return (
    <Suspense fallback={null}>
      <StatusContent />
    </Suspense>
  );
}
