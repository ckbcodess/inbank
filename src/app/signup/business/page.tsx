"use client";

/**
 * Business signup — a company applying to bank with GCB for the first time.
 *
 * The reasoning for why this is a submit-and-review flow rather than an
 * instant one lives in `src/lib/signup-business.ts`. In short: a business has
 * documents to check, not a selfie to match, and that check can't be
 * instant — so this ends in a reference number, not a session.
 *
 * Every reachable instance is addressable from the Dev Mode switcher
 * (bottom-right).
 */

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Loader2,
  Paperclip,
  Pencil,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AuthLayout from "@/components/auth/AuthLayout";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import DevStatePanel from "@/components/states/DevStatePanel";
import {
  BUSINESS_SIGNUP_SCENARIO_IDS,
  BUSINESS_SIGNUP_SCENARIO_LABELS,
  BUSINESS_TYPES,
  EXISTING_COMPANY_NAME,
  EXISTING_COMPANY_TIN,
  REQUIRED_DOCUMENTS,
  REVIEW_TIMELINE,
  SIGNATORY_ROLES,
  SUPPORT_LINE,
  businessScenarioIdFor,
  findBusinessScenario,
  generateReference,
  lookupTin,
  type BusinessSignupStep,
  type BusinessSignupVariant,
  type CompanyDetails,
  type PrimaryContact,
  type Signatory,
} from "@/lib/signup-business";

const EMPTY_COMPANY: CompanyDetails = { name: "", tin: "", businessType: BUSINESS_TYPES[0] };
const EMPTY_CONTACT: PrimaryContact = { name: "", role: SIGNATORY_ROLES[0], ghanaCard: "", mobile: "", email: "" };

function newSignatoryId() {
  return `sig-${Math.random().toString(36).slice(2, 9)}`;
}

export default function BusinessSignupPage() {
  const [step, setStep] = useState<BusinessSignupStep>("company");
  const [variant, setVariant] = useState<BusinessSignupVariant>("default");
  const [busy, setBusy] = useState(false);

  const [company, setCompany] = useState<CompanyDetails>(EMPTY_COMPANY);
  const [contact, setContact] = useState<PrimaryContact>(EMPTY_CONTACT);
  const [contactIsSignatory, setContactIsSignatory] = useState(true);
  const [signatories, setSignatories] = useState<Signatory[]>([]);
  const [attached, setAttached] = useState<Record<string, string>>({});
  const [reference, setReference] = useState("");

  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const allDocsAttached = REQUIRED_DOCUMENTS.every((d) => attached[d.id]);
  const effectiveSignatories = contactIsSignatory
    ? [{ id: "contact", name: contact.name, role: contact.role, mobile: contact.mobile }, ...signatories]
    : signatories;

  const applyScenario = useCallback((id: string) => {
    const target = findBusinessScenario(id);
    if (!target) return;

    setStep(target.step);
    setVariant(target.variant);
    setBusy(false);

    if (target.variant === "existingCustomer") {
      setCompany({ name: EXISTING_COMPANY_NAME, tin: EXISTING_COMPANY_TIN, businessType: BUSINESS_TYPES[0] });
      return;
    }

    const seedsBeyondCompany = target.step !== "company";
    setCompany(seedsBeyondCompany ? { name: "Adinkra Fabrics Ltd", tin: "C0099887766", businessType: BUSINESS_TYPES[0] } : EMPTY_COMPANY);

    const seedsBeyondContact = target.step === "signatories" || target.step === "documents" || target.step === "review" || target.step === "submitted";
    setContact(
      seedsBeyondContact
        ? { name: "Abena Owusu-Mensah", role: "Director", ghanaCard: "GHA-0777888999-1", mobile: "+233241112233", email: "abena@adinkrafabrics.com" }
        : EMPTY_CONTACT,
    );
    setContactIsSignatory(true);

    const seedsBeyondSignatories = target.step === "documents" || target.step === "review" || target.step === "submitted";
    setSignatories(seedsBeyondSignatories ? [{ id: "sig-demo", name: "Kojo Anim", role: "Finance Manager", mobile: "+233247778899" }] : []);

    const seedsBeyondDocuments = target.step === "review" || target.step === "submitted";
    setAttached(
      seedsBeyondDocuments
        ? Object.fromEntries(REQUIRED_DOCUMENTS.map((d) => [d.id, `${d.id}.pdf`]))
        : {},
    );

    setReference(target.step === "submitted" ? generateReference() : "");
  }, []);

  function handleCompanySubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      const result = lookupTin(company.tin);
      if (result === "existingCustomer") {
        setVariant("existingCustomer");
        return;
      }
      setStep("contact");
    }, 700);
  }

  function handleAttach(docId: string, file: File | undefined) {
    if (!file) return;
    setAttached((prev) => ({ ...prev, [docId]: file.name }));
  }

  function handleSubmitApplication() {
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      setReference(generateReference());
      setStep("submitted");
    }, 900);
  }

  function handleBackStep() {
    if (step === "review") {
      setStep("documents");
    } else if (step === "documents") {
      setStep("signatories");
    } else if (step === "signatories") {
      setStep("contact");
    } else if (step === "contact") {
      setStep("company");
    }
  }

  const headings = resolveHeadings(step, variant);
  const stepIndex = ["company", "contact", "signatories", "documents", "review"].indexOf(step);

  return (
    <>
      <StateSwitcher
        section="12.1"
        states={BUSINESS_SIGNUP_SCENARIO_IDS}
        value={businessScenarioIdFor(step, variant)}
        onChange={applyScenario}
        labels={BUSINESS_SIGNUP_SCENARIO_LABELS}
      />
      <DevStatePanel />

      <AuthLayout
        icon={headings.icon}
        title={headings.title}
        description={headings.description}
        width="wide"
        footer={
          step === "submitted" || (step === "company" && variant === "existingCustomer") ? null : step === "company" ? (
            <div className="mt-5 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft size={15} strokeWidth={2} aria-hidden="true" />
                Back to sign in
              </Link>
            </div>
          ) : (
            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={handleBackStep}
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
              >
                <ArrowLeft size={15} strokeWidth={2} aria-hidden="true" />
                Back to previous step
              </button>
            </div>
          )
        }
      >
        {step !== "submitted" && (
          <ol className="mb-5 flex items-center gap-1.5">
            {["Company", "Contact", "Signatories", "Documents", "Review"].map((label, i) => (
              <li key={label} className="flex flex-1 flex-col items-center gap-1.5">
                <span
                  className={`h-1 w-full rounded-full ${
                    i <= stepIndex ? "bg-primary" : "bg-muted"
                  }`}
                  aria-hidden="true"
                />
                <span className="hidden text-[10px] text-muted-foreground sm:block">{label}</span>
              </li>
            ))}
          </ol>
        )}

        {/* ── Company ──────────────────────────────────────────────────────── */}
        {step === "company" && variant !== "existingCustomer" && (
          <form onSubmit={handleCompanySubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="companyName" className="text-[13.5px] font-medium text-foreground">
                Registered business name
              </Label>
              <Input
                id="companyName"
                value={company.name}
                onChange={(e) => setCompany((c) => ({ ...c, name: e.target.value }))}
                placeholder="Adinkra Fabrics Ltd"
                className="h-11 text-[14.5px]"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="tin" className="text-[13.5px] font-medium text-foreground">
                Taxpayer Identification Number (TIN)
              </Label>
              <Input
                id="tin"
                value={company.tin}
                onChange={(e) => setCompany((c) => ({ ...c, tin: e.target.value }))}
                placeholder="C0099887766"
                className="h-11 font-mono text-[14.5px] uppercase tracking-wider tabular"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="businessType" className="text-[13.5px] font-medium text-foreground">
                Business type
              </Label>
              <Select
                value={company.businessType}
                onValueChange={(v) => v && setCompany((c) => ({ ...c, businessType: v }))}
              >
                <SelectTrigger id="businessType" className="h-11 w-full text-[14px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BUSINESS_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <p className="text-[12.5px] text-muted-foreground">
              We check this against your incorporation documents later, so it&apos;s fine if you
              don&apos;t have everything else to hand yet.
            </p>

            <Button
              type="submit"
              variant="default"
              size="lg"
              disabled={busy || company.name.trim() === "" || company.tin.trim() === ""}
              className="mt-2 h-11 w-full text-[14px]"
            >
              {busy ? (
                <>
                  <Loader2 size={16} strokeWidth={2} className="mr-2 animate-spin" aria-hidden="true" />
                  Checking…
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </form>
        )}

        {step === "company" && variant === "existingCustomer" && (
          <div className="flex flex-col gap-5">
            <p className="text-[13.5px] leading-relaxed text-muted-foreground">
              {EXISTING_COMPANY_NAME} already banks with GCB, so a new application isn&apos;t
              needed. Internet banking access for your company is granted by your Corporate Admin
              from Administration — ask them to send you an invitation.
            </p>
            <p className="text-[12.5px] text-muted-foreground">
              Not sure who that is, or think this is a mistake? Call us on{" "}
              <span className="tabular text-foreground">{SUPPORT_LINE}</span>.
            </p>
            <Button
              variant="default"
              size="lg"
              nativeButton={false}
              render={<Link href="/login" />}
              className="mt-2 h-11 w-full text-[14px]"
            >
              Back to sign in
            </Button>
          </div>
        )}

        {/* ── Primary contact ──────────────────────────────────────────────── */}
        {step === "contact" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setStep("signatories");
            }}
            className="flex flex-col gap-5"
          >
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              You — the person filling this in. Once we approve the application, we&apos;ll send
              this person the activation link that sets them up as the company&apos;s first
              Corporate Admin.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="contactName" className="text-[13.5px] font-medium text-foreground">
                  Full name
                </Label>
                <Input
                  id="contactName"
                  value={contact.name}
                  onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))}
                  className="h-11 text-[14.5px]"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="contactRole" className="text-[13.5px] font-medium text-foreground">
                  Your role
                </Label>
                <Select value={contact.role} onValueChange={(v) => v && setContact((c) => ({ ...c, role: v }))}>
                  <SelectTrigger id="contactRole" className="h-11 w-full text-[14px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SIGNATORY_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="contactGhanaCard" className="text-[13.5px] font-medium text-foreground">
                Ghana Card number
              </Label>
              <Input
                id="contactGhanaCard"
                value={contact.ghanaCard}
                onChange={(e) => setContact((c) => ({ ...c, ghanaCard: e.target.value }))}
                placeholder="GHA-0123456789-0"
                className="h-11 font-mono text-[14.5px] uppercase tracking-wider tabular"
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="contactMobile" className="text-[13.5px] font-medium text-foreground">
                  Mobile number
                </Label>
                <Input
                  id="contactMobile"
                  type="tel"
                  value={contact.mobile}
                  onChange={(e) => setContact((c) => ({ ...c, mobile: e.target.value }))}
                  className="h-11 text-[14.5px] tabular"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="contactEmail" className="text-[13.5px] font-medium text-foreground">
                  Email
                </Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={contact.email}
                  onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))}
                  className="h-11 text-[14.5px]"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="default"
              size="lg"
              disabled={contact.name.trim() === "" || contact.ghanaCard.trim() === "" || contact.mobile.trim() === "" || contact.email.trim() === ""}
              className="mt-2 h-11 w-full text-[14px]"
            >
              Continue
            </Button>
          </form>
        )}

        {/* ── Signatories ──────────────────────────────────────────────────── */}
        {step === "signatories" && (
          <div className="flex flex-col gap-5">
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              Anyone who can act for the company on this account — approve payments, view
              statements. Add as many as you need; you can always add more later from
              Administration.
            </p>

            <label className="flex cursor-pointer items-start gap-3.5 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40">
              <Checkbox
                checked={contactIsSignatory}
                onCheckedChange={(checked) => setContactIsSignatory(!!checked)}
                className="mt-0.5"
              />
              <span className="flex min-w-0 flex-col">
                <span className="text-[13.5px] font-medium text-foreground">
                  {contact.name || "You"} — {contact.role}
                </span>
                <span className="mt-0.5 text-[12.5px] text-muted-foreground">
                  Included automatically as the primary contact, unless removed here.
                </span>
              </span>
            </label>

            {signatories.map((sig) => (
              <div key={sig.id} className="flex items-center gap-3.5 rounded-2xl border border-border bg-card p-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <Users size={18} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[13.5px] font-medium text-foreground">{sig.name || "Unnamed signatory"}</span>
                  <span className="mt-0.5 text-[12.5px] text-muted-foreground tabular">
                    {sig.role} · {sig.mobile || "no number yet"}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setSignatories((prev) => prev.filter((s) => s.id !== sig.id))}
                  aria-label={`Remove ${sig.name || "this signatory"}`}
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                >
                  <Trash2 size={16} strokeWidth={1.8} />
                </button>
              </div>
            ))}

            <SignatoryForm onAdd={(sig) => setSignatories((prev) => [...prev, sig])} />

            <Button
              variant="default"
              size="lg"
              onClick={() => setStep("documents")}
              disabled={effectiveSignatories.length === 0}
              className="mt-2 h-11 w-full text-[14px]"
            >
              Continue
            </Button>
            {effectiveSignatories.length === 0 && (
              <p className="text-center text-[12.5px] text-muted-foreground">
                At least one signatory is required to open the account.
              </p>
            )}
          </div>
        )}

        {/* ── Documents ────────────────────────────────────────────────────── */}
        {step === "documents" && (
          <div className="flex flex-col gap-5">
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              Bank of Ghana requires all four before an application can be reviewed. PDF or a clear
              photo, up to 10MB each.
            </p>

            {REQUIRED_DOCUMENTS.map((doc) => {
              const filename = attached[doc.id];
              return (
                <div
                  key={doc.id}
                  className={`flex items-center gap-3.5 rounded-2xl border p-4 transition-colors ${
                    filename ? "border-primary/40 bg-primary/5" : "border-border bg-card"
                  }`}
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                    {filename ? (
                      <Check size={18} strokeWidth={1.9} className="text-primary" aria-hidden="true" />
                    ) : (
                      <FileText size={18} strokeWidth={1.8} aria-hidden="true" />
                    )}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[13.5px] font-medium text-foreground">{doc.label}</span>
                    <span className="mt-0.5 truncate text-[12.5px] text-muted-foreground">
                      {filename ?? doc.hint}
                    </span>
                  </span>
                  <input
                    ref={(el) => {
                      fileInputs.current[doc.id] = el;
                    }}
                    type="file"
                    accept="application/pdf,image/*"
                    className="hidden"
                    onChange={(e) => handleAttach(doc.id, e.target.files?.[0])}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputs.current[doc.id]?.click()}
                    className="shrink-0 h-9"
                  >
                    <Paperclip size={14} strokeWidth={1.8} className="mr-1.5" aria-hidden="true" />
                    {filename ? "Replace" : "Attach"}
                  </Button>
                </div>
              );
            })}

            <Button
              variant="default"
              size="lg"
              onClick={() => setStep("review")}
              disabled={!allDocsAttached}
              className="mt-2 h-11 w-full text-[14px]"
            >
              Continue
            </Button>
            {!allDocsAttached && (
              <p className="text-center text-[12.5px] text-muted-foreground">
                All four documents are needed before we can review this.
              </p>
            )}
          </div>
        )}

        {/* ── Review ───────────────────────────────────────────────────────── */}
        {step === "review" && (
          <div className="flex flex-col gap-5">
            <ReviewSection title="Company" onEdit={() => setStep("company")}>
              <dl className="grid grid-cols-1 gap-y-2.5 text-[13.5px]">
                <Row label="Name" value={company.name} />
                <Row label="TIN" value={company.tin} tabular />
                <Row label="Type" value={company.businessType} />
              </dl>
            </ReviewSection>

            <ReviewSection title="Primary contact" onEdit={() => setStep("contact")}>
              <dl className="grid grid-cols-1 gap-y-2.5 text-[13.5px]">
                <Row label="Name" value={contact.name} />
                <Row label="Role" value={contact.role} />
                <Row label="Mobile" value={contact.mobile} tabular />
                <Row label="Email" value={contact.email} />
              </dl>
            </ReviewSection>

            <ReviewSection title={`Signatories (${effectiveSignatories.length})`} onEdit={() => setStep("signatories")}>
              <ul className="flex flex-col gap-2 text-[13.5px]">
                {effectiveSignatories.map((sig) => (
                  <li key={sig.id} className="text-foreground">
                    {sig.name} <span className="text-muted-foreground">· {sig.role}</span>
                  </li>
                ))}
              </ul>
            </ReviewSection>

            <ReviewSection title="Documents" onEdit={() => setStep("documents")}>
              <ul className="flex flex-col gap-2 text-[13.5px] text-foreground">
                {REQUIRED_DOCUMENTS.map((doc) => (
                  <li key={doc.id} className="flex items-center gap-2">
                    <Check size={15} strokeWidth={1.9} className="text-primary" aria-hidden="true" />
                    {doc.label}
                  </li>
                ))}
              </ul>
            </ReviewSection>

            <div
              role="note"
              className="flex items-start gap-3 rounded-2xl bg-muted p-4 text-[12.5px] leading-relaxed text-muted-foreground"
            >
              <ClipboardCheck size={16} strokeWidth={1.8} aria-hidden="true" className="mt-0.5 shrink-0" />
              <span>
                Submitting sends this for review — it doesn&apos;t open the account yet. We&apos;ll
                email {contact.email || "your primary contact"} within {REVIEW_TIMELINE}.
              </span>
            </div>

            <Button
              variant="default"
              size="lg"
              onClick={handleSubmitApplication}
              disabled={busy}
              className="mt-2 h-11 w-full text-[14px]"
            >
              {busy ? (
                <>
                  <Loader2 size={16} strokeWidth={2} className="mr-2 animate-spin" aria-hidden="true" />
                  Submitting…
                </>
              ) : (
                "Submit application"
              )}
            </Button>
          </div>
        )}

        {/* ── Submitted ────────────────────────────────────────────────────── */}
        {step === "submitted" && (
          <div className="flex flex-col gap-6">
            <div className="rounded-2xl border border-border bg-muted/30 p-5 text-center">
              <p className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
                Application reference
              </p>
              <p className="mt-1.5 text-[20px] font-medium text-foreground tabular">{reference}</p>
            </div>

            <p className="text-[13.5px] leading-relaxed text-muted-foreground">
              We review applications within <span className="text-foreground">{REVIEW_TIMELINE}</span>.
              We&apos;ll email <span className="text-foreground">{contact.email}</span> either way — if
              anything&apos;s missing, we&apos;ll say exactly what. Once approved,{" "}
              <span className="text-foreground">{contact.name}</span> receives an activation link to
              sign in as the company&apos;s first Corporate Admin, and can invite the rest of the
              team from Administration.
            </p>

            <Button
              variant="default"
              size="lg"
              nativeButton={false}
              render={<Link href="/login" />}
              className="h-11 w-full text-[14px]"
            >
              Back to sign in
            </Button>

            <p className="text-center text-[12.5px] text-muted-foreground">
              Keep this reference — quote it if you call us on{" "}
              <span className="tabular text-foreground">{SUPPORT_LINE}</span>.
            </p>
          </div>
        )}
      </AuthLayout>
    </>
  );
}

/* ── Small building blocks ─────────────────────────────────────────────────── */

function Row({ label, value, tabular = false }: { label: string; value: string; tabular?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`text-foreground ${tabular ? "tabular" : ""}`}>{value || "—"}</dd>
    </div>
  );
}

function ReviewSection({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3.5 flex items-center justify-between">
        <p className="text-[13.5px] font-medium text-foreground">{title}</p>
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-1.5 text-[12.5px] font-medium text-foreground underline underline-offset-4 hover:text-foreground/80 cursor-pointer"
        >
          <Pencil size={13} strokeWidth={1.9} aria-hidden="true" />
          Edit
        </button>
      </div>
      {children}
    </div>
  );
}

function SignatoryForm({ onAdd }: { onAdd: (sig: Signatory) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState<string>(SIGNATORY_ROLES[0]);
  const [mobile, setMobile] = useState("");

  if (!open) {
    return (
      <Button type="button" variant="outline" onClick={() => setOpen(true)} className="h-11 w-full text-[14px]">
        <UserPlus size={16} strokeWidth={1.9} className="mr-2" aria-hidden="true" />
        Add another signatory
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-border p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          aria-label="Signatory name"
          className="h-11 text-[14.5px]"
        />
        <Select value={role} onValueChange={(v) => v && setRole(v)}>
          <SelectTrigger aria-label="Signatory role" className="h-11 w-full text-[14px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SIGNATORY_ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Input
        value={mobile}
        onChange={(e) => setMobile(e.target.value)}
        placeholder="Mobile number"
        type="tel"
        className="h-11 text-[14.5px] tabular"
        aria-label="Signatory mobile number"
      />
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={name.trim() === "" || mobile.trim() === ""}
          onClick={() => {
            onAdd({ id: newSignatoryId(), name, role, mobile });
            setName("");
            setRole(SIGNATORY_ROLES[0]);
            setMobile("");
            setOpen(false);
          }}
          className="h-9"
        >
          Add signatory
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)} className="h-9">
          Cancel
        </Button>
      </div>
    </div>
  );
}

/* ── Headings ──────────────────────────────────────────────────────────────── */

function resolveHeadings(step: BusinessSignupStep, variant: BusinessSignupVariant) {
  if (step === "submitted") {
    return { icon: CheckCircle2, title: "Application submitted", description: "We'll be in touch." };
  }
  if (step === "review") {
    return { icon: ClipboardCheck, title: "Review your application", description: "Check everything before it goes to us." };
  }
  if (step === "documents") {
    return { icon: FileText, title: "Upload your documents", description: "What Bank of Ghana requires to open a business account." };
  }
  if (step === "signatories") {
    return { icon: Users, title: "Authorised signatories", description: "Who can act for the company on this account." };
  }
  if (step === "contact") {
    return { icon: UserPlus, title: "Primary contact", description: "The person we'll reach about this application." };
  }
  return variant === "existingCustomer"
    ? { icon: CheckCircle2, title: "Already a GCB customer", description: "This company doesn't need a new application." }
    : { icon: Building2, title: "Open a business account", description: "We review every application before it opens." };
}
