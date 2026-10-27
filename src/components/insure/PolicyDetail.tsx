"use client";

/**
 * One policy (Figma "View Policy Details"). A policy is not a balance, so there is no big figure: the title, then rows
 * (CONSTITUTION §3, PATTERNS §5), then the actions, who it pays and any claims in progress.
 *
 *  - What needs the customer is the first row, in amber, with its action as a text link: missed premiums with the
 *    amount and Pay now, a pending medical assessment, a requested cancellation. A healthy policy shows none of them
 *    (normal status is silent).
 *  - Sum assured is the key fact, styled as the total on a payment review with the same dashed line after it.
 *  - Update Beneficiaries sits on the Beneficiaries heading rather than in the action list, so it appears once.
 *  - Pay Outstanding is the amber row, not an action row. Cancel Policy is last and disappears once a cancellation is
 *    requested.
 */

import Link from "next/link";
import { ChevronRight, ClipboardList, FileText, ShieldOff } from "@/components/ui/icons";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { ListCard } from "@/components/ui/list-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { FactsPanel } from "@/components/invest/parts";
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
  const windowLabel = DEDUCTION_WINDOWS.find((w) => w.value === policy.window)?.days ?? "";
  const maturity = maturityOf(policy);
  const owed = outstanding(policy);
  const base = `/insure/policies/${policy.id}`;
  const trustee = personOf(policy.trusteeId);

  const premium = premiumLine(policy, showAmounts);
  const waiting = policy.status === "pending-medical";
  const cancelling = policy.status === "cancel-requested" && policy.cancellation;
  // The banner says what needs the customer; these rows keep the detail it does not carry.
  type FactRow = [React.ReactNode, React.ReactNode];
  const needsYou: FactRow[] = [
    ...(owed > 0 ? ([["Missed premiums", money(owed)]] as FactRow[]) : []),
    ...(waiting ? ([["Next step", `${PROVIDER} will call you`]] as FactRow[]) : []),
    ...(cancelling && policy.cancellation ? ([["Cancellation requested on", formatDate(policy.cancellation.requestedOn)]] as FactRow[]) : []),
  ];

  const facts: Array<[React.ReactNode, React.ReactNode]> = [
    ...needsYou,
    [policy.tier ? "Total benefit" : "Sum assured", money(policy.sumAssured)],
    ["Premium", waiting ? `${premium}, not taken yet` : premium],
    ...(waiting || cancelling ? [] : ([["Taken", `Between the ${windowLabel}`]] as Array<[React.ReactNode, React.ReactNode]>)),
    ...(cancelling ? ([["Cover", "Continues until it’s completed"]] as Array<[React.ReactNode, React.ReactNode]>) : []),
    ...(policy.tier ? ([["Your cover", `${findTier(policy.tier).label} · ${money(findTier(policy.tier).benefit)}`]] as Array<[React.ReactNode, React.ReactNode]>) : []),
    ...(policy.termYears ? ([["Policy term", `${policy.termYears} years`]] as Array<[React.ReactNode, React.ReactNode]>) : []),
    ...(maturity ? ([["Matures", formatDate(maturity)]] as Array<[React.ReactNode, React.ReactNode]>) : []),
    ["Premiums paid so far", money(premiumsPaid(policy))],
    ...(policy.increment ? ([["Yearly increase", `${policy.increment}%`]] as Array<[React.ReactNode, React.ReactNode]>) : []),
    ...(account ? ([["Paid from", `${account.name} · ${account.number}`]] as Array<[React.ReactNode, React.ReactNode]>) : []),
    ["Provider", PROVIDER],
    ["Policy number", policy.number],
  ];

  const canClaim = policy.status !== "pending-medical";

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6">
      <PageHeader title={plan?.name ?? "Policy"} backTo={{ href: plan ? `${INSURE_HOME}/plans/${plan.id}` : INSURE_HOME, label: plan?.name ?? "Insure" }} />
      <ProductBanner alert={policyAlert(policy)} />
      <InsureDevTools />
      <div className="flex flex-col gap-10">
        <FactsPanel rows={facts} keyRow={needsYou.length} />

        <ListCard>
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

        <section className="flex flex-col gap-3">
          <SectionHeading
            title="Beneficiaries"
            action={
              <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`${base}/beneficiaries`} />}>
                Update
              </Button>
            }
          />
          {policy.beneficiaries.length > 0 ? (
            <FactsPanel
              rows={[
                ...policy.beneficiaries.map((b) => {
                  const p = personOf(b.personId);
                  return [p ? `${p.fullName} · ${p.relationship}` : "Beneficiary", `${b.share}%`] as [string, React.ReactNode];
                }),
                ...(trustee ? ([[`Trustee · ${trustee.fullName}`, trustee.relationship]] as Array<[string, React.ReactNode]>) : []),
              ]}
            />
          ) : (
            <p className="px-1 text-[13px] text-muted-foreground">No one is named yet. Without a beneficiary, a payout goes to your estate.</p>
          )}
        </section>

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
