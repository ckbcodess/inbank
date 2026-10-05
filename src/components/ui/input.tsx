import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-field-border bg-field px-2.5 py-1 text-base transition-colors outline-none",
        "file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground",
        "focus:outline-none focus:border-field-border-focus focus-visible:outline-none focus-visible:border-field-border-focus focus:ring-0 focus-visible:ring-0",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-border/50 disabled:opacity-50",
        "aria-invalid:border-destructive aria-invalid:ring-0",
        "md:text-sm hover:bg-field-hover focus-visible:bg-field-focus dark:disabled:bg-border/80 dark:aria-invalid:border-destructive/50",
        "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
        className
      )}
      {...props}
    />
  )
}

export { Input }
