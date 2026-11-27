"use client";

/**
 * A business that banks with GCB asks for internet banking online: /business/signup/enrol?type=company|sole.
 *
 * The bank's paper form (GCB/IBCAF/2014/038) rethought, not copied (designer, 2026-11-26; prototype in
 * prototype/corporate-form-prototype.html), in five steps: your details, the company's details, the account numbers,
 * the authorised users and what each may do, then the letter. The letter is written from the answers; the signatories
 * sign it, each user signs beside their name, and it comes back as an upload. Nothing is looked up online: staff match
 * the account numbers in Flexcube and check the letter against the answers.
 *
 * The request is saved when the letter step opens, because signatures take days. The emailed link
 * (`?upload=<reference>`) opens the upload screen. Model: `lib/corporate-enrolment.ts`.
 *
 * On a wide screen the steps run down the left with the form beside them (`EnrolmentDesktopShell`, layout 2 of the
 * desktop explorations, chosen 2026-11-26); phones and narrow windows keep the onboarding card. Each step's content and
 * button are built once below and placed in either frame. The copy is formal (designer, 2026-11-26).
 */

import { Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Check, CheckCircle2, Download, Eye, Paperclip, Plus, X } from "@/components/ui/icons";
import AuthLayout from "@/components/auth/AuthLayout";
import EnrolmentDesktopShell, { type ShellStep } from "@/components/corporate/onboarding/EnrolmentDesktopShell";
import { toAttachedFile, type AttachedFile } from "@/components/corporate/onboarding/LetterUpload";
import RequestPeople from "@/components/corporate/onboarding/RequestPeople";
import TermsDialog from "@/components/corporate/onboarding/TermsDialog";
import {
  downloadRequestLetter,
  letterDataFrom,
  requestLetterHtml,
  type RequestLetterData,
} from "@/components/corporate/onboarding/request-letter";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  accountNumberProblem,
  businessRecord,
  cleanAccountNumber,
  CORPORATE_BANKING_TEAM,
  ENROLMENT_DEMO,
  ENROLMENT_PROGRESS_STEPS,
  findCorporateEnrolmentScenario,
  newEnrolmentReference,
  roleActs,
  typedAccount,
  usersReady,
  type BusinessKind,
  type CompanyApplicant,
  type CorporateEnrolmentStep,
  type CorporateUserDraft,
  type EnrolmentApplication,
} from "@/lib/corporate-enrolment";
import { getEnrolment, submitEnrolment, uploadEnrolmentLetter } from "@/lib/enrolment-store";
import { isCompleteGhanaMobile } from "@/lib/phone";
import { useWideScreen } from "@/lib/use-wide-screen";

const DEMO_REFERENCE = "ENR-2026-0814";

type Step = CorporateEnrolmentStep;

const EMPTY_BUSINESS = { name: "", nature: "", email: "", phone: "", location: "" };

const noopSubscribe = () => () => {};

/** A dropped file skips the picker's filter, so its type is checked here: PDF or Word only, no images. */
const isLetterFile = (file: File) => /\.(pdf|docx?)$/i.test(file.name);

const LETTER_TYPES =
  ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function CorporateEnrolmentFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scenarioParam = searchParams.get("scenario");
  const uploadParam = searchParams.get("upload");
  const [kind, setKind] = useState<BusinessKind>(searchParams.get("type") === "sole" ? "sole" : "company");
  const sole = kind === "sole";

  const [step, setStep] = useState<Step>(uploadParam ? "upload" : "details");
  const [busy, setBusy] = useState(false);

  const [requesterName, setRequesterName] = useState("");
  const [requesterMobile, setRequesterMobile] = useState("");
  const [requesterEmail, setRequesterEmail] = useState("");
  const [business, setBusiness] = useState(EMPTY_BUSINESS);

  const [accountInputs, setAccountInputs] = useState<string[]>([""]);
  const [touched, setTouched] = useState<number[]>([]);
  const [users, setUsers] = useState<CorporateUserDraft[]>([]);

  const [reference, setReference] = useState(uploadParam ?? "");
  /** The saved request, on the upload screen. Undefined while loading, null when the link matches nothing. */
  const [savedRequest, setSavedRequest] = useState<EnrolmentApplication | null | undefined>(undefined);
  const [letter, setLetter] = useState<AttachedFile | null>(null);
  const [agreed, setAgreed] = useState(false);
  /** The letter's contents when it was last downloaded, so a later change to the answers asks for a new one. */
  const [downloadedAs, setDownloadedAs] = useState<string | null>(null);
  const [termsOpen, setTermsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  /** True while a file is dragged over the upload row. */
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const requester: CompanyApplicant = {
    name: requesterName.trim(),
    mobile: requesterMobile,
    email: requesterEmail.trim(),
    isSignatory: false,
  };
  const requesterMobileError =
    requesterMobile && !isCompleteGhanaMobile(requesterMobile) ? "Please enter a complete Ghana mobile number." : "";
  const businessPhoneError =
    business.phone && !isCompleteGhanaMobile(business.phone) ? "Please enter a complete telephone number." : "";
  const detailsReady = requester.name !== "" && requester.email.includes("@") && isCompleteGhanaMobile(requesterMobile);
  const businessReady =
    business.name.trim() !== "" &&
    business.nature.trim() !== "" &&
    business.location.trim() !== "" &&
    business.email.includes("@") &&
    isCompleteGhanaMobile(business.phone);

  /* Accounts: typed numbers, checked for shape only. */
  const accountErrors = accountInputs.map((raw, i) => {
    const problem = accountNumberProblem(raw);
    const clean = cleanAccountNumber(raw);
    if (problem && (touched.includes(i) || clean.length > 16 || /\D/.test(clean))) return problem;
    if (!problem && clean && accountInputs.findIndex((x) => cleanAccountNumber(x) === clean) !== i) {
      return "This account has already been added.";
    }
    return "";
  });
  const filledAccounts = accountInputs.filter((a) => cleanAccountNumber(a));
  const accountsLack =
    filledAccounts.length === 0
      ? "Enter an Account Number"
      : filledAccounts.some((a) => accountNumberProblem(a))
        ? "Correct the Account Numbers"
        : new Set(filledAccounts.map(cleanAccountNumber)).size !== filledAccounts.length
          ? "Remove the Duplicate Account"
          : "";
  const accounts = useMemo(
    () => [...new Set(accountInputs.map(cleanAccountNumber).filter((a) => a && !accountNumberProblem(a)))].map(typedAccount),
    [accountInputs],
  );

  const peopleLack = usersReady(users, kind);

  /* The letter, from the answers here or from the saved request on the upload screen. */
  const letterData: RequestLetterData | null =
    step === "upload"
      ? savedRequest
        ? letterDataFrom(savedRequest)
        : null
      : { reference, business: { kind, ...business }, applicant: requester, accounts, users };
  const letterKey = letterData ? JSON.stringify(letterData) : "";
  const downloaded = step === "upload" || (downloadedAs !== null && downloadedAs === letterKey);
  const outOfDate = step === "letter" && downloadedAs !== null && downloadedAs !== letterKey;

  /* The steps down the left on a wide screen, the card otherwise. */
  const wide = useWideScreen();
  // True once in the browser. Until then the width is unknown, so nothing is drawn rather than a card that turns into
  // the wide layout a moment later (designer, 2026-11-26: the card "collapsed" on the way in).
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const progress = ENROLMENT_PROGRESS_STEPS.indexOf(step);
  // The furthest step opened; on a wide screen any step before it can be reopened from the list.
  const [reached, setReached] = useState(0);
  if (progress > reached) setReached(progress);

  // `?scenario=` opens the flow on a given screen (the Demo hub links with it), with the screens before it filled in.
  const appliedScenario = useRef<string | null>(null);
  useEffect(() => {
    if (!scenarioParam || appliedScenario.current === scenarioParam) return;
    appliedScenario.current = scenarioParam;
    const scenario = findCorporateEnrolmentScenario(scenarioParam);
    if (!scenario) return;
    const k = scenario.kind ?? "company";
    setKind(k);
    const order: Step[] = ["details", "business", "accounts", "people", "letter", "submitted"];
    const at = scenario.step === "upload" ? order.length : order.indexOf(scenario.step);
    if (at > 0) {
      setRequesterName(ENROLMENT_DEMO.requester.name);
      setRequesterMobile(ENROLMENT_DEMO.requester.mobile);
      setRequesterEmail(ENROLMENT_DEMO.requester.email);
    }
    if (at > 1) setBusiness(ENROLMENT_DEMO.business);
    if (at > 2) setAccountInputs(ENROLMENT_DEMO.accounts);
    if (at > 3) {
      setUsers(ENROLMENT_DEMO.users);
      setReference(DEMO_REFERENCE);
    }
    if (at >= 4) {
      // The letter step saves the request, so the demo does too; the upload screen opens on that saved request.
      const saved = submitEnrolment({
        reference: DEMO_REFERENCE,
        company: businessRecord({ kind: k, ...ENROLMENT_DEMO.business }),
        accounts: ENROLMENT_DEMO.accounts.map(typedAccount),
        applicant: { ...ENROLMENT_DEMO.requester, isSignatory: false },
        users: ENROLMENT_DEMO.users,
        businessKind: k,
        natureOfBusiness: ENROLMENT_DEMO.business.nature,
      });
      setSavedRequest(saved);
    }
    setStep(scenario.step);
  }, [scenarioParam]);

  // The emailed link: find the saved request once the store (local storage) can be read.
  useEffect(() => {
    if (uploadParam) setSavedRequest(getEnrolment(uploadParam) ?? null);
  }, [uploadParam]);

  /** Users keep only accounts still on the request; viewers see all of them. */
  function syncedUsers(): CorporateUserDraft[] {
    const ids = accounts.map((a) => a.id);
    return users.map((u) => ({ ...u, accountIds: roleActs(u.role) ? u.accountIds.filter((id) => ids.includes(id)) : ids }));
  }

  /** Opens one of the five steps, as long as every step before it is complete. */
  function goToStep(i: number) {
    const ready = [detailsReady, businessReady, !accountsLack, !peopleLack];
    if (ready.slice(0, i).some((r) => !r)) return;
    if (i >= 3) {
      const next = syncedUsers();
      setUsers(next);
      if (i === 4) return goToLetter(next);
    }
    setStep(ENROLMENT_PROGRESS_STEPS[i]);
  }

  function goToLetter(list: CorporateUserDraft[] = users) {
    if (usersReady(list, kind)) return;
    const ref = reference || newEnrolmentReference();
    setReference(ref);
    // Saved now, so the requester can come back with the signed letter from the emailed link.
    setSavedRequest(
      submitEnrolment({
        reference: ref,
        company: businessRecord({ kind, ...business }),
        accounts,
        applicant: requester,
        users: list,
        businessKind: kind,
        natureOfBusiness: business.nature.trim(),
      }),
    );
    setStep("letter");
  }

  function takeLetter(file: File) {
    if (!isLetterFile(file)) {
      toast.error("Please upload the signed letter as a PDF or Word document.");
      return;
    }
    if (letter?.url) URL.revokeObjectURL(letter.url);
    setLetter(toAttachedFile(file));
  }

  function handleSubmit() {
    if (!letter || !agreed || !downloaded) return;
    setBusy(true);
    window.setTimeout(() => {
      uploadEnrolmentLetter(reference, { fileName: letter.name, fileSize: letter.size });
      setBusy(false);
      setStep("submitted");
    }, 700);
  }

  /* ── Submitted ───────────────────────────────────────────────────────────── */

  if (step === "submitted") {
    // There is no tracking page (designer, 2026-11-25): email is how they hear, so both addresses are shown.
    const updatesTo = [
      savedRequest?.applicant.email ?? requester.email,
      savedRequest?.companyEmail ?? business.email,
    ].filter((e, i, all) => e && all.indexOf(e) === i);
    return (
      <AuthLayout
        title="Request Submitted"
        description="We will verify your letter against our records and contact you."
        icon={CheckCircle2}
        align="center"
        width="compact"
      >
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-1">
            <span className="text-caption text-muted-foreground">Reference</span>
            <span className="tabular text-h1 tracking-[var(--ls-heading)] text-foreground">{reference}</span>
          </div>
          <div className="flex flex-col items-center gap-1 text-center">
            <span className="text-caption text-muted-foreground">Updates will be sent to</span>
            {updatesTo.map((email) => (
              <span key={email} className="break-all text-body text-foreground">
                {email}
              </span>
            ))}
          </div>
          <p className="text-center text-caption text-muted-foreground">
            Once approved, each user will receive login details by email and SMS.
          </p>
          <Button size="md" className="w-full" onClick={() => router.push("/login?type=business")}>
            Return to Login
          </Button>
        </div>
      </AuthLayout>
    );
  }

  /* ── The emailed link, when it can't be used ─────────────────────────────── */

  if (step === "upload" && savedRequest !== undefined && (!savedRequest || savedRequest.status !== "awaiting_letter")) {
    return (
      <AuthLayout
        title={savedRequest ? "Letter Already Received" : "Request Not Found"}
        description={
          savedRequest
            ? "We will email you once it has been verified."
            : `Please check the link in your email, or call us on ${CORPORATE_BANKING_TEAM.phone}.`
        }
        align="center"
        width="compact"
      >
        <Button size="md" className="w-full" onClick={() => router.push("/login?type=business")}>
          Return to Login
        </Button>
      </AuthLayout>
    );
  }

  /* ── The steps ───────────────────────────────────────────────────────────── */

  if (!mounted) return null;

  // Leaving the form drops everything typed (nothing is saved before the letter step), so Back says so first, unless
  // nothing has been entered yet (designer, 2026-11-26).
  const entered = Boolean(
    requesterName || requesterMobile || requesterEmail || Object.values(business).some(Boolean) ||
      accountInputs.some(Boolean) || users.length,
  );
  const leave = () => router.push("/business/signup?step=type");
  // Every step asks first, the letter step too (designer, 2026-11-26): the request is saved there, but leaving still
  // clears the answers on screen.
  const askToLeave = () => (entered ? setLeaveOpen(true) : leave());
  const leaveDialog = (
    <Modal
      open={leaveOpen}
      onOpenChange={setLeaveOpen}
      title="Leave This Request?"
      size="sm"
      footer={
        <>
          <Button variant="outline" size="md" onClick={() => setLeaveOpen(false)}>
            Stay on This Page
          </Button>
          <Button variant="destructive" size="md" onClick={leave}>
            Leave and Discard
          </Button>
        </>
      }
    >
      <p className="text-body text-muted-foreground">
        {step === "letter"
          ? `Your request has been saved, and the link to upload the signed letter has been sent to ${requester.email}. If you go back now, you will need to start again to change your answers.`
          : "If you go back now, the information you have entered will be lost and you will need to start again."}
      </p>
    </Modal>
  );

  const HEAD: Record<Exclude<Step, "submitted">, { title: string; nav: string; description: string }> = {
    details: {
      title: "Your Details",
      nav: "Your details",
      description: "Anyone at the business may submit this request. Updates will be sent to you.",
    },
    business: {
      title: sole ? "Business Details" : "Company Details",
      nav: sole ? "Business details" : "Company details",
      description: sole
        ? "Please provide the business's registered details."
        : "Please provide the company's registered details.",
    },
    accounts: {
      title: "Accounts",
      nav: "Accounts",
      description: "Please list the accounts to be enabled for internet banking.",
    },
    people: {
      title: "Authorised Users",
      nav: "Authorised users",
      description: "Please add each person who will use internet banking. Inputters and authorisers may also view.",
    },
    letter: {
      title: "Letter of Request",
      nav: "Letter of request",
      description: "Your letter has been prepared from the information provided.",
    },
    upload: {
      title: "Upload the Signed Letter",
      nav: "",
      description: savedRequest ? `${savedRequest.companyName} · ${reference}` : reference,
    },
  };
  const BACK: Partial<Record<Step, () => void>> = {
    details: askToLeave,
    business: () => setStep("details"),
    accounts: () => setStep("business"),
    people: () => setStep("accounts"),
    letter: () => setStep("people"),
  };
  const desktop = wide && progress >= 0;
  // Under the card's narrow column the button is full width; beside Back on a wide screen it sizes to its label.
  const actionWidth = desktop ? "min-w-40" : "w-full";

  /* 1. Who is making the request. */
  const detailsContent = (
    <form
      id="enrol-step"
      onSubmit={(e) => {
        e.preventDefault();
        goToStep(1);
      }}
      className="flex flex-col gap-4"
    >
      <Field label="Full Name" htmlFor="requesterName">
        <Input
          id="requesterName"
          autoComplete="name"
          value={requesterName}
          onChange={(e) => setRequesterName(e.target.value)}
          autoFocus
        />
      </Field>
      <Field label="Mobile Number" htmlFor="requesterMobile" error={requesterMobileError}>
        <PhoneInput id="requesterMobile" value={requesterMobile} onValueChange={setRequesterMobile} />
      </Field>
      <Field label="Email Address" htmlFor="requesterEmail">
        <Input
          id="requesterEmail"
          type="email"
          autoComplete="email"
          placeholder="name@company.com"
          value={requesterEmail}
          onChange={(e) => setRequesterEmail(e.target.value)}
        />
      </Field>
    </form>
  );

  /* 2. The company, as typed. Nothing is looked up. */
  const businessContent = (
    <form
      id="enrol-step"
      onSubmit={(e) => {
        e.preventDefault();
        goToStep(2);
      }}
      className="flex flex-col gap-4"
    >
      <Field label="Registered Name" htmlFor="businessName">
        <Input
          id="businessName"
          autoComplete="organization"
          value={business.name}
          onChange={(e) => setBusiness({ ...business, name: e.target.value })}
          autoFocus
        />
      </Field>
      <Field label="Nature of Business" htmlFor="businessNature">
        <Input
          id="businessNature"
          placeholder="For example, textile manufacturing"
          value={business.nature}
          onChange={(e) => setBusiness({ ...business, nature: e.target.value })}
        />
      </Field>
      <Field label="Business Address" htmlFor="businessLocation">
        <Input
          id="businessLocation"
          autoComplete="street-address"
          placeholder="Building, street, area and city"
          value={business.location}
          onChange={(e) => setBusiness({ ...business, location: e.target.value })}
        />
      </Field>
      <Field label="Official Email Address" htmlFor="businessEmail">
        <Input
          id="businessEmail"
          type="email"
          placeholder="info@company.com"
          value={business.email}
          onChange={(e) => setBusiness({ ...business, email: e.target.value })}
        />
      </Field>
      <Field label="Office Telephone Number" htmlFor="businessPhone" error={businessPhoneError}>
        <PhoneInput
          id="businessPhone"
          value={business.phone}
          onValueChange={(v) => setBusiness({ ...business, phone: v })}
        />
      </Field>
    </form>
  );

  /* 3. Account numbers only: nothing is looked up, so typing one reveals nothing. The form's codes A to H are gone;
     each user's accounts are ticked on the next step. */
  const accountsContent = (
    <form
      id="enrol-step"
      onSubmit={(e) => {
        e.preventDefault();
        goToStep(3);
      }}
      className="flex flex-col gap-4"
    >
      {/* In the card only this list scrolls, never the page (designer, 2026-11-26). It is at most four accounts tall
          (336px: each field is its 18px label, 8px gap and 44px input, plus the gaps and inset), shrinks with the
          screen so everything else on the page (520px) always fits, and never drops below two accounts (156px). The
          520px is AuthLayout measured: header offset and page padding 104, card padding 98, Back 44, step bar 30,
          title block 101, Add and Continue 112, plus 31 for a wrapped description. It fades at the bottom while more
          waits below (`scroll-fade`); the inset keeps focus rings clear of the edge. On a wide screen the form's own
          pane scrolls, so the list simply grows. */}
      <div
        className={
          desktop
            ? "flex flex-col gap-4"
            : "custom-scrollbar scroll-fade -mx-1 flex max-h-[clamp(156px,calc(100dvh-520px),336px)] flex-col gap-4 overflow-y-auto px-1 py-1"
        }
      >
        {accountInputs.map((value, i) => (
          <Field
            key={i}
            label={accountInputs.length > 1 ? `Account Number ${i + 1}` : "Account Number"}
            htmlFor={`account-${i}`}
            error={accountErrors[i]}
          >
            <div className="flex items-center gap-2">
              <Input
                id={`account-${i}`}
                inputMode="numeric"
                autoComplete="off"
                className="tabular"
                placeholder="As shown on your cheque book or statement"
                value={value}
                aria-invalid={Boolean(accountErrors[i])}
                autoFocus={i === accountInputs.length - 1}
                onChange={(e) => setAccountInputs(accountInputs.map((a, j) => (j === i ? e.target.value : a)))}
                onBlur={() => setTouched((t) => (t.includes(i) ? t : [...t, i]))}
              />
              {accountInputs.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-lg"
                  aria-label={`Remove account number ${i + 1}`}
                  onClick={() => {
                    setAccountInputs(accountInputs.filter((_, j) => j !== i));
                    setTouched([]);
                  }}
                >
                  <X size={16} aria-hidden="true" />
                </Button>
              )}
            </div>
          </Field>
        ))}
      </div>
      <div>
        <Button type="button" variant="outline" size="sm" onClick={() => setAccountInputs([...accountInputs, ""])}>
          <Plus size={15} aria-hidden="true" />
          Add Another Account
        </Button>
      </div>
    </form>
  );

  /* 4. One list, one role per user. */
  const peopleContent = (
    <RequestPeople
      users={users}
      onUsersChange={setUsers}
      accounts={accounts}
      kind={kind}
      self={{ name: requester.name, email: requester.email, mobile: requesterMobile }}
    />
  );

  /* 5. The letter, as numbered steps that tick when done (amber, designer 2026-11-26). The upload screen is the same
     list with the letter already in hand. */
  const letterContent = letterData && (
    <div className="flex flex-col gap-6">
      <ol className="flex flex-col">
        {[
          {
            title: step === "upload" ? "Your letter of request" : "Download the letter of request",
            line: outOfDate ? (
              <span className="block text-caption text-warning-text">
                Your details have changed. Please download the letter again.
              </span>
            ) : (
              <span className="tabular block truncate text-caption text-muted-foreground">
                {step === "upload"
                  ? `Lost the letter? Download it again · ${reference}`
                  : `Prepared from the information provided · ${reference}`}
              </span>
            ),
            done: downloaded,
            action: (
              <span className="flex shrink-0 gap-1">
                <Button variant="ghost" size="sm" onClick={() => setPreviewOpen(true)}>
                  <Eye size={14} aria-hidden="true" />
                  Preview
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    downloadRequestLetter(letterData);
                    setDownloadedAs(letterKey);
                  }}
                >
                  <Download size={14} aria-hidden="true" />
                  Download
                </Button>
              </span>
            ),
          },
          {
            title: "Upload the signed letter",
            line: (
              <span className="tabular block truncate text-caption text-muted-foreground">
                {letter ? `${letter.name} · ${letter.size}` : "Signed by each user and your signatories · PDF or Word"}
              </span>
            ),
            done: Boolean(letter),
            drop: true,
            action: (
              <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
                <Paperclip size={14} aria-hidden="true" />
                {letter ? "Replace" : "Choose File"}
              </Button>
            ),
          },
          {
            title: "Accept the Terms & Conditions",
            line: (
              <span className="block truncate text-caption text-muted-foreground">
                {agreed ? "Read and accepted" : "Please read them in full before accepting"}
              </span>
            ),
            done: agreed,
            action: (
              <Button variant="outline" size="sm" onClick={() => setTermsOpen(true)}>
                {agreed ? "Read Again" : "Read"}
              </Button>
            ),
          },
        ].map((item, i, all) => (
          // The upload row also takes a dropped file (designer, 2026-11-26), and lights up while one is over it.
          <li
            key={item.title}
            className={`-mx-2 flex gap-3 rounded-xl px-2 transition-colors duration-hover ${
              "drop" in item && dragging ? "bg-primary/10 outline outline-1 outline-dashed outline-primary" : ""
            }`}
            onDragOver={
              "drop" in item
                ? (e) => {
                    e.preventDefault();
                    setDragging(true);
                  }
                : undefined
            }
            onDragLeave={"drop" in item ? () => setDragging(false) : undefined}
            onDrop={
              "drop" in item
                ? (e) => {
                    e.preventDefault();
                    setDragging(false);
                    const dropped = e.dataTransfer.files[0];
                    if (dropped) takeLetter(dropped);
                  }
                : undefined
            }
          >
            <span className="flex flex-col items-center">
              <span
                className={`flex size-6 shrink-0 items-center justify-center rounded-full border text-caption font-medium ${
                  item.done ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground"
                }`}
              >
                {item.done ? <Check size={12} aria-hidden="true" /> : i + 1}
              </span>
              {i < all.length - 1 && <span className="my-1 w-px flex-1 bg-border" aria-hidden="true" />}
            </span>
            <span className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-x-3 gap-y-2 pb-5">
              <span className="min-w-0">
                <span className="block text-body font-medium text-foreground">{item.title}</span>
                {item.line}
              </span>
              {item.action}
            </span>
          </li>
        ))}
      </ol>
      <input
        ref={fileInput}
        type="file"
        accept={LETTER_TYPES}
        aria-label="Choose the signed letter"
        className="sr-only"
        onChange={(e) => {
          const chosen = e.target.files?.[0];
          e.target.value = "";
          if (chosen) takeLetter(chosen);
        }}
      />

      {step === "letter" && (
        <p className="-mt-3 text-caption text-muted-foreground">
          {`Signatures may take a few days. Your request has been saved, and a link to upload the signed letter has been sent to ${requester.email}.`}
        </p>
      )}

      <TermsDialog open={termsOpen} onOpenChange={setTermsOpen} onAgree={() => setAgreed(true)} />
      <Modal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title="Letter of Request"
        size="xl"
        footer={
          <>
            <Button variant="outline" size="md" onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
            <Button
              size="md"
              onClick={() => {
                downloadRequestLetter(letterData);
                setDownloadedAs(letterKey);
                setPreviewOpen(false);
              }}
            >
              <Download size={14} aria-hidden="true" />
              Download
            </Button>
          </>
        }
      >
        {/* The letter is a printed page with its own white paper, in either theme. */}
        <iframe
          title="Letter of request"
          srcDoc={requestLetterHtml(letterData, { printButton: false })}
          className="h-[65vh] w-full rounded-lg border border-border"
        />
      </Modal>
    </div>
  );

  const content =
    step === "details"
      ? detailsContent
      : step === "business"
        ? businessContent
        : step === "accounts"
          ? accountsContent
          : step === "people"
            ? peopleContent
            : letterContent;

  // Until everything is done, the button says what is outstanding.
  const action =
    step === "details" || step === "business" ? (
      <Button
        type="submit"
        form="enrol-step"
        size="xl"
        disabled={step === "details" ? !detailsReady : !businessReady}
        className={actionWidth}
      >
        Continue
      </Button>
    ) : step === "accounts" ? (
      <Button type="submit" form="enrol-step" size="xl" disabled={Boolean(accountsLack)} className={actionWidth}>
        {accountsLack || "Continue"}
      </Button>
    ) : step === "people" ? (
      <Button size="xl" disabled={Boolean(peopleLack)} onClick={() => goToStep(4)} className={actionWidth}>
        {peopleLack || "Continue"}
      </Button>
    ) : (
      <Button
        size="xl"
        loading={busy}
        disabled={!downloaded || !letter || !agreed}
        onClick={handleSubmit}
        className={actionWidth}
      >
        {!downloaded
          ? "Download the Letter"
          : !letter
            ? "Upload the Signed Letter"
            : !agreed
              ? "Accept the Terms"
              : "Submit Request"}
      </Button>
    );

  /* ── Wide screen: the steps down the left ────────────────────────────────── */

  if (desktop) {
    const shellSteps: ShellStep[] = ENROLMENT_PROGRESS_STEPS.map((s) => {
      const head = HEAD[s as Exclude<Step, "submitted">];
      return { nav: head.nav, title: head.title };
    });
    return (
      <EnrolmentDesktopShell
        steps={shellSteps}
        current={progress}
        reached={reached}
        onGoTo={goToStep}
        description={HEAD[step as Exclude<Step, "submitted">].description}
        onExit={askToLeave}
        onPrevious={progress > 0 ? BACK[step] : undefined}
        action={action}
      >
        {content}
        {leaveDialog}
      </EnrolmentDesktopShell>
    );
  }

  /* ── The card ────────────────────────────────────────────────────────────── */

  return (
    <AuthLayout
      title={HEAD[step].title}
      description={HEAD[step].description}
      onBack={BACK[step]}
      backHref={step === "upload" ? "/login?type=business" : undefined}
      backLabel="Back to previous step"
      stepProgress={progress >= 0 ? { current: progress + 1, total: ENROLMENT_PROGRESS_STEPS.length } : undefined}
      width="compact"
      animateHeight
    >
      {content && (
        <div className="flex flex-col gap-6">
          {content}
          {action}
        </div>
      )}
      {leaveDialog}
    </AuthLayout>
  );
}

export default function CorporateEnrolmentPage() {
  return (
    <Suspense fallback={null}>
      <CorporateEnrolmentFlow />
    </Suspense>
  );
}
