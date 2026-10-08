import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-24 w-full rounded-xl border border-field-border bg-field px-4 py-3 text-[14px] text-foreground transition-all outline-none placeholder:text-muted-foreground",
        "focus:outline-none focus:border-field-border-focus focus:ring-1 focus:ring-field-border-focus focus-visible:outline-none focus-visible:border-field-border-focus focus-visible:ring-1 focus-visible:ring-field-border-focus",
        "disabled:cursor-not-allowed disabled:bg-border/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive dark:aria-invalid:ring-destructive hover:bg-field-hover focus-visible:bg-field-focus dark:disabled:bg-border/80 dark:aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
