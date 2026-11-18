"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { AppLoader } from "@/components/ui/loader";
import { ArrowLeftRight, Check, Lock, ShieldCheck, X } from "@/components/ui/icons";
import { QrCode } from "@/components/ui/qr-code";
import { SHOW_DEMO_TOOLS } from "@/lib/demo-tools";
import { cn } from "@/lib/utils";
import {
  PARTNER_DEMO_OUTCOMES,
  demoPartnerResult,
  type PartnerDemoOutcome,
  type PartnerProgress,
  type PartnerResult,
} from "@/lib/identity-partner";

const STEP_DELAY = { opening: 800, checking: 1500, done: 900 } as const;

/**
 * The identity partner's window, drawn in the page for the prototype.
 *
 * In production this is a real browser window the partner serves (opened with `window.open`, like "Continue with
 * Google"), and these callbacks are its `postMessage` events. Here it sits over a dimmed page with its own title bar
 * and address bar, so it reads as somebody else's window. It can be dragged by the title bar on a computer and fills
 * the screen on a phone, which is how a browser shows a login window there.
 *
 * Closing it before the check finishes calls `onClose`; nothing is shared in that case.
 */
export default function IdentityPartnerWindow({
  open,
  knownPassport,
  flashKey,
  onProgress,
  onResult,
  onClose,
}: {
  open: boolean;
  /** The demo account's passport, returned when the demo result is "Passes". */
  knownPassport: string;
  /** Bump to draw attention to the window ("Show it again" on the page). */
  flashKey: number;
  onProgress: (progress: PartnerProgress) => void;
  onResult: (result: PartnerResult) => void;
  onClose: () => void;
}) {
  const [progress, setProgress] = useState<PartnerProgress>("opening");
  const [outcome, setOutcome] = useState<PartnerDemoOutcome>("verified");
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [flashing, setFlashing] = useState(false);
  const drag = useRef<{ startX: number; startY: number; fromX: number; fromY: number } | null>(null);

  // Keep the latest callbacks without restarting the timers below.
  const handlers = useRef({ onProgress, onResult });
  handlers.current = { onProgress, onResult };

  // Each opening starts from the top, in the middle of the screen.
  useEffect(() => {
    if (!open) return;
    setProgress("opening");
    setOffset({ x: 0, y: 0 });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    handlers.current.onProgress(progress);
    let next: PartnerProgress | null = null;
    if (progress === "opening") next = "consent";
    if (progress === "checking") next = "done";
    if (next) {
      const to = next;
      const t = window.setTimeout(() => setProgress(to), STEP_DELAY[progress as "opening" | "checking"]);
      return () => window.clearTimeout(t);
    }
    if (progress === "done") {
      const t = window.setTimeout(() => handlers.current.onResult(demoPartnerResult(outcome, knownPassport)), STEP_DELAY.done);
      return () => window.clearTimeout(t);
    }
  }, [open, progress, outcome, knownPassport]);

  useEffect(() => {
    if (!flashKey) return;
    setFlashing(true);
    const t = window.setTimeout(() => setFlashing(false), 1000);
    return () => window.clearTimeout(t);
  }, [flashKey]);

  function startDrag(e: ReactPointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("button")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { startX: e.clientX, startY: e.clientY, fromX: offset.x, fromY: offset.y };
  }
  function moveDrag(e: ReactPointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d) return;
    setOffset({ x: d.fromX + e.clientX - d.startX, y: d.fromY + e.clientY - d.startY });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      disablePointerDismissal
    >
      <DialogContent
        size="sm"
        showDragHandle={false}
        aria-label="Identity verification window"
        style={{ "--drag-x": `${offset.x}px`, "--drag-y": `${offset.y}px` } as CSSProperties}
        className={cn(
          "rounded-2xl border-0 sm:max-w-[560px] sm:h-[720px] sm:max-h-[92dvh] sm:[transform:translate(var(--drag-x),var(--drag-y))]",
          "max-sm:inset-0 max-sm:top-0 max-sm:h-dvh max-sm:max-h-none max-sm:rounded-none max-sm:border-t-0",
          "ring-0 transition-shadow duration-hover ease-settle",
          flashing && "ring-4 ring-primary",
        )}
      >
        {/* Title bar: whose window this is. Dragging it moves the window on a computer. */}
        <div
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={() => (drag.current = null)}
          className="flex h-10 shrink-0 select-none items-center gap-2 bg-muted pl-3 sm:cursor-grab sm:active:cursor-grabbing"
        >
          <span className="flex size-5 shrink-0 items-center justify-center rounded-sm bg-foreground text-background">
            <ShieldCheck size={12} />
          </span>
          <DialogTitle className="flex-1 text-meta text-foreground">Identity verification</DialogTitle>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close window"
            className="flex size-10 shrink-0 items-center justify-center text-muted-foreground transition-colors duration-hover hover:bg-background hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>
        {/* Address bar: a secure page that isn't GCB's. The partner isn't named to customers. */}
        <div className="shrink-0 border-b border-border bg-muted px-2 pb-2">
          <div className="flex h-(--control-sm) items-center gap-2 rounded-full bg-modal px-3 text-meta text-muted-foreground">
            <Lock size={12} />
            <span className="truncate">Secure connection</span>
          </div>
        </div>

        <div className="custom-scrollbar flex flex-1 flex-col items-center gap-4 overflow-y-auto px-6 py-8 text-center">
          <PartnerStep progress={progress} onNext={setProgress} />
        </div>

        <div className="flex shrink-0 flex-col gap-3 border-t border-border px-4 py-3">
          {SHOW_DEMO_TOOLS && progress !== "done" && (
            <div className="flex items-center gap-3">
              <span className="shrink-0 text-meta text-muted-foreground">Demo result</span>
              <SegmentedControl
                aria-label="Demo result"
                fullWidth
                options={PARTNER_DEMO_OUTCOMES.map((o) => ({ value: o.id, label: o.label }))}
                value={outcome}
                onChange={setOutcome}
              />
            </div>
          )}
          <p className="text-center text-meta text-muted-foreground">
            Identity verification for GCB Bank PLC
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The partner's own screens. The check is QR-only: the passport and the selfie are taken on the customer's phone,
 * never on this computer, so there is no photo capture or upload here.
 */
function PartnerStep({ progress, onNext }: { progress: PartnerProgress; onNext: (p: PartnerProgress) => void }) {
  const partnerButton = (label: string, next: PartnerProgress) => (
    <Button type="button" size="xl" onClick={() => onNext(next)} className="w-full">
      {label}
    </Button>
  );

  if (progress === "opening") {
    return (
      <div className="flex w-full flex-1 flex-col items-center gap-4" aria-busy="true">
        <div className="size-10 animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-2/3 animate-pulse rounded-sm bg-muted" />
        <div className="h-20 w-full animate-pulse rounded-xl bg-muted" />
        <div className="mt-auto h-(--control-xl) w-52 animate-pulse rounded-full bg-muted" />
      </div>
    );
  }

  if (progress === "consent") {
    return (
      <>
        <div className="flex items-center gap-3 text-muted-foreground">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-body font-medium text-primary-foreground">G</span>
          <ArrowLeftRight size={16} />
          <span className="flex size-10 items-center justify-center rounded-lg bg-foreground text-background">
            <ShieldCheck size={18} />
          </span>
        </div>
        <h2 className="text-title font-medium tracking-[var(--ls-tight)]">GCB Bank wants to confirm it’s you</h2>
        <p className="max-w-80 text-body leading-relaxed text-muted-foreground">
          You’ll check your passport and take a selfie on your phone. Then we share this with GCB Bank, and nothing else:
        </p>
        <ul className="w-full rounded-xl border border-border px-4 py-3 text-left text-body leading-loose">
          <li>Your name and date of birth</li>
          <li>Your passport number and expiry date</li>
          <li>Whether the check passed</li>
        </ul>
        <div className="mt-auto w-full">{partnerButton("Continue", "handoff")}</div>
        <a href="#" className="text-meta text-muted-foreground underline underline-offset-4 hover:text-foreground">
          Privacy notice
        </a>
      </>
    );
  }

  if (progress === "handoff") {
    return (
      <>
        <h2 className="text-title font-medium tracking-[var(--ls-tight)]">Continue on your phone</h2>
        <p className="max-w-80 text-body leading-relaxed text-muted-foreground">
          Scan this with your phone’s camera to check your passport there. This window moves on when you’re done.
        </p>
        <div className="rounded-xl border border-border bg-background p-3 text-foreground">
          <QrCode value="https://example.com/verify/session" size={160} aria-label="Code to continue on your phone" />
        </div>
        <div className="flex items-center gap-2 text-body text-muted-foreground" role="status">
          <AppLoader size={16} />
          Waiting for your phone
        </div>
        {SHOW_DEMO_TOOLS && (
          <div className="mt-auto flex w-full flex-col items-center gap-3">
            <Button type="button" variant="outline" size="xl" className="w-full" onClick={() => onNext("checking")}>
              Demo: Finish on Phone
            </Button>
          </div>
        )}
      </>
    );
  }

  if (progress === "checking") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4" role="status">
        <AppLoader size={32} />
        <h2 className="text-title font-medium tracking-[var(--ls-tight)]">Checking your passport</h2>
        <p className="text-body text-muted-foreground">This takes a few seconds.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4" role="status">
      <span className="flex size-14 items-center justify-center rounded-full bg-success text-success-foreground">
        <Check size={24} />
      </span>
      <h2 className="text-title font-medium tracking-[var(--ls-tight)]">Done</h2>
      <p className="text-body text-muted-foreground">Taking you back to GCB Bank.</p>
    </div>
  );
}
