"use client";

/**
 * The option list inside the Dev Mode dropdown, shared by the header control
 * and the floating `DevStatePanel` so both draw a screen's primary states,
 * customer simulation presets (Clean, Single Account, Everyday), and any extra groups.
 */

import { Fragment } from "react";
import { Check } from "lucide-react";
import type { DevStateData, DevStateOption } from "@/components/providers/DevStateProvider";
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useDevUserStore, DEMO_USER_CONFIGS, type DemoUserType } from "@/lib/dev-user-simulation";

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

export function DemoUserSwitcherSection() {
  const userType = useDevUserStore((s) => s.userType);
  const switchUserType = useDevUserStore((s) => s.switchUserType);

  const users: { id: DemoUserType; title: string; subtitle: string }[] = [
    {
      id: "clean",
      title: "Clean (Zero Setup)",
      subtitle: "Kwesi Arthur · Fresh Unfunded Account · 0 Cards · 0 Payees",
    },
    {
      id: "single",
      title: "Single Account User",
      subtitle: "Abena Osei · 1 Account · 1 Visa Debit · 2 Payees",
    },
    {
      id: "everyday",
      title: "Everyday User (Multiple Accounts)",
      subtitle: "Ransford Gyasi · 3 Accounts · 3 Cards · Full History",
    },
  ];

  return (
    <>
      <DropdownMenuLabel className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        <span>Demo User Type</span>
        <span className="rounded bg-warning/20 px-1 py-0.5 text-[10px] text-warning-text font-medium">
          {DEMO_USER_CONFIGS[userType]?.badgeLabel || "Everyday"}
        </span>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      {users.map((u) => {
        const isSelected = userType === u.id;
        return (
          <DropdownMenuItem
            key={u.id}
            onClick={() => switchUserType(u.id)}
            className="flex cursor-pointer items-start justify-between py-2 px-2.5 text-[13px] gap-2 rounded-lg"
          >
            <div className="flex flex-col min-w-0">
              <span className={`font-medium leading-snug ${isSelected ? "text-primary" : "text-foreground"}`}>
                {u.title}
              </span>
              <span className="text-[11px] text-muted-foreground leading-normal mt-0.5">
                {u.subtitle}
              </span>
            </div>
            {isSelected && <Check size={14} strokeWidth={2.2} className="text-primary shrink-0 mt-0.5" />}
          </DropdownMenuItem>
        );
      })}
    </>
  );
}

export function DevStateMenuItems({ devState }: { devState?: DevStateData | null }) {
  return (
    <>
      {/* 1. Global Demo User Persona Switcher */}
      <DemoUserSwitcherSection />

      {/* 2. Page-Specific Dev States (if registered by the active route) */}
      {devState && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <span>{devState.label ?? "Screen States"}</span>
            {devState.section && <span>{devState.section}</span>}
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
      )}
    </>
  );
}
