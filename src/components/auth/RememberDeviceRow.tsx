"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { TRUST_DAYS } from "@/lib/device-trust";

/**
 * "Remember this device for 30 days" — one row, used by every place a sign-in is
 * set up or verified (activation, sign-up, migration, MFA), so the offer reads
 * the same everywhere. `hint` is the only thing that varies with the moment.
 */
export function RememberDeviceRow({
  checked,
  onCheckedChange,
  hint = "Sign in faster next time, without a code. Only on a device you don\u2019t share.",
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="flex items-start gap-3 px-1 text-[13.5px] text-foreground cursor-pointer select-none">
      <Checkbox
        checked={checked}
        onCheckedChange={(c) => onCheckedChange(!!c)}
        aria-label={`Remember this device for ${TRUST_DAYS} days`}
        className="mt-0.5"
      />
      <span className="flex flex-col gap-0.5">
        <span>Remember this device for {TRUST_DAYS} days</span>
        <span className="text-[12.5px] text-muted-foreground">{hint}</span>
      </span>
    </label>
  );
}
