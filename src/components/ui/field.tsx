import * as React from "react"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

/**
 * The one way to put a label on a form control. It owns the label's casing (Title Case, from `Label`), size and
 * spacing, the "(Optional)" suffix, and the hint and error lines, so a screen only says what the field is called.
 * The control itself is `Input`, `Textarea`, a `Select`, `PhoneInput` or a date picker; the only fields that
 * are not built from these are the one-time code boxes and the amount field.
 */
export function Field({
  label,
  htmlFor,
  optional,
  hint,
  error,
  className,
  children,
}: {
  label: React.ReactNode
  htmlFor?: string
  optional?: boolean
  /** Quiet helper text under the control. */
  hint?: React.ReactNode
  /** Error about what was just typed. Shown under the control, replacing the hint. */
  error?: string | null | false
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {optional ? <span className="text-[12px] font-normal italic text-muted-foreground ml-1.5">(optional)</span> : null}
      </Label>
      {children}
      {error ? (
        <p role="alert" className="text-[12px] text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[12px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}
