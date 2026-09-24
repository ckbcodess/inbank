"use client";

/**
 * An `ActionTile` whose right side is a switch instead of a chevron — for a
 * setting that lives in a list of tiles (e.g. "Set as Default" on Account
 * Details). The whole tile toggles. Switch visuals match the "Save as
 * beneficiary" toggle on the payment success screen.
 *
 * `lockedBadge`: for a one-way setting (there's always a default), once it's
 * on the switch is replaced by a badge — state, not a control — so nothing
 * looks tappable that isn't, and "on" never reads as greyed-out "off".
 */

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { TileChip } from "@/components/ui/action-tile";

type TileIcon = React.ComponentType<{
  size?: number;
  strokeWidth?: number;
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}>;

interface ToggleTileProps {
  /** Optional — a plain setting row can go without a chip. */
  icon?: TileIcon;
  title: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  lockedBadge?: string;
  /** `row`: no tile — just the label and switch, for a setting under a list of tiles. */
  variant?: "tile" | "row";
}

const TILE =
  "group flex min-h-[72.5px] w-full items-center justify-between gap-4 rounded-[16px] border border-[var(--tile-border)] bg-[var(--tile)] p-4 text-left";
const ROW = "group flex w-full items-center justify-between gap-4 px-1 py-2 text-left";

export function ToggleTile({
  icon: Icon,
  title,
  checked,
  onCheckedChange,
  lockedBadge,
  variant = "tile",
}: ToggleTileProps) {
  const frame = variant === "row" ? ROW : TILE;
  const body = (
    <span className="flex min-w-0 items-center gap-4">
      {Icon && (
        <TileChip>
          <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
        </TileChip>
      )}
      <span className="truncate text-[16px] font-medium tracking-[-0.01em] text-foreground">{title}</span>
    </span>
  );

  if (checked && lockedBadge) {
    return (
      <div className={frame}>
        {body}
        <Badge className="shrink-0 gap-1">
          <Check size={12} strokeWidth={2.2} aria-hidden="true" />
          {lockedBadge}
        </Badge>
      </div>
    );
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        frame,
        "cursor-pointer",
        variant === "tile" && "transition-colors duration-150 hover:bg-[var(--tile-hover)]",
      )}
    >
      {body}
      <span
        aria-hidden="true"
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out",
          checked ? "bg-primary" : "bg-muted-foreground/25",
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block size-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out",
            checked ? "translate-x-5" : "translate-x-0",
          )}
        />
      </span>
    </button>
  );
}
