import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-13 w-full min-w-0 rounded-xl border border-field-border bg-field px-4 py-1 text-[14px] text-foreground transition-all outline-none",
        "file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground",
        "focus:outline-none focus:border-field-border-focus focus:ring-1 focus:ring-field-border-focus focus-visible:outline-none focus-visible:border-field-border-focus focus-visible:ring-1 focus-visible:ring-field-border-focus",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-border/50 disabled:opacity-50",
        "aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive dark:aria-invalid:ring-destructive",
        "hover:bg-field-hover focus-visible:bg-field-focus dark:disabled:bg-border/80 dark:aria-invalid:border-destructive",
        "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
        className
      )}
      {...props}
    />
  )
}

export { Input }
