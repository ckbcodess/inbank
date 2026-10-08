"use client"

import * as React from "react"
import { format, parse, isValid } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"

interface DatePickerProps {
  /** ISO date string (yyyy-MM-dd), matching what a native <input type="date"> stores. */
  value?: string
  /** Called with the new ISO date string (or "" when cleared). */
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  id?: string
  disabled?: boolean
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  className,
  id,
  disabled,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  const parsed = value ? parse(value, "yyyy-MM-dd", new Date()) : undefined
  const selected = parsed && isValid(parsed) ? parsed : undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        disabled={disabled}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-border bg-transparent px-3 py-2 text-sm whitespace-nowrap transition-all outline-none",
          "focus-visible:border-field-border-focus focus-visible:ring-2 focus-visible:ring-field-border-focus/25",
          "disabled:cursor-not-allowed disabled:opacity-50 dark:bg-border/30 dark:hover:bg-border/50",
          !selected && "text-muted-foreground",
          className
        )}
      >
        {selected ? format(selected, "PP") : placeholder}
        <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          onSelect={(d) => {
            onChange?.(d ? format(d, "yyyy-MM-dd") : "")
            setOpen(false)
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}
