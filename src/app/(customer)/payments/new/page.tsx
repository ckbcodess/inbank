"use client";

/**
 * Payment Form → Payment Review — section 3, state model 13.3.
 *
 * These are two surfaces in one flow (Payments Hub → Payment Form → Payment
 * Review), not two nav destinations (12.4). Review is reached by advancing the
 * form, and confirming hands off to Transaction Details, where status lives
 * (section 3: "Payment Status" is a state of the transaction, not a screen).
 *
 * 13.3 states implemented:
 *   initial          — progressive disclosure by payment type
 *   field-error      — inline, never a blocking modal
 *   submitting       — submit disabled, double-submit prevented
 *   submission-error — worded distinctly from field validation
 */

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeft, Loader2, Send, ShieldCheck } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import type { PaymentFormState } from "@/lib/states";
import { accountsForProfile, BENEFICIARIES, formatMoney } from "@/lib/mock-data";
import { useSession } from "@/lib/session-store";

const FORM_STATES: readonly PaymentFormState[] = [
  "initial",
  "field-error",
  "submitting",
  "submission-error",
] as const;

const FORM_STATE_LABEL: Record<PaymentFormState, string> = {
  initial: "Empty / initial",
  "field-error": "Field validation error",
  submitting: "Submitting",
  "submission-error": "Submission error",
};

/** Payment types carry materially different fields — hence progressive disclosure. */
type PaymentType = "internal" | "domestic" | "international";

const PAYMENT_TYPES: { value: PaymentType; label: string; hint: string }[] = [
  { value: "internal", label: "Between my accounts", hint: "Instant, no fee" },
  { value: "domestic", label: "To another bank", hint: "Same day" },
  { value: "international", label: "International", hint: "2–3 business days" },
];

type Step = "form" | "review";

export default function PaymentFormPage() {
  return (
    <Suspense fallback={null}>
      <PaymentFormInner />
    </Suspense>
  );
}

function PaymentFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeProfile = useSession((s) => s.activeProfile);
  const accounts = accountsForProfile(activeProfile?.kind);

  const prefillBeneficiary = searchParams.get("beneficiary");
  const duplicateOf = searchParams.get("duplicate");

  const [step, setStep] = useState<Step>("form");
  const [state, setState] = useState<PaymentFormState>("initial");

  const [type, setType] = useState<PaymentType>("domestic");
  const [sourceAccount, setSourceAccount] = useState(accounts[0]?.id ?? "");
  const [beneficiaryId, setBeneficiaryId] = useState(prefillBeneficiary ?? "");
  const [beneficiaryName, setBeneficiaryName] = useState(
    BENEFICIARIES.find((b) => b.id === prefillBeneficiary)?.name ?? "",
  );
  const [beneficiaryAccount, setBeneficiaryAccount] = useState(
    BENEFICIARIES.find((b) => b.id === prefillBeneficiary)?.accountNumber ?? "",
  );
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [swift, setSwift] = useState("");
  const [purpose, setPurpose] = useState("");

  const account = accounts.find((a) => a.id === sourceAccount) ?? accounts[0];
  const numericAmount = Number(amount) || 0;
  const fee = type === "international" ? 45 : type === "domestic" ? 12.5 : 0;

  // Field-level validity — surfaced inline, per 13.3.
  const amountError =
    state === "field-error" || (numericAmount > 0 && numericAmount > account.available)
      ? numericAmount > account.available
        ? `Amount exceeds the available balance of ${formatMoney(account.available, account.currency)}.`
        : "Enter an amount greater than zero."
      : null;

  const canReview =
    beneficiaryName.trim() !== "" &&
    beneficiaryAccount.trim() !== "" &&
    numericAmount > 0 &&
    !amountError &&
    (type !== "international" || swift.trim() !== "");

  function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    if (!canReview) {
      setState("field-error");
      return;
    }
    setState("initial");
    setStep("review");
  }

  function handleConfirm() {
    setState("submitting");
    window.setTimeout(() => {
      // Reference ending in 9 demonstrates the server-side failure path.
      if (reference.trim().endsWith("9")) {
        setState("submission-error");
        return;
      }
      // Status belongs to the transaction lifecycle (section 3) — hand off to
      // Transaction Details rather than showing a status screen here.
      router.push("/transactions/txn-008");
    }, 900);
  }

  /* ── Payment Review ─────────────────────────────────────────────────────── */
  if (step === "review") {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader
          title="Review payment"
          description="Check every detail before this leaves your account."
          backTo={{ href: "#", label: "Back to form" }}
        />

        <StateSwitcher
          section="13.3"
          states={FORM_STATES}
          value={state}
          onChange={setState}
          labels={FORM_STATE_LABEL}
        />

        {/* Submission error — distinct wording from field validation (13.3) */}
        {state === "submission-error" && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-5"
          >
            <AlertCircle size={17} strokeWidth={1.8} aria-hidden="true" className="mt-px shrink-0 text-destructive" />
            <div>
              <p className="text-[14px] text-destructive">We couldn&apos;t submit this payment</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-foreground/90">
                The details you entered are fine — the payment service didn&apos;t accept the request.
                Nothing has been debited. You can try submitting again.
              </p>
            </div>
          </div>
        )}

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="border-b border-border pb-5">
            <span className="text-[12px] text-muted-foreground">You&apos;re sending</span>
            <p className="mt-1.5 text-[28px] leading-none tracking-[-0.02em] text-foreground tabular">
              {formatMoney(numericAmount, account.currency)}
            </p>
          </div>

          <dl className="grid grid-cols-1 gap-x-8 gap-y-4 pt-5 sm:grid-cols-2">
            <Row label="From" value={`${account.name} · ${account.number}`} />
            <Row label="To" value={beneficiaryName} />
            <Row label="Beneficiary account" value={beneficiaryAccount} mono />
            <Row label="Payment type" value={PAYMENT_TYPES.find((p) => p.value === type)!.label} />
            {type === "international" && <Row label="SWIFT / BIC" value={swift} mono />}
            <Row label="Fee" value={formatMoney(fee, account.currency)} />
            <Row
              label="Total debit"
              value={formatMoney(numericAmount + fee, account.currency)}
            />
            <Row
              label="Expected arrival"
              value={PAYMENT_TYPES.find((p) => p.value === type)!.hint}
            />
            {reference && <Row label="Reference" value={reference} />}
            {purpose && <Row label="Purpose" value={purpose} />}
          </dl>
        </section>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={handleConfirm} disabled={state === "submitting"}>
            {state === "submitting" ? (
              <>
                <Loader2 size={15} className="animate-spin" aria-hidden="true" />
                Submitting…
              </>
            ) : (
              <>
                <ShieldCheck size={15} strokeWidth={1.9} aria-hidden="true" />
                Confirm and send
              </>
            )}
          </Button>
          <Button variant="outline" onClick={() => setStep("form")} disabled={state === "submitting"}>
            <ArrowLeft size={15} strokeWidth={1.9} aria-hidden="true" />
            Edit details
          </Button>
        </div>

        <p className="text-[12px] text-muted-foreground">
          Tip: end the reference with &ldquo;9&rdquo; to see the submission error state.
        </p>
      </div>
    );
  }

  /* ── Payment Form ───────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={duplicateOf ? "Duplicate payment" : "New payment"}
        description={
          duplicateOf
            ? "We've copied the details from the failed payment. Correct what went wrong and send it again."
            : "Send money to a beneficiary from one of your accounts."
        }
        backTo={{ href: "/payments", label: "Payments" }}
      />

      <StateSwitcher
        section="13.3"
        states={FORM_STATES}
        value={state}
        onChange={setState}
        labels={FORM_STATE_LABEL}
      />

      <form onSubmit={handleContinue} className="flex flex-col gap-5">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-[15px] text-foreground">Payment type</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            The fields below adjust to the type you choose.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {PAYMENT_TYPES.map((pt) => (
              <button
                key={pt.value}
                type="button"
                onClick={() => setType(pt.value)}
                aria-pressed={type === pt.value}
                className={`rounded-xl border px-4 py-3 text-left transition-all ${
                  type === pt.value
                    ? "border-primary bg-[var(--active-bg)]"
                    : "border-border bg-background hover:border-primary/40"
                }`}
              >
                <span className="block text-[13px] text-foreground">{pt.label}</span>
                <span className="mt-0.5 block text-[12px] text-muted-foreground">{pt.hint}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-4 text-[15px] text-foreground">Details</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="source">Pay from</Label>
              <select
                id="source"
                value={sourceAccount}
                onChange={(e) => setSourceAccount(e.target.value)}
                className="h-10 rounded-lg border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/40"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} — {formatMoney(a.available, a.currency)} available
                  </option>
                ))}
              </select>
            </div>

            {/* Beneficiary search/select is inline — no separate screen (section 3) */}
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="ben">Beneficiary</Label>
              <select
                id="ben"
                value={beneficiaryId}
                onChange={(e) => {
                  const b = BENEFICIARIES.find((x) => x.id === e.target.value);
                  setBeneficiaryId(e.target.value);
                  setBeneficiaryName(b?.name ?? "");
                  setBeneficiaryAccount(b?.accountNumber ?? "");
                }}
                className="h-10 rounded-lg border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/40"
              >
                <option value="">Enter a new beneficiary…</option>
                {BENEFICIARIES.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} — {b.bank}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="benName">Beneficiary name</Label>
              <Input
                id="benName"
                value={beneficiaryName}
                onChange={(e) => setBeneficiaryName(e.target.value)}
                placeholder="Full name as held by their bank"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="benAcct">Beneficiary account</Label>
              <Input
                id="benAcct"
                value={beneficiaryAccount}
                onChange={(e) => setBeneficiaryAccount(e.target.value)}
                placeholder="Account number"
                className="tabular"
              />
            </div>

            {/* Progressive disclosure — international-only fields */}
            {type === "international" && (
              <>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="swift">SWIFT / BIC</Label>
                  <Input
                    id="swift"
                    value={swift}
                    onChange={(e) => setSwift(e.target.value)}
                    placeholder="e.g. BOFAUS3N"
                    className="tabular"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="purpose">Purpose of payment</Label>
                  <Input
                    id="purpose"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="Required for cross-border transfers"
                  />
                </div>
              </>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="amount">Amount ({account.currency})</Label>
              <Input
                id="amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  if (state === "field-error") setState("initial");
                }}
                placeholder="0.00"
                className="tabular"
                aria-invalid={Boolean(amountError)}
                aria-describedby={amountError ? "amount-error" : undefined}
              />
              {/* Inline field error — not a blocking modal (13.3) */}
              {amountError && (
                <p id="amount-error" className="flex items-start gap-1.5 text-[12.5px] text-destructive">
                  <AlertCircle size={13} strokeWidth={1.9} className="mt-px shrink-0" />
                  {amountError}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="ref">Reference</Label>
              <Input
                id="ref"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Shown on both statements"
              />
            </div>

            {type !== "international" && (
              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label htmlFor="note">Note (optional)</Label>
                <Textarea
                  id="note"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="A note for your own records"
                  rows={2}
                />
              </div>
            )}
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={state === "submitting"}>
            <Send size={15} strokeWidth={1.9} />
            Continue to review
          </Button>
          <Button type="button" variant="outline" nativeButton={false} render={<Link href="/payments" />}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[12px] text-muted-foreground">{label}</dt>
      <dd className={`mt-0.5 text-[13px] text-foreground ${mono ? "tabular" : ""}`}>{value}</dd>
    </div>
  );
}
