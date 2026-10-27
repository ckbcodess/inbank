"use client";

/**
 * Pieces shared by the Insure screens, so a plan and a policy read the same wherever they appear: the plan icon, the
 * policy row, the "policy not found" state, the ledger line a premium payment posts, and the Dev Mode switches.
 */

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Car, ChevronRight, FileText, GraduationCap, HandCoins, HandHeart, Landmark, PiggyBank, Plane, ShieldCheck, ShieldPlus, Umbrella } from "@/components/ui/icons";
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

/** Anything that gets a card: an insurance plan, the salary advance on Loans, or a kind of investment on Invest. */
export type ProductKey = PlanId | "advance" | "term-deposits" | "treasury-bills" | "bonds";

const PLAN_ICONS: Record<ProductKey, typeof ShieldCheck> = {
  advance: HandCoins,
  "term-deposits": PiggyBank,
  "treasury-bills": FileText,
  bonds: Landmark,
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
const PLAN_TONES: Partial<Record<ProductKey, string>> = {
  advance: "var(--plan-art-advance-1)",
  "term-deposits": "var(--plan-art-term-deposits-1)",
  "treasury-bills": "var(--plan-art-treasury-bills-1)",
  bonds: "var(--plan-art-bonds-1)",
  // The insurance plans take the light stop of their picture's gradient, so the icons match the art.
  "child-education": "var(--plan-art-child-education-1)",
  homecall: "var(--plan-art-homecall-1)",
  wealthmaster: "var(--plan-art-wealthmaster-1)",
  "ultimate-protection": "var(--plan-art-ultimate-protection-1)",
};

/** The CSS variable a card or dialog sets as `--plan`; plans without a colour yet fall back to the muted fill. */
export const planToneStyle = (planId: ProductKey) => ({ "--plan": PLAN_TONES[planId] ?? "var(--muted)" }) as React.CSSProperties;

/** The plan's icon on a disc of its colour. Dark glyph, as on any filled amber button. */
export function PlanDisc({ planId, size = 48, onColour = false, className }: { planId: ProductKey; size?: number; onColour?: boolean; className?: string }) {
  const Icon = PLAN_ICONS[planId];
  return (
    <span
      style={{ ...planToneStyle(planId), "--tint": "var(--plan)", width: size, height: size } as React.CSSProperties}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full on-tint",
        // On a card already filled with the plan's colour the disc is a quiet circle of the dark glyph colour.
        onColour ? "bg-current/12" : "bg-[var(--plan)]",
        className,
      )}
    >
      <Icon size={Math.round(size * 0.42)} strokeWidth={1.8} aria-hidden="true" />
    </span>
  );
}

/**
 * The product's icon, large and faint, to crop into a card's corner (the card places it with `className`). It is the
 * product's own mark and sits behind the text, never under it: the card keeps its text clear of it.
 */
export function PlanMark({ planId, size = 150, className }: { planId: ProductKey; size?: number; className?: string }) {
  const Icon = PLAN_ICONS[planId];
  return <Icon size={size} strokeWidth={1.2} aria-hidden="true" className={cn("pointer-events-none absolute text-[var(--plan)]", className)} />;
}

/** Plans whose picture is a transparent cut-out on a gradient of its own (`--plan-art-<id>-1` and `-2` in globals.css). */
const PLAN_ART: Partial<Record<ProductKey, true>> = {
  "child-education": true,
  homecall: true,
  wealthmaster: true,
  "ultimate-protection": true,
  "treasury-bills": true,
  bonds: true,
  "term-deposits": true,
  advance: true,
};

const SCENES: Partial<Record<ProductKey, React.ReactNode>> = {
  advance: (
    <>
      <rect x="86" y="62" width="136" height="76" rx="8" className="fill-[var(--plan)]" />
      <rect x="98" y="74" width="112" height="52" rx="4" className="fill-none stroke-foreground/70" strokeWidth="2" />
      <circle cx="154" cy="100" r="16" className="fill-foreground/85" />
      <circle cx="114" cy="100" r="4" className="fill-foreground" />
      <circle cx="194" cy="100" r="4" className="fill-foreground" />
      <ellipse cx="256" cy="132" rx="24" ry="7" className="fill-foreground" />
      <ellipse cx="256" cy="120" rx="24" ry="7" className="fill-[var(--plan)]" />
      <ellipse cx="256" cy="108" rx="24" ry="7" className="fill-foreground" />
    </>
  ),
  "child-education": (
    <>
      <rect x="96" y="116" width="128" height="22" rx="4" className="fill-[var(--plan)]" />
      <rect x="104" y="96" width="112" height="20" rx="4" className="fill-foreground/80" />
      <rect x="92" y="76" width="120" height="20" rx="4" className="fill-[var(--plan)] opacity-70" />
      <path d="M152 22l56 20-56 20-56-20z" className="fill-foreground" />
      <path d="M124 54v12c18 10 42 10 60 0V54l-30 11z" className="fill-foreground/70" />
      <path d="M208 42v22" className="fill-none stroke-foreground" strokeWidth="3" strokeLinecap="round" />
      <circle cx="208" cy="68" r="4" className="fill-foreground" />
    </>
  ),
  homecall: (
    <>
      <rect x="108" y="88" width="104" height="52" className="fill-[var(--plan)]" />
      <path d="M92 90L160 32l68 58z" className="fill-foreground" />
      <rect x="148" y="104" width="24" height="36" rx="3" className="fill-foreground" />
      <path d="M160 78c-9-7-14-11-14-16a7 7 0 0114-2 7 7 0 0114 2c0 5-5 9-14 16z" className="fill-[var(--plan)]" />
    </>
  ),
  wealthmaster: (
    <>
      <rect x="88" y="112" width="32" height="28" rx="4" className="fill-[var(--plan)] opacity-60" />
      <rect x="132" y="92" width="32" height="48" rx="4" className="fill-[var(--plan)] opacity-80" />
      <rect x="176" y="68" width="32" height="72" rx="4" className="fill-[var(--plan)]" />
      <rect x="220" y="40" width="32" height="100" rx="4" className="fill-foreground" />
      <circle cx="270" cy="40" r="16" className="fill-foreground" />
      <circle cx="270" cy="40" r="8" className="fill-none stroke-[var(--plan)]" strokeWidth="3" />
    </>
  ),
  "ultimate-protection": (
    <>
      <path d="M160 20l56 20v38c0 32-24 50-56 62-32-12-56-30-56-62V40z" className="fill-[var(--plan)]" />
      <path d="M160 20l56 20v38c0 32-24 50-56 62z" className="fill-foreground/15" />
      <path d="M134 78l18 18 34-36" className="fill-none stroke-foreground" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  "term-deposits": (
    <>
      <rect x="96" y="40" width="128" height="100" rx="10" className="fill-[var(--plan)]" />
      <rect x="108" y="52" width="104" height="76" rx="6" className="fill-none stroke-foreground/70" strokeWidth="2" />
      <circle cx="160" cy="90" r="20" className="fill-foreground/85" />
      <circle cx="160" cy="90" r="6" className="fill-[var(--plan)]" />
      <rect x="104" y="140" width="12" height="6" className="fill-foreground" />
      <rect x="204" y="140" width="12" height="6" className="fill-foreground" />
    </>
  ),
  "treasury-bills": (
    <>
      <rect x="96" y="34" width="128" height="92" rx="6" className="fill-foreground/90" />
      <rect x="106" y="44" width="108" height="72" rx="3" className="fill-none stroke-[var(--plan)]" strokeWidth="3" />
      <path d="M122 64h76M122 80h76M122 96h44" className="fill-none stroke-[var(--plan)]" strokeWidth="4" strokeLinecap="round" />
      <circle cx="196" cy="102" r="12" className="fill-[var(--plan)]" />
      <rect x="104" y="136" width="112" height="4" rx="2" className="fill-foreground/60" />
    </>
  ),
  bonds: (
    <>
      <path d="M96 70l64-36 64 36z" className="fill-foreground" />
      <rect x="108" y="76" width="16" height="52" className="fill-[var(--plan)]" />
      <rect x="138" y="76" width="16" height="52" className="fill-[var(--plan)]" />
      <rect x="168" y="76" width="16" height="52" className="fill-[var(--plan)]" />
      <rect x="198" y="76" width="16" height="52" className="fill-[var(--plan)]" />
      <rect x="96" y="128" width="128" height="10" rx="2" className="fill-foreground" />
    </>
  ),
};

/**
 * The picture on an "image" card: a flat scene for each product, drawn from the product's colour and the page ink so it is
 * right in light and dark. It fills whatever box it is given. When StarLife's photographs or illustrations arrive,
 * replace the contents here and every card follows.
 */
export function PlanImage({ planId, className, src }: { planId: ProductKey; className?: string; src?: string }) {
  if (src) {
    const hasArt = planId in PLAN_ART;
    return (
      <div
        style={hasArt ? { backgroundImage: `linear-gradient(to bottom, var(--plan-art-${planId}-1), var(--plan-art-${planId}-2))` } : undefined}
        className={cn("relative overflow-hidden", !hasArt && "bg-muted", className)}
      >
        {/* The art is a transparent cut-out: shown whole, centred, with a little air round it. It is already a small WebP, so it is served as it is (no /_next/image round trip to wait on) and loaded eagerly. */}
        <Image src={src} alt="" fill sizes="560px" unoptimized={hasArt} loading="eager" className={hasArt ? "object-contain p-2 transition-transform group-hover:scale-[1.06]" : "object-cover"} />
      </div>
    );
  }
  return (
    <div style={planToneStyle(planId)} className={cn("relative overflow-hidden bg-[color-mix(in_srgb,var(--plan)_24%,var(--tile))] text-foreground", className)}>
      <svg viewBox="0 0 320 160" preserveAspectRatio="xMidYMid meet" aria-hidden="true" className="absolute inset-0 size-full">
        <rect x="56" y="140" width="208" height="2" className="fill-foreground/20" />
        {SCENES[planId]}
      </svg>
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

/** What needs the customer on a policy, if anything: a medical assessment, a cancellation, missed premiums. */
function attentionOf(p: Policy): string | undefined {
  if (p.status === "pending-medical") return "Waiting for a medical assessment";
  if (p.status === "cancel-requested") return "Cancellation requested";
  if (p.arrears.length > 0) return p.arrears.length === 1 ? "1 premium missed" : `${p.arrears.length} premiums missed`;
  return undefined;
}

/** What the row says under the plan name: anything that needs attention first, otherwise the policy number. */
function policyMeta(p: Policy): string {
  return attentionOf(p) ?? p.number;
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
        <ChevronRight size={15} aria-hidden="true" className="shrink-0 text-muted-foreground" />
      </Link>
    </li>
  );
}

/**
 * A policy on its own plan's page, where every row is the same plan, so the plan name would say nothing: the policy
 * number leads, then what needs the customer (amber) or who it covers, then the sum assured and the premium.
 */
export function PlanPolicyRow({ policy, showAmounts }: { policy: Policy; showAmounts: boolean }) {
  const attention = attentionOf(policy);
  const covers =
    findPlan(policy.planId)?.kind === "funeral"
      ? policy.members.length > 0
        ? `Covers you and ${policy.members.length === 1 ? "1 other" : `${policy.members.length} others`}`
        : "Covers you"
      : premiumLine(policy, showAmounts);
  return (
    <li>
      <Link
        href={`/insure/policies/${policy.id}`}
        className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none sm:px-3"
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="tabular truncate text-[14px] text-foreground">{policy.number}</span>
          <span className={cn("truncate text-[12px]", attention ? "text-warning-text" : "text-muted-foreground")}>{attention ?? covers}</span>
        </span>
        <span className="flex shrink-0 flex-col items-end">
          <span className="tabular text-[14px] text-foreground">{formatMoney(policy.sumAssured, "GHS", showAmounts)}</span>
          <span className="tabular text-[12px] text-muted-foreground">{premiumLine(policy, showAmounts)}</span>
        </span>
        <ChevronRight size={15} aria-hidden="true" className="shrink-0 text-muted-foreground" />
      </Link>
    </li>
  );
}

/** A policy that isn't there (another customer's, or reset from Dev Mode). Says so and goes back to Insure. */
export function PolicyNotFound({ title = "Policy" }: { title?: string }) {
  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6">
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
const WELCOME_STATES = [{ id: "again", label: "Show it again" }];
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
  const markWelcomed = useInsurance((s) => s.markWelcomed);
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
      {
        label: "Welcome",
        states: WELCOME_STATES,
        value: "",
        onChange: () => markWelcomed(ownerId, false),
      },
      ...(extraGroups ?? []),
    ];
  }, [ownerId, accountId, profile, count, inArrears, failRequests, saveProfile, clearProfile, seedPolicies, setFailRequests, markWelcomed, extraGroups]);

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
