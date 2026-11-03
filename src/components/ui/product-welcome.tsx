"use client";

import type { ElementType } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { GCBLogo } from "@/components/ui/GCBLogo";
import { X } from "@/components/ui/icons";

export interface WelcomeBenefit {
  icon: ElementType;
  title: string;
  detail: string;
}

/**
 * "Welcome to <product>", shown once to a customer who has not used the product yet. Same split layout as the first-run
 * "Welcome to GCB" funding modal: the message on the left, the gold art panel on the right (hidden on a phone). Three
 * short benefits and one button. "Get Started" only closes it: nothing opens, nothing is created, the person lands on
 * the product and looks around. Each product keeps its own "seen" flag in its own store and passes `open` and `onClose`.
 */
export function ProductWelcome({
  title,
  benefits,
  open,
  onClose,
}: {
  title: string;
  benefits: readonly WelcomeBenefit[];
  open: boolean;
  onClose: () => void;
}) {
  const ArtIcon = benefits[0]?.icon;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        size="lg"
        showCloseButton={false}
        className="overflow-hidden sm:max-w-[812px] p-2 sm:p-2 border border-border/80 bg-modal shadow-2xl sm:rounded-3xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3.5 top-3.5 z-20 flex size-7 cursor-pointer items-center justify-center rounded-full border border-border/60 bg-card/85 text-foreground backdrop-blur transition-colors hover:bg-card"
        >
          <X size={15} aria-hidden="true" />
        </button>
        <div className="grid min-h-[440px] max-h-[calc(92vh-2rem)] grid-cols-1 overflow-hidden sm:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)]">
          <div className="flex min-h-[440px] min-w-0 flex-col justify-between gap-6 p-4 sm:px-5 sm:py-6">
            <div className="flex flex-col gap-5 sm:gap-6">
              <div className="flex justify-start">
                <GCBLogo className="h-8 w-auto" />
              </div>
              <DialogTitle className="text-[22px] font-medium leading-tight tracking-tight text-foreground sm:text-[24px]">
                {title}
              </DialogTitle>
              <div className="flex flex-col gap-5">
                {benefits.map(({ icon: Icon, title: t, detail }) => (
                  <div key={t} className="flex items-start gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                      <Icon size={16} aria-hidden="true" />
                    </span>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-[14px] text-foreground">{t}</span>
                      <span className="text-[13px] leading-relaxed text-muted-foreground">{detail}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <Button type="button" onClick={onClose} className="h-9 w-full cursor-pointer text-[14px] font-medium">
              Get Started
            </Button>
          </div>

          <div
            aria-hidden="true"
            className="relative isolate hidden min-h-[440px] min-w-0 select-none items-center justify-center overflow-hidden rounded-xl [clip-path:inset(0_round_12px)] sm:flex"
            style={{ background: "radial-gradient(ellipse at center, #ffd400 0%, #ffbb00 100%)" }}
          >
            {ArtIcon && (
              <span className="flex size-24 items-center justify-center rounded-3xl bg-black/10 text-black/80">
                <ArtIcon size={48} />
              </span>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
