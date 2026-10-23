"use client";

/**
 * Pieces shared by the Insure screens, so a plan and a policy read the same wherever they appear: the plan icon, the
 * policy row, the "policy not found" state, the ledger line a premium payment posts, and the Dev Mode switches.
 */

import { useMemo } from "react";
import Link from "next/link";
import { Car, ChevronRight, FileText, GraduationCap, HandHeart, PiggyBank, Plane, ShieldCheck, ShieldPlus, Umbrella } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { TrueEmptyState } from "@/components/states/ListStates";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import type { DevStateGroup } from "@/components/providers/DevStateProvider";
import { formatDate, formatMoney, recordTransaction, type Account } from "@/lib/mock-data";
import { INSURE_HOME, PROVIDER, findPlan, type PlanId } from "@/lib/insurance-plans";
import type { Frequency } from "@/lib/insurance-plans";
import { sampleProfile, useInsurance, useMyInsurance, type Policy } from "@/lib/insurance";
import { useTreasuryAccounts } from "@/lib/treasury";
import { cn } from "@/lib/utils";

const PLAN_ICONS: Record<PlanId, typeof ShieldCheck> = {
  "child-education": GraduationCap,
  homecall: HandHeart,
  wealthmaster: PiggyBank,
  "ultimate-protection": ShieldPlus,
  "savings-protection": Umbrella,
  vehicle: Car,
  travel: Plane,
  "personal-accident": ShieldCheck,
};

export function PlanIcon({ planId, muted = false }: { planId: PlanId; muted?: boolean }) {
  const Icon = PLAN_ICONS[planId];
  return (
    <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted", muted ? "text-muted-foreground" : "text-foreground")}>
      <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
    </span>
  );
}

/**
 * Each plan has a colour of its own from the categorical set, so a plan is recognisable on the cards and in its dialog.
 * None is red: red means an error here, and a protection plan is not one.
 */
const PLAN_TONES: Partial<Record<PlanId, string>> = {
  "child-education": "var(--cat-1)",
  homecall: "var(--cat-2)",
  wealthmaster: "var(--cat-4)",
  "ultimate-protection": "var(--cat-5)",
};

/** The CSS variable a card or dialog sets as `--plan`; plans without a colour yet fall back to the muted fill. */
export const planToneStyle = (planId: PlanId) => ({ "--plan": PLAN_TONES[planId] ?? "var(--muted)" }) as React.CSSProperties;

/** The plan's icon on a disc of its colour. Dark glyph, as on any filled amber button. */
export function PlanDisc({ planId, size = 48, onColour = false, className }: { planId: PlanId; size?: number; onColour?: boolean; className?: string }) {
  const Icon = PLAN_ICONS[planId];
  return (
    <span
      style={{ ...planToneStyle(planId), width: size, height: size }}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full text-primary-foreground",
        // On a card already filled with the plan's colour the disc is a quiet circle of the dark glyph colour.
        onColour ? "bg-primary-foreground/12" : "bg-[var(--plan)]",
        className,
      )}
    >
      <Icon size={Math.round(size * 0.42)} strokeWidth={1.8} aria-hidden="true" />
    </span>
  );
}

/**
 * The picture slot on an "art" card. Until StarLife's illustrations arrive it is the plan's icon, large, on a tint of its
 * colour. Swap the contents here and every card follows.
 */
export function PlanArt({ planId, className }: { planId: PlanId; className?: string }) {
  const Icon = PLAN_ICONS[planId];
  return (
    <div
      style={planToneStyle(planId)}
      className={cn("flex items-center justify-center bg-[color-mix(in_srgb,var(--plan)_28%,var(--tile))] text-foreground", className)}
    >
      <Icon size={56} strokeWidth={1.4} aria-hidden="true" />
    </div>
  );
}

/** "GHS 500.00 a month" or "GHS 6,000.00 a year": one whole phrase per frequency, so each translates on its own. */
export function perPeriod(amount: number, frequency: Frequency, showAmounts = true) {
  const m = formatMoney(amount, "GHS", showAmounts);
  return frequency === "monthly" ? `${m} a month` : `${m} a year`;
}

export function premiumLine(p: Pick<Policy, "premium" | "frequency">, showAmounts = true) {
  return perPeriod(p.premium, p.frequency, showAmounts);
}

/** What the row says under the plan name: anything that needs attention first, otherwise the policy number. */
function policyMeta(p: Policy): string {
  if (p.status === "pending-medical") return "Waiting for a medical assessment";
  if (p.status === "cancel-requested") return "Cancellation requested";
  if (p.arrears.length > 0) return p.arrears.length === 1 ? "1 premium missed" : `${p.arrears.length} premiums missed`;
  return p.number;
}

export function PolicyRow({ policy, showAmounts }: { policy: Policy; showAmounts: boolean }) {
  const plan = findPlan(policy.planId);
  return (
    <li>
      <Link
        href={`/insure/policies/${policy.id}`}
        className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none sm:px-3"
      >
        <PlanIcon planId={policy.planId} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[14px] text-foreground">{plan?.name}</span>
          <span className="tabular truncate text-[12px] text-muted-foreground">{policyMeta(policy)}</span>
        </span>
        <span className="flex shrink-0 flex-col items-end">
          <span className="tabular text-[14px] text-foreground">{formatMoney(policy.sumAssured, "GHS", showAmounts)}</span>
          <span className="tabular text-[12px] text-muted-foreground">{premiumLine(policy, showAmounts)}</span>
        </span>
        <ChevronRight size={15} strokeWidth={1.8} aria-hidden="true" className="shrink-0 text-muted-foreground" />
      </Link>
    </li>
  );
}

/** A policy that isn't there (another customer's, or reset from Dev Mode). Says so and goes back to Insure. */
export function PolicyNotFound({ title = "Policy" }: { title?: string }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title} backTo={{ href: INSURE_HOME, label: "Insure" }} />
      <TrueEmptyState
        icon={<FileText size={22} strokeWidth={1.8} />}
        title="We couldn’t find this policy"
        description="Your other policies are still on your Insure page."
        action={
          <Button nativeButton={false} render={<Link href={INSURE_HOME} />}>
            Back to Insure
          </Button>
        }
      />
    </div>
  );
}

/**
 * Posts one line to the customer's ledger when missed premiums are paid, so it shows in Transactions and View Receipt
 * works. A premium is a bill paid to StarLife, not saving, so it goes on the Bills rail and in the Bills spending
 * category, with the policy number as the reference. Returns the transaction reference.
 */
export function postPremiumEntry({ amount, account, policy }: { amount: number; account: Account; policy: Policy }): string {
  const d = new Date();
  const trn = `TRN-${String(d.getTime()).slice(-8)}`;
  recordTransaction({
    id: trn,
    reference: trn,
    date: d.toISOString().slice(0, 10),
    time: d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    valueDate: d.toISOString().slice(0, 10),
    description: `Insurance premium · ${findPlan(policy.planId)?.name ?? "Policy"}`,
    counterparty: PROVIDER,
    counterpartyAccount: policy.number,
    accountId: account.id,
    currency: "GHS",
    amount,
    direction: "debit",
    kind: "single",
    state: "completed",
    paymentMethod: "bill",
    category: "Bills",
    channel: "Internet Banking",
    profileKind: account.profileKind ?? "RETAIL",
  });
  return trn;
}

/** "Due 12 Aug 2026" lines for missed premiums. */
export const dueLabel = (iso: string) => `Due ${formatDate(iso)}`;

/**
 * Dev Mode switches for the whole Insure area: a whole customer in one click (presets), the profile, how many policies
 * they hold, whether one has missed premiums, and whether new requests go through or fail.
 */
const PRESET_STATES = [
  { id: "new", label: "New customer (no profile)" },
  { id: "profile", label: "Profile, no policies" },
  { id: "insured", label: "Has policies" },
  { id: "arrears", label: "Has policies, one in arrears" },
];
const PROFILE_STATES = [
  { id: "none", label: "Not created" },
  { id: "done", label: "Created" },
];
const POLICY_STATES = [
  { id: "0", label: "None" },
  { id: "1", label: "One (WealthMaster)" },
  { id: "2", label: "Two (adds HomeCall)" },
  { id: "4", label: "All four" },
];
const ARREARS_STATES = [
  { id: "none", label: "Fully paid" },
  { id: "some", label: "Two premiums missed" },
];
const REQUEST_STATES = [
  { id: "succeed", label: "Go through" },
  { id: "fail", label: "Fail" },
];
const PROFILE_KEYS = ["none", "done"] as const;
const PROFILE_LABELS = { none: "No profile", done: "Profile created" };

export function InsureDevTools({
  states,
  value,
  onChange,
  labels,
  extraGroups,
}: {
  /** A page with a list passes its own list states (stable references). Without them the primary switch is the profile. */
  states?: readonly string[];
  value?: string;
  onChange?: (next: string) => void;
  labels?: Record<string, string>;
  /** Switches that belong to one page (memoised by the caller), shown after the customer switches. */
  extraGroups?: DevStateGroup[];
}) {
  const { ownerId, profile, policies } = useMyInsurance();
  const saveProfile = useInsurance((s) => s.saveProfile);
  const clearProfile = useInsurance((s) => s.clearProfile);
  const seedPolicies = useInsurance((s) => s.seedPolicies);
  const failRequests = useInsurance((s) => s.failRequests);
  const setFailRequests = useInsurance((s) => s.setFailRequests);
  const accounts = useTreasuryAccounts();
  const accountId = accounts[0]?.id ?? "";
  const count = policies.length;
  const inArrears = policies.some((p) => p.arrears.length > 0);

  const groups = useMemo<DevStateGroup[]>(() => {
    const setProfile = (on: boolean) => (on ? saveProfile(ownerId, sampleProfile()) : clearProfile(ownerId));
    const seed = (n: number, arrears: boolean) => {
      // Policies need a profile, so adding any creates one.
      if (n > 0) setProfile(true);
      seedPolicies(ownerId, accountId, n, arrears);
    };
    return [
      {
        label: "Presets",
        states: PRESET_STATES,
        value: "",
        onChange: (v) => {
          setFailRequests(false);
          if (v === "new") {
            seed(0, false);
            setProfile(false);
          }
          if (v === "profile") {
            seed(0, false);
            setProfile(true);
          }
          if (v === "insured") seed(4, false);
          if (v === "arrears") seed(4, true);
          toast.success("Customer reset.", { id: "insure-preset" });
        },
      },
      {
        label: "Insurance profile",
        states: PROFILE_STATES,
        value: profile ? "done" : "none",
        onChange: (v) => {
          if (v === "none") seed(0, false);
          setProfile(v === "done");
        },
      },
      {
        label: "Policies",
        states: POLICY_STATES,
        value: String(count >= 4 ? 4 : count),
        onChange: (v) => seed(Number(v), inArrears),
      },
      {
        label: "Premiums",
        states: ARREARS_STATES,
        value: inArrears ? "some" : "none",
        onChange: (v) => seed(Math.max(count, 1), v === "some"),
      },
      {
        label: "New requests",
        states: REQUEST_STATES,
        value: failRequests ? "fail" : "succeed",
        onChange: (v) => setFailRequests(v === "fail"),
      },
      ...(extraGroups ?? []),
    ];
  }, [ownerId, accountId, profile, count, inArrears, failRequests, saveProfile, clearProfile, seedPolicies, setFailRequests, extraGroups]);

  if (states && onChange && value !== undefined) {
    return <StateSwitcher section="Insure" states={states} value={value} onChange={onChange} labels={labels} groups={groups} />;
  }
  return (
    <StateSwitcher
      section="Insure"
      label="Profile"
      states={PROFILE_KEYS}
      value={profile ? "done" : "none"}
      onChange={(v) => (v === "done" ? saveProfile(ownerId, sampleProfile()) : clearProfile(ownerId))}
      labels={PROFILE_LABELS}
      groups={groups}
    />
  );
}
