"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { COUNTRIES, findCountryByName, type Country } from "@/lib/countries";
import { CountryFlag } from "@/components/ui/country-flag";

/**
 * "Select destination country": a trigger that opens every country, A to Z, with search.
 * Picking one closes the list and hands the country back; the caller decides what follows.
 */
export function CountryPicker({
  value,
  onSelect,
  triggerClassName,
}: {
  /** The selected country's name, or "" for none. */
  value: string;
  onSelect: (country: Country) => void;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = findCountryByName(value);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? COUNTRIES.filter((c) => c.name.toLowerCase().includes(q)) : COUNTRIES;
  }, [query]);

  const pick = (country: Country) => {
    setOpen(false);
    setQuery("");
    onSelect(country);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          triggerClassName ??
          "flex h-11 w-full cursor-pointer items-center gap-2 rounded-2xl border border-field-border bg-field px-3 text-left text-[14px] transition-colors hover:bg-field-hover"
        }
      >
        {selected && <CountryFlag code={selected.code} size={24} />}
        <span className={selected ? "flex-1 truncate text-foreground" : "flex-1 truncate text-muted-foreground"}>
          {selected ? selected.name : "Select destination country"}
        </span>
        <ChevronRight size={16} strokeWidth={1.8} className="shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setQuery("");
        }}
      >
        <DialogContent size="sm" className="p-0">
          <DialogHeader onClose={() => setOpen(false)}>
            <DialogTitle>Select Destination Country</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 px-4 pb-2 pt-3 sm:px-5">
            <div className="relative">
              <Search
                size={16}
                strokeWidth={1.8}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                aria-label="Search countries"
                autoComplete="off"
                className="h-10 w-full rounded-xl border border-field-border bg-field pl-10 pr-2 text-[14px] text-foreground outline-none transition focus:border-field-border-focus focus:ring-0"
              />
            </div>
          </div>
          <ul className="max-h-[55vh] overflow-y-auto px-4 pb-3 sm:px-5">
            {matches.map((country) => (
              <li key={country.code} className="border-b border-border/60 last:border-b-0">
                <button
                  type="button"
                  onClick={() => pick(country)}
                  className="flex w-full cursor-pointer items-center gap-3 py-2 text-left transition-colors hover:bg-muted/30"
                >
                  <CountryFlag code={country.code} size={28} />
                  <span className="flex-1 truncate text-[14.5px] text-foreground">{country.name}</span>
                  <ChevronRight size={16} strokeWidth={1.8} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                </button>
              </li>
            ))}
            {matches.length === 0 && (
              <li className="py-6 text-center text-[13.5px] text-muted-foreground">
                No country matches &ldquo;{query.trim()}&rdquo;.
              </li>
            )}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
