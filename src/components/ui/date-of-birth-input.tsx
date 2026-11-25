"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { DATE_OF_BIRTH_PLACEHOLDER, formatDateOfBirth } from "@/lib/date-of-birth";

/**
 * Date of birth field. Digits only, day first, with the slashes put in as the person types. `onValueChange` emits
 * the text as shown ("14/05/1990"); `parseDateOfBirth` turns it into an ISO date and says whether it is real.
 * For any other date use `DatePicker`.
 */
export function DateOfBirthInput({
  value,
  onValueChange,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type" | "inputMode" | "maxLength"> & {
  value: string;
  onValueChange: (text: string) => void;
}) {
  return (
    <Input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      maxLength={10}
      placeholder={DATE_OF_BIRTH_PLACEHOLDER}
      className="tabular"
      value={value}
      onChange={(e) => onValueChange(formatDateOfBirth(e.target.value))}
      {...props}
    />
  );
}
