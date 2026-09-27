"use client";

/**
 * A three-card welcome, shown on the dashboard after someone finishes
 * onboarding (lib/device-trust `setFirstRun`) until they dismiss it. Short and skippable on purpose:
 * a first-timer should meet their money, not homework. People moving from the
 * old internet banking get a first card about what came across instead.
 */

import { useEffect, useState } from "react";
import { ArrowLeftRight, Eye, Fingerprint, Send, Sparkles } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { clearFirstRun, peekFirstRun, useTrustedDevice, type FirstRunKind } from "@/lib/device-trust";

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
  const [index, setIndex] = useState(0);
  const trusted = useTrustedDevice();

  // Shown until it's dismissed (not merely seen), so a reload mid-read doesn't lose it.
  useEffect(() => {
    setKind(peekFirstRun());
  }, []);

  if (!kind) return null;
  const slides = slidesFor(kind, !!trusted);
  const slide = slides[index];
  const last = index === slides.length - 1;
  const Icon = slide.icon;
  const close = () => {
    clearFirstRun();
    setKind(null);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent size="sm">
        <DialogHeader onClose={close}>
          <DialogTitle>{kind === "migrated" ? `Welcome to the new internet banking, ${firstName}` : `Welcome, ${firstName}`}</DialogTitle>
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
                  className={cn("h-1.5 rounded-full transition-all", i === index ? "w-5 bg-foreground" : "w-1.5 bg-border")}
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
          <Button onClick={() => (last ? close() : setIndex((i) => i + 1))}>{last ? "Go to my dashboard" : "Next"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
