"use client";

/**
 * Invest → Treasury Bills & Bonds → statement. Emailed, never downloaded here: the address on file is filled in,
 * and the choice is active or closed investments. A choice with nothing in it says so instead of sending an empty
 * statement.
 */

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormPageSkeleton } from "@/components/states/PageSkeletons";
import TransactionOtpModal from "@/components/payments/TransactionOtpModal";
import { PaymentSuccessScreen } from "@/components/payments/PaymentSuccessScreen";
import { ProceedButton } from "@/components/payments/flows/shared";
import { AccountRequired, INVEST_HOME } from "@/components/invest/parts";
import { useSession } from "@/lib/session-store";
import { useMyTreasury, useTreasuryHydrated } from "@/lib/treasury";
import { useMyDeposits } from "@/lib/term-deposits";

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
  const deposits = useMyDeposits();
  const forDeposits = useSearchParams().get("product") === "term-deposits";
  const actor = useSession((s) => s.actor);

  const [type, setType] = useState<Type | "">("");
  const [typedEmail, setEmail] = useState<string | null>(null);
  const email = typedEmail ?? actor?.email ?? "";
  const [authOpen, setAuthOpen] = useState(false);
  const [done, setDone] = useState(false);

  const back = forDeposits ? { href: "/invest/products/term-deposits", label: "Term Deposits" } : { href: INVEST_HOME, label: "Invest" };
  if (!hydrated) return <FormPageSkeleton fields={2} />;
  if (csd?.status !== "active") return <AccountRequired status={csd?.status} title="Statement" backTo={back} />;

  const [activeCount, closedCount] = forDeposits ? [deposits.active.length, deposits.closed.length] : [holdings.length, closed.length];
  const count = type === "active" ? activeCount : type === "closed" ? closedCount : 0;
  const emailOk = EMAIL.test(email.trim());
  const valid = emailOk && type !== "" && count > 0;

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
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6">
      <PageHeader title="Statement" backTo={back} />
      <div className="flex flex-col gap-5">
        <Field label="Email Address" htmlFor="treasury-statement-email" error={email.trim() !== "" && !emailOk && "Enter a valid email address."}>
          <Input id="treasury-statement-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </Field>

        <Field label="Statement Type">
          <Select value={type} onValueChange={(v) => v && setType(v as Type)}>
            <SelectTrigger aria-label="Statement type">
              <SelectValue placeholder="Select statement type" />
            </SelectTrigger>
            <SelectContent>
              {TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value} label={t.label}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <div>
          <ProceedButton disabled={!valid} onClick={() => setAuthOpen(true)} />
          <p className="px-1 pt-2 text-center text-[12px] text-muted-foreground">
            {!type
              ? "Select a statement type to continue."
              : count === 0
                ? type === "active"
                  ? "You have no active investments yet."
                  : "You have no closed investments yet."
                : "We’ll email it to the address above."}
          </p>
        </div>
      </div>

      <TransactionOtpModal
        open={authOpen}
        onOpenChange={setAuthOpen}
        onSuccess={() => setDone(true)}
      />
    </div>
  );
}
