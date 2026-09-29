"use client";

/**
 * A post-onboarding welcome sequence, shown over the blurred dashboard
 * after someone finishes onboarding (lib/device-trust `setFirstRun`) until they dismiss it.
 *
 * Sequence for new users:
 * 1. Referral Code step (if pending)
 * 2. Add as Source of Funds prompt (if pending funding source exists)
 * 3. 3-card quick feature introduction
 */

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowLeftRight, CreditCard, Eye, Fingerprint, Send, Sparkles } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  clearFirstRun,
  peekFirstRun,
  useTrustedDevice,
  type FirstRunKind,
  peekPendingReferral,
  clearPendingReferral,
  peekPendingFundingSource,
  clearPendingFundingSource,
  type PendingFundingSource,
} from "@/lib/device-trust";
import { useLinkedSources, type NetworkOperator } from "@/lib/accounts-store";
import { toast } from "sonner";
import ReferralStep from "@/components/auth/ReferralStep";

interface Slide {
  icon: typeof Send;
  title: string;
  body: string;
}

function slidesFor(kind: FirstRunKind, trusted: boolean): Slide[] {
  const first: Slide =
    kind === "migrated"
      ? {
          icon: ArrowLeftRight,
          title: "Everything came across",
          body: "Your accounts, saved payees and standing orders are all here. Your payees sit under Pay again for one-tap payments.",
        }
      : {
          icon: Sparkles,
          title: "Your money, at a glance",
          body: "Your balance is at the top. Tap the account pill above it to switch between your accounts.",
        };
  return [
    first,
    {
      icon: Send,
      title: "Send, pay and top up",
      body: "Send Money, Pay Bill and Top-Up are always on your balance card, and they start from the account you're looking at.",
    },
    trusted
      ? {
          icon: Eye,
          title: "Keep it private",
          body: "Tap the eye next to your balance to hide amounts when someone's looking over your shoulder.",
        }
      : {
          icon: Fingerprint,
          title: "Sign in faster next time",
          body: "Tick “Remember this device” when you next sign in here, and you can use a passkey instead of a code.",
        },
  ];
}

export function FirstRunWelcome({ firstName }: { firstName: string }) {
  const [kind, setKind] = useState<FirstRunKind | null>(null);
  const [pendingSource, setPendingSource] = useState<PendingFundingSource | null>(null);
  const [stage, setStage] = useState<"referral" | "source" | "slides">("slides");
  const [index, setIndex] = useState(0);
  const trusted = useTrustedDevice();
  const addSource = useLinkedSources((s) => s.addSource);

  // Shown until it's dismissed (not merely seen), so a reload mid-read doesn't lose it.
  useEffect(() => {
    const k = peekFirstRun();
    setKind(k);
    if (k === "new") {
      const hasRef = peekPendingReferral();
      const src = peekPendingFundingSource();
      setPendingSource(src);
      if (hasRef) {
        setStage("referral");
      } else if (src) {
        setStage("source");
      } else {
        setStage("slides");
      }
    }
  }, []);

  if (!kind) return null;

  const slides = slidesFor(kind, !!trusted);
  const slide = slides[index];
  const last = index === slides.length - 1;
  const Icon = slide.icon;

  const close = () => {
    clearFirstRun();
    clearPendingReferral();
    clearPendingFundingSource();
    setKind(null);
  };

  const handleReferralDone = () => {
    clearPendingReferral();
    if (pendingSource) {
      setStage("source");
    } else {
      setStage("slides");
    }
  };

  const handleAllowSource = () => {
    if (pendingSource) {
      addSource({
        id: `src-${Date.now()}`,
        type: pendingSource.type,
        title:
          pendingSource.type === "momo"
            ? `${pendingSource.operator || "Mobile Money"} Wallet`
            : "Visa Debit Card",
        subtitle:
          pendingSource.type === "momo"
            ? pendingSource.momoNumber || ""
            : `•••• ${pendingSource.cardNumber?.replace(/\s/g, "").slice(-4) || "4444"}`,
        operator: pendingSource.type === "momo" ? (pendingSource.operator as NetworkOperator) : undefined,
        maskedNumber:
          pendingSource.type === "momo"
            ? pendingSource.momoNumber || ""
            : `•••• ${pendingSource.cardNumber?.replace(/\s/g, "").slice(-4) || "4444"}`,
      });
      toast.success("Source of funds added", {
        description: `${pendingSource.type === "momo" ? pendingSource.operator + " Mobile Money" : "Card"} saved for future top-ups.`,
      });
    }
    clearPendingFundingSource();
    setStage("slides");
  };

  const handleDontAllowSource = () => {
    clearPendingFundingSource();
    setStage("slides");
  };

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent size="sm">
        {/* STAGE 1: Referral Code */}
        {stage === "referral" && (
          <>
            <DialogHeader onClose={close}>
              <DialogTitle>Welcome, {firstName}</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <ReferralStep onDone={handleReferralDone} dataTour="dashboard-referral" />
            </DialogBody>
          </>
        )}

        {/* STAGE 2: Add as Source of Funds */}
        {stage === "source" && (
          <>
            <DialogHeader showCloseButton={false}>
              <DialogTitle>Add as Source of Funds</DialogTitle>
            </DialogHeader>
            <DialogBody className="gap-4 text-left">
              <p className="text-[13.5px] text-muted-foreground leading-relaxed">
                Would you like to save this{" "}
                {pendingSource?.type === "momo"
                  ? `${pendingSource.operator || "Mobile Money"} wallet`
                  : "bank card"}{" "}
                as a linked source of funds for quick top-ups in the future?
              </p>

              <div className="flex items-center gap-3.5 rounded-xl border border-border/80 bg-muted/30 p-3.5 text-left">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-card border border-border/60">
                  {pendingSource?.type === "momo" ? (
                    <Image
                      src={
                        pendingSource.operator === "MTN"
                          ? "/mtn.svg"
                          : pendingSource.operator === "Telecel"
                          ? "/telecel.svg"
                          : "/at.svg"
                      }
                      alt={pendingSource.operator || "Operator"}
                      width={24}
                      height={24}
                      className="object-contain"
                    />
                  ) : (
                    <CreditCard size={20} className="text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-medium text-foreground truncate">
                    {pendingSource?.type === "momo"
                      ? `${pendingSource.operator || "Mobile Money"} Wallet`
                      : "Visa Debit Card"}
                  </p>
                  <p className="text-[12.5px] text-muted-foreground font-mono truncate">
                    {pendingSource?.type === "momo"
                      ? pendingSource.momoNumber
                      : `•••• ${pendingSource?.cardNumber?.replace(/\s/g, "").slice(-4) || "4444"}`}
                  </p>
                </div>
              </div>
            </DialogBody>
            <DialogFooter className="flex-row gap-2.5 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleDontAllowSource}
                className="flex-1 sm:flex-none h-10 px-4 text-[13.5px]"
              >
                Don&apos;t Allow
              </Button>
              <Button
                type="button"
                variant="default"
                onClick={handleAllowSource}
                className="flex-1 sm:flex-none h-10 px-5 text-[13.5px]"
              >
                Allow
              </Button>
            </DialogFooter>
          </>
        )}

        {/* STAGE 3: Introduction Slides */}
        {stage === "slides" && (
          <>
            <DialogHeader onClose={close}>
              <DialogTitle>
                {kind === "migrated"
                  ? `Welcome to the new internet banking, ${firstName}`
                  : `Welcome, ${firstName}`}
              </DialogTitle>
            </DialogHeader>
            <DialogBody>
              <div className="flex flex-col items-start gap-4 py-2">
                <span className="flex size-11 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-[16px] text-foreground">{slide.title}</h3>
                  <p className="text-[14px] leading-relaxed text-muted-foreground">{slide.body}</p>
                </div>
                <div className="flex gap-1.5" aria-label={`Card ${index + 1} of ${slides.length}`}>
                  {slides.map((s, i) => (
                    <span
                      key={s.title}
                      className={cn(
                        "h-1.5 rounded-full transition-all",
                        i === index ? "w-5 bg-foreground" : "w-1.5 bg-border"
                      )}
                    />
                  ))}
                </div>
              </div>
            </DialogBody>
            <DialogFooter>
              {!last && (
                <Button variant="ghost" onClick={close}>
                  Skip
                </Button>
              )}
              <Button onClick={() => (last ? close() : setIndex((i) => i + 1))}>
                {last ? "Go to my dashboard" : "Next"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
