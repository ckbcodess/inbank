/**
 * Two-tone icons for the Send & Pay hub: a slate outline (--duo-outline) with amber parts
 * drawn inside. Hand-drawn on a 24px grid so they read as one set. They take the same props as a
 * Lucide icon, so they can be passed anywhere an icon component is expected.
 */

import type { ReactNode } from "react";

// The amber parts use the `duo-fill` class and the outline uses `duo-outline` (globals.css): CSS variables do
// not work in SVG paint attributes, so both are classes. `--duo-accent` lets a tile recolour the amber parts.

interface DuotoneProps {
  size?: number;
  strokeWidth?: number;
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}

function icon(draw: () => ReactNode) {
  const Icon = ({ size = 24, strokeWidth = 1.6, className, ...rest }: DuotoneProps) => (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ? `duo-outline ${className}` : "duo-outline"}
      aria-hidden={rest["aria-hidden"] ?? true}
    >
      {draw()}
    </svg>
  );
  return Icon;
}

export const DuoBank = icon(() => (
  <>
    <path d="M12 3.5 3.5 8.5h17z" className="duo-fill" />
    <path d="M3.5 20.5h17M6 11.5v6M10 11.5v6M14 11.5v6M18 11.5v6" />
  </>
));

export const DuoWallet = icon(() => (
  <>
    <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H17v3" />
    <rect x="3" y="7.5" width="18" height="12" rx="3" />
    <rect x="13.5" y="11.5" width="7.5" height="4" rx="2" className="duo-fill" />
    <circle cx="16.2" cy="13.5" r=".6" className="duo-outline-fill" stroke="none" />
  </>
));

export const DuoUser = icon(() => (
  <>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5z" className="duo-fill" />
  </>
));

export const DuoUsers = icon(() => (
  <>
    <circle cx="9" cy="8" r="3" />
    <circle cx="17" cy="9" r="2.4" />
    <path d="M3.5 19.5c0-3 2.4-5 5.5-5s5.5 2 5.5 5z" className="duo-fill" />
    <path d="M16 14.6c2.8-.3 5 1.4 5 4.4" />
  </>
));

export const DuoSwap = icon(() => (
  <>
    <rect x="6" y="9" width="12" height="6" rx="3" className="duo-fill" stroke="none" />
    <path d="M4 8h14m0 0-3-3m3 3-3 3M20 16H6m0 0 3-3m-3 3 3 3" />
  </>
));

export const DuoGlobe = icon(() => (
  <>
    <circle cx="12" cy="12" r="9" className="duo-fill" />
    <path d="M12 3c-3.2 3.2-3.2 14.8 0 18 3.2-3.2 3.2-14.8 0-18zM3 12h18" />
  </>
));

export const DuoReceipt = icon(() => (
  <>
    <path d="M6 3h12v18l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5L6 21z" />
    <circle cx="12" cy="9.5" r="2.8" className="duo-fill" />
    <path d="M9 15.5h6" />
  </>
));

export const DuoWifi = icon(() => (
  <>
    <path d="M3.5 9.5a12 12 0 0 1 17 0M6.6 12.8a7.6 7.6 0 0 1 10.8 0M9.6 16a3.4 3.4 0 0 1 4.8 0" />
    <circle cx="12" cy="19.2" r="1.9" className="duo-fill" />
  </>
));

export const DuoPhone = icon(() => (
  <>
    <rect x="6.5" y="2.5" width="11" height="19" rx="2.8" />
    <rect x="9" y="5.5" width="6" height="10" rx="1.2" className="duo-fill" stroke="none" />
    <path d="M11 18.5h2" />
  </>
));

export const DuoCard = icon(() => (
  <>
    <rect x="3" y="5.5" width="18" height="13" rx="2.8" />
    <path d="M3 9.5h18v3H3z" className="duo-fill" />
    <path d="M6.5 16h4" />
  </>
));

export const DuoCash = icon(() => (
  <>
    <rect x="2.5" y="6" width="19" height="12" rx="2.4" />
    <circle cx="12" cy="12" r="3" className="duo-fill" />
    <path d="M6 12h.01M18 12h.01" />
  </>
));

export const DuoQr = icon(() => (
  <>
    <rect x="3" y="3" width="7" height="7" rx="1.6" className="duo-fill" />
    <rect x="14" y="3" width="7" height="7" rx="1.6" />
    <rect x="3" y="14" width="7" height="7" rx="1.6" />
    <path d="M14 14h3v3h-3zM19.5 14H21M14 19.5h1.5M18 18h3v3h-3z" />
  </>
));
