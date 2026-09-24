"use client";

/**
 * Per-screen state switcher integration.
 *
 * Registers the screen's real state model (section 13) with the top navigation
 * Dev Mode dropdown, preventing state switchers from cluttering page canvases.
 */

import { useEffect } from "react";
import { useDevState, type DevStateGroup } from "@/components/providers/DevStateProvider";

interface StateSwitcherProps<T extends string> {
  states: readonly T[];
  value: T;
  onChange: (next: T) => void;
  labels?: Partial<Record<T, string>>;
  /** Section reference, e.g. "13.2" */
  section: string;
  /** Heading for `states` when `groups` are also shown. */
  label?: string;
  /** Extra independent dimensions (memoise these — they are effect deps). */
  groups?: DevStateGroup[];
}

export function StateSwitcher<T extends string>({
  states,
  value,
  onChange,
  labels,
  section,
  label,
  groups,
}: StateSwitcherProps<T>) {
  const { registerState, unregisterState } = useDevState();

  useEffect(() => {
    registerState({
      states: states.map((s) => ({
        id: s,
        label: labels?.[s] ?? s,
      })),
      value,
      onChange: (nextId: string) => onChange(nextId as T),
      section,
      label,
      groups,
    });

    return () => {
      unregisterState();
    };
  }, [states, value, onChange, labels, section, label, groups, registerState, unregisterState]);

  return null;
}
