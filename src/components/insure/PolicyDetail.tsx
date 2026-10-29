"use client";

/**
 * One policy (Figma "View Policy Details"). A policy is not a balance, so there is no big figure: the title, then rows
 * (CONSTITUTION §3, PATTERNS §5), then the actions, who it pays and any claims in progress.
 *
 *  - What needs the customer is the first row, in amber, with its action as a text link: missed premiums with the
 *    amount and Pay now, a pending medical assessment, a requested cancellation. A healthy policy shows none of them
 *    (normal status is silent).
 *  - Facts are plain rows in clusters with whitespace between them (designer, 2026-10-28): who and which policy (holder,
 *    provider, number), the term (policy term, deduction date, ends), the money (premium, paid so far), then the sum
 *    assured last, set large like a total.
 *  - Beneficiaries are not listed on the page: Update Beneficiaries is the first row of the action list and shows them.
 *  - Pay Outstanding is the amber row, not an action row. Cancel Policy is last and disappears once a cancellation is
 *    requested.
 */

import Link from "next/link";
import { ChevronRight, ClipboardList, FileText, ShieldOff, Users } from "@/components/ui/icons";
import PageHeader from "@/components/layout/PageHeader";
import { ListCard } from "@/components/ui/list-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { FactGroups, FactsPanel, type Fact, type FactGroup } from "@/components/invest/parts";
import { ProductBanner } from "@/components/ui/product-banner";
import { policyAlert } from "@/lib/product-alerts";
import { FactsPageSkeleton } from "@/components/states/PageSkeletons";
import { InsureDevTools, PolicyNotFound, premiumLine } from "@/components/insure/parts";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";
import { formatDate, formatMoney } from "@/lib/mock-data";
import { useTreasuryAccounts } from "@/lib/treasury";
import { CLAIM_TYPES, DEDUCTION_WINDOWS, INSURE_HOME, PROVIDER, findPlan, findTier } from "@/lib/insurance-plans";
import { maturityOf, outstanding, premiumsPaid, useInsuranceHydrated, usePolicy } from "@/lib/insurance";

function ActionRow({
  href,
  icon: Icon,
  title,
  meta,
}: {
  href: string;
  icon: typeof FileText;
  title: string;
  meta: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none sm:px-3"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
          <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[14px] text-foreground">{title}</span>
          <span className="tabular truncate text-[12px] text-muted-foreground">{meta}</span>
        </span>
        <ChevronRight size={15} aria-hidden="true" className="shrink-0 text-muted-foreground" />
      </Link>
    </li>
  );
}

export function PolicyDetail({ policyId }: { policyId: string }) {
  const hydrated = useInsuranceHydrated();
  const { policy, policyClaims, personOf } = usePolicy(policyId);
  const { showAmounts } = useAmountVisibility();
  const accounts = useTreasuryAccounts();

  if (!hydrated) return <FactsPageSkeleton facts={6} actions={3} />;
  if (!policy) return <PolicyNotFound />;

  const plan = findPlan(policy.planId);
  const money = (n: number) => formatMoney(n, "GHS", showAmounts);
  const account = accounts.find((a) => a.id === policy.accountId);
  const windowLabel = DEDUCTION_WINDOWS.find((w) => w.value === policy.window)?.label.replace(/ \(.*\)$/, "") ?? "";
  const maturity = maturityOf(policy);
  const owed = outstanding(policy);
  const base = `/insure/policies/${policy.id}`;

  const premium = premiumLine(policy, showAmounts);
  const waiting = policy.status === "pending-medical";
  const cancelling = policy.status === "cancel-requested" && policy.cancellation;
  // The banner says what needs the customer; these rows keep the detail it does not carry.
  const needsYou: Fact[] = [
    ...(owed > 0 ? [{ label: "Missed premiums", value: money(owed) }] : []),
    ...(waiting ? [{ label: "Next step", value: `${PROVIDER} will call you` }] : []),
    ...(cancelling && policy.cancellation ? [{ label: "Cancellation requested on", value: formatDate(policy.cancellation.requestedOn) }] : []),
  ];
  const tier = policy.tier ? findTier(policy.tier) : undefined;
  const from = account ? `${account.name} · ${account.number}` : undefined;
  // Only a monthly policy has a count to show: the premiums paid, out of the premiums in the whole term.
  const count = policy.termYears && policy.frequency === "monthly" ? `${policy.payments.length} of ${policy.termYears * 12} premiums` : undefined;

  const holder = personOf(policy.ownerId)?.fullName;
  const groups: FactGroup[] = [
    { rows: needsYou },
    {
      rows: [
        ...(holder ? [{ label: "Holder", value: holder }] : []),
        { label: "Provider", value: PROVIDER },
        { label: "Policy number", value: policy.number },
      ],
    },
    {
      rows: [
        ...(policy.termYears ? [{ label: "Policy term", value: `${policy.termYears} Years` }] : []),
        ...(waiting || cancelling ? [] : [{ label: "Deduction date", value: windowLabel }]),
        ...(maturity ? [{ label: "Ends", value: formatDate(maturity) }] : []),
        ...(tier ? [{ label: "Your cover", value: `${tier.label} · ${money(tier.benefit)}` }] : []),
        ...(cancelling ? [{ label: "Cover", value: "Continues until it’s completed" }] : []),
      ],
    },
    {
      rows: [
        { label: "Premium", value: waiting ? `${premium}, not taken yet` : premium },
        ...(policy.increment && plan?.kind === "savings" ? [{ label: "Yearly increase", value: `${policy.increment}%` }] : []),
        ...(from ? [{ label: "Paid from", value: from }] : []),
        { label: "Paid so far", value: money(premiumsPaid(policy)), note: count },
      ],
    },
    { rows: [{ label: tier ? "Total benefit" : "Sum assured", value: money(policy.sumAssured), total: true }] },
  ];

  const canClaim = policy.status !== "pending-medical";

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6">
      <PageHeader title={plan?.name ?? "Policy"} backTo={{ href: plan ? `${INSURE_HOME}/plans/${plan.id}` : INSURE_HOME, label: plan?.name ?? "Insure" }} />
      <ProductBanner alert={policyAlert(policy)} />
      <InsureDevTools />
      <div className="flex flex-col gap-10">
        <FactGroups groups={groups} boxed />

        <ListCard>
          <ActionRow href={`${base}/beneficiaries`} icon={Users} title="Update Beneficiaries" meta="Add, remove or change shares" />
          {policy.payments.length > 0 && (
            <ActionRow href={`${base}/statement`} icon={FileText} title="Statement" meta="Every premium you’ve paid" />
          )}
          {canClaim && <ActionRow href={`${base}/claim`} icon={ClipboardList} title="File a Claim" meta="Tell us what happened and upload documents" />}
          {policy.status !== "cancel-requested" && (
            <ActionRow
              href={`${base}/cancel`}
              icon={ShieldOff}
              title={policy.status === "pending-medical" ? "Withdraw Application" : "Cancel Policy"}
              meta="End your cover"
            />
          )}
        </ListCard>

        {policy.members.length > 0 && (
          <section className="flex flex-col gap-3">
            <SectionHeading title="Also Covered" />
            <FactsPanel
              rows={policy.members.map((m) => [
                m.fullName,
                `${m.relationship} · ${money(findTier(m.tier).benefit)}`,
              ])}
            />
          </section>
        )}

        {policyClaims.length > 0 && (
          <section className="flex flex-col gap-3">
            <SectionHeading title="Claims" />
            <ListCard>
              {policyClaims.map((c) => (
                <li key={c.id} className="flex items-center gap-3 rounded-xl px-2 py-3 sm:px-3">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[14px] text-foreground">{CLAIM_TYPES[c.type].label}</span>
                    <span className="tabular truncate text-[12px] text-muted-foreground">{`${c.reference} · ${c.subject}`}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end">
                    <span className="text-[13px] text-foreground">Under review</span>
                    <span className="tabular text-[12px] text-muted-foreground">{`Sent ${formatDate(c.submittedOn)}`}</span>
                  </span>
                </li>
              ))}
            </ListCard>
            <p className="px-1 text-[12px] text-muted-foreground">{`${PROVIDER} contacts you within 48 hours of a claim, once every document is in.`}</p>
          </section>
        )}
      </div>
    </div>
  );
}
