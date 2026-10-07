"use client";

import type { ReactNode } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterGroupBase {
  id: string;
  label: string;
  options: FilterOption[];
  /** Short explanation shown under the label, for terms that need one. */
  hint?: string;
}

/** One choice, or "Any". `value` equals `anyValue` when the filter is off. */
export interface SingleFilterGroup extends FilterGroupBase {
  kind: "single";
  value: string;
  onChange: (value: string) => void;
  /** The value that means "not filtering". Defaults to "all". */
  anyValue?: string;
  /** Extra controls under the row, such as the custom date inputs. */
  extra?: ReactNode;
  /** Overrides the label on the applied chip (a custom date range, say). */
  chipLabel?: (value: string) => string;
}

/** Any number of choices. An empty array means "Any". */
export interface MultiFilterGroup extends FilterGroupBase {
  kind: "multi";
  value: string[];
  onChange: (value: string[]) => void;
}

export type FilterGroup = SingleFilterGroup | MultiFilterGroup;

function isActive(g: FilterGroup): boolean {
  return g.kind === "single" ? g.value !== (g.anyValue ?? "all") : g.value.length > 0;
}

export function countActiveFilters(groups: FilterGroup[]): number {
  return groups.filter(isActive).length;
}

function labelOf(g: FilterGroup, value: string): string {
  return g.options.find((o) => o.value === value)?.label ?? value;
}

function optionChars(g: FilterGroup): number {
  return g.options.reduce((n, o) => n + o.label.length, 0);
}

/** Few, very short options sit in one segmented row beside the label. */
function fitsInline(g: FilterGroup): boolean {
  return g.options.length <= 4 && optionChars(g) <= 22;
}

/** Few options that are too wide to sit beside the label get a full-width segmented row under it. */
function fitsSegmented(g: FilterGroup): boolean {
  return g.options.length <= 4 && optionChars(g) <= 30;
}

const segment =
  "shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-[13px] transition-colors duration-hover ease-settle cursor-pointer";
const segmentOn = "bg-chip-selected text-chip-selected-foreground shadow-xs font-medium";
const segmentOff = "text-chip-foreground hover:text-chip-selected-foreground";

const chip =
  "h-8 rounded-lg border px-3 text-[13px] transition-colors duration-hover ease-settle cursor-pointer";
const chipOn = "border-[var(--active-border)] bg-[var(--active-bg)] text-foreground font-medium";
const chipOff = "border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground";

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function FilterRow({ group }: { group: FilterGroup }) {
  const anyOn = !isActive(group);
  const anyValue = group.kind === "single" ? (group.anyValue ?? "all") : "";
  const inline = fitsInline(group);
  const segmented = inline || fitsSegmented(group);

  const select = (value: string) => {
    if (group.kind === "single") group.onChange(value);
    else group.onChange(toggle(group.value, value));
  };
  const clear = () => {
    if (group.kind === "single") group.onChange(anyValue);
    else group.onChange([]);
  };
  const picked = (value: string) =>
    group.kind === "single" ? group.value === value : group.value.includes(value);

  const labelBlock = (
    <div className="min-w-0">
      <span className="text-[13px] font-medium text-foreground">{group.label}</span>
      {group.hint && <p className="mt-0.5 text-[12px] text-muted-foreground">{group.hint}</p>}
    </div>
  );

  if (segmented) {
    const item = (wide: boolean) => cn(segment, wide && "flex-1");
    return (
      <div role="group" aria-label={group.label}>
        <div
          className={cn(
            inline
              ? "flex flex-wrap items-center justify-between gap-x-4 gap-y-2"
              : "flex flex-col gap-2.5",
          )}
        >
          {labelBlock}
          <div className={cn("flex max-w-full items-center rounded-xl bg-chip p-1", inline && "inline-flex")}>
            {group.options.map((o) => (
              <button
                key={o.value}
                type="button"
                aria-pressed={picked(o.value)}
                onClick={() => select(o.value)}
                className={cn(item(!inline), picked(o.value) ? segmentOn : segmentOff)}
              >
                {o.label}
              </button>
            ))}
            <button
              type="button"
              aria-pressed={anyOn}
              onClick={clear}
              className={cn(item(!inline), anyOn ? segmentOn : segmentOff)}
            >
              Any
            </button>
          </div>
        </div>
        {group.kind === "single" && group.extra}
      </div>
    );
  }

  return (
    <div role="group" aria-label={group.label} className="flex flex-col gap-2.5">
      {labelBlock}
      <div className="flex flex-wrap gap-1.5">
        {group.kind === "single" && (
          <button
            type="button"
            aria-pressed={anyOn}
            onClick={clear}
            className={cn(chip, anyOn ? chipOn : chipOff)}
          >
            Any
          </button>
        )}
        {group.options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={picked(o.value)}
            onClick={() => select(o.value)}
            className={cn(chip, picked(o.value) ? chipOn : chipOff)}
          >
            {o.label}
          </button>
        ))}
      </div>
      {group.kind === "single" && group.extra}
    </div>
  );
}

interface FilterPanelProps {
  groups: FilterGroup[];
  /** Turns every group in the panel back to "Any". The search text keeps its own clear button. */
  onClear: () => void;
  /** Sizes the button to sit beside the page's search field. */
  className?: string;
  align?: "start" | "center" | "end";
}

/**
 * FilterPanel — the one list-filter control in the app.
 *
 * A single "Filters" button beside the search field. It opens a panel with one
 * row per filter: the label on the left and a segmented control on the right
 * when the options are few, otherwise the options wrap beneath the label.
 * "Any" means the filter is off. Pair it with `AppliedFilters` so the person
 * can always see what is narrowing the list without opening the panel.
 */
export function FilterPanel({ groups, onClear, className, align = "end" }: FilterPanelProps) {
  const active = countActiveFilters(groups);
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className={cn("h-9 shrink-0 gap-2 rounded-xl px-3.5 text-[13px]", className)}
          />
        }
      >
        <SlidersHorizontal size={15} strokeWidth={1.8} className="text-muted-foreground" aria-hidden="true" />
        <span>Filters</span>
        {active > 0 && (
          <span className="flex size-4 items-center justify-center rounded-full bg-foreground text-[10px] leading-none text-background tabular">
            {active}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent
        align={align}
        sideOffset={8}
        className="w-[min(28rem,calc(100vw-2rem))] rounded-2xl"
      >
        <div className="flex max-h-[min(34rem,70vh)] flex-col gap-5 overflow-y-auto p-5">
          {groups.map((g) => (
            <FilterRow key={g.id} group={g} />
          ))}
          {active > 0 && (
            <div className="flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClear}
                className="h-8 gap-1.5 rounded-lg px-3 text-[13px] font-normal text-muted-foreground"
              >
                <X size={14} strokeWidth={1.8} aria-hidden="true" />
                Clear all filters
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * AppliedFilters — one removable chip per active filter, shown under the toolbar.
 * Renders nothing when no filter is on, so it never takes space on a clean list.
 */
export function AppliedFilters({ groups, className }: { groups: FilterGroup[]; className?: string }) {
  const chips: { key: string; label: string; remove: () => void }[] = [];
  for (const g of groups) {
    if (!isActive(g)) continue;
    if (g.kind === "single") {
      chips.push({
        key: g.id,
        label: g.chipLabel ? g.chipLabel(g.value) : labelOf(g, g.value),
        remove: () => g.onChange(g.anyValue ?? "all"),
      });
    } else {
      for (const v of g.value) {
        chips.push({
          key: `${g.id}:${v}`,
          label: labelOf(g, v),
          remove: () => g.onChange(g.value.filter((x) => x !== v)),
        });
      }
    }
  }
  if (chips.length === 0) return null;
  return (
    <ul className={cn("flex flex-wrap items-center gap-1.5", className)} aria-label="Applied filters">
      {chips.map((c) => (
        <li key={c.key}>
          <button
            type="button"
            onClick={c.remove}
            aria-label={`Remove filter: ${c.label}`}
            className="flex h-7 cursor-pointer items-center gap-1.5 rounded-full bg-muted pl-3 pr-2 text-[12px] text-foreground transition-colors duration-hover ease-settle hover:bg-muted/70"
          >
            <span>{c.label}</span>
            <X size={12} strokeWidth={1.9} className="text-muted-foreground" aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}
