"use client"

import * as React from "react"
import { Popover as PopoverPrimitive } from "@base-ui/react/popover"

import { cn } from "@/lib/utils"


import { hideFocusRingUntilNextMove } from "@/lib/focus-ring"

function Popover({ open, onOpenChange, ...props }: PopoverPrimitive.Root.Props) {
  const wasOpen = React.useRef(false);
  React.useEffect(() => {
    if (open) wasOpen.current = true;
    else if (wasOpen.current) {
      wasOpen.current = false;
      hideFocusRingUntilNextMove();
    }
  }, [open]);

  return (
    <PopoverPrimitive.Root
      open={open}
      onOpenChange={(next, details) => {
        if (!next) hideFocusRingUntilNextMove();
        onOpenChange?.(next, details);
      }}
      {...props}
    />
  );
}

const PopoverTrigger = PopoverPrimitive.Trigger
const PopoverClose = PopoverPrimitive.Close
const PopoverTitle = PopoverPrimitive.Title
const PopoverDescription = PopoverPrimitive.Description

function PopoverContent({
  className,
  side = "bottom",
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  anchor,
  collisionPadding,
  arrow = false,
  children,
  ...props
}: PopoverPrimitive.Popup.Props & {
    /** A small pointed edge toward the anchor, for a popover that points at something (the product tour). */
    arrow?: boolean
  } &
  Pick<
    PopoverPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset" | "anchor" | "collisionPadding"
  >) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        // For a popover that points at an element it has no trigger for (the product tour).
        anchor={anchor}
        collisionPadding={collisionPadding}
        className="isolate z-50"
      >
                  <PopoverPrimitive.Popup
            data-slot="popover-content"
            className={cn(
              "relative z-50 w-auto origin-(--transform-origin) rounded-lg p-0 text-foreground outline-none",
              "before:pointer-events-none before:absolute before:inset-0 before:-z-1 before:rounded-[inherit] before:backdrop-blur-2xl before:backdrop-saturate-150",
              "duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
              "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2",
              "bg-menu shadow-[var(--shadow-menu)]",
              className
            )}
            {...props}
          >
            {children}
            {arrow && (
              <PopoverPrimitive.Arrow
                className="flex size-3 data-[side=bottom]:-top-1.5 data-[side=top]:-bottom-1.5 data-[side=left]:-right-1.5 data-[side=right]:-left-1.5"
              >
                <span aria-hidden className="block size-3 rotate-45 rounded-[2px] bg-menu" />
              </PopoverPrimitive.Arrow>
            )}
          </PopoverPrimitive.Popup>
              </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  )
}

export { Popover, PopoverTrigger, PopoverContent, PopoverClose, PopoverTitle, PopoverDescription }
