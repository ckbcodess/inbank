"use client";

/**
 * Invest → one holding → change what happens when it matures.
 *
 * Stopping is never harder than starting: switching to "Do not rollover" takes effect at once, with an Undo, and asks
 * for no code. Choosing a rollover commits future money, so that one is authorised with a one-time code.
 */

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { OptionTile } from "@/components/ui/option-tile";
import { FormPageSkeleton } from "@/components/states/PageSkeletons";
import TransactionOtpModal from "@/components/payments/TransactionOtpModal";
import { PaymentSuccessScreen } from "@/components/payments/PaymentSuccessScreen";
import { AuthSummary, HoldingNotFound, TREASURY_HOME } from "@/components/invest/parts";
import { formatDate } from "@/lib/mock-data";
import { instructionLabel, isRollover, MATURITY_INSTRUCTIONS, useHolding, useTreasury, type MaturityInstructionId } from "@/lib/treasury";

export default function ChangeMaturityPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { hydrated, holding: h } = useHolding(id);
  const setInstruction = useTreasury((s) => s.setInstruction);

  const [choice, setChoice] = useState<MaturityInstructionId | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [done, setDone] = useState(false);

  if (!hydrated) return <FormPageSkeleton fields={2} />;
  if (!h) return <HoldingNotFound title="When It Matures" />;

  const back = { href: `${TREASURY_HOME}/holdings/${h.id}`, label: h.title };
  const current = h.instruction;
  const selected = choice ?? current;
  const changed = selected !== current;

  if (done) {
    return (
      <PaymentSuccessScreen
        title="Maturity instruction updated"
        message={`Your maturity instruction for ${h.title} has been updated. You can change it any time before it matures.`}
        onPrimaryAction={() => router.push(back.href)}
        primaryActionLabel="Back to Investment"
        showSaveBeneficiary={false}
        customActionCards={[]}
      />
    );
  }

  function apply() {
    if (!h) return;
    if (!isRollover(selected)) {
      const before = current;
      setInstruction(h.id, selected);
      toast.success("Rollover stopped. The full face value will be paid into your account at maturity.", {
        id: "treasury-maturity",
        action: { label: "Undo", onClick: () => setInstruction(h.id, before) },
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
          {`Your ${h.title} matures on ${formatDate(h.maturity)}. Choose what happens then. You can change it any time before.`}
        </p>

        <div role="radiogroup" aria-label="Maturity instruction" className="flex flex-col gap-3">
          {MATURITY_INSTRUCTIONS.map((m) => (
            <OptionTile
              key={m.id}
              title={m.label}
              detail={m.detail}
              value={m.id === current ? "Current" : undefined}
              selected={selected === m.id}
              onSelect={() => setChoice(m.id)}
            />
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
          setInstruction(h.id, selected);
          setDone(true);
        }}
        summary={
          <AuthSummary
            headline={`Change what happens when ${h.title} matures`}
            rows={[
              ["Now", instructionLabel(current)],
              ["Change to", instructionLabel(selected)],
            ]}
          />
        }
      />
    </div>
  );
}
