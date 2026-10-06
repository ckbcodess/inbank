"use client";

import * as React from "react";
import Image from "next/image";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNationalMobile, toLocalMobile } from "@/lib/phone";
import { COUNTRIES } from "@/lib/countries";
import { dialCodeFor } from "@/lib/dial-codes";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * Mobile number field. By default it is Ghana only: "+233" is fixed in front; the field takes digits only,
 * stops at nine, groups them as they're typed ("24 123 4567") and cleans up pasted or autofilled numbers
 * ("+233 24…", "024…"). `onValueChange` then always emits the local form ("0241234567").
 *
 * Pass `onCountryChange` and the "+233" becomes a country picker (flag, dial code, search over every
 * country), Ghana being the default. Ghana keeps the rules above. Any other country takes plain digits,
 * up to 15, and `onValueChange` emits those digits as typed.
 *
 * `value` may be in any format. `className` styles the outer box (border, height, radius, text size) so
 * each surface keeps its own look.
 */
interface PhoneInputProps
  extends Omit<React.ComponentProps<"input">, "value" | "onChange" | "type" | "inputMode" | "className"> {
  value: string;
  onValueChange: (localNumber: string) => void;
  className?: string;
  inputClassName?: string;
  /** The selected country's ISO code. Defaults to Ghana. Only used with `onCountryChange`. */
  country?: string;
  /** Turns the fixed "+233" into a country picker. */
  onCountryChange?: (code: string) => void;
}

const GHANA = "GH";
const MAX_INTERNATIONAL_DIGITS = 15;

/** Every country A to Z, with Ghana (left out of `COUNTRIES`, which lists destinations abroad) slotted in. The selected row is marked. */
const PICKER_COUNTRIES = [{ code: GHANA, name: "Ghana" }, ...COUNTRIES.map(({ code, name }) => ({ code, name }))].sort((a, b) =>
  a.name.localeCompare(b.name),
);

function Flag({ code, size = 20 }: { code: string; size?: number }) {
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

function CountryDropdown({
  country,
  onChange,
  disabled,
}: {
  country: string;
  onChange: (code: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const q = query.trim().toLowerCase().replace(/^\+/, "");
  const matches = q
    ? PICKER_COUNTRIES.filter((c) => c.name.toLowerCase().includes(q) || dialCodeFor(c.code).startsWith(q))
    : PICKER_COUNTRIES;
  const selected = PICKER_COUNTRIES.find((c) => c.code === country);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger
        disabled={disabled}
        aria-label={`Country: ${selected?.name ?? "Ghana"}. Change country`}
        className="-ml-1 flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-1 outline-none transition-colors hover:bg-foreground/5 focus-visible:bg-foreground/5"
      >
        <Flag code={country} />
        <span className="tabular text-muted-foreground">+{dialCodeFor(country)}</span>
        <ChevronDown size={14} strokeWidth={1.8} className="text-muted-foreground" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={8} className="w-[300px] rounded-xl">
        <div className="flex flex-col gap-1 p-2">
          <div className="relative">
            <Search
              size={15}
              strokeWidth={1.8}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search country or code"
              aria-label="Search countries"
              autoComplete="off"
              className="h-10 w-full rounded-lg border border-field-border bg-field pl-9 pr-3 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-field-border-focus focus:bg-field-focus"
            />
          </div>
          <ul className="max-h-[260px] overflow-y-auto" role="listbox" aria-label="Countries">
            {matches.map((c) => (
              <li key={c.code} role="option" aria-selected={c.code === country}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(c.code);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors hover:bg-muted/70",
                    c.code === country && "bg-muted/70",
                  )}
                >
                  <Flag code={c.code} size={22} />
                  <span className="flex-1 truncate text-foreground">{c.name}</span>
                  <span className="tabular text-muted-foreground">+{dialCodeFor(c.code)}</span>
                </button>
              </li>
            ))}
            {matches.length === 0 && <li className="px-2.5 py-3 text-[13px] text-muted-foreground">No country matches that.</li>}
          </ul>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function PhoneInput({
  value,
  onValueChange,
  className,
  inputClassName,
  country = GHANA,
  onCountryChange,
  placeholder,
  autoComplete = "tel-national",
  disabled,
  ...props
}: PhoneInputProps) {
  const picker = Boolean(onCountryChange);
  const ghana = !picker || country === GHANA;

  return (
    <div
      data-slot="phone-input"
      className={cn(
        "flex h-11 w-full items-center gap-2 rounded-lg border border-field-border bg-field px-3.5 text-[14px] transition-colors outline-none",
        "focus-within:outline-none focus-within:border-field-border-focus focus-within:ring-0",
        "hover:bg-field-hover focus-within:bg-field-focus",
        "has-aria-invalid:border-destructive has-aria-invalid:ring-0",
        disabled && "pointer-events-none opacity-50",
        className
      )}
    >
      {picker ? (
        <CountryDropdown country={country} onChange={onCountryChange!} disabled={disabled} />
      ) : (
        <span className="tabular shrink-0 text-muted-foreground select-none" aria-hidden="true">
          +233
        </span>
      )}
      <input
        type="tel"
        inputMode="numeric"
        autoComplete={autoComplete}
        value={ghana ? formatNationalMobile(value) : value}
        onChange={(e) =>
          onValueChange(ghana ? toLocalMobile(e.target.value) : e.target.value.replace(/\D/g, "").slice(0, MAX_INTERNATIONAL_DIGITS))
        }
        placeholder={placeholder ?? (ghana ? "24 123 4567" : "Phone number")}
        disabled={disabled}
        className={cn(
          "tabular h-full min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground/60",
          inputClassName
        )}
        {...props}
      />
    </div>
  );
}
