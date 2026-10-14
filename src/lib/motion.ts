/**
 * Motion tokens for Framer Motion and any JS that needs a number. The CSS side is in globals.css
 * (`duration-press|hover|reveal|move|entrance|modal|toast`, `ease-settle|standard|inOut|snappy`); keep the two in step.
 *
 * Generated from NIBS Motion Lab (/motion-lab).
 *
 * Pick by purpose, not by number:
 * - press     feedback while a finger or cursor is down (scale on tap)
 * - hover     hover and small state changes (colour, border)
 * - reveal    something appearing or disappearing in place (fade, expand)
 * - move      a larger thing travelling or turning (a sheet)
 * - entrance  a number or bar settling in after the page loads
 * - modal     modal dialog pop/zoom and backdrop transitions
 * - toast     toast notifications sliding into view
 */

/** Base duration speeds in seconds. */
export const SPEED = {
  fast: 0.2,
  base: 0.4,
  slow: 0.6,
} as const;

/** Seconds, for Framer Motion's `transition.duration`. Kept in lockstep with CSS --dur-*. */
export const DURATION = {
  // Speed tiers
  fast: SPEED.fast,
  base: SPEED.base,
  slow: SPEED.slow,

  // Semantic mappings
  press: SPEED.base,
  hover: SPEED.fast,
  reveal: SPEED.base,
  move: SPEED.base,
  entrance: SPEED.fast,
  modal: SPEED.fast,
  toast: SPEED.fast,
  /** A highlight passing once across a control, e.g. the Sidi launcher's amber sweep. */
  sweep: 1.6,
} as const;

/** Cubic-bezier curves, for Framer Motion's `transition.ease`. */
export const EASE = {
  settle: [0.2, 0.8, 0.2, 1],
  standard: [0, 0, 0.2, 1],
  inOut: [0.4, 0, 0.2, 1],
  snappy: [0.16, 1, 0.3, 1],
  bounce: [0.34, 1.56, 0.64, 1],
} as const;

/** Spring physics presets. Reach for `settle` first; it never overshoots. */
export const SPRING = {
  settle: { type: "spring", stiffness: 360, damping: 28, mass: 0.8 },
  snappy: { type: "spring", stiffness: 400, damping: 32, mass: 1 },
  gentle: { type: "spring", stiffness: 180, damping: 24, mass: 1 },
} as const;
