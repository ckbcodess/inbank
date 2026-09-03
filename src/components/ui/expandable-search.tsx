"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface ExpandableSearchProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  tooltip?: string;
  className?: string;
  inputWidthClassName?: string;
  side?: "top" | "bottom" | "left" | "right";
  ariaLabel?: string;
}

/**
 * ExpandableSearch
 *
 * Implements the inline expandable search pattern:
 * - Sits inline with tab navigation bars or toolbars.
 * - Clicking the search icon slides out an input smoothly from the right and auto-focuses.
 * - Typing filters results live.
 * - Clicking outside when the input is empty auto-collapses it back to the icon.
 * - Provides an instant clear (X) button when query text is present.
 * - Pressing Escape clears the query or closes the search.
 */
export function ExpandableSearch({
  value,
  onChange,
  placeholder = "Search...",
  tooltip = "Search",
  className,
  inputWidthClassName = "w-56 sm:w-72",
  side = "left",
  ariaLabel,
}: ExpandableSearchProps) {
  const [isOpen, setIsOpen] = useState(Boolean(value));
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Keep open if value is externally set or populated
  useEffect(() => {
    if (value && !isOpen) {
      setIsOpen(true);
    }
  }, [value, isOpen]);

  // Click outside detection: auto-collapse if empty
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        if (!value.trim()) {
          setIsOpen(false);
        }
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, value]);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const label = ariaLabel || tooltip || "Search";

  return (
    <div ref={containerRef} className={cn("relative flex items-center justify-end", className)}>
      {isOpen || value ? (
        <div className="relative flex items-center animate-in fade-in slide-in-from-right-3 duration-200">
          <Search
            size={15}
            className="absolute left-3 text-muted-foreground pointer-events-none"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                if (value) {
                  onChange("");
                } else {
                  setIsOpen(false);
                }
              }
            }}
            placeholder={placeholder}
            aria-label={label}
            className={cn(
              "h-9 rounded-xl border border-border bg-background pl-9 pr-8 text-[13px] text-foreground shadow-sm outline-none transition-all placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20",
              inputWidthClassName
            )}
          />
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                inputRef.current?.focus();
              }}
              className="absolute right-2.5 flex size-5 items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              aria-label="Clear search"
            >
              <X size={13} strokeWidth={2} />
            </button>
          )}
        </div>
      ) : (
        <SimpleTooltip content={tooltip} side={side}>
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="flex size-9 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/70 active:scale-95 transition-all cursor-pointer"
            aria-label={label}
          >
            <Search size={18} strokeWidth={1.8} />
          </button>
        </SimpleTooltip>
      )}
    </div>
  );
}
