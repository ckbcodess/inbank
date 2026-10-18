"use client";

import type { ReactNode } from "react";
import {
  ArrowRightLeft,
  ArrowUpDown,
  Calendar,
  Check,
  CircleDashed,
  Filter,
  Landmark,
  MapPin,
  Radio,
  SlidersHorizontal,
  Tag,
  User,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  /** Label for the unconstrained option. Defaults to "All". */
  anyLabel?: string;
  /** Optional icon for category menus (defaults to an intelligent match based on id/label). */
  icon?: React.ElementType;
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

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function getGroupIcon(group: FilterGroup): React.ElementType {
  if (group.icon) return group.icon;
  const key = `${group.id} ${group.label}`.toLowerCase();
  if (key.includes("status")) return CircleDashed;
  if (key.includes("date") || key.includes("time") || key.includes("period")) return Calendar;
  if (key.includes("account")) return Landmark;
  if (key.includes("method") || key.includes("rail") || key.includes("payment")) return ArrowRightLeft;
  if (key.includes("category") || key.includes("cat")) return Tag;
  if (key.includes("assignee") || key.includes("creator") || key.includes("user") || key.includes("person")) return User;
  if (key.includes("type") || key.includes("kind")) return SlidersHorizontal;
  if (key.includes("city") || key.includes("location") || key.includes("branch")) return MapPin;
  if (key.includes("channel")) return Radio;
  if (key.includes("direction")) return ArrowUpDown;
  return Filter;
}

function getGroupSummary(group: FilterGroup): string | null {
  if (!isActive(group)) return null;
  if (group.kind === "single") {
    if (group.chipLabel) return group.chipLabel(group.value);
    const opt = group.options.find((o) => o.value === group.value);
    return opt?.label ?? group.value;
  }
  if (group.value.length === 1) {
    const opt = group.options.find((o) => o.value === group.value[0]);
    return opt?.label ?? group.value[0];
  }
  return `${group.value.length}`;
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
 * FilterPanel — the list-filter control.
 *
 * For single-category filters, opens directly as a simple option list with checkmarks.
 * For multi-category filters (e.g. Transactions), collapses into category rows with
 * icons and right carets (like Linear) that fly out into focused submenus.
 */
export function FilterPanel({ groups, onClear, className, align = "end" }: FilterPanelProps) {
  const active = countActiveFilters(groups);
  const multipleGroups = groups.length > 1;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            className={cn(
              "h-9 shrink-0 gap-2 rounded-xl px-3.5 text-[13px] transition-transform duration-150 active:scale-[0.98]",
              className
            )}
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
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={align}
        sideOffset={6}
        className={cn(
          "max-w-[calc(100vw-2rem)] rounded-xl p-1",
          multipleGroups ? "w-56 sm:w-60" : "w-64 sm:w-72"
        )}
      >
        {multipleGroups ? (
          /* Multi-group: Linear-style collapsed categories with submenus */
          <div className="flex flex-col">
            {groups.map((group) => {
              const Icon = getGroupIcon(group);
              const summary = getGroupSummary(group);
              const anyOn = !isActive(group);
              const anyValue = group.kind === "single" ? (group.anyValue ?? "all") : "";
              const anyLabel = group.anyLabel ?? "All";

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

              return (
                <DropdownMenuSub key={group.id}>
                  <DropdownMenuSubTrigger
                    chevron={
                      <span className="ml-auto text-[9px] text-muted-foreground/45 group-data-popup-open:text-foreground select-none" aria-hidden="true">
                        ▸
                      </span>
                    }
                    className="group gap-2.5 px-2.5 py-1.5 text-[13px] cursor-pointer"
                  >
                    <Icon size={14} strokeWidth={1.8} className="shrink-0 text-muted-foreground/80" />
                    <span className="truncate text-foreground font-medium">{group.label}</span>
                    {summary && (
                      <span className="ml-auto mr-1 max-w-[80px] truncate text-[11px] text-muted-foreground tabular">
                        {summary}
                      </span>
                    )}
                  </DropdownMenuSubTrigger>

                  <DropdownMenuSubContent
                    side="right"
                    sideOffset={4}
                    align="start"
                    className="w-60 sm:w-68 max-w-[calc(100vw-2rem)] max-h-[min(26rem,75vh)] overflow-y-auto p-1"
                  >
                    {/* "All" reset option */}
                    <DropdownMenuItem
                      onClick={clear}
                      closeOnClick={false}
                      className="justify-between px-2.5 py-1.5 text-[13px] cursor-pointer"
                    >
                      <span className="truncate">{anyLabel}</span>
                      {anyOn && (
                        <Check size={14} strokeWidth={2.2} className="shrink-0 text-foreground" aria-hidden="true" />
                      )}
                    </DropdownMenuItem>

                    <div className="my-1 border-t border-border/40" role="separator" />

                    {/* Group options */}
                    {group.options.map((o) => {
                      const isSelected = picked(o.value);
                      return (
                        <DropdownMenuItem
                          key={o.value}
                          onClick={() => select(o.value)}
                          closeOnClick={false}
                          className="justify-between px-2.5 py-1.5 text-[13px] cursor-pointer"
                        >
                          <span className="truncate">{o.label}</span>
                          {isSelected && (
                            <Check size={14} strokeWidth={2.2} className="shrink-0 text-foreground" aria-hidden="true" />
                          )}
                        </DropdownMenuItem>
                      );
                    })}

                    {/* Extra controls (e.g. custom date range inputs) */}
                    {group.kind === "single" && group.extra && (
                      <div
                        className="mt-1.5 border-t border-border/40 p-2"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        {group.extra}
                      </div>
                    )}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              );
            })}

            {active > 0 && (
              <>
                <div className="my-1 border-t border-border/50" role="separator" />
                <DropdownMenuItem
                  onClick={onClear}
                  className="gap-2 px-2.5 py-1.5 text-[12px] text-muted-foreground hover:text-foreground justify-center cursor-pointer"
                >
                  <X size={13} strokeWidth={1.8} aria-hidden="true" />
                  Clear all filters
                </DropdownMenuItem>
              </>
            )}
          </div>
        ) : (
          /* Single group: direct options list */
          <div className="flex flex-col">
            {groups[0] && (() => {
              const group = groups[0];
              const anyOn = !isActive(group);
              const anyValue = group.kind === "single" ? (group.anyValue ?? "all") : "";
              const anyLabel = group.anyLabel ?? "All";

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

              return (
                <div className="flex flex-col">
                  {/* "All" reset option */}
                  <DropdownMenuItem
                    onClick={clear}
                    closeOnClick={false}
                    className="justify-between px-2.5 py-1.5 text-[13px] cursor-pointer"
                  >
                    <span className="truncate">{anyLabel}</span>
                    {anyOn && (
                      <Check size={14} strokeWidth={2.2} className="shrink-0 text-foreground" aria-hidden="true" />
                    )}
                  </DropdownMenuItem>

                  <div className="my-1 border-t border-border/40" role="separator" />

                  {/* Options */}
                  {group.options.map((o) => {
                    const isSelected = picked(o.value);
                    return (
                      <DropdownMenuItem
                        key={o.value}
                        onClick={() => select(o.value)}
                        closeOnClick={false}
                        className="justify-between px-2.5 py-1.5 text-[13px] cursor-pointer"
                      >
                        <span className="truncate">{o.label}</span>
                        {isSelected && (
                          <Check size={14} strokeWidth={2.2} className="shrink-0 text-foreground" aria-hidden="true" />
                        )}
                      </DropdownMenuItem>
                    );
                  })}

                  {group.kind === "single" && group.extra && (
                    <div
                      className="mt-1.5 border-t border-border/40 p-2"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      {group.extra}
                    </div>
                  )}

                  {active > 0 && (
                    <>
                      <div className="my-1 border-t border-border/50" role="separator" />
                      <DropdownMenuItem
                        onClick={onClear}
                        className="gap-2 px-2.5 py-1.5 text-[12px] text-muted-foreground hover:text-foreground justify-center cursor-pointer"
                      >
                        <X size={13} strokeWidth={1.8} aria-hidden="true" />
                        Clear filter
                      </DropdownMenuItem>
                    </>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
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
