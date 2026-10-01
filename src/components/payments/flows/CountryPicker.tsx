"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ChevronRight, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { COUNTRIES, findCountryByName, type Country } from "@/lib/countries";

export function CountryFlag({ code, size = 28 }: { code: string; size?: number }) {
  return (
    <Image
      src={`/flags/${code}.svg`}
      alt=""
      width={size}
      height={size}
      unoptimized
      className="shrink-0 rounded-full border border-border/60 object-cover"
      style={{ width: size, height: size }}
    />
  );
}

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
          "flex h-13 w-full cursor-pointer items-center gap-3 rounded-2xl border border-border/80 bg-card px-4 text-left text-[15px] transition-colors hover:bg-muted/30"
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
            <DialogTitle>Select destination country</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 px-5 pb-2 pt-4 sm:px-6">
            <div className="relative">
              <Search
                size={16}
                strokeWidth={1.8}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                aria-label="Search countries"
                autoComplete="off"
                className="h-11 w-full rounded-xl border border-border/80 bg-card pl-10 pr-3 text-[14.5px] text-foreground outline-none transition-all focus:border-ring focus:ring-1 focus:ring-ring/30"
              />
            </div>
          </div>
          <ul className="max-h-[55vh] overflow-y-auto px-5 pb-4 sm:px-6">
            {matches.map((country) => (
              <li key={country.code} className="border-b border-border/60 last:border-b-0">
                <button
                  type="button"
                  onClick={() => pick(country)}
                  className="flex w-full cursor-pointer items-center gap-3.5 py-3 text-left transition-colors hover:bg-muted/30"
                >
                  <CountryFlag code={country.code} size={28} />
                  <span className="flex-1 truncate text-[14.5px] text-foreground">{country.name}</span>
                  <ChevronRight size={16} strokeWidth={1.8} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                </button>
              </li>
            ))}
            {matches.length === 0 && (
              <li className="py-8 text-center text-[13.5px] text-muted-foreground">
                No country matches &ldquo;{query.trim()}&rdquo;.
              </li>
            )}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
