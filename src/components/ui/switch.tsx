"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"

import { cn } from "@/lib/utils"
import { haptic } from "@/lib/haptics"

/**
 * An on/off setting that takes effect the moment it is flipped (no Save button). The hit area reaches past the
 * track to 40px. Name it with `aria-labelledby` pointing at the row's title.
 */
/**
 * `sm` (36×20, the house default) is used everywhere. `default` is the older 44×24 track, kept for a case that needs it.
 * The tap area stays about 40px either way.
 */
const SWITCH_SIZE = {
  default: { track: "h-6 w-11", thumb: "size-5 data-checked:translate-x-5" },
  sm: { track: "h-5 w-9", thumb: "size-4 data-checked:translate-x-4" },
} as const

type SwitchSize = keyof typeof SWITCH_SIZE

function Switch({
  className,
  onCheckedChange,
  size = "sm",
  ...props
}: SwitchPrimitive.Root.Props & { size?: SwitchSize }) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      onCheckedChange={(checked, details) => {
        haptic("tap")
        onCheckedChange?.(checked, details)
      }}
      className={cn(
        "relative inline-flex shrink-0 cursor-pointer items-center rounded-full bg-muted-foreground/30 p-0.5 outline-none transition-colors duration-hover",
        SWITCH_SIZE[size].track,
        "after:absolute after:-inset-2 after:content-['']",
        "focus-visible:ring-1 focus-visible:ring-ring data-checked:bg-primary data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "block rounded-full bg-white shadow-xs transition-transform duration-hover dark:data-checked:bg-primary-foreground",
          SWITCH_SIZE[size].thumb
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
