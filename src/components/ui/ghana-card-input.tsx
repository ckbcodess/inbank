"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { formatGhanaCard, GHANA_CARD_PLACEHOLDER } from "@/lib/ghana-card";

/**
 * Ghana Card number field. Digits only, stops at the ten a card has (nine, then the check digit), and puts in
 * "GHA-" and the dash as they type. Pasted or autofilled numbers ("gha 123456789 0") are cleaned the same way.
 * `onValueChange` emits the formatted number ("GHA-123456789-0").
 */
export function GhanaCardInput({
  value,
  onValueChange,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type" | "inputMode" | "maxLength"> & {
  value: string;
  onValueChange: (card: string) => void;
}) {
  return (
    <Input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      spellCheck={false}
      maxLength={15}
      placeholder={GHANA_CARD_PLACEHOLDER}
      className="tabular"
      value={formatGhanaCard(value)}
      onChange={(e) => onValueChange(formatGhanaCard(e.target.value))}
      {...props}
    />
  );
}
