"use client";

/**
 * Glass treatment for a Reicon icon, rebuilt from Reicon's website "glass" style.
 *
 * What that style is: the icon's Filled shape (24px grid, scaled 8x inside a 240px canvas with a 10% margin)
 * used as an alpha mask over a tall radial gradient (light at the top, dark at the bottom), with a filter that
 * lights one edge and shades the opposite edge. We keep those three layers and drop the website's two drop
 * shadows (under the glyph, and clipped by its mask, so they don't show) and its second mask.
 *
 * The three gradient stops come from the icon's tone (`--icon-<tone>-light|mid|dark`) and the two edge colours from
 * `--glass-shine` and `--glass-shade`, all in globals.css, so the look follows the tokens in both themes. The edge width grows as the icon gets smaller: the website's 1.2-unit blur would be
 * under a pixel at tile size.
 */

import { useId } from "react";
import type { IconComponent } from "reicon-react/createIcon";
import { toneVar, type IconTone } from "@/lib/icon-tones";

const CANVAS = 240;
const MARGIN = 24;
const GLYPH_SCALE = 8; // 24px grid -> 192px, inside the 240px canvas
/** The website's edge offset and blur, in canvas units. */
const EDGE = 2.43;
const BLUR = 1.21;
/** On-screen edge offset and blur (px) the effect should reach at small sizes. A blur under ~0.7px is sampled too coarsely and leaves stair-steps. */
const TARGET_EDGE_PX = 1;
const TARGET_BLUR_PX = 0.8;

/** A region of the icon on its own 24px grid: polygon points, or an SVG path (copied from one segment of the icon). */
export type IconRegion = ReadonlyArray<readonly [number, number]> | { path: string };

/** A region that follows the exact outline of one segment of the icon, so the cut is as clean as the icon's own edge. */
export function pathRegion(path: string): IconRegion {
  return { path };
}

/** A rectangular region on the 24px grid. */
export function rectRegion(x: number, y: number, w: number, h: number): IconRegion {
  return [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ];
}

/** Part of the icon drawn in a second tone (the duotone glass look). The two parts bevel against each other at the cut. */
export interface GlassAccent {
  tone: IconTone;
  region: IconRegion;
}

/** The region as a path in canvas units, with the transform it needs when it is still on the 24px grid. */
const regionShape = (region: IconRegion): { d: string; transform?: string } =>
  "path" in region
    ? { d: region.path, transform: `translate(${MARGIN} ${MARGIN}) scale(${GLYPH_SCALE})` }
    : {
        d: region.map(([x, y], i) => `${i === 0 ? "M" : "L"}${MARGIN + x * GLYPH_SCALE} ${MARGIN + y * GLYPH_SCALE}`).join(" ") + " Z",
      };

interface GlassIconProps {
  icon: IconComponent;
  /** Colour tone of the gradient. Defaults to GCB amber. */
  tone?: IconTone;
  /** A second tone for one region of the icon. */
  accent?: GlassAccent;
  /** Rendered size of the whole canvas, margin included. The glyph itself is 80% of this. */
  size?: number;
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}

/** The tall radial gradient (light top, tone in the middle, dark bottom) for one tone. */
function inkGradient(id: string, tone: IconTone) {
  return (
    <radialGradient id={id} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(120 80) rotate(70) scale(180 360)">
      <stop style={{ stopColor: toneVar(tone, "light") }} />
      <stop offset="0.5" style={{ stopColor: toneVar(tone, "mid") }} />
      <stop offset="1" style={{ stopColor: toneVar(tone, "dark") }} />
    </radialGradient>
  );
}

export function GlassIcon({ icon: Icon, tone = "amber", accent, size = 30, className, ...rest }: GlassIconProps) {
  const uid = useId().replace(/:/g, "");
  const ink = `glass-ink-${uid}`;
  const inkAccent = `glass-ink2-${uid}`;
  const inMask = `glass-in-${uid}`;
  const outMask = `glass-out-${uid}`;
  const shape = accent ? regionShape(accent.region) : null;
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
        {inkGradient(ink, tone)}
        {accent && inkGradient(inkAccent, accent.tone)}
        {shape && (
          <>
            {/* Masks, not clip paths, so a region that follows a curve is anti-aliased like the icon's own edge. */}
            <mask id={inMask} maskUnits="userSpaceOnUse" x="0" y="0" width={CANVAS} height={CANVAS}>
              <path d={shape.d} transform={shape.transform} fill="white" />
            </mask>
            <mask id={outMask} maskUnits="userSpaceOnUse" x="0" y="0" width={CANVAS} height={CANVAS}>
              <rect width={CANVAS} height={CANVAS} fill="white" />
              <path d={shape.d} transform={shape.transform} fill="black" />
            </mask>
          </>
        )}
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
      {/* Masked once: the edge bands are already composited inside the glyph, and a second mask would square the
          anti-aliased edge alpha. With an accent the region mask sits inside the filter, so each part gets its own edges.
          Glass shine/edge effect is applied only to the amber parts of the icon. */}
      {[
        { id: ink, tone, clip: accent ? outMask : undefined },
        ...(accent ? [{ id: inkAccent, tone: accent.tone, clip: inMask }] : []),
      ].map((layer) => (
        <g key={layer.id} filter={layer.tone === "amber" ? `url(#${edge})` : undefined}>
          <g mask={layer.clip ? `url(#${layer.clip})` : undefined}>
            <g mask={`url(#${glyph})`}>
              <rect x="0" y="0" width={CANVAS} height={CANVAS} fill={`url(#${layer.id})`} />
            </g>
          </g>
        </g>
      ))}
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
export function glassOf(Icon: IconComponent, tone: IconTone = "amber", accent?: GlassAccent) {
  const Glass = ({ size = 24, className, ...rest }: TileIconProps) => (
    <GlassIcon icon={Icon} tone={tone} accent={accent} size={Math.round(size * CANVAS_PER_ICON)} className={className} aria-hidden={rest["aria-hidden"]} />
  );
  return Glass;
}
