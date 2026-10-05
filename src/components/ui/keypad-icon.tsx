/**
 * A phone keypad drawn as ten dots: three rows of three and one below the middle. The mark for "Show PIN".
 * Lucide has no keypad, so this is drawn by hand; it takes the same props as a Lucide icon and follows
 * the text colour.
 */

const COLUMNS = [6, 12, 18];
const ROWS = [4.5, 9.5, 14.5];

export function KeypadIcon({
  size = 20,
  className,
  "aria-hidden": ariaHidden,
}: {
  size?: number;
  /** Accepted so it can stand in for a Lucide icon; the dots are filled, so the stroke width does nothing. */
  strokeWidth?: number;
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden={ariaHidden}
      xmlns="http://www.w3.org/2000/svg"
    >
      {ROWS.flatMap((y) => COLUMNS.map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.8" />))}
      <circle cx="12" cy="19.5" r="1.8" />
    </svg>
  );
}
