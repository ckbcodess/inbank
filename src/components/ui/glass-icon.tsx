"use client";

/**
 * Glass treatment for a Reicon icon, rebuilt from Reicon's website "glass" style.
 *
 * What that style is: the icon's Filled shape (24px grid, scaled 8x inside a 240px canvas with a 10% margin)
 * used as an alpha mask over a tall radial gradient (light at the top, dark at the bottom), with a filter that
 * lights one edge and shades the opposite edge. We keep those three layers and drop the website's two drop
 * shadows (under the glyph, and clipped by its mask, so they don't show) and its second mask.
 *
 * The three gradient stops and both edge colours are tokens (`--glass-*` in globals.css), so the look follows
 * GCB amber in both themes. The edge width grows as the icon gets smaller: the website's 1.2-unit blur would be
 * under a pixel at tile size.
 */

import { useId } from "react";
import type { IconComponent } from "reicon-react/createIcon";

const CANVAS = 240;
const MARGIN = 24;
const GLYPH_SCALE = 8; // 24px grid -> 192px, inside the 240px canvas
/** The website's edge offset and blur, in canvas units. */
const EDGE = 2.43;
const BLUR = 1.21;
/** On-screen edge offset and blur (px) the effect should reach at small sizes. A blur under ~0.7px is sampled too coarsely and leaves stair-steps. */
const TARGET_EDGE_PX = 1;
const TARGET_BLUR_PX = 0.8;

interface GlassIconProps {
  icon: IconComponent;
  /** Rendered size of the whole canvas, margin included. The glyph itself is 80% of this. */
  size?: number;
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}

export function GlassIcon({ icon: Icon, size = 30, className, ...rest }: GlassIconProps) {
  const uid = useId().replace(/:/g, "");
  const ink = `glass-ink-${uid}`;
  const edge = `glass-edge-${uid}`;
  const glyph = `glass-glyph-${uid}`;

  // Pixels per canvas unit; widen the edge until it reads at this size.
  const px = size / CANVAS;
  const boost = Math.max(1, TARGET_EDGE_PX / (EDGE * px));
  const offset = EDGE * boost;
  const blur = Math.max(BLUR * boost, TARGET_BLUR_PX / px);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${CANVAS} ${CANVAS}`}
      fill="none"
      className={className}
      aria-hidden={rest["aria-hidden"] ?? true}
    >
      <defs>
        <mask id={glyph} maskUnits="userSpaceOnUse" x="0" y="0" width={CANVAS} height={CANVAS} style={{ maskType: "alpha" }}>
          <g transform={`translate(${MARGIN} ${MARGIN}) scale(${GLYPH_SCALE})`}>
            <Icon weight="Filled" color="white" size={24} />
          </g>
        </mask>
        <radialGradient
          id={ink}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(120 80) rotate(70) scale(180 360)"
        >
          <stop style={{ stopColor: "var(--glass-light)" }} />
          <stop offset="0.5" style={{ stopColor: "var(--glass-mid)" }} />
          <stop offset="1" style={{ stopColor: "var(--glass-dark)" }} />
        </radialGradient>
        <filter id={edge} x="0" y="0" width={CANVAS} height={CANVAS} filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          {/* Highlight on the top-left edge: the shape minus a copy pushed down-right. */}
          <feOffset in="SourceAlpha" dx={offset} dy={offset} result="shiftSE" />
          <feGaussianBlur in="shiftSE" stdDeviation={blur} result="blurSE" />
          <feComposite in="SourceAlpha" in2="blurSE" operator="out" result="bandNW" />
          <feFlood style={{ floodColor: "var(--glass-shine)" }} floodOpacity="0.9" />
          <feComposite in2="bandNW" operator="in" result="shine" />
          {/* Shade on the bottom-right edge: the shape minus a copy pushed up-left. */}
          <feOffset in="SourceAlpha" dx={-offset} dy={-offset} result="shiftNW" />
          <feGaussianBlur in="shiftNW" stdDeviation={blur} result="blurNW" />
          <feComposite in="SourceAlpha" in2="blurNW" operator="out" result="bandSE" />
          <feFlood style={{ floodColor: "var(--glass-shade)" }} floodOpacity="0.35" />
          <feComposite in2="bandSE" operator="in" result="shade" />
          <feMerge>
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="shade" />
            <feMergeNode in="shine" />
          </feMerge>
        </filter>
      </defs>
      {/* Masked once: the edge bands are already composited inside the glyph, and a second mask would square the anti-aliased edge alpha. */}
      <g filter={`url(#${edge})`}>
        <g mask={`url(#${glyph})`}>
          <rect x="0" y="0" width={CANVAS} height={CANVAS} fill={`url(#${ink})`} />
        </g>
      </g>
    </svg>
  );
}

/** How much larger than the outline icon's size the glass canvas is drawn, so the glyph itself ends up ~1.25x. */
const CANVAS_PER_ICON = 1.55;

type TileIconProps = { size?: number; strokeWidth?: number; className?: string; "aria-hidden"?: boolean | "true" | "false" };

/**
 * Turns a Reicon icon into a component with the same props as the outline one, so it can sit wherever a tile
 * icon is expected. Call at module level: the result must be a stable component, not created during render.
 */
export function glassOf(Icon: IconComponent) {
  const Glass = ({ size = 24, className, ...rest }: TileIconProps) => (
    <GlassIcon icon={Icon} size={Math.round(size * CANVAS_PER_ICON)} className={className} aria-hidden={rest["aria-hidden"]} />
  );
  return Glass;
}
