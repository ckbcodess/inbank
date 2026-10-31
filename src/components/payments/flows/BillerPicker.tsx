"use client";

import { useMemo } from "react";
import { SearchPicker, type PickerItem } from "@/components/ui/search-picker";
import { BillerMark } from "@/components/ui/biller-mark";
import type { Biller } from "@/lib/mock-data";

/**
 * Choosing who to pay in Bills: the shared searchable picker, with each biller's logo and a search over its name, its
 * kind and the reference it takes ("meter number", "smartcard").
 */
export function BillerPicker({
  billers,
  value,
  onChange,
}: {
  billers: Biller[];
  value?: Biller;
  onChange: (biller: Biller) => void;
}) {
  // The kind only says something in a mixed list; inside one category it repeats the same words on every row
  const mixed = useMemo(() => new Set(billers.map((b) => b.category)).size > 1, [billers]);
  const items = useMemo<PickerItem[]>(
    () =>
      [...billers]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((b) => ({
          id: b.id,
          label: b.name,
          sublabel: mixed ? b.category : undefined,
          keywords: [b.reference],
          mark: (size: number) => <BillerMark name={b.name} category={b.category} size={size} />,
        })),
    [billers, mixed],
  );

  return (
    <SearchPicker
      items={items}
      value={value?.id}
      onChange={(item) => {
        const biller = billers.find((b) => b.id === item.id);
        if (biller) onChange(biller);
      }}
      placeholder="Select biller"
      title="Select a Biller"
      searchPlaceholder="Search by name or type"
      emptyText="No biller matches that. Clear the search to see them all."
    />
  );
}
