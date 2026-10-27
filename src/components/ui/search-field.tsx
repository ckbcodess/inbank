"use client";

import { Search, X } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * The search box at the top of a list page: a search icon at the start, a clear button at the end once something
 * is typed. Fills the space it is given, so put it in a flex row beside a Filters button or a type dropdown.
 */
export function SearchField({
  value,
  onChange,
  placeholder,
  clearLabel = "Clear search",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** Names the clear button for assistive tech. */
  clearLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative flex-1", className)}>
      <Search
        size={18}
        aria-hidden="true"
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-10 pl-10 pr-10"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label={clearLabel}
          className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer p-1 text-muted-foreground hover:text-foreground"
        >
          <X size={15} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
