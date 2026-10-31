"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown } from "@/components/ui/icons";
import { Modal } from "@/components/ui/dialog";
import { SearchField } from "@/components/ui/search-field";
import { cn } from "@/lib/utils";

export interface PickerItem {
  id: string;
  label: string;
  /** A second line, such as the kind of biller. Searched too. */
  sublabel?: string;
  /** More words that should find it. */
  keywords?: string[];
  /** Its mark (a logo, or a quiet icon), drawn at the size asked for. */
  mark: (size: number) => React.ReactNode;
}

/**
 * Choosing one from a long list: the field shows the choice with its mark, and opens a modal with a search and the
 * whole list. Banks, billers and the like all use it, so a long list is searched, never scrolled through to find a name.
 * The field is the same box as a select (`data-slot="select-trigger"`).
 */
export function SearchPicker({
  items,
  value,
  onChange,
  placeholder,
  title,
  searchPlaceholder,
  emptyText,
  emptyMark,
  invalid,
}: {
  items: readonly PickerItem[];
  /** The id of the chosen item. */
  value?: string;
  onChange: (item: PickerItem) => void;
  /** What the field says before anything is chosen. */
  placeholder: string;
  /** The modal's title. */
  title: string;
  searchPlaceholder: string;
  emptyText: string;
  /** The mark shown in the field before anything is chosen. */
  emptyMark?: React.ReactNode;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const chosen = items.find((i) => i.id === value);

  const rows = useMemo(() => {
    if (!q) return items;
    return items.filter((i) => [i.label, i.sublabel ?? "", ...(i.keywords ?? [])].some((v) => v.toLowerCase().includes(q)));
  }, [items, q]);

  function close(next: boolean) {
    if (!next) setQuery("");
    setOpen(next);
  }

  return (
    <>
      <button
        type="button"
        data-slot="select-trigger"
        data-size="default"
        data-invalid={invalid || undefined}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="flex min-h-11 w-full cursor-pointer select-none items-center justify-between gap-2 rounded-xl border border-field-border bg-field px-3 py-2 text-left text-[14px] text-foreground outline-none transition-all hover:bg-field-hover focus-visible:border-field-border-focus focus-visible:ring-1 focus-visible:ring-field-border-focus data-[invalid=true]:border-destructive data-[invalid=true]:ring-1 data-[invalid=true]:ring-destructive"
      >
        <span className="flex min-w-0 items-center gap-3">
          {chosen ? chosen.mark(28) : emptyMark}
          <span className={cn("truncate", !chosen && "text-muted-foreground")}>{chosen ? chosen.label : placeholder}</span>
        </span>
        <ChevronDown aria-hidden="true" className="pointer-events-none ml-1 size-3 shrink-0 text-muted-foreground" />
      </button>

      <Modal open={open} onOpenChange={close} title={title} size="md">
        <div className="flex flex-col gap-3">
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder={searchPlaceholder}
            clearLabel="Clear search"
          />
          {rows.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-muted-foreground">{emptyText}</p>
          ) : (
            <div
              role="listbox"
              aria-label={title}
              className="custom-scrollbar scroll-fade -mx-1 flex max-h-[50vh] flex-col gap-0.5 overflow-y-auto overscroll-contain px-1"
            >
              {rows.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected={item.id === value}
                  onClick={() => {
                    close(false);
                    onChange(item);
                  }}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-xl p-2 text-left transition-colors duration-hover hover:bg-muted/50 aria-selected:bg-muted/60"
                >
                  {item.mark(36)}
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[14px] text-foreground">{item.label}</span>
                    {item.sublabel && <span className="truncate text-[12px] text-muted-foreground">{item.sublabel}</span>}
                  </span>
                  {item.id === value && <Check size={14} className="shrink-0 text-foreground" aria-hidden="true" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
