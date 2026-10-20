"use client";

/**
 * Admin Corporate Enrolment Detail & Decision Page — /admin/enrolments/[id]
 *
 * Modeled after src/app/admin/trade/[id]/page.tsx.
 *
 * Staff capabilities:
 *   - Summary of company, enrolled accounts, applicant, mandate, and users
 *   - Signed letter: uploaded online, or recorded by staff when it arrives by email, post or at a branch
 *   - Signature verification: Side-by-side comparison of the Flexcube specimen vs the signed letter
 *   - Security callback log: phone called, who answered, outcome
 *   - Approval action: Gated until all signatures match AND callback is verified
 *   - Return for clarification: Reuses ReturnForClarificationDialog
 *   - Reject: Reuses RejectionDialog
 *   - Reassign action: RM (Kwame Asante) <-> Corporate Banking Team (Operations)
 *   - Writes audit log entries to /admin/audit
 */

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRightLeft,
  Building2,
  Check,
  CheckCircle2,
  Eye,
  FileCheck2,
  Phone,
  PhoneCall,
  RotateCcw,
  ShieldCheck,
  Users,
  X,
  XCircle,
} from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ReturnForClarificationDialog from "@/components/approvals/ReturnForClarificationDialog";
import RejectionDialog from "@/components/approvals/RejectionDialog";
import { CHANNEL_LABEL, type LetterChannel } from "@/lib/corporate-enrolment";
import {
  approveEnrolment,
  getEnrolment,
  recordLetterReceived,
  reassignEnrolment,
  rejectEnrolment,
  returnEnrolment,
  updateEnrolment,
  type EnrolmentApplication,
  type SignatureCheckItem,
  type VerificationCallLog,
} from "@/lib/enrolment-store";
import { formatMoney } from "@/lib/mock-data";

export default function AdminEnrolmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const normalizedId = id.toUpperCase();

  const [application, setApplication] = useState<EnrolmentApplication | null>(null);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");

  // Callback form state
  const [callNumber, setCallNumber] = useState("");
  const [callAnsweredBy, setCallAnsweredBy] = useState("");
  const [callOutcome, setCallOutcome] = useState<"verified" | "unreachable" | "failed">("verified");
  const [callNotes, setCallNotes] = useState("");
  const [callLogged, setCallLogged] = useState(false);
  const [letterVia, setLetterVia] = useState<Exclude<LetterChannel, "upload">>("email");

  // Load application
  useEffect(() => {
    const loaded = getEnrolment(normalizedId);
    if (loaded) {
      setApplication(loaded);
      setCallNumber(loaded.applicant.mobile);
      setCallAnsweredBy(loaded.applicant.name);
      setCallLogged(loaded.verificationCall.logged);
      if (loaded.verificationCall.callNotes) {
        setCallNotes(loaded.verificationCall.callNotes);
      }
      if (loaded.verificationCall.outcome) {
        setCallOutcome(loaded.verificationCall.outcome);
      }
    }
  }, [normalizedId]);

  if (!application) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader
          title="Enrolment Not Found"
          description={`No application record found for reference ${normalizedId}.`}
          backTo={{ href: "/admin/enrolments", label: "Enrolments queue" }}
        />
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <p className="text-[13px] text-muted-foreground">
            Please return to the work queue to select an active application.
          </p>
          <Button nativeButton={false} render={<Link href="/admin/enrolments" />} className="mt-3">
            Back to Enrolments Queue
          </Button>
        </div>
      </div>
    );
  }

  // Signature check helpers
  function handleSignatureDecision(idx: number, status: "match" | "no_match") {
    if (!application) return;
    const updatedChecks: SignatureCheckItem[] = [...application.signatureChecks];
    updatedChecks[idx] = {
      ...updatedChecks[idx],
      status,
    };
    const updated = updateEnrolment(application.reference, {
      signatureChecks: updatedChecks,
    });
    if (updated) setApplication(updated);
  }

  // Handle logging verification call
  function handleLogCall() {
    if (!application || !callNumber.trim() || !callAnsweredBy.trim()) return;
    const callLog: VerificationCallLog = {
      logged: true,
      calledNumber: callNumber.trim(),
      answeredBy: callAnsweredBy.trim(),
      outcome: callOutcome,
      callNotes: callNotes.trim(),
      calledAt: new Date().toISOString(),
      loggedBy: application.assignedTo.name,
    };

    const updated = updateEnrolment(application.reference, {
      verificationCall: callLog,
      status:
        callOutcome === "verified" && allSignaturesMatch
          ? "approved"
          : application.status,
    });
    if (updated) {
      setApplication(updated);
      setCallLogged(true);
      setFeedbackMsg("Verification call logged successfully.");
      setTimeout(() => setFeedbackMsg(""), 3500);
    }
  }

  // A signed letter that reached the bank outside the app
  function handleRecordLetter() {
    if (!application) return;
    const updated = recordLetterReceived(
      application.reference,
      letterVia,
      application.assignedTo.name,
      application.assignedTo.type === "rm" ? "Relationship Manager" : "Corporate Operations User",
    );
    if (updated) {
      setApplication(updated);
      setFeedbackMsg(`Signed letter recorded as received by ${letterVia}.`);
      setTimeout(() => setFeedbackMsg(""), 3500);
    }
  }

  // Handle staff approval
  function handleApprove() {
    if (!application) return;
    const approved = approveEnrolment(
      application.reference,
      application.assignedTo.name,
      application.assignedTo.type === "rm" ? "Relationship Manager" : "Corporate Operations User",
    );
    if (approved) {
      setApplication(approved);
      setFeedbackMsg("Application approved! User setup invite links have been generated.");
    }
  }

  // Handle staff return
  function handleReturnConfirm(payload: { note: string; documents: string[] }) {
    if (!application) return;
    const returned = returnEnrolment(
      application.reference,
      payload.note,
      payload.note,
      payload.documents,
      application.assignedTo.name,
      application.assignedTo.type === "rm" ? "Relationship Manager" : "Corporate Operations User",
    );
    if (returned) {
      setApplication(returned);
      setReturnDialogOpen(false);
      setFeedbackMsg("Application returned to applicant for clarification.");
    }
  }

  // Handle staff rejection
  function handleRejectConfirm(reason: string) {
    if (!application) return;
    const rejected = rejectEnrolment(
      application.reference,
      reason,
      application.assignedTo.name,
      application.assignedTo.type === "rm" ? "Relationship Manager" : "Corporate Operations User",
    );
    if (rejected) {
      setApplication(rejected);
      setRejectionDialogOpen(false);
      setFeedbackMsg("Application declined.");
    }
  }

  // Handle reassigning between RM and Corporate Banking Team
  function handleReassign() {
    if (!application) return;
    const newAssignment =
      application.assignedTo.type === "rm"
        ? {
            type: "operations" as const,
            name: "Corporate Banking Team",
            email: "corporate.onboarding@gcb.com.gh",
            phone: "+233 30 268 1521",
          }
        : {
            type: "rm" as const,
            name: "Kwame Asante",
            email: "kwame.asante@gcb.com.gh",
            phone: "+233 24 499 1821",
          };

    const updated = reassignEnrolment(application.reference, newAssignment);
    if (updated) {
      setApplication(updated);
      setFeedbackMsg(`Application reassigned to ${newAssignment.name}.`);
      setTimeout(() => setFeedbackMsg(""), 3500);
    }
  }

  // Verification readiness checks
  const totalSignatures = application.signatureChecks.length;
  const matchedSignatures = application.signatureChecks.filter((s) => s.status === "match").length;
  const allSignaturesMatch = totalSignatures > 0 && matchedSignatures === totalSignatures;
  const isCallVerified = application.verificationCall.logged && application.verificationCall.outcome === "verified";
  const letterIn = application.status !== "awaiting_letter";
  const canApprove = letterIn && allSignaturesMatch && isCallVerified && application.status !== "approved";

  const approvalBlockReason =
    application.status === "approved"
      ? "This application has already been approved."
      : !letterIn
      ? "Waiting for the signed letter. Record it here when it arrives by email, post or at a branch."
      : !allSignaturesMatch && !isCallVerified
      ? `Requires all signatures verified as Match (${matchedSignatures}/${totalSignatures}) and security callback logged as Verified.`
      : !allSignaturesMatch
      ? `Requires all signatures verified as Match (${matchedSignatures}/${totalSignatures} matched).`
      : !isCallVerified
      ? "Requires security callback to be logged with outcome 'Verified'."
      : "";

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={application.companyName}
        description={`${application.reference} · ${CHANNEL_LABEL[application.channel]} · Mandate: ${application.mandate}`}
        backTo={{ href: "/admin/enrolments", label: "Enrolments queue" }}
      />

      {feedbackMsg && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-[13px] text-emerald-800 dark:text-emerald-300 animate-in fade-in">
          <Check size={16} strokeWidth={2.5} />
          {feedbackMsg}
        </div>
      )}

      {/* Assist / Review Notice banner */}
      <div className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-muted/30 p-3.5">
        <div className="flex items-start gap-2.5">
          <Eye size={17} strokeWidth={1.8} className="mt-0.5 text-muted-foreground shrink-0" />
          <div className="text-[13px] leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">Staff Review Mode: </span>
            Verify wet signatures against cards on file and complete the security callback verification before issuing corporate access.
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[12px] text-muted-foreground">Assigned:</span>
          <Badge variant={application.assignedTo.type === "rm" ? "default" : "outline"}>
            {application.assignedTo.name}
          </Badge>
          <Button variant="ghost" size="xs" onClick={handleReassign} className="text-[11.5px] h-7">
            <ArrowRightLeft size={12} className="mr-1" />
            Reassign
          </Button>
        </div>
      </div>

      {/* Grid: 2 columns for Application Details & Users */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Card 1: Company & Accounts */}
        <section className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Building2 size={17} className="text-muted-foreground" />
              <h2 className="text-[15px] font-medium text-foreground">Company & Accounts</h2>
            </div>
            <Badge variant="outline">{application.mandate}</Badge>
          </div>

          <dl className="grid grid-cols-1 gap-y-2.5 text-[13px]">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Registered Name</dt>
              <dd className="font-medium text-foreground">{application.companyName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">TIN</dt>
              <dd className="font-medium text-foreground tabular">{application.companyTin}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Applicant</dt>
              <dd className="font-medium text-foreground">
                {application.applicant.name} ({application.applicant.mobile})
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Signing Rule</dt>
              <dd className="text-right text-foreground max-w-[260px] leading-snug">
                {application.approvalRule}
              </dd>
            </div>
          </dl>

          <div className="pt-2 border-t border-border/50">
            <p className="text-[12px] font-medium text-muted-foreground mb-2">
              Enrolled Accounts ({application.accounts.length})
            </p>
            <div className="flex flex-col gap-1.5 text-[12.5px]">
              {application.accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="flex items-center justify-between rounded-xl bg-muted/20 px-3 py-2 border border-border/40"
                >
                  <div>
                    <p className="font-medium text-foreground">{acc.name}</p>
                    <p className="text-[11.5px] text-muted-foreground tabular">
                      {acc.type} · {acc.number}
                    </p>
                  </div>
                  {acc.balance !== undefined && (
                    <span className="font-medium text-foreground tabular">
                      {formatMoney(acc.balance, acc.currency)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Card 2: Designated Users & Roles */}
        <section className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Users size={17} className="text-muted-foreground" />
              <h2 className="text-[15px] font-medium text-foreground">
                Designated Users ({application.users.length})
              </h2>
            </div>
            <span className="text-[11.5px] text-muted-foreground">
              Will receive activation links
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {application.users.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[13px] font-medium text-foreground">{u.name}</p>
                    {u.isFromMandate && (
                      <span className="rounded-md bg-primary/15 px-1.5 py-0.2 text-[10px] font-medium text-foreground">
                        Mandate Signatory
                      </span>
                    )}
                  </div>
                  <p className="text-[11.5px] text-muted-foreground truncate">
                    {u.email} · {u.mobile}
                  </p>
                </div>

                <Badge variant="outline" className="shrink-0 text-[11.5px]">
                  {u.role}
                </Badge>
              </div>
            ))}
          </div>

          {letterIn ? (
            <div className="mt-auto pt-2 border-t border-border/50 flex items-center justify-between text-[12px] text-muted-foreground">
              <span>Signed letter</span>
              <span className="flex items-center gap-1 font-medium text-foreground truncate max-w-[240px]">
                <FileCheck2 size={13} className="text-primary shrink-0" />
                {application.pack.uploadedFileName ??
                  `Received by ${CHANNEL_LABEL[application.pack.receivedVia ?? "branch"].toLowerCase()}`}
              </span>
            </div>
          ) : (
            <div className="mt-auto flex flex-col gap-2 pt-2 border-t border-border/50">
              <p className="text-[12px] text-muted-foreground">
                Signed letter not received yet. Record it when it arrives.
              </p>
              <div className="flex items-center gap-2">
                <Select
                  value={letterVia}
                  onValueChange={(v) => v && setLetterVia(v as Exclude<LetterChannel, "upload">)}
                >
                  <SelectTrigger aria-label="How the letter arrived" className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="post">Post</SelectItem>
                    <SelectItem value="branch">Branch</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={handleRecordLetter}>
                  Record Letter Received
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Signature Verification Comparison Matrix */}
      <section className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-primary" />
            <div>
              <h2 className="text-[15px] font-medium text-foreground">
                Wet-Ink Signature Verification ({matchedSignatures}/{totalSignatures} Matched)
              </h2>
              <p className="text-[12px] text-muted-foreground">
                Compare the signatures on the letter with the specimen signatures in Flexcube.
              </p>
            </div>
          </div>
          {allSignaturesMatch ? (
            <Badge variant="success" className="gap-1">
              <Check size={12} strokeWidth={2.5} /> All Signatures Matched
            </Badge>
          ) : (
            <Badge variant="warning">Verification Incomplete</Badge>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {application.signatureChecks.map((check, idx) => (
            <div
              key={check.signatoryName}
              className={`rounded-2xl border p-4 transition-all ${
                check.status === "match"
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : check.status === "no_match"
                  ? "border-destructive/40 bg-destructive/5"
                  : "border-border bg-card"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                <div>
                  <p className="text-[14px] font-medium text-foreground">
                    {check.signatoryName}
                  </p>
                  <p className="text-[11.5px] text-muted-foreground">{check.role}</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-muted-foreground mr-1">Status:</span>
                  <Button
                    type="button"
                    variant={check.status === "match" ? "default" : "outline"}
                    size="xs"
                    disabled={!letterIn}
                    onClick={() => handleSignatureDecision(idx, "match")}
                    className={`h-7 text-[12px] ${check.status === "match" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
                  >
                    <Check size={12} strokeWidth={2.5} className="mr-1" />
                    Match
                  </Button>
                  <Button
                    type="button"
                    variant={check.status === "no_match" ? "destructive" : "outline"}
                    size="xs"
                    disabled={!letterIn}
                    onClick={() => handleSignatureDecision(idx, "no_match")}
                    className="h-7 text-[12px]"
                  >
                    <X size={12} strokeWidth={2.5} className="mr-1" />
                    No match
                  </Button>
                </div>
              </div>

              {/* Side by side comparison previews */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                {/* Column 1: Card on File */}
                <div className="flex flex-col gap-1.5 rounded-xl border border-border/80 bg-background/50 p-3">
                  <div className="flex items-center justify-between text-[11.5px] text-muted-foreground">
                    <span>Registered Specimen Card</span>
                    <span className="tabular font-medium text-foreground">High St. Branch</span>
                  </div>
                  <div className="h-20 w-full rounded-lg border border-dashed border-border flex items-center justify-center bg-card p-2">
                    <svg viewBox="0 0 200 60" className="h-full w-auto text-primary stroke-current fill-none stroke-[2] stroke-linecap-round stroke-linejoin-round opacity-80">
                      <path d="M 10 40 Q 30 10 50 35 T 90 25 T 130 40 T 170 15 T 190 30" />
                    </svg>
                  </div>
                  <p className="text-[10.5px] text-muted-foreground">
                    Card ID: SIG-GCB-{check.signatoryName.slice(0, 3).toUpperCase()}-2021
                  </p>
                </div>

                {/* Column 2: Uploaded Document */}
                <div className="flex flex-col gap-1.5 rounded-xl border border-border/80 bg-background/50 p-3">
                  <div className="flex items-center justify-between text-[11.5px] text-muted-foreground">
                    <span>Uploaded Request Pack</span>
                    <span className="tabular font-medium text-foreground">Page 2 Box {idx + 1}</span>
                  </div>
                  <div className="h-20 w-full rounded-lg border border-border flex items-center justify-center bg-card p-2">
                    <svg viewBox="0 0 200 60" className="h-full w-auto text-foreground stroke-current fill-none stroke-[2.2] stroke-linecap-round stroke-linejoin-round">
                      <path d={check.status === "no_match" ? "M 15 20 Q 40 50 80 20 T 140 45" : "M 12 38 Q 32 12 52 34 T 92 24 T 132 39 T 168 17 T 188 31"} />
                    </svg>
                  </div>
                  <p className="text-[10.5px] text-muted-foreground">
                    Scanned 300 DPI · Wet-ink confirmed
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Security Callback Log Card */}
      <section className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <PhoneCall size={18} className="text-primary" />
            <div>
              <h2 className="text-[15px] font-medium text-foreground">
                Security Callback Verification
              </h2>
              <p className="text-[12px] text-muted-foreground">
                Required security call to verify request legitimacy and confirm appointed corporate users.
              </p>
            </div>
          </div>
          {isCallVerified ? (
            <Badge variant="success" className="gap-1">
              <Check size={12} strokeWidth={2.5} /> Callback Verified
            </Badge>
          ) : (
            <Badge variant="outline">Pending Call</Badge>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Phone Number Called" htmlFor="callNumber">
            <Input
              id="callNumber"
              value={callNumber}
              onChange={(e) => setCallNumber(e.target.value)}
              className="tabular"
              placeholder="0244123456"
            />
          </Field>

          <Field label="Who Answered" htmlFor="callAnsweredBy">
            <Input
              id="callAnsweredBy"
              value={callAnsweredBy}
              onChange={(e) => setCallAnsweredBy(e.target.value)}
              placeholder="Ransford Gyasi (Director)"
            />
          </Field>

          <Field label="Call Outcome" htmlFor="callOutcome">
            <Select
              value={callOutcome}
              onValueChange={(v) => v && setCallOutcome(v as "verified" | "unreachable" | "failed")}
            >
              <SelectTrigger id="callOutcome">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="verified">Verified (Confirmed)</SelectItem>
                <SelectItem value="unreachable">Unreachable (Left message)</SelectItem>
                <SelectItem value="failed">Failed / Disputed</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field label="Verification Call Notes" htmlFor="callNotes" optional>
          <Input
            id="callNotes"
            value={callNotes}
            onChange={(e) => setCallNotes(e.target.value)}
            placeholder="e.g. Confirmed authorization of 3 corporate users and signatory mandate."
          />
        </Field>

        <div className="flex justify-end pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleLogCall}
            className="text-[13px] h-8"
          >
            <Phone size={13} className="mr-1.5" />
            {callLogged ? "Update call log" : "Log verification call"}
          </Button>
        </div>
      </section>

      {/* Decision Action Bar */}
      <section className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3">
        <h2 className="text-[14px] font-medium text-foreground">Application Decisions</h2>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="default"
              disabled={!canApprove}
              onClick={handleApprove}
              className="h-10 text-[13.5px] px-5"
            >
              <CheckCircle2 size={16} className="mr-1.5" />
              Approve & Issue User Links
            </Button>

            <Button
              variant="outline"
              onClick={() => setReturnDialogOpen(true)}
              className="h-10 text-[13.5px]"
            >
              <RotateCcw size={15} className="mr-1.5 text-warning-text" />
              Return for Clarification
            </Button>

            <Button
              variant="destructive"
              onClick={() => setRejectionDialogOpen(true)}
              className="h-10 text-[13.5px]"
            >
              <XCircle size={15} className="mr-1.5" />
              Reject Application
            </Button>
          </div>

          <div className="text-[12px] text-muted-foreground">
            Current Status: <span className="font-medium text-foreground capitalize">{application.status.replace("_", " ")}</span>
          </div>
        </div>

        {approvalBlockReason && (
          <p className="text-[12px] text-muted-foreground bg-muted/30 rounded-lg p-2.5">
            {approvalBlockReason}
          </p>
        )}
      </section>

      {/* Return for Clarification Dialog */}
      <ReturnForClarificationDialog
        open={returnDialogOpen}
        onOpenChange={setReturnDialogOpen}
        onConfirm={handleReturnConfirm}
        reference={application.reference}
        subheading={`This keeps ${application.reference} alive. The applicant can re-upload corrected signatures directly in their status tracker.`}
        items={[
          { id: "sig-page-2", name: "Signatures on Page 2 (Indemnity box)" },
          { id: "sig-specimen-mismatch", name: "Signatory signature mismatch against registered card" },
          { id: "missing-company-stamp", name: "Company seal / physical official stamp missing" },
          { id: "mandate-resolution", name: "Board resolution extract missing" },
        ]}
        itemLabel="Flag Specific Items to Fix"
      />

      {/* Rejection Dialog */}
      <RejectionDialog
        open={rejectionDialogOpen}
        onOpenChange={setRejectionDialogOpen}
        onConfirm={handleRejectConfirm}
        reference={application.reference}
      />
    </div>
  );
}
