"use client";

import type { ElementType } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface WelcomeBenefit {
  icon: ElementType;
  title: string;
  detail: string;
}

/**
 * "Welcome to <product>", shown once to a customer who has not used the product yet. Three short benefits and one
 * button. "Get Started" only closes it: nothing opens, nothing is created, the person lands on the product and looks
 * around. Each product keeps its own "seen" flag in its own store and passes `open` and `onClose`.
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
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent size="md">
        <DialogHeader showCloseButton={false}>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogBody className="gap-5 py-5">
          {benefits.map(({ icon: Icon, title: t, detail }) => (
            <div key={t} className="flex items-start gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
                <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
              </span>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[14px] text-foreground">{t}</span>
                <span className="text-[13px] leading-relaxed text-muted-foreground">{detail}</span>
              </div>
            </div>
          ))}
        </DialogBody>
        <DialogFooter>
          <Button type="button" className="w-full" onClick={onClose}>
            Get Started
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
