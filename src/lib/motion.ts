/**
 * Motion tokens for Framer Motion and any JS that needs a number. The CSS side is in globals.css
 * (`duration-press|hover|reveal|move|entrance`, `ease-settle`); keep the two in step.
 *
 * Pick by purpose, not by number:
 * - press     feedback while a finger or cursor is down (scale on tap)
 * - hover     hover and small state changes (colour, border)
 * - reveal    something appearing or disappearing in place (fade, expand)
 * - move      a larger thing travelling or turning (a sheet)
 * - entrance  a number or bar settling in after the page loads
 */

/** Seconds, for Framer Motion's `transition.duration`. */
export const DURATION = {
  press: 0.1,
  hover: 0.15,
  reveal: 0.25,
  move: 0.5,
  entrance: 0.9,
} as const;

/** Cubic-bezier curves, for Framer Motion's `transition.ease`. */
export const EASE = {
  standard: [0, 0, 0.2, 1],
  inOut: [0.4, 0, 0.2, 1],
  /** Fast start, long soft landing. */
  settle: [0.2, 0.8, 0.2, 1],
} as const;

/** Spring presets. Reach for `settle` first; it never overshoots. */
export const SPRING = {
  settle: { type: "spring", duration: 0.35, bounce: 0 },
  snappy: { type: "spring", stiffness: 400, damping: 32 },
  gentle: { type: "spring", stiffness: 320, damping: 32 },
} as const;
