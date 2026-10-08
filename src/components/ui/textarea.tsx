import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-lg border border-field-border bg-field px-2.5 py-2 text-[14px] transition-colors outline-none placeholder:text-muted-foreground",
        "focus:outline-none focus:border-field-border-focus focus-visible:outline-none focus-visible:border-field-border-focus focus:ring-0 focus-visible:ring-0",
        "disabled:cursor-not-allowed disabled:bg-border/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-0 hover:bg-field-hover focus-visible:bg-field-focus dark:disabled:bg-border/80 dark:aria-invalid:border-destructive/50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
