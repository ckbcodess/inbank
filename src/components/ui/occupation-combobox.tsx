"use client";

/**
 * Searchable occupation combobox with a standard catalog of professions.
 * Allows filtering, keyboard selection, or entering a custom occupation.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Briefcase, Check, ChevronDown, X } from "lucide-react";

export const OCCUPATIONS = [
  "Accountant / Auditor",
  "Actor / Entertainer",
  "Administrator / Executive Assistant",
  "Agriculture / Farmer / Agribusiness",
  "Architect / Urban Planner",
  "Artist / Designer / Creative",
  "Banker / Financial Analyst",
  "Business Owner / Entrepreneur",
  "Chef / Caterer / Hospitality",
  "Civil Servant / Public Officer",
  "Construction Worker / Builder",
  "Consultant / Advisor",
  "Customer Service Representative",
  "Data Analyst / Data Scientist",
  "Dentist / Dental Practitioner",
  "Doctor / Physician / Surgeon",
  "Driver / Logistics Operator",
  "Economist / Statistician",
  "Electrician / Technician",
  "Engineer (Civil / Electrical / Mechanical)",
  "Healthcare Worker / Medical Assistant",
  "HR Specialist / Recruiter",
  "IT Specialist / System Administrator",
  "Journalist / Media Practitioner",
  "Lawyer / Legal Professional",
  "Lecturer / Professor / Academic",
  "Marketing / PR Specialist",
  "Military / Police / Security Personnel",
  "Miner / Geologist",
  "Nurse / Midwife",
  "Pharmacist / Chemist",
  "Pilot / Aviation Professional",
  "Plumber / Artisan",
  "Real Estate Agent / Property Developer",
  "Researcher / Scientist",
  "Retired",
  "Sales Executive / Representative",
  "Software Engineer / Developer",
  "Student",
  "Tailor / Fashion Designer",
  "Teacher / Educator",
  "Trader / Merchant / Retailer",
  "Veterinarian",
  "Other",
] as const;

interface OccupationComboboxProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
}

export function OccupationCombobox({
  value,
  onChange,
  id = "invest-occupation",
  placeholder = "Search or type occupation...",
}: OccupationComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [placement, setPlacement] = useState<"top" | "bottom">("bottom");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Dynamic collision detection to open upward when space below is tight
  useEffect(() => {
    if (!open || !containerRef.current) return;

    const updatePlacement = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const dropdownHeight = 240;

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

  // Sync query when external value changes
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        if (value && query !== value) {
          setQuery(value);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value, query]);

  // Filter occupations
  const filteredOccupations = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return OCCUPATIONS;
    return OCCUPATIONS.filter((occ) => occ.toLowerCase().includes(q));
  }, [query]);

  const hasExactMatch = OCCUPATIONS.some(
    (occ) => occ.toLowerCase() === query.trim().toLowerCase()
  );

  const handleSelect = (occ: string) => {
    onChange(occ);
    setQuery(occ);
    setOpen(false);
    setHighlightedIndex(-1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    setOpen(true);
    setHighlightedIndex(-1);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQuery("");
    onChange("");
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
          prev < filteredOccupations.length - 1 ? prev + 1 : 0
        );
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (open) {
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredOccupations.length - 1
        );
      }
    } else if (e.key === "Enter") {
      if (open) {
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOccupations.length) {
          handleSelect(filteredOccupations[highlightedIndex]);
        } else if (filteredOccupations.length > 0) {
          handleSelect(filteredOccupations[0]);
        } else if (query.trim()) {
          handleSelect(query.trim());
        }
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
        className={`flex h-13 w-full cursor-text items-center gap-3 rounded-2xl border px-3.5 transition ${
          open
            ? "border-foreground bg-field"
            : "border-field-border bg-field hover:bg-field-hover"
        }`}
      >
        <Briefcase size={16} strokeWidth={1.8} className="shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-listbox`}
          aria-autocomplete="list"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="organization-title"
          className="min-w-0 flex-1 bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted-foreground"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Clear occupation"
          >
            <X size={15} strokeWidth={1.8} />
          </button>
        )}
        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation();
            setOpen((prev) => !prev);
            if (!open) inputRef.current?.focus();
          }}
          className="flex size-7 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Toggle occupation dropdown"
        >
          <ChevronDown
            size={16}
            strokeWidth={1.8}
            className={`transition-transform duration-200 ${open ? "rotate-180 text-foreground" : ""}`}
          />
        </button>
      </div>

      {open && (
        <div
          id={`${id}-listbox`}
          role="listbox"
          className={`absolute left-0 right-0 z-50 max-h-60 overflow-y-auto rounded-2xl border border-border bg-modal p-1.5 shadow-lg animate-in fade-in duration-100 ${
            placement === "top"
              ? "bottom-[calc(100%+6px)] origin-bottom"
              : "top-[calc(100%+6px)] origin-top"
          }`}
        >
          {filteredOccupations.length > 0 ? (
            <div className="flex flex-col gap-0.5">
              {filteredOccupations.map((occ, index) => {
                const isSelected = value.toLowerCase() === occ.toLowerCase();
                const isHighlighted = highlightedIndex === index;
                return (
                  <button
                    key={occ}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(occ)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-left text-[14px] transition-colors ${
                      isHighlighted || isSelected
                        ? "bg-muted text-foreground"
                        : "text-foreground hover:bg-muted/60"
                    }`}
                  >
                    <span className="truncate">{occ}</span>
                    {isSelected && (
                      <Check size={15} strokeWidth={2} className="ml-2 shrink-0 text-foreground" />
                    )}
                  </button>
                );
              })}
            </div>
          ) : query.trim() ? (
            <div className="flex flex-col gap-1 p-1">
              <button
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => handleSelect(query.trim())}
                className="flex w-full cursor-pointer items-center justify-between rounded-xl bg-muted/60 px-3 py-2.5 text-left text-[14px] text-foreground hover:bg-muted"
              >
                <span>Use &ldquo;{query.trim()}&rdquo;</span>
                <Check size={15} strokeWidth={2} className="ml-2 shrink-0 text-muted-foreground" />
              </button>
            </div>
          ) : (
            <div className="p-3 text-center text-[13px] text-muted-foreground">
              No occupations found
            </div>
          )}

          {!hasExactMatch && query.trim() && filteredOccupations.length > 0 && (
            <div className="mt-1 border-t border-border/60 pt-1">
              <button
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => handleSelect(query.trim())}
                className="flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-left text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <span>Or use &ldquo;{query.trim()}&rdquo;</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
