import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-21 w-full field-surface rounded-xl border border-transparent bg-field px-3 py-2 text-[14px] text-foreground transition-all outline-none placeholder:text-muted-foreground",
        "focus:outline-none focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:bg-border/50 disabled:opacity-50 hover:bg-field-hover focus-visible:bg-field-focus dark:disabled:bg-border/80",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
