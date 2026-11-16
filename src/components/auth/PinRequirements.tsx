"use client";

import RuleChecklist, { type RuleState } from "@/components/auth/RuleChecklist";
import { hasConsecutiveDigits, hasRepeatingDigits } from "@/lib/auth-shared";

/**
 * The PIN rules as the same quiet checklist the password uses, shown only while the PIN is being set (the confirm
 * step has its own mismatch error). A rule is judged once all four digits are in, so a tick never shows on a PIN that
 * could still break it; a run or repeat turns amber as soon as it's typed.
 */
export default function PinRequirements({ pin }: { pin: string }) {
  const complete = pin.length === 4;
  const state = (broken: boolean): RuleState => (broken ? "broken" : complete ? "met" : "pending");
  return (
    <RuleChecklist
      label="PIN requirements"
      rules={[
        { id: "no-run", label: "No runs, like 123 or 987", state: state(hasConsecutiveDigits(pin)) },
        { id: "no-repeat", label: "No repeats, like 111", state: state(hasRepeatingDigits(pin)) },
      ]}
    />
  );
}
