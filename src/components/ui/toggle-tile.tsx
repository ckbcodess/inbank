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

import { useId } from "react";
import { Check } from "@/components/ui/icons";
import { Switch } from "@/components/ui/switch";
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
  "group flex min-h-[72.5px] w-full items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-transparent p-3 text-left";
const ROW = "group flex w-full items-center justify-between gap-3 px-1 py-2 text-left";

export function ToggleTile({
  icon: Icon,
  title,
  checked,
  onCheckedChange,
  lockedBadge,
  variant = "tile",
}: ToggleTileProps) {
  const titleId = useId();
  const frame = variant === "row" ? ROW : TILE;
  const body = (
    <span className="flex min-w-0 items-center gap-3">
      {Icon && (
        <TileChip>
          <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
        </TileChip>
      )}
      <span id={titleId} className="truncate text-heading font-medium tracking-[var(--ls-tight)] text-foreground">{title}</span>
    </span>
  );

  if (checked && lockedBadge) {
    return (
      <div className={frame}>
        {body}
        <Badge className="shrink-0 gap-1">
          <Check size={12} aria-hidden="true" />
          {lockedBadge}
        </Badge>
      </div>
    );
  }

  // The whole row toggles; the switch inside is the shared `Switch`, so it looks the same as every other toggle.
  // Its own click is stopped from bubbling so the row doesn't flip twice.
  return (
    <div
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        frame,
        "cursor-pointer",
        variant === "tile" && "transition-colors duration-hover hover:bg-muted/50",
      )}
    >
      {body}
      <span onClick={(e) => e.stopPropagation()} className="flex shrink-0">
        <Switch checked={checked} onCheckedChange={onCheckedChange} aria-labelledby={titleId} />
      </span>
    </div>
  );
}
