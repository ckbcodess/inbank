"use client";

/**
 * One policy (Figma "View Policy Details"). Top to bottom: what it pays, what it costs and when it is taken, the facts,
 * who it pays, any claims in progress, then the actions.
 *
 *  - Missed premiums come first among the actions, in amber, with the amount: that is the one thing that can put the
 *    cover at risk.
 *  - Update Beneficiaries sits on the Beneficiaries heading rather than in the action list, so it appears once.
 *  - Pay Outstanding only appears when something is owed (Figma has a "nothing to pay" screen; hiding the row is
 *    lighter). Cancel Policy is last and disappears once a cancellation is requested.
 */

import Link from "next/link";
import { AlertCircle, ChevronRight, ClipboardList, FileText, ShieldOff } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { ListCard } from "@/components/ui/list-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { FactsPanel } from "@/components/invest/parts";
import { DetailPageSkeleton } from "@/components/states/PageSkeletons";
import { InsureDevTools, PolicyNotFound, premiumLine } from "@/components/insure/parts";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";
import { formatDate, formatMoney } from "@/lib/mock-data";
import { useTreasuryAccounts } from "@/lib/treasury";
import { CLAIM_TYPES, DEDUCTION_WINDOWS, INSURE_HOME, PROVIDER, findPlan, findTier } from "@/lib/insurance-plans";
import { maturityOf, outstanding, premiumsPaid, useInsuranceHydrated, usePolicy } from "@/lib/insurance";
import { cn } from "@/lib/utils";

function ActionRow({
  href,
  icon: Icon,
  title,
  meta,
  attention = false,
}: {
  href: string;
  icon: typeof FileText;
  title: string;
  meta: string;
  attention?: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none sm:px-3"
      >
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-xl",
            attention ? "bg-warning/15 text-warning-text" : "bg-muted text-foreground",
          )}
        >
          <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[14px] text-foreground">{title}</span>
          <span className={cn("tabular truncate text-[12px]", attention ? "text-warning-text" : "text-muted-foreground")}>{meta}</span>
        </span>
        <ChevronRight size={15} strokeWidth={1.8} aria-hidden="true" className="shrink-0 text-muted-foreground" />
      </Link>
    </li>
  );
}

export function PolicyDetail({ policyId }: { policyId: string }) {
  const hydrated = useInsuranceHydrated();
  const { policy, policyClaims, personOf } = usePolicy(policyId);
  const { showAmounts } = useAmountVisibility();
  const accounts = useTreasuryAccounts();

  if (!hydrated) return <DetailPageSkeleton />;
  if (!policy) return <PolicyNotFound />;

  const plan = findPlan(policy.planId);
  const money = (n: number) => formatMoney(n, "GHS", showAmounts);
  const account = accounts.find((a) => a.id === policy.accountId);
  const windowLabel = DEDUCTION_WINDOWS.find((w) => w.value === policy.window)?.days ?? "";
  const maturity = maturityOf(policy);
  const owed = outstanding(policy);
  const base = `/insure/policies/${policy.id}`;
  const trustee = personOf(policy.trusteeId);

  const status =
    policy.status === "pending-medical"
      ? `Waiting for a medical assessment. ${PROVIDER} will call you, and nothing is deducted until your cover is confirmed.`
      : policy.status === "cancel-requested" && policy.cancellation
        ? `You asked to cancel on ${formatDate(policy.cancellation.requestedOn)}. ${PROVIDER} will contact you to complete it. Your cover continues until then.`
        : account
          ? `${premiumLine(policy, showAmounts)}, taken between the ${windowLabel} from ${account.name}.`
          : `${premiumLine(policy, showAmounts)}, taken between the ${windowLabel}.`;

  const facts: Array<[string, React.ReactNode]> = [
    ["Policy number", policy.number],
    ["Provider", PROVIDER],
    ...(policy.tier ? ([["Your cover", `${findTier(policy.tier).label} · ${money(findTier(policy.tier).benefit)}`]] as Array<[string, React.ReactNode]>) : []),
    ...(policy.termYears ? ([["Policy term", `${policy.termYears} years`]] as Array<[string, React.ReactNode]>) : []),
    ...(maturity ? ([["Matures", formatDate(maturity)]] as Array<[string, React.ReactNode]>) : []),
    ["Premiums paid so far", money(premiumsPaid(policy))],
    ...(policy.increment ? ([["Yearly increase", `${policy.increment}%`]] as Array<[string, React.ReactNode]>) : []),
    ...(account ? ([["Paid from", `${account.name} · ${account.number}`]] as Array<[string, React.ReactNode]>) : []),
  ];

  const canClaim = policy.status !== "pending-medical";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={plan?.name ?? "Policy"} backTo={{ href: INSURE_HOME, label: "Insure" }} />
      <InsureDevTools />
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-10">
        <section className="flex flex-col gap-2 px-1">
          <span className="text-[13px] text-muted-foreground">{policy.tier ? "Total benefit" : "Sum assured"}</span>
          <span className="tabular text-[40px] leading-none tracking-[var(--ls-heading)] text-foreground">{money(policy.sumAssured)}</span>
          <p className={cn("text-[13px] leading-relaxed", policy.status === "active" ? "text-muted-foreground" : "text-foreground")}>{status}</p>
        </section>

        <ListCard>
          {owed > 0 && (
            <ActionRow
              href={`${base}/pay`}
              icon={AlertCircle}
              title="Pay Outstanding"
              meta={`${money(owed)} · ${policy.arrears.length === 1 ? "1 premium missed" : `${policy.arrears.length} premiums missed`}`}
              attention
            />
          )}
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

        <FactsPanel rows={facts} />

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
