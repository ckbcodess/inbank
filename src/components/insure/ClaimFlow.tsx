"use client";

/**
 * Policy → File a Claim, from the Figma's four claim rows (Funeral, Child Education, Ultimate Protection,
 * WealthMaster). One flow: the claim types and the documents asked for follow the plan and the claim type.
 *
 *  - Figma opens each claim with a "have these ready" screen. Here that list sits at the top of the form instead of
 *    being a step of its own.
 *  - Claim types that can't succeed aren't offered: Maturity only once the policy has matured, Surrender Value and
 *    Policy Loan only once the policy has a cash value, Death only for someone covered on the policy. The line under
 *    the picker says why one is missing.
 *  - Surrender and loans show what they would pay before anything is submitted, and that surrendering ends the cover.
 *
 * Then where the money goes, a review, the one-time code (Figma: PIN), and the outcome.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check } from "@/components/ui/icons";
import { StepBar } from "@/components/ui/step-bar";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { InlineError } from "@/components/ui/inline-error";
import { Input } from "@/components/ui/input";
import { ReviewSummary } from "@/components/ui/review-summary";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SignatureUpload } from "@/components/ui/signature-upload";
import { Textarea } from "@/components/ui/textarea";
import { FormPageSkeleton } from "@/components/states/PageSkeletons";
import { TrueEmptyState } from "@/components/states/ListStates";
import TransactionOtpModal from "@/components/payments/TransactionOtpModal";
import { PaymentSuccessScreen } from "@/components/payments/PaymentSuccessScreen";
import { AmountInput, FromAccountSelector, ProceedButton } from "@/components/payments/flows/shared";
import { FactsPanel } from "@/components/invest/parts";
import { OutcomeFailure } from "@/components/invest/term-deposit-parts";
import { PolicyNotFound } from "@/components/insure/parts";
import { formatDate, formatMoney } from "@/lib/mock-data";
import { MOCK_TODAY, daysBetween, useTreasuryAccounts } from "@/lib/treasury";
import { CLAIM_TYPES, DEATH_DOCUMENTS, PROVIDER, WAITING_PERIOD_DAYS, findPlan, type ClaimTypeId } from "@/lib/insurance-plans";
import { loanLimit, maturityOf, surrenderValue, useInsurance, useInsuranceHydrated, usePolicy, type Policy } from "@/lib/insurance";

type FileRef = { name: string; size: number } | null;
type YesNo = "yes" | "no" | "";
const YES_NO = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
] as const;
const asNumber = (v: string) => Number(String(v).replace(/[^0-9.]/g, "")) || 0;
const money = (n: number) => formatMoney(n, "GHS", true);
const reveal = "flex flex-col gap-5 animate-in fade-in slide-in-from-top-2 duration-200";

/** The documents a claim type needs, besides the claimant's ID. */
function documentsFor(type: ClaimTypeId | "", accidental: boolean): string[] {
  switch (type) {
    case "death":
      return [...DEATH_DOCUMENTS, ...(accidental ? ["Police Report"] : [])];
    case "school-fees":
      return ["Proof of School Enrolment"];
    case "disability":
    case "critical-illness":
    case "accident":
      return ["Medical Report"];
    case "hospital-cash":
      return ["Hospital Discharge Summary"];
    case "retrenchment":
      return ["Letter of Termination"];
    default:
      return [];
  }
}

/** Which claim types this policy can actually make today, and a line about any left out. */
function availableTypes(policy: Policy, kind: string | undefined, all: readonly ClaimTypeId[]) {
  const matured = (maturityOf(policy) ?? "9999") <= MOCK_TODAY;
  const cash = surrenderValue(policy) > 0;
  const types = all.filter((t) => {
    if (t === "maturity") return matured;
    if (t === "surrender" || t === "loan") return kind === "savings" && cash;
    if (t === "death") return policy.members.length > 0;
    return true;
  });
  const notes: string[] = [];
  if (all.includes("maturity") && !matured && maturityOf(policy)) notes.push(`Maturity opens on ${formatDate(maturityOf(policy) ?? "")}.`);
  if ((all.includes("surrender") || all.includes("loan")) && !cash) notes.push("Surrender and loans open once the policy is 2 years old.");
  if (all.includes("death") && policy.members.length === 0) notes.push("A claim for your own death is made by your beneficiaries, through any GCB branch.");
  return { types, note: notes.join(" ") };
}

function ClaimForm({ policy }: { policy: Policy }) {
  const router = useRouter();
  const { ownerId, personOf } = usePolicy(policy.id);
  const fileClaim = useInsurance((s) => s.fileClaim);
  const failRequests = useInsurance((s) => s.failRequests);
  const accounts = useTreasuryAccounts();
  const plan = findPlan(policy.planId);
  const base = `/insure/policies/${policy.id}`;

  const [screen, setScreen] = useState<"form" | "review" | "success" | "failed">("form");
  const [type, setType] = useState<ClaimTypeId | "">("");
  // Death and hospital
  const [memberId, setMemberId] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [place, setPlace] = useState("");
  const [cause, setCause] = useState("");
  const [accidental, setAccidental] = useState<YesNo>("");
  // School fees, loan, refund, illness, retrenchment
  const [childId, setChildId] = useState("");
  const [school, setSchool] = useState("");
  const [level, setLevel] = useState("");
  const [amount, setAmount] = useState("");
  const [details, setDetails] = useState("");
  // Documents and payout
  const [idDoc, setIdDoc] = useState<FileRef>(null);
  const [docs, setDocs] = useState<Record<string, FileRef>>({});
  const [pickedTo, setPickedTo] = useState("");
  const [truthful, setTruthful] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [reference, setReference] = useState("");

  const toId = useMemo(() => {
    if (pickedTo && accounts.some((a) => a.id === pickedTo)) return pickedTo;
    return accounts.find((a) => a.id === policy.accountId)?.id ?? accounts[0]?.id ?? "";
  }, [pickedTo, accounts, policy.accountId]);
  const to = accounts.find((a) => a.id === toId);

  const { types } = availableTypes(policy, plan?.kind, plan?.claimTypes ?? []);
  const member = policy.members.find((m) => m.id === memberId);
  const child = personOf(childId);
  const surrender = surrenderValue(policy);
  const loanMax = loanLimit(policy);
  const requiredDocs = documentsFor(type, accidental === "yes");

  /* What each type needs before the documents. */
  const eventInFuture = eventDate !== "" && eventDate > MOCK_TODAY;
  const beforeCover = eventDate !== "" && eventDate < `${policy.startMonth}-01`;
  const dateError = eventInFuture ? "That date is in the future." : beforeCover ? "That’s before this policy started." : null;
  const withinWaiting =
    type === "death" && eventDate !== "" && !dateError && accidental === "no" && daysBetween(`${policy.startMonth}-01`, eventDate) < WAITING_PERIOD_DAYS;
  const loanAmount = asNumber(amount);
  const loanError = type === "loan" && loanAmount > loanMax ? `You can borrow up to ${money(loanMax)}.` : null;

  let detailsDone = false;
  switch (type) {
    case "death":
      detailsDone = Boolean(member) && eventDate !== "" && !dateError && place.trim().length >= 2 && cause.trim().length >= 2 && accidental !== "";
      break;
    case "hospital-cash":
      detailsDone = Boolean(memberId) && eventDate !== "" && !dateError && endDate !== "" && endDate >= eventDate && endDate <= MOCK_TODAY;
      break;
    case "school-fees":
      detailsDone = Boolean(child) && school.trim().length >= 3 && level.trim().length >= 1 && asNumber(amount) > 0;
      break;
    case "loan":
      detailsDone = loanAmount > 0 && !loanError;
      break;
    case "disability":
    case "critical-illness":
    case "accident":
    case "retrenchment":
      detailsDone = eventDate !== "" && !dateError && details.trim().length >= 3;
      break;
    case "refund":
      detailsDone = details.trim().length >= 3;
      break;
    case "maturity":
    case "surrender":
    case "cashback":
      detailsDone = true;
      break;
  }
  const docsDone = Boolean(idDoc) && requiredDocs.every((d) => docs[d]);
  const ready = Boolean(type) && detailsDone && docsDone && Boolean(to) && truthful;

  const subject =
    type === "death" ? (member?.fullName ?? "") : type === "hospital-cash" ? (memberId === "holder" ? "You" : (member?.fullName ?? "")) : type === "school-fees" ? (child?.fullName ?? "") : (plan?.name ?? "");
  const claimAmount =
    type === "maturity" ? policy.sumAssured : type === "surrender" ? surrender : type === "loan" || type === "school-fees" ? asNumber(amount) : undefined;

  function chooseType(next: ClaimTypeId) {
    // A different claim needs different answers: clear what depended on the old one.
    setType(next);
    setEventDate("");
    setEndDate("");
    setAccidental("");
    setAmount("");
    setDetails("");
    setDocs({});
  }

  function authorised() {
    if (!type || !to) return;
    if (failRequests) {
      setScreen("failed");
      return;
    }
    const claim = fileClaim({ ownerId, policyId: policy.id, type, submittedOn: MOCK_TODAY, subject, payoutAccountId: to.id });
    setReference(claim.reference);
    setScreen("success");
  }

  if (screen === "success") {
    return (
      <PaymentSuccessScreen
        title="Claim submitted"
        message={`${PROVIDER} will review it and contact you within 48 hours, once every document is in. Approved claims are paid within 48 to 72 hours.`}
        receiptRows={[
          ["Claim reference", reference],
          ["Claim", type ? CLAIM_TYPES[type].label : ""],
          ["Policy", policy.number],
          ["Paid into", to ? `${to.name} · ${to.number}` : ""],
        ]}
        onPrimaryAction={() => router.push(base)}
        primaryActionLabel="Back to Policy"
        showSaveBeneficiary={false}
        customActionCards={[]}
      />
    );
  }
  if (screen === "failed") {
    return (
      <OutcomeFailure
        title="Your claim wasn’t sent"
        message="Nothing was submitted, and your answers are still here. Try again."
        onRetry={() => setScreen("review")}
        onLeave={() => router.push(base)}
        leaveLabel="Back to Policy"
      />
    );
  }

  if (screen === "review" && type) {
    const rows = [
      { label: "Policy", value: `${plan?.name} · ${policy.number}` },
      { label: "Claim", value: CLAIM_TYPES[type].label },
      ...(type === "death"
        ? [
            { label: "Name of deceased", value: member?.fullName ?? "" },
            { label: "Date of death", value: formatDate(eventDate), tabular: true },
            { label: "Place of death", value: place.trim() },
            { label: "Cause of death", value: cause.trim() },
          ]
        : []),
      ...(type === "school-fees"
        ? [
            { label: "Child", value: child?.fullName ?? "" },
            { label: "School", value: `${school.trim()} · ${level.trim()}` },
          ]
        : []),
      ...(type === "hospital-cash"
        ? [
            { label: "Admitted", value: subject },
            { label: "Dates", value: `${formatDate(eventDate)} to ${formatDate(endDate)}`, tabular: true },
          ]
        : []),
      { label: "Documents", value: `${1 + requiredDocs.length} uploaded`, tabular: true },
      { label: "Paid into", value: to ? `${to.name} · ${to.number}` : "" },
    ];
    return (
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6">
        <PageHeader title="Review and Confirm" backTo={{ href: base, label: "File a Claim", onClick: () => setScreen("form") }} />
        <div className="flex flex-col gap-5">
          <StepBar current={2} total={2} showCount />
          <ReviewSummary
            details={rows}
            total={claimAmount ? money(claimAmount) : "To be confirmed"}
            totalLabel={type === "surrender" ? "Estimated payout" : claimAmount ? "Claim amount" : "Amount"}
          />
          <p className="px-1 text-[13px] leading-relaxed text-muted-foreground">
            {type === "surrender"
              ? `Surrendering ends your cover. ${PROVIDER} confirms the final amount before anything is paid.`
              : `${PROVIDER} confirms the amount after reviewing your documents.`}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="h-11 flex-1 text-[15px]" onClick={() => setScreen("form")}>
              Back to Edit
            </Button>
            <Button type="button" className="h-11 flex-1 text-[16px]" onClick={() => setAuthOpen(true)}>
              Submit Claim
            </Button>
          </div>
        </div>
        <TransactionOtpModal
          open={authOpen}
          onOpenChange={setAuthOpen}
          onSuccess={() => {
            setAuthOpen(false);
            authorised();
          }}
        />
      </div>
    );
  }

  const children = policy.beneficiaries.map((b) => personOf(b.personId)).filter((p) => p !== undefined);

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6">
      <PageHeader title="File a Claim" backTo={{ href: base, label: plan?.name ?? "Policy" }} />
      <div className="flex flex-col gap-5">
        <StepBar current={1} total={2} showCount />
        <section className="flex flex-col gap-2 px-1">
          <p className="text-[13px] text-foreground">{type === "death" ? "We’re sorry for your loss. To make this claim, have these ready:" : "To make a claim, have these ready:"}</p>
          <ul className="flex flex-col gap-2">
            {(type ? ["A valid ID", ...requiredDocs] : (plan?.claimChecklist ?? [])).map((item) => (
              <li key={item} className="flex items-start gap-2 text-[13px] text-muted-foreground">
                <Check size={15} aria-hidden="true" className="mt-0.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        <Field label="Claim Type">
          <Select value={type} onValueChange={(v) => v && chooseType(v as ClaimTypeId)}>
            <SelectTrigger aria-label="Claim type">
              <SelectValue placeholder="Select claim type">{type ? CLAIM_TYPES[type].label : undefined}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {types.map((t) => (
                <SelectItem key={t} value={t} label={CLAIM_TYPES[t].label}>
                  <div className="flex flex-col py-0.5 text-left">
                    <span className="text-foreground">{CLAIM_TYPES[t].label}</span>
                    <span className="max-w-[22rem] whitespace-normal text-[12px] font-normal text-muted-foreground">{CLAIM_TYPES[t].detail}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {/* What happened */}
        {type === "death" && (
          <div className={reveal}>
            <Field label="Who Has Died?">
              <Select value={memberId} onValueChange={(v) => v && setMemberId(v)}>
                <SelectTrigger aria-label="Who has died">
                  <SelectValue placeholder="Select person">{member ? member.fullName : undefined}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {policy.members.map((m) => (
                    <SelectItem key={m.id} value={m.id} label={m.fullName}>
                      {`${m.fullName} · ${m.relationship}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Date of Death" htmlFor="claim-date" error={dateError}>
              <Input id="claim-date" type="date" value={eventDate} max={MOCK_TODAY} onChange={(e) => setEventDate(e.target.value)} />
            </Field>
            <Field label="Place of Death" htmlFor="claim-place">
              <Input id="claim-place" value={place} onChange={(e) => setPlace(e.target.value)} placeholder="For example, Korle Bu Teaching Hospital" />
            </Field>
            <Field label="Cause of Death" htmlFor="claim-cause">
              <Input id="claim-cause" value={cause} onChange={(e) => setCause(e.target.value)} />
            </Field>
            <Field label="Was the Death Accidental?">
              <SegmentedControl<YesNo> aria-label="Was the death accidental" options={YES_NO} value={accidental} onChange={setAccidental} fullWidth />
            </Field>
            {withinWaiting && (
              <p className="px-1 text-[13px] leading-relaxed text-warning-text">
                {`This was within the first ${WAITING_PERIOD_DAYS} days of cover, when only accidental deaths are paid. You can still submit, and ${PROVIDER} will review it.`}
              </p>
            )}
          </div>
        )}

        {type === "hospital-cash" && (
          <div className={reveal}>
            <Field label="Who Was Admitted?">
              <Select value={memberId} onValueChange={(v) => v && setMemberId(v)}>
                <SelectTrigger aria-label="Who was admitted">
                  <SelectValue placeholder="Select person">{memberId === "holder" ? "You" : member?.fullName}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="holder" label="You">
                    You
                  </SelectItem>
                  {policy.members.map((m) => (
                    <SelectItem key={m.id} value={m.id} label={m.fullName}>
                      {`${m.fullName} · ${m.relationship}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Date Admitted" htmlFor="claim-admitted" error={dateError}>
              <Input id="claim-admitted" type="date" value={eventDate} max={MOCK_TODAY} onChange={(e) => setEventDate(e.target.value)} />
            </Field>
            <Field label="Date Discharged" htmlFor="claim-discharged" error={endDate !== "" && eventDate !== "" && endDate < eventDate ? "That’s before the date admitted." : null}>
              <Input id="claim-discharged" type="date" value={endDate} max={MOCK_TODAY} onChange={(e) => setEndDate(e.target.value)} />
            </Field>
          </div>
        )}

        {type === "school-fees" && (
          <div className={reveal}>
            <Field label="Child">
              <Select value={childId} onValueChange={(v) => v && setChildId(v)}>
                <SelectTrigger aria-label="Child">
                  <SelectValue placeholder="Select child">{child?.fullName}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {children.map((p) => (
                    <SelectItem key={p.id} value={p.id} label={p.fullName}>
                      {`${p.fullName} · ${p.relationship}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Name of School" htmlFor="claim-school">
              <Input id="claim-school" value={school} onChange={(e) => setSchool(e.target.value)} placeholder="For example, Achimota School" />
            </Field>
            <Field label="Class or Level" htmlFor="claim-level">
              <Input id="claim-level" value={level} onChange={(e) => setLevel(e.target.value)} placeholder="For example, SHS 2" />
            </Field>
            <AmountInput value={amount} onChange={setAmount} label="Fees for This Term" />
          </div>
        )}

        {type === "loan" && (
          <div className={reveal}>
            <AmountInput
              value={amount}
              onChange={setAmount}
              label="How Much Do You Want to Borrow?"
              hasError={Boolean(loanError)}
              error={loanError ? <InlineError message={loanError} className="text-left" /> : undefined}
            />
            <p className="-mt-3 px-1 text-[12px] text-muted-foreground">{`Up to ${money(loanMax)}. ${PROVIDER} sets the interest when it approves.`}</p>
          </div>
        )}

        {(type === "maturity" || type === "surrender") && (
          <div className={reveal}>
            <FactsPanel
              rows={
                type === "maturity"
                  ? [["Sum assured", money(policy.sumAssured)], ["Matured", formatDate(maturityOf(policy) ?? "")]]
                  : [
                      ["Estimated payout", money(surrender)],
                      ["Premiums paid", money(policy.payments.reduce((n, p) => n + p.amount, 0))],
                      ["Your cover", "Ends when it’s paid"],
                    ]
              }
            />
          </div>
        )}

        {(type === "disability" || type === "critical-illness" || type === "accident" || type === "retrenchment") && (
          <div className={reveal}>
            <Field label={type === "retrenchment" ? "Date You Lost Your Job" : type === "accident" ? "Date of the Accident" : "Date Diagnosed"} htmlFor="claim-date" error={dateError}>
              <Input id="claim-date" type="date" value={eventDate} max={MOCK_TODAY} onChange={(e) => setEventDate(e.target.value)} />
            </Field>
            <Field label={type === "retrenchment" ? "Employer" : "What Happened?"} htmlFor="claim-details">
              {type === "retrenchment" ? (
                <Input id="claim-details" value={details} onChange={(e) => setDetails(e.target.value)} />
              ) : (
                <Textarea id="claim-details" value={details} onChange={(e) => setDetails(e.target.value)} placeholder="In a few words" />
              )}
            </Field>
          </div>
        )}

        {type === "refund" && (
          <div className={reveal}>
            <Field label="What Should Be Refunded?" htmlFor="claim-details">
              <Textarea id="claim-details" value={details} onChange={(e) => setDetails(e.target.value)} placeholder="For example, the premium taken twice in August" />
            </Field>
          </div>
        )}

        {/* Documents */}
        {type && detailsDone && (
          <div className={reveal}>
            <p className="px-1 text-[13px] text-muted-foreground">Each document must be clear and fully visible.</p>
            <SignatureUpload label="Valid ID of Claimant" file={idDoc} onChange={setIdDoc} />
            {requiredDocs.map((d) => (
              <SignatureUpload key={d} label={d} file={docs[d] ?? null} onChange={(f) => setDocs({ ...docs, [d]: f })} />
            ))}
          </div>
        )}

        {/* Where the money goes */}
        {type && detailsDone && docsDone && (
          <div className={reveal}>
            <FromAccountSelector accounts={accounts} value={toId} onChange={setPickedTo} label="Pay Into" />
            <label className="flex cursor-pointer items-start gap-2 px-1 py-2 text-[13px] leading-relaxed text-foreground">
              <Checkbox checked={truthful} onCheckedChange={(v) => setTruthful(Boolean(v))} aria-label="Confirm the information is true" className="mt-0.5" />
              <span>I confirm that all the information I’ve given is true and accurate.</span>
            </label>
          </div>
        )}

        <ProceedButton disabled={!ready} onClick={() => setScreen("review")} />
      </div>
    </div>
  );
}

export function ClaimFlow({ policyId }: { policyId: string }) {
  const hydrated = useInsuranceHydrated();
  const { policy } = usePolicy(policyId);
  if (!hydrated) return <FormPageSkeleton fields={3} />;
  if (!policy) return <PolicyNotFound title="File a Claim" />;
  if (policy.status === "pending-medical") {
    return (
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6">
        <PageHeader title="File a Claim" backTo={{ href: `/insure/policies/${policy.id}`, label: "Policy" }} />
        <TrueEmptyState
          title="This policy hasn’t started yet"
          description="Claims open once your medical assessment is done and your cover is confirmed."
          action={
            <Button nativeButton={false} render={<Link href={`/insure/policies/${policy.id}`} />}>
              Back to Policy
            </Button>
          }
        />
      </div>
    );
  }
  return <ClaimForm policy={policy} />;
}
