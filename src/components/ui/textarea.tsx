import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-24 w-full rounded-xl border border-field-border bg-field px-4 py-3 text-[14px] text-foreground transition-all outline-none placeholder:text-muted-foreground",
        "focus:outline-none focus:border-field-border-focus focus:ring-2 focus:ring-field-border-focus/25 focus-visible:outline-none focus-visible:border-field-border-focus focus-visible:ring-2 focus-visible:ring-field-border-focus/25",
        "disabled:cursor-not-allowed disabled:bg-border/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 hover:bg-field-hover focus-visible:bg-field-focus dark:disabled:bg-border/80 dark:aria-invalid:border-destructive/50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
