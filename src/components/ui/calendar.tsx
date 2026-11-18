"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "@/components/ui/icons"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DayPicker, type DropdownProps } from "react-day-picker"

import { cn } from "@/lib/utils"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

/** A month or year picker for the calendar caption: the app's Select, so it matches every other dropdown. */
function CalendarDropdown({ options, value, onChange, "aria-label": ariaLabel }: DropdownProps) {
  return (
    <Select
      value={String(value)}
      onValueChange={(next) => {
        if (next && onChange) onChange({ target: { value: next } } as React.ChangeEvent<HTMLSelectElement>)
      }}
    >
      <SelectTrigger size="sm" aria-label={ariaLabel} className="w-auto gap-1 px-2 text-body">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-64">
        {options?.map((o) => (
          <SelectItem key={o.value} value={String(o.value)} disabled={o.disabled}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-2", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-2",
        month: "flex flex-col gap-3",
        month_caption: "flex justify-center pt-1 relative items-center w-full h-8",
        dropdowns: "flex items-center justify-center gap-1.5 px-8",
        caption_label: "text-body font-medium",
        nav: "flex items-center gap-1",
        button_previous: cn(
          "absolute left-1 top-1 inline-flex items-center justify-center size-6 rounded-lg border border-border bg-transparent hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-40 disabled:pointer-events-none z-10"
        ),
        button_next: cn(
          "absolute right-1 top-1 inline-flex items-center justify-center size-6 rounded-lg border border-border bg-transparent hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-40 disabled:pointer-events-none z-10"
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "text-muted-foreground rounded-lg w-8 font-normal text-[0.8rem]",
        week: "flex w-full mt-2",
        day: "relative size-8 p-0 text-center text-body focus-within:relative focus-within:z-20",
        day_button: cn(
          "inline-flex items-center justify-center size-8 rounded-lg font-normal hover:bg-accent hover:text-accent-foreground transition-colors aria-selected:opacity-100"
        ),
        selected:
          "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground",
        today: "[&>button]:bg-accent [&>button]:text-accent-foreground",
        outside: "text-muted-foreground/50",
        disabled: "text-muted-foreground/40 opacity-50",
        range_middle:
          "[&>button]:bg-accent [&>button]:text-accent-foreground [&>button]:rounded-none",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        // captionLayout="dropdown" draws its month and year pickers with the app's Select, not a native <select>.
        Dropdown: CalendarDropdown,
        Chevron:({ orientation, className: cls, ...rest }) =>
          orientation === "left" ? (
            <ChevronLeft className={cn("size-3.5", cls)} {...rest} />
          ) : (
            <ChevronRight className={cn("size-3.5", cls)} {...rest} />
          ),
      }}
      {...props}
    />
  )
}

export { Calendar }
