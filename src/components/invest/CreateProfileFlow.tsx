"use client";

/**
 * Setting up the securities account (the securities account at the Central Securities Depository, the CSD).
 *
 * This is never a place the customer goes on purpose to "open an account". It appears the first time they start an
 * investment, or from "Start investing now" in the welcome. The customer fills in the form themselves, one block at a
 * time, then one code submits it. The account takes up to 7 working days, so what they were about to invest in is
 * saved (`intent`) and Invest offers to carry on when it's ready.
 */

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, ShieldCheck, Upload, X } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { OccupationCombobox } from "@/components/ui/occupation-combobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormPageSkeleton } from "@/components/states/PageSkeletons";
import { TrueEmptyState } from "@/components/states/ListStates";
import TransactionOtpModal from "@/components/payments/TransactionOtpModal";
import { PaymentSuccessScreen } from "@/components/payments/PaymentSuccessScreen";
import { FromAccountSelector, ProceedButton } from "@/components/payments/flows/shared";
import { INVEST_HOME } from "@/components/invest/parts";
import { useSession } from "@/lib/session-store";
import { useCustomerAccounts } from "@/lib/use-customer-accounts";
import {
  INVESTOR_TITLES,
  useMyTreasury,
  useTreasury,
  useTreasuryAccounts,
  useTreasuryHydrated,
  type AccountIntent,
} from "@/lib/treasury";

const RESIDENTIAL_STATUSES = ["Resident Ghanaian", "Non-resident Ghanaian", "Resident Foreigner", "Non-resident Foreigner"] as const;
const NATIONALITIES = [
  "Ghanaian",
  "Nigerian",
  "Ivorian",
  "Togolese",
  "Burkinabe",
  "Beninese",
  "Senegalese",
  "Kenyan",
  "South African",
  "British",
  "American",
  "Indian",
  "Chinese",
  "Lebanese",
  "Other",
] as const;

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const FILE_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const reveal = "flex flex-col animate-in fade-in slide-in-from-top-2 duration-200";

function fileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** The signature the CSD keeps on file: a JPG, PNG or PDF up to 5 MB. */
function SignatureUpload({
  file,
  onChange,
}: {
  file: { name: string; size: number } | null;
  onChange: (next: { name: string; size: number } | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  function pick(f: File | undefined) {
    if (!f) return;
    if (!FILE_TYPES.includes(f.type)) return setError("That file type isn’t supported. Choose a JPG, PNG or PDF.");
    if (f.size > MAX_FILE_BYTES) return setError("That file is over 5 MB. Choose a smaller one.");
    setError("");
    onChange({ name: f.name, size: f.size });
  }

  return (
    <Field label="Signature" error={error}>
      <input
        ref={input}
        type="file"
        accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {file ? (
        <div className="flex min-h-[58px] items-center justify-between gap-3 rounded-2xl border border-field-border bg-field px-3.5 py-2.5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
              <FileText size={16} strokeWidth={1.8} aria-hidden="true" />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-[14px] text-foreground">{file.name}</span>
              <span className="tabular text-[12px] text-muted-foreground">{fileSize(file.size)}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Remove signature"
            className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X size={16} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="flex min-h-[96px] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-field-border bg-field px-4 py-5 text-center transition-colors hover:bg-field-hover"
        >
          <Upload size={18} strokeWidth={1.8} className="text-muted-foreground" aria-hidden="true" />
          <span className="text-[13px] text-muted-foreground">Upload a JPG, PNG or PDF, up to 5 MB</span>
        </button>
      )}
    </Field>
  );
}

export function CreateProfileFlow({ intent, onCreated }: { intent?: AccountIntent; onCreated?: () => void }) {
  const router = useRouter();
  const hydrated = useTreasuryHydrated();
  const { ownerId, csd } = useMyTreasury();
  const requestAccount = useTreasury((s) => s.requestAccount);
  const actor = useSession((s) => s.actor);
  const accounts = useTreasuryAccounts();
  const { defaultId } = useCustomerAccounts();

  const [screen, setScreen] = useState<"form" | "success">("form");
  const [authOpen, setAuthOpen] = useState(false);
  const [pickedFrom, setPickedFrom] = useState("");
  const [title, setTitle] = useState("");
  const [occupation, setOccupation] = useState("");
  const [typedEmail, setEmail] = useState<string | null>(null);
  const email = typedEmail ?? actor?.email ?? "";
  const [nationality, setNationality] = useState("");
  const [status, setStatus] = useState("");
  const [postal, setPostal] = useState("");
  const [residential, setResidential] = useState("");
  const [signature, setSignature] = useState<{ name: string; size: number } | null>(null);
  const [accepted, setAccepted] = useState(false);

  const fromId = pickedFrom && accounts.some((a) => a.id === pickedFrom) ? pickedFrom : accounts.find((a) => a.id === defaultId)?.id ?? accounts[0]?.id ?? "";
  const from = accounts.find((a) => a.id === fromId);
  const back = { href: INVEST_HOME, label: "Invest" };

  if (!hydrated) return <FormPageSkeleton fields={3} />;

  if (screen === "success") {
    return (
      <PaymentSuccessScreen
        title="Request submitted"
        message={
          intent
            ? `Your securities account will be ready within 7 working days. Your choice, ${intent.label}, is saved.`
            : "Your securities account will be ready within 7 working days."
        }
        onPrimaryAction={() => router.push(INVEST_HOME)}
        primaryActionLabel="Back to Invest"
        showSaveBeneficiary={false}
        customActionCards={[]}
      />
    );
  }

  if (csd) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title="Your Securities Account" backTo={back} />
        <TrueEmptyState
          icon={<ShieldCheck size={22} strokeWidth={1.8} />}
          title={csd.status === "pending" ? "Your request is already in" : "Your securities account is ready"}
          description={
            csd.status === "pending"
              ? "We’re setting it up. It will be ready within 7 working days."
              : "You can invest in anything on offer now."
          }
          action={
            <Button nativeButton={false} render={<Link href={INVEST_HOME} />}>
              Back to Invest
            </Button>
          }
        />
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title="Open a Securities Account" backTo={back} />
        <TrueEmptyState
          icon={<ShieldCheck size={22} strokeWidth={1.8} />}
          title="You need a bank account first"
          description="An securities account is linked to an active current or savings account in cedis, and you don’t have one yet."
        />
      </div>
    );
  }

  /* Two blocks: about you first, then where you live and the signature, then the account and terms. */
  const aboutDone = Boolean(title) && occupation.trim().length >= 2 && EMAIL.test(email.trim()) && Boolean(nationality) && Boolean(status);
  const detailsDone = postal.trim().length >= 3 && residential.trim().length >= 3 && Boolean(signature);
  const emailInvalid = email.trim() !== "" && !EMAIL.test(email.trim());

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Open a Securities Account" backTo={back} />
      <div className="mx-auto flex w-full max-w-[600px] flex-col gap-6">
        <p className="px-1 text-[13px] leading-relaxed text-muted-foreground">
          {intent
            ? `To invest in ${intent.label}, we first open your securities account. It’s held with the Central Securities Depository, where what you own is recorded.`
            : "To start investing, we first open your securities account. It’s held with the Central Securities Depository, where what you own is recorded."}
        </p>

        <FromAccountSelector accounts={accounts} value={fromId} onChange={setPickedFrom} label="Linked Account" />

        <Field label="Title">
          <Select value={title} onValueChange={(v) => v && setTitle(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select title" />
            </SelectTrigger>
            <SelectContent>
              {INVESTOR_TITLES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Occupation" htmlFor="invest-occupation">
          <OccupationCombobox id="invest-occupation" value={occupation} onChange={setOccupation} />
        </Field>

        <Field label="Email Address" htmlFor="invest-email" error={emailInvalid && "Enter a valid email address."}>
          <Input id="invest-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </Field>

        <Field label="Nationality">
          <Select value={nationality} onValueChange={(v) => v && setNationality(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select nationality" />
            </SelectTrigger>
            <SelectContent>
              {NATIONALITIES.map((n) => (
                <SelectItem key={n} value={n}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Residential Status">
          <Select value={status} onValueChange={(v) => v && setStatus(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select residential status" />
            </SelectTrigger>
            <SelectContent>
              {RESIDENTIAL_STATUSES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {aboutDone && (
          <div className={`${reveal} gap-6`}>
            <Field label="Postal Address" htmlFor="invest-postal">
              <Input id="invest-postal" value={postal} onChange={(e) => setPostal(e.target.value)} placeholder="For example, P.O. Box GT 454" autoComplete="street-address" />
            </Field>
            <Field label="Residential Address" htmlFor="invest-residential">
              <Input id="invest-residential" value={residential} onChange={(e) => setResidential(e.target.value)} autoComplete="street-address" />
            </Field>
            <SignatureUpload file={signature} onChange={setSignature} />
          </div>
        )}

        {aboutDone && detailsDone && (
          <div className={reveal}>
            <div className="flex flex-col gap-1">
              <label className="flex cursor-pointer items-start gap-3 px-1 py-2 text-[13px] leading-relaxed text-foreground">
                <Checkbox checked={accepted} onCheckedChange={(v) => setAccepted(Boolean(v))} aria-label="Accept the Terms and Conditions" className="mt-0.5" />
                <span>By checking this box, I acknowledge that I have read and agree to the Terms &amp; Conditions of treasury bills and bonds.</span>
              </label>
              <ProceedButton disabled={!accepted || !from} onClick={() => setAuthOpen(true)} label="Open Securities Account" />
            </div>
          </div>
        )}
      </div>

      <TransactionOtpModal
        open={authOpen}
        onOpenChange={setAuthOpen}
        onSuccess={() => {
          requestAccount(ownerId, fromId, intent);
          onCreated?.();
          setScreen("success");
        }}
      />
    </div>
  );
}
