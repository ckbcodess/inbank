/**
 * The colour tones icons can take. Each tone is a set of tokens in globals.css (`--icon-<tone>-light|mid|dark|ink`),
 * so a recolour is a token change. `amber` is the GCB default and `slate` its graphite partner (the second part of a duotone
 * glass icon); the others are used when the Send & Pay hub colours its icons by function.
 */

export type IconTone = "amber" | "blue" | "green" | "violet" | "rose" | "teal" | "slate";

export const ICON_TONES: readonly IconTone[] = ["amber", "blue", "green", "violet", "rose", "teal", "slate"];

/** The CSS variable for one part of a tone. */
export function toneVar(tone: IconTone, part: "light" | "mid" | "dark" | "ink"): string {
  return `var(--icon-${tone}-${part})`;
}
