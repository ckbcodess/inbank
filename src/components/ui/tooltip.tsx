"use client"

import * as React from "react"
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"

import { cn } from "@/lib/utils"

const TooltipTrigger = TooltipPrimitive.Trigger

function TooltipProvider({
  delay = 200,
  ...props
}: TooltipPrimitive.Provider.Props) {
  return <TooltipPrimitive.Provider delay={delay} {...props} />
}

function Tooltip(props: TooltipPrimitive.Root.Props) {
  return <TooltipPrimitive.Root {...props} />
}

function TooltipContent({
  className,
  side = "top",
  sideOffset = 6,
  align = "center",
  alignOffset = 0,
  children,
  ...props
}: TooltipPrimitive.Popup.Props &
  Pick<
    TooltipPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset"
  >) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        className="isolate z-50"
      >
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={cn(
            "relative z-50 max-w-xs origin-(--transform-origin) rounded-lg px-2.5 py-1.5 text-[11.5px] font-medium text-foreground tracking-tight shadow-md border border-border/80 dark:border-[#333] outline-none select-none pointer-events-none",
            "bg-popover/90 dark:bg-[#1a1a1a]/95 backdrop-blur-md",
            "duration-150 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            "data-[side=bottom]:slide-in-from-top-1.5 data-[side=top]:slide-in-from-bottom-1.5 data-[side=left]:slide-in-from-right-1.5 data-[side=right]:slide-in-from-left-1.5",
            className
          )}
          {...props}
        >
          {children}
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  )
}

function SimpleTooltip({
  content,
  children,
  side = "top",
  align = "center",
  sideOffset = 6,
}: {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: "top" | "bottom" | "left" | "right";
  align?: "center" | "start" | "end";
  sideOffset?: number;
}) {
  if (!content) return children;
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent side={side} align={align} sideOffset={sideOffset}>
        {content}
      </TooltipContent>
    </Tooltip>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, SimpleTooltip }

