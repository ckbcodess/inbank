"use client";

/**
 * Branch picker you can type into: filters GCB branches as you type, arrow keys
 * + Enter to pick, clear button, opens upward when there's no room below.
 * Shared by card pickup (Request a card) and branch collection (Place a request).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, MapPin, X } from "lucide-react";
import type { GcbBranch } from "@/lib/mock-data";

interface BranchComboboxProps {
  value: GcbBranch | null;
  onChange: (branch: GcbBranch | null) => void;
  branches: readonly GcbBranch[];
}

export function BranchCombobox({ value, onChange, branches }: BranchComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value?.name ?? "");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [placement, setPlacement] = useState<"top" | "bottom">("top");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Dynamic collision detection to open upward above the input when space below is tight
  useEffect(() => {
    if (!open || !containerRef.current) return;

    const updatePlacement = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const dropdownHeight = 260;

      if (spaceBelow < dropdownHeight && spaceAbove > 140) {
        setPlacement("top");
      } else {
        setPlacement("bottom");
      }
    };

    updatePlacement();
    window.addEventListener("scroll", updatePlacement, true);
    window.addEventListener("resize", updatePlacement);
    return () => {
      window.removeEventListener("scroll", updatePlacement, true);
      window.removeEventListener("resize", updatePlacement);
    };
  }, [open]);

  // Sync query when value changes
  useEffect(() => {
    setQuery(value?.name ?? "");
  }, [value]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        if (value && query !== value.name) {
          setQuery(value.name);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value, query]);

  // Filter branches by name
  const filteredBranches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return branches;
    return branches.filter((b) => b.name.toLowerCase().includes(q));
  }, [branches, query]);

  const handleSelect = (branch: GcbBranch) => {
    onChange(branch);
    setQuery(branch.name);
    setOpen(false);
    setHighlightedIndex(-1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setOpen(true);
    setHighlightedIndex(-1);

    const exactMatch = branches.find(
      (b) => b.name.toLowerCase() === val.trim().toLowerCase()
    );
    if (exactMatch) {
      onChange(exactMatch);
    } else if (!val.trim()) {
      onChange(null);
    } else {
      onChange({
        id: `branch-custom-${Date.now()}`,
        name: val.trim(),
        address: "Custom Branch Location",
        city: "Accra",
        operatingHours: "Mon - Fri: 8:00 AM - 5:00 PM",
      });
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQuery("");
    onChange(null);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
    setOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
      } else {
        setHighlightedIndex((prev) =>
          prev < filteredBranches.length - 1 ? prev + 1 : 0
        );
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (open) {
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredBranches.length - 1
        );
      }
    } else if (e.key === "Enter") {
      if (open && filteredBranches.length > 0) {
        e.preventDefault();
        const target =
          highlightedIndex >= 0 && highlightedIndex < filteredBranches.length
            ? filteredBranches[highlightedIndex]
            : filteredBranches[0];
        handleSelect(target);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        onClick={() => {
          setOpen(true);
          inputRef.current?.focus();
        }}
        className={`h-13 px-4 w-full rounded-2xl border bg-card text-left transition-all shadow-none flex items-center gap-3 cursor-text ${
          open
            ? "border-ring ring-1 ring-ring/30"
            : "border-border/80 hover:bg-muted/20"
        }`}
      >
        <MapPin size={18} strokeWidth={1.8} className="shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Type or select pickup branch..."
          className="flex-1 min-w-0 bg-transparent text-[15px] font-medium text-foreground placeholder:text-muted-foreground/60 placeholder:font-normal outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="size-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
            aria-label="Clear branch"
          >
            <X size={14} strokeWidth={2} />
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((prev) => !prev);
            if (!open) inputRef.current?.focus();
          }}
          className="p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          aria-label="Toggle branch dropdown"
        >
          <ChevronDown
            size={18}
            className={`transition-transform duration-200 ${open ? "rotate-180 text-foreground" : ""}`}
          />
        </button>
      </div>

      {open && (
        <div
          className={`absolute left-0 right-0 z-50 rounded-2xl border border-border/80 bg-popover/95 backdrop-blur-md shadow-lg p-1.5 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-150 ${
            placement === "top"
              ? "bottom-[calc(100%+6px)] origin-bottom"
              : "top-[calc(100%+6px)] origin-top"
          }`}
        >
          {filteredBranches.length > 0 ? (
            <div className="flex flex-col gap-0.5" role="listbox">
              {filteredBranches.map((branch, index) => {
                const isSelected =
                  value?.id === branch.id ||
                  value?.name.toLowerCase() === branch.name.toLowerCase();
                const isHighlighted = highlightedIndex === index;
                return (
                  <button
                    key={branch.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(branch)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-[14px] font-medium transition-colors flex items-center justify-between cursor-pointer ${
                      isHighlighted || isSelected
                        ? "bg-muted text-foreground"
                        : "text-foreground hover:bg-muted/60"
                    }`}
                  >
                    <span className="truncate">{branch.name}</span>
                    {isSelected && (
                      <Check size={16} strokeWidth={2.2} className="shrink-0 ml-2 text-foreground" />
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-3 text-center text-[13.5px] text-muted-foreground">
              <span>No branches found matching &ldquo;{query}&rdquo;</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
