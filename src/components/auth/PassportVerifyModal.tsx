"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { Modal } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, ExternalLink } from "@/components/ui/icons";

const TOUCH_QUERY = "(pointer: coarse)";

function subscribeTouch(onChange: () => void) {
  const mq = window.matchMedia(TOUCH_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/** Capability, not a device guess (see use-keyboard-open): a touch screen can't scan the QR code, so it verifies in place. */
function useIsTouchScreen() {
  return useSyncExternalStore(
    subscribeTouch,
    () => window.matchMedia(TOUCH_QUERY).matches,
    () => false,
  );
}

/** A line in the modal: a plain icon, a title and a muted line under it. No tile behind the icon. */
function Fact({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center text-foreground">{icon}</span>
      <div className="flex flex-col gap-1">
        <p className="text-heading font-medium text-foreground">{title}</p>
        <p className="text-body leading-relaxed text-muted-foreground">{children}</p>
      </div>
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
  const touch = useIsTouchScreen();
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      title="Verify With Your Passport"
      bodyClassName="gap-12 py-5"
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
      <div className="rounded-xl bg-warning/10 p-4">
        <p className="text-body leading-relaxed text-foreground">
          This option is only for customers who opened their GCB accounts using an international passport. e.g.
          Link2Home
        </p>
      </div>
      {/* 48px above this group (the body's gap), 24px between the two lines. */}
      <div className="flex flex-col gap-6">
        <Fact icon={<Clock size={20} />} title="Have your passport ready">
          Takes 2 minutes. Scan the bio page and take a selfie.
        </Fact>
        <Fact icon={<ExternalLink size={20} />} title="Secure verification">
          {touch
            ? "Verify and return here to complete."
            : "Scan a QR code with your mobile device, verify and return here to complete."}
        </Fact>
      </div>
    </Modal>
  );
}
