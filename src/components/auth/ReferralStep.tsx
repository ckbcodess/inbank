"use client";

/**
 * Optional referral code — between Create Your Password and Set Your PIN in
 * both onboarding flows (mirrors the GCB mobile app's welcome screen).
 *
 * Skipping is a first-class, equal-weight choice: the referral rewards someone
 * else, so it must never feel like a gate on the customer's own sign-up.
 * A code is a branch's (three digits) or a friend's (KWAM-4821, from Settings →
 * Refer a Friend). It resolves to the branch or the friend as it's typed, and can
 * only be applied once the referrer shows. A shared link opens it filled in.
 * Demo codes: REFERRAL_BRANCHES in lib/referrals (e.g. 183) or any persona's code.
 */

import { AlertToast } from "@/components/ui/alert-toast";
import { useState } from "react";
import { PartyPopper } from "@/components/ui/icons";
import { DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VerifiedAccountBadge } from "@/components/payments/flows/shared";
import { ACTORS } from "@/lib/mock-data";
import { forgetReferralFromLink, normaliseReferralCode, referralFromLink, resolveReferral } from "@/lib/referrals";

export default function ReferralStep({
  onDone,
  dataTour,
  skipLabel = "Skip",
}: {
  /** Called with the applied code, or null when skipped. */
  onDone: (code: string | null) => void;
  dataTour?: string;
  skipLabel?: string;
}) {
  // A shared link (`/join/[code]`) brings the code with it, so the field opens filled in and its owner named.
  const [linked] = useState(() => referralFromLink());
  const [code, setCode] = useState(linked ?? "");
  const [busy, setBusy] = useState(false);
  const [skipping, setSkipping] = useState(false);
  // Starts as a plain choice; the code field only appears if they have one.
  const [entering, setEntering] = useState(!!linked);

  function skip() {
    setSkipping(true);
    forgetReferralFromLink();
    window.setTimeout(() => onDone(null), 500);
  }

  const found = resolveReferral(code, ACTORS);
  const referrer = found?.name ?? null;
  // A branch code is three digits; a friend's is four letters and four digits.
  const notFound = !referrer && (/^\d{3}$/.test(code) || code.length >= 9);

  function apply(e: React.FormEvent) {
    e.preventDefault();
    if (!referrer || busy) return;
    setBusy(true);
    forgetReferralFromLink();
    window.setTimeout(() => onDone(code), 500);
  }

  return (
    <form
      onSubmit={apply}
      className="flex flex-1 flex-col justify-between h-full"
      data-tour={dataTour}
    >
      {/* Top area */}
      <div className="flex flex-col gap-2">
        <DialogTitle className="text-[20px] font-medium tracking-tight text-foreground sm:text-[22px]">
          Were You Referred by Someone?
        </DialogTitle>
        <DialogDescription className="text-[13px] text-muted-foreground leading-normal">
          {linked ? "You came with a referral link. Apply it, or skip." : "Enter the code a friend or a GCB branch gave you."}
        </DialogDescription>
      </div>

      {/* Middle area: Centered icon and optional code input */}
      <div className="flex flex-1 flex-col items-center justify-center py-5 my-auto gap-3">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-foreground shadow-xs">
          <PartyPopper size={28} aria-hidden="true" />
        </div>

        {entering && (
          <div className="flex flex-col items-center gap-2 w-full max-w-[280px] animate-in fade-in-0 zoom-in-95 duration-200">
            <Label htmlFor="referral-code" className="sr-only">
              Referral Code
            </Label>
            <Input
              id="referral-code"
              autoFocus
              value={code}
              onChange={(e) => {
                setCode(normaliseReferralCode(e.target.value));
              }}
              placeholder="KWAM-4821 or 183"
              autoCapitalize="characters"
              autoComplete="off"
              maxLength={9}
              className="tabular text-center text-[18px] font-medium"
            />

            {referrer && (
              <div className="animate-in fade-in-0 slide-in-from-top-1 duration-150 ease-out">
                <VerifiedAccountBadge name={found?.kind === "friend" ? `Referred by ${referrer}` : referrer} />
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
      <div className="flex flex-col gap-2 pt-3">
        {entering ? (
          <Button
            type="submit"
            disabled={!referrer}
            loading={busy}
            className="h-9 w-full text-[14px]"
          >
            Apply Code
          </Button>
        ) : (
          <Button
            type="button"
            disabled={skipping}
            onClick={() => setEntering(true)}
            className="h-9 w-full text-[14px]"
          >
            Enter Referral Code
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          disabled={busy || skipping}
          onClick={skip}
          className="h-9 w-full text-[14px]"
        >
          {skipLabel}
        </Button>
      </div>
    </form>
  );
}
