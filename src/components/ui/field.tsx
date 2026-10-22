import * as React from "react"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

/**
 * The one way to put a label on a form control. It owns the label's casing (Title Case, from `Label`), size and
 * spacing, the "(Optional)" suffix, and the error line, so a screen only says what the field is called.
 *
 * There is no hint line, on purpose (designer, 2026-10-22; CONSTITUTION §9): help goes in the control's placeholder.
 * The only thing that sits under a field is an error about what was just typed.
 * The control itself is `Input`, `Textarea`, a `Select`, `PhoneInput` or a date picker; the only fields that
 * are not built from these are the one-time code boxes and the amount field.
 */
export function Field({
  label,
  htmlFor,
  optional,
  error,
  action,
  className,
  children,
}: {
  label: React.ReactNode
  htmlFor?: string
  optional?: boolean
  /** Error about what was just typed. Shown under the control, replacing the hint. */
  error?: string | null | false
  /** A small control at the end of the label row, such as a "Saved" link. */
  action?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={htmlFor}>
          {label}
          {optional ? <span className="text-[12px] font-normal italic text-muted-foreground">(optional)</span> : null}
        </Label>
        {action}
      </div>
      {children}
      {error ? (
        <p role="alert" className="text-[12px] text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
