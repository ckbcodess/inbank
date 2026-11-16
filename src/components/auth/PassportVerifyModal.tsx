"use client";

import type { ReactNode } from "react";
import { Modal } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, ExternalLink } from "@/components/ui/icons";

function Fact({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">{icon}</span>
      <p className="flex flex-col gap-0.5 text-[14px] leading-relaxed">
        <span className="font-medium text-foreground">{title}</span>
        <span className="text-muted-foreground">{children}</span>
      </p>
    </div>
  );
}

/**
 * Opened by "With Passport" at the start of `/activate`. It says who the passport path is for, what to have ready,
 * and that the identity partner opens in its own window. Continue opens that window.
 */
export default function PassportVerifyModal({
  open,
  onOpenChange,
  onContinue,
  onUseGhanaCard,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: () => void;
  /** Leaves the passport path for the Ghana Card field. */
  onUseGhanaCard: () => void;
}) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title="Verify With Your Passport"
      bodyClassName="gap-5 py-5"
      footer={
        <>
          <Button type="button" variant="outline" size="md" onClick={onUseGhanaCard}>
            Use Ghana Card
          </Button>
          <Button type="button" size="md" onClick={onContinue}>
            Verify With Passport
          </Button>
        </>
      }
    >
      {/* Who this is for, as an amber note: the one thing to check before going on (designer override, WORKING_LOG). */}
      <div className="flex items-start gap-3 rounded-xl bg-warning/10 p-3">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-warning-text" />
        <p className="flex flex-col gap-0.5 text-[14px] leading-relaxed">
          <span className="font-medium text-foreground">For accounts created with a passport only</span>
          <span className="text-muted-foreground">
            Such as Link2Home. If you registered with a Ghana Card, verify with that.
          </span>
        </p>
      </div>
      <Fact icon={<Clock size={18} />} title="Have your passport with you">
        It takes about two minutes. You’ll photograph the photo page and take a selfie.
      </Fact>
      <Fact icon={<ExternalLink size={18} />} title="Verification opens in a secure window">
        Our verification partner reads your passport and checks it’s you. Then you come back here to finish.
      </Fact>
    </Modal>
  );
}
