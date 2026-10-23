"use client";

/**
 * Insure → a plan → Get Started. One flow for all four plans, from the bancassurance Figma's Purchase rows:
 *
 *   quote → beneficiaries (and a trustee if one is under 18) → review → one-time code → outcome
 *
 * The quote is where the plans differ:
 *  - WealthMaster and Child Education (savings): pick the premium or the benefit you want, and the term; the other
 *    figure follows.
 *  - Ultimate Protection: pick the term, then the sum assured from four, each showing what it costs.
 *  - HomeCall (funeral): pick a cover level, and add the people you want covered, each at their own level.
 *
 * Figma has a Calculate button and a separate From Account screen. Here the premium is simply there as soon as the
 * inputs are valid, and the account sits at the top of the form. Nothing is taken today: the review says exactly when
 * the first premium is deducted. Figma authorises with a PIN; here it is the one-time code every payment uses.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, ShieldCheck, X } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { InlineError } from "@/components/ui/inline-error";
import { Input } from "@/components/ui/input";
import { ListCard } from "@/components/ui/list-card";
import { OptionTile } from "@/components/ui/option-tile";
import { ReviewSummary } from "@/components/ui/review-summary";
import { SectionHeading } from "@/components/ui/section-heading";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormPageSkeleton } from "@/components/states/PageSkeletons";
import { TrueEmptyState } from "@/components/states/ListStates";
import TransactionOtpModal from "@/components/payments/TransactionOtpModal";
import { PaymentSuccessScreen } from "@/components/payments/PaymentSuccessScreen";
import { AmountInput, FromAccountSelector, ProceedButton } from "@/components/payments/flows/shared";
import { AuthSummary } from "@/components/invest/parts";
import { OutcomeFailure } from "@/components/invest/term-deposit-parts";
import { BeneficiaryEditor, beneficiariesReady } from "@/components/insure/BeneficiaryEditor";
import { perPeriod } from "@/components/insure/parts";
import { formatDate, formatMoney } from "@/lib/mock-data";
import { sumMoney } from "@/lib/money";
import { useSession } from "@/lib/session-store";
import { useCustomerAccounts } from "@/lib/use-customer-accounts";
import { useTreasuryAccounts } from "@/lib/treasury";
import {
  COVER_TIERS,
  DEDUCTION_WINDOWS,
  FREQUENCIES,
  HOLDER_AGES,
  INCREMENTS,
  MEMBER_RULES,
  MIN_MONTHLY_PREMIUM,
  NON_MEDICAL_LIMIT,
  PROTECTION_BENEFIT_AGE,
  PROTECTION_SUMS,
  PROVIDER,
  WAITING_PERIOD_DAYS,
  findPlan,
  findTier,
  type CoverTierId,
  type DeductionWindow,
  type Frequency,
  type MemberRelationship,
  type PlanId,
} from "@/lib/insurance-plans";
import {
  ageOn,
  bankRecordOf,
  firstDeductionLabel,
  funeralMonthly,
  maturityOf,
  memberMonthly,
  monthLabel,
  perPayment,
  protectionAnnual,
  savingsAnnualFor,
  savingsSumAssured,
  startMonths,
  toAnnual,
  useInsurance,
  useInsuranceHydrated,
  useMyInsurance,
  type BeneficiaryShare,
  type CoveredMember,
  type Policy,
} from "@/lib/insurance";

type Screen = "quote" | "beneficiaries" | "review" | "success" | "failed";
type Basis = "monthly" | "yearly" | "sum";

const BASES: readonly { value: Basis; label: string }[] = [
  { value: "monthly", label: "Monthly Premium" },
  { value: "yearly", label: "Yearly Premium" },
  { value: "sum", label: "Sum Assured" },
];
const MEMBER_KINDS = Object.keys(MEMBER_RULES) as MemberRelationship[];
const GENDERS = [
  { value: "Female", label: "Female" },
  { value: "Male", label: "Male" },
] as const;
/** Age used to price a customer the bank has no date of birth for. */
const DEFAULT_AGE = 35;

const asNumber = (v: string) => Number(String(v).replace(/[^0-9.]/g, "")) || 0;
const money = (n: number) => formatMoney(n, "GHS", true);
const reveal = "flex flex-col gap-5 animate-in fade-in slide-in-from-top-2 duration-200";
const years = (min: number, max: number) => Array.from({ length: max - min + 1 }, (_, i) => min + i);

/** One label/value line in the live result under the quote. */
function ResultRows({ rows }: { rows: Array<[string, string]> }) {
  return (
    <dl className="flex flex-col gap-2 px-1 text-[14px]">
      {rows.map(([label, value], i) => (
        <div key={`${i}-${label}`} className="flex items-baseline justify-between gap-5">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="tabular text-right text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ── HomeCall: adding someone to the cover ─────────────────────────────────── */

function MemberForm({ onAdd, onCancel }: { onAdd: (m: CoveredMember) => void; onCancel: () => void }) {
  const [relationship, setRelationship] = useState<MemberRelationship | "">("");
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<"Female" | "Male" | "">("");
  const [tier, setTier] = useState<CoverTierId | "">("");

  const rule = relationship ? MEMBER_RULES[relationship] : undefined;
  const age = dob ? ageOn(dob) : null;
  const ageError =
    rule && age !== null
      ? dob > new Date().toISOString().slice(0, 10) || age < 0
        ? "That date is in the future."
        : age < rule.min || age > rule.max
          ? `Must be ${rule.min} to ${rule.max} years old to be covered.`
          : null
      : null;
  const ready = Boolean(relationship) && fullName.trim().split(/\s+/).length >= 2 && dob !== "" && !ageError && gender !== "" && tier !== "";

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-border p-3 animate-in fade-in slide-in-from-top-2 duration-200 sm:p-4">
      <Field label="Relationship">
        <Select value={relationship} onValueChange={(v) => v && setRelationship(v as MemberRelationship)}>
          <SelectTrigger aria-label="Relationship">
            <SelectValue placeholder="Select relationship" />
          </SelectTrigger>
          <SelectContent>
            {MEMBER_KINDS.map((k) => (
              <SelectItem key={k} value={k}>
                {k}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      {relationship && (
        <div className={reveal}>
          <Field label="Full Name" htmlFor="member-name">
            <Input id="member-name" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="off" placeholder="As on their ID" />
          </Field>
          <Field label="Date of Birth" htmlFor="member-dob" hint={rule ? `From ${rule.min} to ${rule.max} years` : undefined} error={ageError}>
            <Input id="member-dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
          </Field>
          <Field label="Gender">
            <SegmentedControl<"Female" | "Male" | ""> aria-label="Gender" options={GENDERS} value={gender} onChange={setGender} fullWidth />
          </Field>
          <Field label="Their Cover">
            <Select value={tier} onValueChange={(v) => v && setTier(v as CoverTierId)}>
              <SelectTrigger aria-label="Their cover">
                <SelectValue placeholder="Select cover" />
              </SelectTrigger>
              <SelectContent>
                {COVER_TIERS.map((t) => (
                  <SelectItem key={t.id} value={t.id} label={`${t.label} · ${money(t.benefit)}`}>
                    <span className="flex w-full items-baseline justify-between gap-4">
                      <span>{`${t.label} · ${money(t.benefit)}`}</span>
                      <span className="tabular text-muted-foreground">{`${money(memberMonthly(t.id, relationship))} a month`}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      )}
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="h-10 flex-1 rounded-xl" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          className="h-10 flex-1 rounded-xl"
          disabled={!ready}
          onClick={() =>
            relationship &&
            gender &&
            tier &&
            onAdd({ id: `cm-${Date.now()}`, relationship, fullName: fullName.trim(), dateOfBirth: dob, gender, tier })
          }
        >
          Add to Cover
        </Button>
      </div>
    </div>
  );
}

/* ── The flow ─────────────────────────────────────────────────────────────── */

export function BuyPlanFlow({ planId }: { planId: PlanId }) {
  const router = useRouter();
  const plan = findPlan(planId);
  const hydrated = useInsuranceHydrated();
  const actor = useSession((s) => s.actor);
  const { ownerId, profile, people } = useMyInsurance();
  const buy = useInsurance((s) => s.buy);
  const failRequests = useInsurance((s) => s.failRequests);
  const accounts = useTreasuryAccounts();
  const { defaultId } = useCustomerAccounts();

  const [screen, setScreen] = useState<Screen>("quote");
  const [pickedFrom, setPickedFrom] = useState("");
  // Savings
  const [basis, setBasis] = useState<Basis>("monthly");
  const [amount, setAmount] = useState("");
  const [sumFrequency, setSumFrequency] = useState<Frequency>("monthly");
  // Savings and protection
  const [term, setTerm] = useState<number | null>(null);
  const [protectionSum, setProtectionSum] = useState<number | null>(null);
  // Funeral
  const [tier, setTier] = useState<CoverTierId | null>(null);
  const [members, setMembers] = useState<CoveredMember[]>([]);
  const [addingMember, setAddingMember] = useState(false);
  // Everyone
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [increment, setIncrement] = useState(0);
  const [startMonth, setStartMonth] = useState("");
  const [window, setWindow] = useState<DeductionWindow | "">("");
  const [accepted, setAccepted] = useState(false);
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryShare[]>([]);
  const [trusteeId, setTrusteeId] = useState<string | undefined>();
  const [authOpen, setAuthOpen] = useState(false);
  const [bought, setBought] = useState<Policy | null>(null);

  const fromId = useMemo(() => {
    if (pickedFrom && accounts.some((a) => a.id === pickedFrom)) return pickedFrom;
    return accounts.find((a) => a.id === defaultId)?.id ?? accounts[0]?.id ?? "";
  }, [pickedFrom, accounts, defaultId]);
  const from = accounts.find((a) => a.id === fromId);

  const record = bankRecordOf(actor?.id);
  const age = record ? ageOn(record.dateOfBirth) : DEFAULT_AGE;
  const planHref = `/insure/plans/${planId}`;
  const back = { href: planHref, label: plan?.name ?? "Plan" };

  if (!plan || !plan.kind) return null;
  if (!hydrated) return <FormPageSkeleton fields={4} />;

  if (!profile) {
    const next = `/insure/plans/${planId}/buy`;
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={plan.name} backTo={back} />
        <TrueEmptyState
          icon={<ShieldCheck size={22} strokeWidth={1.8} />}
          title="Create your insurance profile first"
          description="Every plan uses it, so you only do it once. We’ll bring you back here when it’s done."
          action={
            <Button nativeButton={false} render={<Link href={`/insure/profile?next=${encodeURIComponent(next)}&label=${encodeURIComponent(plan.name)}`} />}>
              Create Profile
            </Button>
          }
        />
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={plan.name} backTo={back} />
        <TrueEmptyState
          title="You need an account to pay premiums from"
          description="Premiums are deducted in cedis from an active current or savings account."
        />
      </div>
    );
  }

  /* ── The quote ──────────────────────────────────────────────────────── */
  const kind = plan.kind;
  const termRange = plan.term ?? { min: 1, max: 1 };
  // Protection must end by the benefit age, so longer terms drop off for older customers.
  const termChoices = years(termRange.min, kind === "protection" ? Math.min(termRange.max, PROTECTION_BENEFIT_AGE - age) : termRange.max);
  const holderTooOld = kind === "funeral" && record && (age < HOLDER_AGES.min || age > HOLDER_AGES.max);
  const noTerms = kind === "protection" && termChoices.length === 0;

  let annual = 0;
  let sumAssured = 0;
  let payFrequency: Frequency = frequency;
  let amountError: string | null = null;

  if (kind === "savings") {
    const n = asNumber(amount);
    payFrequency = basis === "monthly" ? "monthly" : basis === "yearly" ? "annually" : sumFrequency;
    if (term && n > 0) {
      if (basis === "sum") {
        sumAssured = n;
        annual = savingsAnnualFor(n, term, increment);
      } else {
        annual = basis === "monthly" ? toAnnual(n, "monthly") : n;
        sumAssured = savingsSumAssured(annual, term, increment);
      }
      if (annual < MIN_MONTHLY_PREMIUM * 12) {
        amountError =
          basis === "sum"
            ? `That works out under the ${money(MIN_MONTHLY_PREMIUM)} monthly minimum. Choose a bigger sum or a shorter term.`
            : `The minimum premium is ${money(MIN_MONTHLY_PREMIUM)} a month (${money(MIN_MONTHLY_PREMIUM * 12)} a year).`;
      }
    }
  } else if (kind === "protection") {
    if (term && protectionSum) {
      sumAssured = protectionSum;
      annual = protectionAnnual(protectionSum, age, term);
    }
  } else if (tier) {
    annual = toAnnual(funeralMonthly(tier, members), "monthly");
    sumAssured = sumMoney([findTier(tier).benefit, ...members.map((m) => findTier(m.tier).benefit)]);
  }

  const premium = perPayment(annual, payFrequency);
  const coverChosen = kind === "funeral" ? Boolean(tier) : kind === "protection" ? Boolean(term && protectionSum) : Boolean(term && asNumber(amount) > 0);
  const priced = coverChosen && annual > 0 && !amountError && !holderTooOld;
  const scheduled = Boolean(startMonth && window);
  const quoteReady = priced && scheduled && accepted && Boolean(from) && !addingMember;
  const needsMedical = sumAssured > NON_MEDICAL_LIMIT;
  const monthly = payFrequency === "monthly";
  const premiumLabel = monthly ? "Premium a month" : "Premium a year";
  const firstDeduction = scheduled && window ? firstDeductionLabel(startMonth, window) : "";

  function reset() {
    setScreen("quote");
    setAmount("");
    setTerm(null);
    setProtectionSum(null);
    setTier(null);
    setMembers([]);
    setStartMonth("");
    setWindow("");
    setAccepted(false);
    setBeneficiaries([]);
    setTrusteeId(undefined);
    setBought(null);
  }

  function authorised() {
    if (!from || !window) return;
    if (failRequests) {
      setScreen("failed");
      return;
    }
    const policy = buy({
      ownerId,
      planId,
      premium,
      frequency: payFrequency,
      increment,
      sumAssured,
      termYears: kind === "funeral" ? undefined : (term ?? undefined),
      tier: tier ?? undefined,
      members,
      startMonth,
      window,
      accountId: from.id,
      beneficiaries,
      trusteeId: beneficiaries.length ? trusteeId : undefined,
    });
    setBought(policy);
    setScreen("success");
  }

  /* ── Outcomes ───────────────────────────────────────────────────────── */
  if (screen === "success" && bought) {
    const pending = bought.status === "pending-medical";
    return (
      <PaymentSuccessScreen
        title={pending ? "Application received" : "Policy purchased"}
        message={
          pending
            ? `A ${PROVIDER} representative will call you to arrange a medical assessment. Nothing is deducted until your cover is confirmed.`
            : `Your ${plan.name} is in place. Your first premium is deducted between ${firstDeduction}.`
        }
        receiptRows={[
          ["Policy Number", bought.number],
          ["Plan", plan.name],
          ["Premium", perPeriod(bought.premium, bought.frequency)],
          ["Sum Assured", money(bought.sumAssured)],
          ["Provider", PROVIDER],
        ]}
        showSaveBeneficiary={false}
        customActionCards={[]}
        onPrimaryAction={() => router.push(`/insure/policies/${bought.id}`)}
        primaryActionLabel="View Policy"
        onSecondaryAction={() => router.push("/insure")}
        secondaryActionLabel="Back to Insure"
      />
    );
  }
  if (screen === "failed") {
    return (
      <OutcomeFailure
        title="Your policy wasn’t set up"
        message="Nothing was taken from your account and no policy was created. Check the details and try again."
        onRetry={() => setScreen("review")}
        onLeave={() => {
          reset();
          router.push(planHref);
        }}
        leaveLabel={`Back to ${plan.name}`}
      />
    );
  }

  /* ── Beneficiaries ──────────────────────────────────────────────────── */
  if (screen === "beneficiaries") {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Beneficiaries" backTo={{ ...back, label: plan.name, onClick: () => setScreen("quote") }} />
        <div className="mx-auto flex w-full max-w-[600px] flex-col gap-5">
          <p className="px-1 text-[13px] leading-relaxed text-muted-foreground">
            {kind === "funeral"
              ? "Who should receive the benefit if you die? You can change this at any time."
              : "Who should receive the sum assured if you die before the plan ends? You can change this at any time."}
          </p>
          <BeneficiaryEditor
            ownerId={ownerId}
            people={people}
            value={beneficiaries}
            onChange={setBeneficiaries}
            trusteeId={trusteeId}
            onTrusteeChange={setTrusteeId}
          />
          <ProceedButton disabled={!beneficiariesReady(beneficiaries, people, trusteeId)} onClick={() => setScreen("review")} />
        </div>
      </div>
    );
  }

  /* ── Review ─────────────────────────────────────────────────────────── */
  if (screen === "review" && window) {
    const personName = (id: string) => people.find((p) => p.id === id)?.fullName ?? "";
    const details = [
      { label: "Plan", value: plan.name },
      ...(kind === "funeral" && tier
        ? [{ label: "Your cover", value: `${findTier(tier).label} · ${money(findTier(tier).benefit)}` }]
        : [{ label: "Policy term", value: `${term} years`, tabular: true }]),
      ...members.map((m) => ({
        label: `${m.relationship}`,
        value: `${m.fullName} · ${findTier(m.tier).label} · ${money(memberMonthly(m.tier, m.relationship))} a month`,
      })),
      { label: kind === "funeral" ? "Total benefit" : "Sum assured", value: money(sumAssured), tabular: true },
      { label: "Yearly increase", value: INCREMENTS.find((i) => i.value === increment)?.label ?? "None" },
      { label: "Paid from", value: from ? `${from.name} · ${from.number}` : "" },
      { label: "First deduction", value: firstDeduction, tabular: true },
      ...beneficiaries.map((b) => ({ label: "Beneficiary", value: `${personName(b.personId)} · ${b.share}%`, tabular: true })),
      ...(trusteeId && beneficiaries.length ? [{ label: "Trustee", value: personName(trusteeId) }] : []),
    ];
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Review and Confirm" backTo={{ ...back, label: "Beneficiaries", onClick: () => setScreen("beneficiaries") }} />
        <div className="mx-auto flex w-full max-w-[600px] flex-col gap-5">
          <ReviewSummary details={details} total={money(premium)} totalLabel={premiumLabel} />
          <p className="px-1 text-[13px] leading-relaxed text-muted-foreground">
            {needsMedical
              ? `The sum assured is above ${money(NON_MEDICAL_LIMIT)}, so ${PROVIDER} needs a medical assessment first. A representative will call you, and nothing is deducted until your cover is confirmed.`
              : monthly
                ? `Nothing is taken today. Your first premium of ${money(premium)} is deducted between ${firstDeduction}, then every month. You can cancel at any time.`
                : `Nothing is taken today. Your first premium of ${money(premium)} is deducted between ${firstDeduction}, then every year. You can cancel at any time.`}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="h-11 flex-1 rounded-2xl text-[15px]" onClick={() => setScreen("quote")}>
              Back to Edit
            </Button>
            <Button type="button" className="h-11 flex-1 rounded-2xl text-[16px]" onClick={() => setAuthOpen(true)}>
              Confirm
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
          summary={
            <AuthSummary
              headline={`Buy the ${plan.name}`}
              amount={perPeriod(premium, payFrequency)}
              rows={[
                ["From", from ? `${from.name} · ${from.number}` : ""],
                ["First deduction", firstDeduction],
              ]}
            />
          }
        />
      </div>
    );
  }

  /* ── Quote form ─────────────────────────────────────────────────────── */
  const resultRows: Array<[string, string]> = priced
    ? [
        ...(kind === "funeral" && tier
          ? ([
              ["You", `${money(memberMonthly(tier))} a month`],
              ...members.map((m) => [m.fullName, `${money(memberMonthly(m.tier, m.relationship))} a month`] as [string, string]),
            ] as Array<[string, string]>)
          : []),
        [premiumLabel, money(premium)],
        [kind === "funeral" ? "Total benefit" : "Sum assured", money(sumAssured)],
      ]
    : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={plan.name} backTo={back} />
      <div className="mx-auto flex w-full max-w-[600px] flex-col gap-5 animate-in fade-in duration-200">
        <div className="flex flex-col gap-2">
          <FromAccountSelector accounts={accounts} value={fromId} onChange={setPickedFrom} label="Pay Premiums From" />
          <p className="px-1 text-[12px] text-muted-foreground">Nothing is taken today. Premiums start in the month you choose below.</p>
        </div>

        {holderTooOld && (
          <InlineError message={`HomeCall covers policyholders aged ${HOLDER_AGES.min} to ${HOLDER_AGES.max}. You can still be added to a relative’s cover.`} className="text-left" />
        )}
        {noTerms && <InlineError message={`This plan has to end by age ${PROTECTION_BENEFIT_AGE}, which leaves no term we can offer you.`} className="text-left" />}

        {/* What the plan covers */}
        {kind === "savings" && (
          <>
            <Field label="Calculate By">
              <SegmentedControl
                aria-label="Calculate by"
                options={BASES}
                value={basis}
                onChange={(v) => {
                  setBasis(v);
                  setAmount("");
                }}
                fullWidth
              />
            </Field>
            <Field label="Policy Term" hint={`From ${termRange.min} to ${termRange.max} years`}>
              <Select value={term ? String(term) : ""} onValueChange={(v) => v && setTerm(Number(v))}>
                <SelectTrigger aria-label="Policy term">
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  {termChoices.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {`${y} years`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {term && (
              <div className={reveal}>
                <AmountInput
                  value={amount}
                  onChange={setAmount}
                  label={BASES.find((b) => b.value === basis)?.label}
                  hasError={Boolean(amountError)}
                  error={amountError ? <InlineError message={amountError} className="text-left" /> : undefined}
                />
                {basis === "sum" && (
                  <Field label="Payment Frequency">
                    <SegmentedControl aria-label="Payment frequency" options={FREQUENCIES} value={sumFrequency} onChange={setSumFrequency} fullWidth />
                  </Field>
                )}
              </div>
            )}
          </>
        )}

        {kind === "protection" && !noTerms && (
          <>
            <Field label="Policy Term" hint={`Pays a disability income up to age ${PROTECTION_BENEFIT_AGE}.`}>
              <Select value={term ? String(term) : ""} onValueChange={(v) => v && setTerm(Number(v))}>
                <SelectTrigger aria-label="Policy term">
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  {termChoices.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {`${y} years`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {term && (
              <div className={reveal}>
                <Field label="Sum Assured">
                  <div role="radiogroup" aria-label="Sum assured" className="flex flex-col gap-2">
                    {PROTECTION_SUMS.map((s) => (
                      <OptionTile
                        key={s}
                        title={money(s)}
                        value={`${money(perPayment(protectionAnnual(s, age, term), "monthly"))} a month`}
                        selected={protectionSum === s}
                        onSelect={() => setProtectionSum(s)}
                      />
                    ))}
                  </div>
                </Field>
                <Field label="Payment Frequency">
                  <SegmentedControl aria-label="Payment frequency" options={FREQUENCIES} value={frequency} onChange={setFrequency} fullWidth />
                </Field>
              </div>
            )}
          </>
        )}

        {kind === "funeral" && !holderTooOld && (
          <>
            <Field label="Your Cover" hint={`Deaths from natural causes are covered after ${WAITING_PERIOD_DAYS} days, accidents from day one.`}>
              <div role="radiogroup" aria-label="Your cover" className="flex flex-col gap-2">
                {COVER_TIERS.map((t) => (
                  <OptionTile
                    key={t.id}
                    title={t.label}
                    detail={`${money(t.benefit)} benefit`}
                    value={`${money(t.monthly)} a month`}
                    selected={tier === t.id}
                    onSelect={() => setTier(t.id)}
                  />
                ))}
              </div>
            </Field>
            {tier && (
              <section className={reveal}>
                <SectionHeading title="People on This Cover" />
                {members.length > 0 && (
                  <ListCard>
                    {members.map((m) => (
                      <li key={m.id} className="flex items-center gap-3 rounded-xl px-2 py-2 sm:px-3">
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-[14px] text-foreground" translate="no">
                            {m.fullName}
                          </span>
                          <span className="truncate text-[12px] text-muted-foreground">{`${m.relationship} · ${findTier(m.tier).label} · ${money(findTier(m.tier).benefit)}`}</span>
                        </span>
                        <span className="tabular shrink-0 text-[14px] text-foreground">{`${money(memberMonthly(m.tier, m.relationship))} a month`}</span>
                        <button
                          type="button"
                          onClick={() => setMembers(members.filter((x) => x.id !== m.id))}
                          aria-label={`Remove ${m.fullName}`}
                          className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <X size={16} strokeWidth={1.8} aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ListCard>
                )}
                {addingMember ? (
                  <MemberForm
                    onAdd={(m) => {
                      setMembers([...members, m]);
                      setAddingMember(false);
                    }}
                    onCancel={() => setAddingMember(false)}
                  />
                ) : (
                  <Button type="button" variant="outline" className="h-10 w-full rounded-xl" onClick={() => setAddingMember(true)}>
                    <Plus size={16} strokeWidth={1.8} aria-hidden="true" />
                    {members.length === 0 ? "Add Someone to This Cover" : "Add Another Person"}
                  </Button>
                )}
                {members.length === 0 && !addingMember && (
                  <p className="-mt-3 px-1 text-[12px] text-muted-foreground">Optional. Your spouse, children up to 23, parents and other family.</p>
                )}
                <Field label="Payment Frequency">
                  <SegmentedControl aria-label="Payment frequency" options={FREQUENCIES} value={frequency} onChange={setFrequency} fullWidth />
                </Field>
              </section>
            )}
          </>
        )}

        {/* When it is paid */}
        {coverChosen && !amountError && (
          <div className={reveal}>
            <Field label="Yearly Increase" hint="Your premium goes up by this much each year, and so does what the plan pays.">
              <SegmentedControl
                aria-label="Yearly increase"
                options={INCREMENTS.map((i) => ({ value: String(i.value), label: i.label }))}
                value={String(increment)}
                onChange={(v) => setIncrement(Number(v))}
                fullWidth
              />
            </Field>
            <Field label="First Deduction Month">
              <Select value={startMonth} onValueChange={(v) => v && setStartMonth(v)}>
                <SelectTrigger aria-label="First deduction month">
                  <SelectValue placeholder="Select month">{startMonth ? monthLabel(startMonth) : undefined}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {startMonths().map((m) => (
                    <SelectItem key={m} value={m} label={monthLabel(m)}>
                      {monthLabel(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Deduction Date">
              <SegmentedControl<DeductionWindow | "">
                aria-label="Deduction date"
                options={DEDUCTION_WINDOWS.map((w) => ({ value: w.value, label: w.label }))}
                value={window}
                onChange={setWindow}
                fullWidth
              />
            </Field>
          </div>
        )}

        {/* What it comes to */}
        {priced && scheduled && (
          <div className={reveal}>
            <ResultRows
              rows={[
                ...resultRows,
                ["First deduction", firstDeduction],
                ...(term && kind !== "funeral" ? ([["Matures", formatDate(maturityOf({ startMonth, termYears: term }) ?? "")]] as Array<[string, string]>) : []),
              ]}
            />
            {needsMedical && (
              <p className="px-1 text-[13px] leading-relaxed text-muted-foreground">
                {`This sum assured is above the ${money(NON_MEDICAL_LIMIT)} we can cover without a medical. You can still apply: a ${PROVIDER} representative will call you to arrange a medical assessment.`}
              </p>
            )}
            <label className="flex cursor-pointer items-start gap-2 px-1 py-2 text-[13px] leading-relaxed text-foreground">
              <Checkbox checked={accepted} onCheckedChange={(v) => setAccepted(Boolean(v))} aria-label="Accept the Terms and Conditions" className="mt-0.5" />
              <span>{`I have read and agree to the Terms & Conditions of the ${plan.name}, provided by ${PROVIDER}.`}</span>
            </label>
          </div>
        )}

        <ProceedButton disabled={!quoteReady} onClick={() => setScreen("beneficiaries")} />
        {priced && scheduled && !accepted && <p className="-mt-2 px-1 text-center text-[12px] text-muted-foreground">Agree to the terms to continue.</p>}
      </div>
    </div>
  );
}
