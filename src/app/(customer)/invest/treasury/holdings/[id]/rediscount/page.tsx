"use client";

/**
 * Invest → one holding → rediscount: cash it in before it matures, in full or in part.
 *
 * Breaking an investment early shows what it costs and the exact payout before anything is confirmed, as plain
 * facts. Figma shows a separate review screen with the same figures; here the figures are the review, so Proceed goes
 * straight to the one-time code, with the payout restated above it. Getting out takes the same code as getting in.
 */

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import { Field } from "@/components/ui/field";
import { InlineError } from "@/components/ui/inline-error";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { FormPageSkeleton } from "@/components/states/PageSkeletons";
import TransactionOtpModal from "@/components/payments/TransactionOtpModal";
import { PaymentSuccessScreen } from "@/components/payments/PaymentSuccessScreen";
import { AmountInput, FromAccountSelector, ProceedButton } from "@/components/payments/flows/shared";
import { AuthSummary, HoldingNotFound, TREASURY_HOME, INVEST_HOME } from "@/components/invest/parts";
import { formatDate, formatMoney } from "@/lib/mock-data";
import { roundMoney } from "@/lib/money";
import { useCustomerAccounts } from "@/lib/use-customer-accounts";
import { formatRate, REDISCOUNT_RATE, rediscountNet, useHolding, useTreasury, useTreasuryAccounts } from "@/lib/treasury";

type Kind = "full" | "partial";
const KINDS: readonly { value: Kind; label: string }[] = [
  { value: "full", label: "Full Rediscount" },
  { value: "partial", label: "Partial Rediscount" },
];

const asNumber = (v: string) => Number(String(v).replace(/[^0-9.]/g, "")) || 0;
const money = (n: number) => formatMoney(n, "GHS", true);

export default function RediscountPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { hydrated, holding: h } = useHolding(id);
  const requestRediscount = useTreasury((s) => s.requestRediscount);
  const accounts = useTreasuryAccounts();
  const { defaultId } = useCustomerAccounts();

  const [kind, setKind] = useState<Kind>("full");
  const [amount, setAmount] = useState("");
  const [pickedTo, setPickedTo] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [done, setDone] = useState(false);

  if (!hydrated) return <FormPageSkeleton fields={3} />;
  if (!h) return <HoldingNotFound title="Rediscount" />;

  const back = { href: `${TREASURY_HOME}/holdings/${h.id}`, label: h.title };

  // The account it was paid from, then the default one: the money goes back where the customer expects it.
  const toId =
    pickedTo && accounts.some((a) => a.id === pickedTo)
      ? pickedTo
      : [h.fromAccountId, defaultId].find((a) => a && accounts.some((x) => x.id === a)) ?? accounts[0]?.id ?? "";
  const to = accounts.find((a) => a.id === toId);

  const full = kind === "full";
  const num = asNumber(amount);
  const redeem = full ? h.face : num;
  const wholeByAccident = !full && num >= h.face;
  const valid = Boolean(to) && redeem > 0 && !wholeByAccident;

  const net = valid ? rediscountNet(redeem, h.maturity) : 0;
  const costOfEarly = roundMoney(redeem - net);
  const kept = roundMoney(h.face - redeem);

  if (done) {
    return (
      <PaymentSuccessScreen
        title="Request submitted"
        message={
          full
            ? `Your full rediscount request for ${h.title} has been submitted. We’ll let you know once it’s processed.`
            : `Your partial rediscount request for ${h.title} has been submitted. We’ll let you know once it’s processed.`
        }
        onPrimaryAction={() => router.push(INVEST_HOME)}
        primaryActionLabel="Back to Invest"
        showSaveBeneficiary={false}
        customActionCards={[]}
      />
    );
  }

  const rows: Array<[string, string]> = [
    ["Face value cashed in", money(redeem)],
    ["Rediscount rate", formatRate(REDISCOUNT_RATE)],
    ["Cost of cashing in early", money(costOfEarly)],
    ...(full ? [] : ([["Stays invested", money(kept)]] as Array<[string, string]>)),
  ];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Rediscount" backTo={back} />
      <div className="mx-auto flex w-full max-w-[600px] flex-col gap-6 animate-in fade-in duration-200">
        <p className="px-1 text-[13px] leading-relaxed text-muted-foreground">
          {`Rediscounting means cashing in before it matures on ${formatDate(h.maturity)}. You’re paid today’s value, which is less than the face value.`}
        </p>

        <FromAccountSelector accounts={accounts} value={toId} onChange={setPickedTo} label="To Account" />

        <Field label="Rediscount Type">
          <SegmentedControl aria-label="Rediscount type" options={KINDS} value={kind} onChange={setKind} />
        </Field>

        {!full && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-200">
            <AmountInput
              value={amount}
              onChange={setAmount}
              label="Face Value to Cash In"
              hasError={wholeByAccident}
              error={wholeByAccident ? <InlineError message="That’s the whole investment. Choose Full Rediscount to cash it all in." className="text-left" /> : undefined}
            />
            <p className="px-1 pt-2 text-[12px] text-muted-foreground">{`Up to ${money(h.face)}, the face value.`}</p>
          </div>
        )}

        {valid && (
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-top-2 duration-200">
            <section className="flex flex-col gap-1.5 px-1">
              <span className="text-[13px] text-muted-foreground">You receive today</span>
              <span className="tabular text-[40px] leading-none tracking-[-0.02em] text-foreground">{money(net)}</span>
              <span className="tabular text-[14px] text-muted-foreground">
                {`Instead of ${money(redeem)} on ${formatDate(h.maturity)}`}
              </span>
            </section>
            <dl className="flex flex-col gap-3 px-1 text-[14px]">
              {rows.map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-6">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="tabular text-right text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        <div>
          <ProceedButton disabled={!valid} onClick={() => setAuthOpen(true)} />
          {valid && <p className="px-1 pt-3 text-center text-[12px] text-muted-foreground">Once it’s processed, this can’t be undone.</p>}
        </div>
      </div>

      <TransactionOtpModal
        open={authOpen}
        onOpenChange={setAuthOpen}
        onSuccess={() => {
          if (!to) return;
          requestRediscount(h.id, { full, face: redeem, receive: net, toAccountId: to.id });
          setDone(true);
        }}
        summary={
          <AuthSummary
            headline={full ? `Cash in all of ${h.title}` : `Cash in part of ${h.title}`}
            amount={money(net)}
            rows={[
              ["To", to ? `${to.name} · ${to.number}` : ""],
              ["Cost of cashing in early", money(costOfEarly)],
            ]}
          />
        }
      />
    </div>
  );
}
