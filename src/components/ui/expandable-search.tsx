"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "@/components/ui/icons";
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
  inputWidthClassName = "w-49 sm:w-63",
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
            className="absolute left-2.5 text-muted-foreground pointer-events-none"
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
              "h-8 rounded-xl border border-field-border bg-field pl-8 pr-6 text-[14px] text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-field-border-focus focus:ring-0",
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
              className="absolute right-2 flex size-4 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>
      ) : (
        <SimpleTooltip content={tooltip} side={side}>
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="flex size-8 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/70 transition cursor-pointer"
            aria-label={label}
          >
            <Search size={18} />
          </button>
        </SimpleTooltip>
      )}
    </div>
  );
}
