"use client";

/**
 * Invest → Treasury Bills & Bonds → statement. Emailed, never downloaded here: the address on file is filled in,
 * and the choice is active or closed investments. A choice with nothing in it says so instead of sending an empty
 * statement.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { FormPageSkeleton } from "@/components/states/PageSkeletons";
import TransactionOtpModal from "@/components/payments/TransactionOtpModal";
import { PaymentSuccessScreen } from "@/components/payments/PaymentSuccessScreen";
import { ProceedButton } from "@/components/payments/flows/shared";
import { AccountRequired, AuthSummary, INVEST_HOME } from "@/components/invest/parts";
import { useSession } from "@/lib/session-store";
import { useMyTreasury, useTreasuryHydrated } from "@/lib/treasury";

type Type = "active" | "closed";
const TYPES: readonly { value: Type; label: string }[] = [
  { value: "active", label: "Active Investments" },
  { value: "closed", label: "Closed Investments" },
];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function TreasuryStatementPage() {
  const router = useRouter();
  const hydrated = useTreasuryHydrated();
  const { csd, holdings, closed } = useMyTreasury();
  const actor = useSession((s) => s.actor);

  const [type, setType] = useState<Type>("active");
  const [typedEmail, setEmail] = useState<string | null>(null);
  const email = typedEmail ?? actor?.email ?? "";
  const [authOpen, setAuthOpen] = useState(false);
  const [done, setDone] = useState(false);

  const back = { href: INVEST_HOME, label: "Invest" };
  if (!hydrated) return <FormPageSkeleton fields={2} />;
  if (csd?.status !== "active") return <AccountRequired status={csd?.status} title="Statement" backTo={back} />;

  const count = type === "active" ? holdings.length : closed.length;
  const emailOk = EMAIL.test(email.trim());
  const valid = emailOk && count > 0;
  const typeLabel = TYPES.find((t) => t.value === type)?.label ?? "";

  if (done) {
    return (
      <PaymentSuccessScreen
        title="Request submitted"
        message="Your request for statement delivery has been submitted successfully. Please check your email for the statement."
        onPrimaryAction={() => router.push(INVEST_HOME)}
        primaryActionLabel="Back to Invest"
        showSaveBeneficiary={false}
        customActionCards={[]}
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Statement" backTo={back} />
      <div className="mx-auto flex w-full max-w-[600px] flex-col gap-6">
        <Field label="Email Address" htmlFor="treasury-statement-email" error={email.trim() !== "" && !emailOk && "Enter a valid email address."}>
          <Input id="treasury-statement-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </Field>

        <Field label="Statement Type">
          <SegmentedControl aria-label="Statement type" options={TYPES} value={type} onChange={setType} />
        </Field>

        <div>
          <ProceedButton disabled={!valid} onClick={() => setAuthOpen(true)} />
          <p className="px-1 pt-3 text-center text-[12px] text-muted-foreground">
            {count === 0 ? (type === "active" ? "You have no active investments yet." : "You have no closed investments yet.") : "We’ll email it to the address above."}
          </p>
        </div>
      </div>

      <TransactionOtpModal
        open={authOpen}
        onOpenChange={setAuthOpen}
        onSuccess={() => setDone(true)}
        summary={<AuthSummary headline="Email a treasury statement" rows={[["Statement", typeLabel], ["To", email.trim()]]} />}
      />
    </div>
  );
}
