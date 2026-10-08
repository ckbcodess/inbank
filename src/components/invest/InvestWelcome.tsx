"use client";

/**
 * "Welcome to Invest", shown once to someone who has no securities account yet. Three short benefits and one button.
 * "Get Started" only closes it: nothing opens, nothing is created, the person simply lands on Invest and looks around.
 */

import { CalendarClock, Landmark, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMyTreasury, useTreasury, useTreasuryHydrated } from "@/lib/treasury";

const BENEFITS = [
  { icon: TrendingUp, title: "See what you’ll earn first", detail: "You see what you pay and what you get back before you confirm." },
  { icon: CalendarClock, title: "Choose how long", detail: "From 91 days to a year, or longer with bonds." },
  { icon: Landmark, title: "Lend to the Government of Ghana", detail: "Treasury bills and bonds are loans to the government." },
] as const;

export function InvestWelcome() {
  const hydrated = useTreasuryHydrated();
  const { ownerId, csd, welcomed } = useMyTreasury();
  const markWelcomed = useTreasury((s) => s.markWelcomed);

  const open = hydrated && ownerId !== "guest" && !csd && !welcomed;
  const close = () => markWelcomed(ownerId);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent size="md">
        <DialogHeader showCloseButton={false}>
          <DialogTitle>Welcome to Invest</DialogTitle>
        </DialogHeader>
        <DialogBody className="gap-6 py-6">
          {BENEFITS.map(({ icon: Icon, title, detail }) => (
            <div key={title} className="flex items-start gap-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
                <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
              </span>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[14px] text-foreground">{title}</span>
                <span className="text-[13px] leading-relaxed text-muted-foreground">{detail}</span>
              </div>
            </div>
          ))}
        </DialogBody>
        <DialogFooter>
          <Button type="button" className="w-full" onClick={close}>
            Get Started
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
