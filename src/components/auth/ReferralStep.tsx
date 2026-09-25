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

import { useState } from "react";
import { AlertCircle, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppLoader } from "@/components/ui/loader";
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
}: {
  /** Called with the applied code, or null when skipped. */
  onDone: (code: string | null) => void;
  dataTour?: string;
}) {
  const [entering, setEntering] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const referrer = REFERRAL_BRANCHES[code] ?? null;
  const notFound = code.length >= 3 && !referrer;

  function apply(e: React.FormEvent) {
    e.preventDefault();
    if (!referrer || busy) return;
    setBusy(true);
    window.setTimeout(() => onDone(code), 500);
  }

  return (
    <div className="flex flex-col gap-6" data-tour={dataTour}>
      <div className="flex justify-center">
        <div className="flex size-20 items-center justify-center rounded-full bg-primary/15 text-foreground">
          <PartyPopper size={34} strokeWidth={1.6} aria-hidden="true" />
        </div>
      </div>

      {entering ? (
        <form onSubmit={apply} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="referral-code" className="text-[13.5px] font-medium text-foreground">
              Referral code
            </Label>
            <Input
              id="referral-code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, "").slice(0, 3));
              }}
              placeholder="e.g. 183"
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              className="h-11 font-mono text-[14.5px] uppercase tracking-wider"
            />
          </div>

          {/* The referrer resolves as the code is typed — confirm who you're rewarding first. */}
          {referrer && (
            <div className="flex flex-col gap-2 animate-in fade-in duration-150">
              <span className="text-[13.5px] font-medium text-foreground">Referrer name</span>
              <VerifiedAccountBadge name={referrer} />
            </div>
          )}
          {notFound && (
            <div role="alert" className="flex items-start gap-2.5 rounded-xl bg-destructive/10 p-3.5 text-[13px] text-destructive">
              <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>We couldn&apos;t find that referral code. Check it and try again, or skip this step.</span>
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            <Button type="submit" size="lg" disabled={!referrer || busy} className="h-11 w-full text-[14px]">
              {busy ? (
                <>
                  <AppLoader size={16} className="mr-2" />
                  Checking…
                </>
              ) : (
                "Apply Code"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={busy}
              onClick={() => onDone(null)}
              className="h-11 w-full text-[14px]"
            >
              Skip &amp; Proceed
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-2.5">
          <Button type="button" size="lg" onClick={() => setEntering(true)} className="h-11 w-full text-[14px]">
            Enter Referral Code
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => onDone(null)}
            className="h-11 w-full text-[14px]"
          >
            Skip &amp; Proceed
          </Button>
        </div>
      )}
    </div>
  );
}
