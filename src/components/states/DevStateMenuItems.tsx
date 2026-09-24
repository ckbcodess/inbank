"use client";

/**
 * The option list inside the Dev Mode dropdown, shared by the header control
 * and the floating `DevStatePanel` so both draw a screen's primary states and
 * any extra groups (e.g. customer configuration) the same way.
 */

import { Fragment } from "react";
import { Check } from "lucide-react";
import type { DevStateData, DevStateOption } from "@/components/providers/DevStateProvider";
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

function OptionList({
  states,
  value,
  onChange,
}: {
  states: DevStateOption[];
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <>
      {states.map((st) => (
        <DropdownMenuItem
          key={st.id}
          onClick={() => onChange(st.id)}
          className="flex cursor-pointer items-center justify-between text-[13px]"
        >
          <span>{st.label}</span>
          {value === st.id && <Check size={14} strokeWidth={2} className="text-primary" />}
        </DropdownMenuItem>
      ))}
    </>
  );
}

export function DevStateMenuItems({ devState }: { devState: DevStateData }) {
  return (
    <>
      <DropdownMenuLabel className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        <span>{devState.label ?? "Dev Mode States"}</span>
        {devState.section && <span className="font-mono">{devState.section}</span>}
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <OptionList states={devState.states} value={devState.value} onChange={devState.onChange} />
      {devState.groups?.map((group) => (
        <Fragment key={group.label}>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {group.label}
          </DropdownMenuLabel>
          <OptionList states={group.states} value={group.value} onChange={group.onChange} />
        </Fragment>
      ))}
    </>
  );
}
