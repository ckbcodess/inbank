"use client";

/**
 * Invest → Treasury Bills & Bonds → buy one.
 *
 * Figma draws this four times (primary or secondary, by cost or by face value); it is one flow here. The security
 * arrives chosen (`?id=`), so nothing asks for it again. With no securities account yet, the first thing here is setting
 * it up (a light step, see `CreateProfileFlow`), and what was chosen is saved for when it is ready. Blocks appear one at a time: account → how to size the
 * purchase and how much → what it comes to and what happens at maturity → review → one-time code → outcome.
 *
 * Figma asks for the Terms & Conditions with a tick on every purchase. They are accepted once, when the securities
 * account is opened, so here the line under Proceed says so instead of asking again (see WORKING_LOG).
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Clock, SearchX } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { InlineError } from "@/components/ui/inline-error";
import { FormPageSkeleton } from "@/components/states/PageSkeletons";
import { TrueEmptyState } from "@/components/states/ListStates";
import TransactionOtpModal from "@/components/payments/TransactionOtpModal";
import { PaymentSuccessScreen } from "@/components/payments/PaymentSuccessScreen";
import { AmountInput, FromAccountSelector, InsufficientFundsAlert, ProceedButton } from "@/components/payments/flows/shared";
import { AccountRequired, AuthSummary, FactsPanel, MaturityInstructionField, TREASURY_HOME, INVEST_HOME, PRODUCTS_HREF, TREASURY_PRODUCTS_HREF } from "@/components/invest/parts";
import { CreateProfileFlow } from "@/components/invest/CreateProfileFlow";
import { formatDate, formatMoney } from "@/lib/mock-data";
import { useCustomerAccounts } from "@/lib/use-customer-accounts";
import {
  billInterest,
  costFromFace,
  couponPerPeriod,
  faceFromCost,
  findSecurity,
  formatRate,
  instructionLabel,
  kindLabel,
  useMyTreasury,
  useTreasury,
  useTreasuryAccounts,
  useTreasuryHydrated,
  type MaturityInstructionId,
} from "@/lib/treasury";

type Basis = "cost" | "face";
const BASES: readonly { value: Basis; label: string }[] = [
  { value: "cost", label: "Cost" },
  { value: "face", label: "Face Value" },
];
const BASIS_HINT: Record<Basis, string> = {
  cost: "Cost is what you pay today, debited from your account.",
  face: "Face value is what you receive at maturity.",
};

const asNumber = (v: string) => Number(String(v).replace(/[^0-9.]/g, "")) || 0;
const money = (n: number) => formatMoney(n, "GHS", true);

export function BuyFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const sec = findSecurity(params.get("id"));

  const hydrated = useTreasuryHydrated();
  const { ownerId, csd, marketOpen } = useMyTreasury();
  const placeOrder = useTreasury((s) => s.placeOrder);
  const accounts = useTreasuryAccounts();
  const { defaultId } = useCustomerAccounts();

  const [screen, setScreen] = useState<"form" | "review" | "success">("form");
  const [pickedFrom, setPickedFrom] = useState("");
  const [basis, setBasis] = useState<Basis>("cost");
  const initialAmount = params.get("amount") || "";
  const [amount, setAmount] = useState(initialAmount);
  const [instruction, setInstruction] = useState<MaturityInstructionId>("none");
  const [authOpen, setAuthOpen] = useState(false);
  // Set once the customer has just created their securities account here, so its confirmation stays on screen.
  const [profileStarted, setProfileStarted] = useState(false);

  // The account chosen when the securities account was set up, then the default one, then the first that can pay.
  const fromId = useMemo(() => {
    if (pickedFrom && accounts.some((a) => a.id === pickedFrom)) return pickedFrom;
    const preferred = [csd?.linkedAccountId, defaultId].find((id) => id && accounts.some((a) => a.id === id));
    return preferred ?? accounts[0]?.id ?? "";
  }, [pickedFrom, accounts, csd?.linkedAccountId, defaultId]);
  const from = accounts.find((a) => a.id === fromId);

  const backTo = { href: TREASURY_PRODUCTS_HREF, label: "Treasury Bills & Bonds" };

  if (!hydrated) return <FormPageSkeleton fields={3} />;

  if (screen !== "success") {
    if (!sec) {
      return (
        <div className="flex flex-col gap-8">
          <PageHeader title="Buy" backTo={backTo} />
          <TrueEmptyState
            icon={<SearchX size={22} strokeWidth={1.8} />}
            title="We couldn’t find that one"
            description="It may have been sold or the auction may have closed. Here’s what’s on offer now."
            action={
              <Button nativeButton={false} render={<Link href={PRODUCTS_HREF} />}>
                See what’s available
              </Button>
            }
          />
        </div>
      );
    }
    // No securities account yet: set it up right here, then carry on with this purchase when it is ready.
    if (!csd || profileStarted) {
      return (
        <CreateProfileFlow intent={{ href: `${TREASURY_HOME}/buy?id=${sec.id}`, label: sec.title }} onCreated={() => setProfileStarted(true)} />
      );
    }
    if (csd.status !== "active") return <AccountRequired status={csd.status} title={sec.title} backTo={backTo} />;
    if (!marketOpen) {
      return (
        <div className="flex flex-col gap-8">
          <PageHeader title={sec.title} backTo={backTo} />
          <TrueEmptyState
            icon={<Clock size={22} strokeWidth={1.8} />}
            title="The market is closed right now"
            description="Treasury bills and bonds can’t be bought at the moment. Your details weren’t saved, and nothing was charged."
          />
        </div>
      );
    }
  }
  if (!sec) return null;

  const num = asNumber(amount);
  const face = basis === "face" ? num : faceFromCost(sec, num);
  const cost = basis === "cost" ? num : costFromFace(sec, num);
  const lot = sec.available;
  const overLot = lot !== undefined && face > lot;
  const overBalance = Boolean(from) && cost > (from?.available ?? 0);
  const valid = num > 0 && !overLot && !overBalance && Boolean(from);
  const interest = billInterest(sec.kind, face, cost);
  const rateLabel = sec.market === "primary" ? "Indicative rate" : "Rate";

  function changeBasis(next: Basis) {
    if (next === basis) return;
    // Keep the numbers true: the amount carries over as what it means in the new basis.
    if (num > 0) setAmount(String(next === "face" ? faceFromCost(sec!, num) : costFromFace(sec!, num)));
    setBasis(next);
  }

  function authorised() {
    if (!sec || !from) return;
    placeOrder({ ownerId, security: sec, face, cost, instruction, fromAccountId: from.id });
    setScreen("success");
  }

  /* ── Success ─────────────────────────────────────────────────────────── */
  if (screen === "success") {
    return (
      <PaymentSuccessScreen
        title="Purchase requested"
        message={`Your ${sec.title} purchase request has been submitted. We’ll let you know once it’s completed.`}
        onPrimaryAction={() => router.push(INVEST_HOME)}
        primaryActionLabel="Back to Invest"
        onSecondaryAction={() => router.push(PRODUCTS_HREF)}
        secondaryActionLabel="Buy another"
        showSaveBeneficiary={false}
        customActionCards={[]}
      />
    );
  }

  /* ── Review ──────────────────────────────────────────────────────────── */
  if (screen === "review") {
    const rows: Array<[string, React.ReactNode]> = [
      ["From", from ? `${from.name} · ${from.number}` : ""],
      ["Security", sec.title],
      ["Type", kindLabel(sec.kind)],
      ["Face value", money(face)],
      [rateLabel, formatRate(sec.rate)],
      ...(sec.kind === "bond" ? ([["Interest every 6 months", money(couponPerPeriod(face, sec.rate))]] as Array<[string, React.ReactNode]>) : []),
      ...(sec.auction ? ([["Auction number", String(sec.auction)]] as Array<[string, React.ReactNode]>) : []),
      ...(sec.settlement ? ([["Settles", formatDate(sec.settlement)]] as Array<[string, React.ReactNode]>) : []),
      ["Matures", formatDate(sec.maturity)],
      ["When it matures", instructionLabel(instruction)],
    ];
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title="Review and Confirm" backTo={{ href: backTo.href, label: "Buy", onClick: () => setScreen("form") }} />
        <div className="mx-auto flex w-full max-w-[600px] flex-col gap-8">
          <section className="flex flex-col gap-1.5 px-1">
            <span className="text-[13px] text-muted-foreground">You pay</span>
            <span className="tabular text-[40px] leading-none tracking-[-0.02em] text-foreground">{money(cost)}</span>
            {sec.kind === "bill" && (
              <span className="tabular text-[14px] text-muted-foreground">
                {`and receive ${money(face)} on ${formatDate(sec.maturity)}`}
              </span>
            )}
          </section>
          <FactsPanel rows={rows} />
          {sec.market === "primary" && (
            <p className="px-1 text-[13px] leading-relaxed text-muted-foreground">
              The final rate is set at the auction, so what you pay and what you receive can shift slightly.
            </p>
          )}
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="h-13 flex-1 rounded-2xl text-[15px]" onClick={() => setScreen("form")}>
              Back to Edit
            </Button>
            <Button type="button" className="h-13 flex-1 rounded-2xl text-[16px]" onClick={() => setAuthOpen(true)}>
              Confirm
            </Button>
          </div>
        </div>
        <TransactionOtpModal
          open={authOpen}
          onOpenChange={setAuthOpen}
          onSuccess={authorised}
          summary={
            <AuthSummary
              headline={`Buy ${sec.title}`}
              amount={money(cost)}
              rows={[
                ["From", from ? `${from.name} · ${from.number}` : ""],
                ["You receive at maturity", `${money(face)} · ${formatDate(sec.maturity)}`],
              ]}
            />
          }
        />
      </div>
    );
  }

  /* ── Form ────────────────────────────────────────────────────────────── */
  const breakdown: Array<[string, string]> = [
    [rateLabel, formatRate(sec.rate)],
    ["You pay today", money(cost)],
    ["You receive at maturity", money(face)],
    ...(sec.kind === "bill" ? ([["Interest earned", money(interest)]] as Array<[string, string]>) : ([["Interest every 6 months", money(couponPerPeriod(face, sec.rate))]] as Array<[string, string]>)),
    [sec.settlement ? "Settles" : "Matures", formatDate(sec.settlement ?? sec.maturity)],
    ...(sec.settlement ? ([["Matures", formatDate(sec.maturity)]] as Array<[string, string]>) : []),
  ];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={sec.title} backTo={backTo} />
      <div className="mx-auto flex w-full max-w-[600px] flex-col gap-6 animate-in fade-in duration-200">
        {accounts.length === 0 ? (
          <TrueEmptyState
            title="You don’t have an account to pay from"
            description="Treasury bills and bonds are paid for in cedis from an active current or savings account."
          />
        ) : (
          <>
            <FromAccountSelector accounts={accounts} value={fromId} onChange={setPickedFrom} />

            <div className="flex flex-col gap-3">
              <SegmentedControl aria-label="Calculate by" options={BASES} value={basis} onChange={changeBasis} />
              <p className="px-1 text-[12px] text-muted-foreground">{BASIS_HINT[basis]}</p>
            </div>

            <div className="flex flex-col gap-2">
              <AmountInput
                value={amount}
                onChange={setAmount}
                label={basis === "cost" ? "Amount to Invest" : "Face Value"}
                hasError={overBalance || overLot}
                error={
                  overBalance ? (
                    <InsufficientFundsAlert />
                  ) : overLot && lot !== undefined ? (
                    <InlineError message={`Only ${money(lot)} of face value is on offer.`} className="text-left" />
                  ) : undefined
                }
              />
            </div>

            {valid && (
              <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-top-2 duration-200">
                <dl className="flex flex-col gap-3 px-1 text-[14px]">
                  {breakdown.map(([label, value]) => (
                    <div key={label} className="flex items-baseline justify-between gap-6">
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="tabular text-right text-foreground">{value}</dd>
                    </div>
                  ))}
                </dl>
                <MaturityInstructionField value={instruction} onChange={setInstruction} />
              </div>
            )}

            <div>
              <ProceedButton disabled={!valid} onClick={() => setScreen("review")} />
              <p className="px-1 pt-3 text-center text-[12px] text-muted-foreground">
                By continuing, you agree to the Terms &amp; Conditions of treasury bills and bonds.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
