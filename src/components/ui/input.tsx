import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-(--control-xl) w-full min-w-0 field-surface rounded-xl border border-transparent bg-field px-3 py-1 text-[14px] text-foreground transition-all outline-none",
        "file:inline-flex file:h-5 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground",
        "focus:outline-none focus-visible:outline-none",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-border/50 disabled:opacity-50",
        "focus-visible:bg-field-focus dark:disabled:bg-border/80",
        "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
        className
      )}
      {...props}
    />
  )
}

export { Input }
