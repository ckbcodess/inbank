"use client";

/**
 * Invest → Term Deposit → change what happens when it matures.
 *
 * A rollover is automatic, so stopping one is never harder than starting it: switching to "Close on maturity" takes
 * effect at once, with an Undo, and asks for no code. Choosing a rollover commits the principal again, so it is
 * authorised with a one-time code. (Figma has no screen for this; without it a rollover chosen at opening could only
 * be undone by closing the deposit early.)
 */

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { XCircle } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { OptionTile } from "@/components/ui/option-tile";
import { FormPageSkeleton } from "@/components/states/PageSkeletons";
import { TrueEmptyState } from "@/components/states/ListStates";
import TransactionOtpModal from "@/components/payments/TransactionOtpModal";
import { PaymentSuccessScreen } from "@/components/payments/PaymentSuccessScreen";
import { AuthSummary, INVEST_HOME } from "@/components/invest/parts";
import { DEPOSITS_HOME } from "@/components/invest/term-deposit-parts";
import { formatDate } from "@/lib/mock-data";
import { DEPOSIT_INSTRUCTIONS, depositInstructionLabel, useDeposit, useTermDeposits, type DepositInstruction } from "@/lib/term-deposits";

export default function DepositMaturityPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { hydrated, deposit: d } = useDeposit(id);
  const setInstruction = useTermDeposits((s) => s.setInstruction);

  const [choice, setChoice] = useState<DepositInstruction | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [done, setDone] = useState(false);

  if (!hydrated) return <FormPageSkeleton fields={2} />;
  if (!d || d.status !== "active") {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title="When It Matures" backTo={{ href: INVEST_HOME, label: "Invest" }} />
        <TrueEmptyState
          icon={<XCircle size={22} strokeWidth={1.8} />}
          title="We couldn’t find this deposit"
          description="It may have been closed. Your other deposits are still on your Invest page."
          action={
            <Button nativeButton={false} render={<Link href={INVEST_HOME} />}>
              Back to Invest
            </Button>
          }
        />
      </div>
    );
  }

  const back = { href: `${DEPOSITS_HOME}/${d.id}`, label: `${d.tenureDays}-day deposit` };
  const current = d.instruction;
  const selected = choice ?? current;
  const changed = selected !== current;

  if (done) {
    return (
      <PaymentSuccessScreen
        title="Maturity instruction updated"
        message="Your maturity instruction has been updated. You can change it any time before the deposit matures."
        onPrimaryAction={() => router.push(back.href)}
        primaryActionLabel="Back to Deposit"
        showSaveBeneficiary={false}
        customActionCards={[]}
      />
    );
  }

  function apply() {
    if (!d) return;
    if (selected === "close") {
      const before = current;
      setInstruction(d.id, selected);
      toast.success("Rollover stopped. Your deposit and its interest will be paid into your account at maturity.", {
        id: "deposit-maturity",
        action: { label: "Undo", onClick: () => setInstruction(d.id, before) },
      });
      router.push(back.href);
      return;
    }
    setAuthOpen(true);
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="When It Matures" backTo={back} />
      <div className="mx-auto flex w-full max-w-[600px] flex-col gap-6">
        <p className="px-1 text-[13px] leading-relaxed text-muted-foreground">
          {`This deposit matures on ${formatDate(d.maturity)}. Choose what happens then. You can change it any time before.`}
        </p>

        <div role="radiogroup" aria-label="Maturity instruction" className="flex flex-col gap-3">
          {DEPOSIT_INSTRUCTIONS.map((i) => (
            <OptionTile key={i.id} title={i.label} detail={i.detail} value={i.id === current ? "Current" : undefined} selected={selected === i.id} onSelect={() => setChoice(i.id)} />
          ))}
        </div>

        <div>
          <div className="pt-2">
            <Button type="button" className="h-13 w-full rounded-2xl text-[16px]" disabled={!changed} onClick={apply}>
              Proceed
            </Button>
          </div>
          {!changed && <p className="px-1 pt-3 text-center text-[12px] text-muted-foreground">Choose a different option to change it.</p>}
        </div>
      </div>

      <TransactionOtpModal
        open={authOpen}
        onOpenChange={setAuthOpen}
        onSuccess={() => {
          setInstruction(d.id, selected);
          setDone(true);
        }}
        summary={
          <AuthSummary
            headline="Change what happens when your term deposit matures"
            rows={[
              ["Now", depositInstructionLabel(current)],
              ["Change to", depositInstructionLabel(selected)],
            ]}
          />
        }
      />
    </div>
  );
}
