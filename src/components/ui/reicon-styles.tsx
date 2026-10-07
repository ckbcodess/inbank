"use client";

/**
 * The non-glass looks for a Reicon icon on the Send & Pay hub (a Dev Mode exploration, with `GlassIcon`).
 * Each factory returns a component with the same props as the outline icon, so it fits anywhere a tile icon goes.
 * Call them at module level: the result must be a stable component, not created during render.
 *
 * - `toneOutlineOf`: the outline icon in a tone's ink colour.
 * - `duotoneOf`: the Filled shape tinted by the tone at low opacity, under the outline. `line` picks the outline
 *   colour: `slate` is the house two-tone look (--duo-outline), `tone` uses the tone's own ink.
 */

import type { IconComponent } from "reicon-react/createIcon";
import { toneVar, type IconTone } from "@/lib/icon-tones";

type TileIconProps = { size?: number; strokeWidth?: number; className?: string; "aria-hidden"?: boolean | "true" | "false" };

/** How strongly the tone fills the duotone shape. */
const DUO_FILL_OPACITY = 0.45;

export function toneOutlineOf(Icon: IconComponent, tone: IconTone) {
  const ToneOutline = ({ size = 24, className }: TileIconProps) => (
    <Icon size={size} color={toneVar(tone, "ink")} className={className} aria-hidden="true" />
  );
  return ToneOutline;
}

export function duotoneOf(Icon: IconComponent, tone: IconTone, line: "slate" | "tone") {
  const lineColor = line === "slate" ? "var(--duo-outline)" : toneVar(tone, "ink");
  const Duotone = ({ size = 24, className }: TileIconProps) => (
    <span className={`relative inline-flex shrink-0 ${className ?? ""}`} style={{ width: size, height: size }} aria-hidden="true">
      <Icon
        weight="Filled"
        size={size}
        color={toneVar(tone, "mid")}
        className="absolute inset-0"
        style={{ opacity: DUO_FILL_OPACITY }}
        aria-hidden="true"
      />
      <Icon size={size} color={lineColor} className="absolute inset-0" aria-hidden="true" />
    </span>
  );
  return Duotone;
}
