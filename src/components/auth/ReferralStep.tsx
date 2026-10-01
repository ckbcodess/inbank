"use client";

/**
 * Optional referral code — between Create Your Password and Set Your PIN in
 * both onboarding flows (mirrors the GCB mobile app's welcome screen).
 *
 * Skipping is a first-class, equal-weight choice: the referral rewards someone
 * else, so it must never feel like a gate on the customer's own sign-up.
 * Referral codes are branch codes — branches hand them out — so the code
 * resolves to the branch's name as it's typed, and it can only be applied once
 * the referrer shows. Demo codes: see REFERRAL_BRANCHES (e.g. 183).
 */

import { AlertToast } from "@/components/ui/alert-toast";
import { useState } from "react";
import { PartyPopper } from "lucide-react";
import { DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VerifiedAccountBadge } from "@/components/payments/flows/shared";

/** Prototype directory: branch referral code → branch name. */
const REFERRAL_BRANCHES: Record<string, string> = {
  "101": "Head Office (Accra)",
  "112": "Airport City",
  "124": "Ring Road Central",
  "137": "Legon Campus",
  "183": "Tema Community (Meridian)",
  "201": "Kumasi Main",
  "305": "Takoradi Harbour",
  "410": "Tamale Main",
};

export default function ReferralStep({
  onDone,
  dataTour,
  skipLabel = "Go to Dashboard",
}: {
  /** Called with the applied code, or null when skipped. */
  onDone: (code: string | null) => void;
  dataTour?: string;
  skipLabel?: string;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [skipping, setSkipping] = useState(false);
  // Starts as a plain choice; the code field only appears if they have one.
  const [entering, setEntering] = useState(false);

  function skip() {
    setSkipping(true);
    window.setTimeout(() => onDone(null), 500);
  }

  const referrer = REFERRAL_BRANCHES[code] ?? null;
  const notFound = code.length >= 3 && !referrer;

  function apply(e: React.FormEvent) {
    e.preventDefault();
    if (!referrer || busy) return;
    setBusy(true);
    window.setTimeout(() => onDone(code), 500);
  }

  return (
    <form
      onSubmit={apply}
      className="flex flex-1 flex-col justify-between h-full"
      data-tour={dataTour}
    >
      {/* Top area */}
      <div className="flex flex-col gap-1">
        <DialogTitle className="text-[20px] font-medium tracking-tight text-foreground sm:text-[22px]">
          Got a referral code?
        </DialogTitle>
      </div>

      {/* Middle area: Centered icon and optional code input */}
      <div className="flex flex-1 flex-col items-center justify-center py-6 my-auto gap-4">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/15 text-foreground shadow-xs">
          <PartyPopper size={28} strokeWidth={1.7} aria-hidden="true" />
        </div>

        {entering && (
          <div className="flex flex-col items-center gap-3 w-full max-w-[240px] animate-in fade-in-0 zoom-in-95 duration-200">
            <Label htmlFor="referral-code" className="sr-only">
              Branch code
            </Label>
            <Input
              id="referral-code"
              autoFocus
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, "").slice(0, 3));
              }}
              placeholder="000"
              inputMode="numeric"
              autoComplete="off"
              maxLength={3}
              className="tabular h-12 w-full text-center text-[22px] tracking-[0.3em] font-medium placeholder:text-muted-foreground/30 rounded-xl bg-card border-border/80"
            />

            {referrer && (
              <div className="animate-in fade-in-0 slide-in-from-top-1 duration-150 ease-out">
                <VerifiedAccountBadge name={referrer} />
              </div>
            )}

            <AlertToast
              when={notFound}
              message="We don't recognise that code. Check it, or skip."
            />
          </div>
        )}
      </div>

      {/* Bottom area: Buttons pinned to bottom, exactly like other screens */}
      <div className="flex flex-col gap-2.5 pt-4">
        {entering ? (
          <Button
            type="submit"
            disabled={!referrer}
            loading={busy}
            className="h-10.5 w-full text-[14px] font-medium active:scale-[0.96] transition-transform duration-150 cursor-pointer"
          >
            Apply Code
          </Button>
        ) : (
          <Button
            type="button"
            disabled={skipping}
            onClick={() => setEntering(true)}
            className="h-10.5 w-full text-[14px] font-medium active:scale-[0.96] transition-transform duration-150 cursor-pointer"
          >
            Enter Referral Code
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          disabled={busy || skipping}
          onClick={skip}
          className="h-10.5 w-full text-[14px] font-medium active:scale-[0.96] transition-transform duration-150 cursor-pointer"
        >
          {skipLabel}
        </Button>
      </div>
    </form>
  );
}
