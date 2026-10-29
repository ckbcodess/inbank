"use client";

/**
 * Setting up the securities account (the securities account at the Central Securities Depository, the CSD).
 *
 * This is never a place the customer goes on purpose to "open an account". It appears the first time they start an
 * investment, or from "Start investing now" in the welcome. The customer fills in the form themselves, one block at a
 * time, then one code submits it. The account takes up to 7 working days, so what they were about to invest in is
 * saved (`intent`) and Invest offers to carry on when it's ready.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "@/components/ui/icons";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { TermsAgreement } from "@/components/ui/terms-agreement";
import { securityTerms } from "@/lib/terms";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { OccupationCombobox } from "@/components/ui/occupation-combobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SignatureUpload } from "@/components/ui/signature-upload";
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

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const reveal = "flex flex-col animate-in fade-in slide-in-from-top-2 duration-200";

/** Opening the account covers both products, so both kinds of terms. */
const SECURITIES_TERMS = [...new Set([...securityTerms("bill", true), ...securityTerms("bond", true)])];

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
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6">
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
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6">
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
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6">
      <PageHeader title="Open a Securities Account" backTo={back} />
      <div className="flex flex-col gap-5">
        <p className="px-1 text-[13px] leading-relaxed text-muted-foreground">
          {intent
            ? `To invest in ${intent.label}, we first open your securities account, which records what you own.`
            : "To start investing, we first open your securities account, which records what you own."}
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
          <div className={`${reveal} gap-5`}>
            <Field label="Postal Address" htmlFor="invest-postal">
              <Input id="invest-postal" value={postal} onChange={(e) => setPostal(e.target.value)} placeholder="e.g. P.O. Box GT 454" autoComplete="street-address" />
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
              <TermsAgreement checked={accepted} onCheckedChange={setAccepted} subject="treasury bills and bonds" terms={SECURITIES_TERMS} />
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
