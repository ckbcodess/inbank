"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"

import { cn } from "@/lib/utils"

/**
 * An on/off setting that takes effect the moment it is flipped (no Save button). The hit area reaches past the
 * track to 40px. Name it with `aria-labelledby` pointing at the row's title.
 */
function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full bg-muted-foreground/30 p-0.5 outline-none transition-colors duration-hover ease-settle",
        "after:absolute after:-inset-2 after:content-['']",
        "focus-visible:ring-1 focus-visible:ring-ring data-checked:bg-primary data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="block size-5 rounded-full bg-background shadow-xs transition-transform duration-hover ease-settle data-checked:translate-x-5 data-checked:bg-primary-foreground"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
