"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { toTitleCase } from "@/lib/title-case"

/** Walks the label's children and Title Cases the plain text, so no screen can type its own casing. */
function titleCaseChildren(children: React.ReactNode): React.ReactNode {
  return React.Children.map(children, (child) => (typeof child === "string" ? toTitleCase(child) : child))
}

function Label({ className, children, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-[12px] leading-none font-medium text-foreground select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    >
      {titleCaseChildren(children)}
    </label>
  )
}

export { Label }
