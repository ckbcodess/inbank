"use client";

/**
 * The hero frame shared by personal and business home screens: the slate panel with its two slow waves of light,
 * dither and dotted map (`HeroSurface`), the rounded sheet the panels rise on with its pointer rim light
 * (`HeroSheet`), and the two stacked (`HeroStack`). Presentation only: what goes inside is each app's own. Colours
 * come from the --hero-* tokens, so a theme (business's smoke ash) restyles it without code.
 * Moved here from the personal dashboard (components/dashboard/v2/hero-parts.tsx re-exports it).
 */

import { useEffect, useRef } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { heroWaveVars, useHeroWave } from "@/lib/hero-wave";
import { decodeImage, holdSplash } from "@/lib/app-splash";

const ASSETS = "/dashboard/hero";

/* ── Surface ─────────────────────────────────────────────────────────────── */

/**
 * A smooth ease-out from the centre, many stops, mixed in OKLab — even steps
 * through dark tones, so soft light doesn't band. No blur on top: large blurs
 * render at low precision and bring the banding back.
 */
function softFalloff(color: string): string {
  const stops = [
    [100, 0],
    [92, 12],
    [78, 24],
    [60, 36],
    [42, 48],
    [27, 60],
    [15, 72],
    [7, 84],
    [2, 94],
  ]
    .map(([mix, at]) => `color-mix(in oklab, ${color} ${mix}%, transparent) ${at}%`)
    .join(", ");
  return `radial-gradient(closest-side in oklab, ${stops}, transparent 100%)`;
}

const WAVE_A_FILL = softFalloff("var(--hero-wave-a)");
const WAVE_B_FILL = softFalloff("var(--hero-wave-b)");

/**
 * Dither against banding: opaque greyscale noise centred on mid-grey. Blended
 * with `overlay` it nudges each pixel up or down by a level or two without
 * shifting the average, so the waves' steps dissolve into grain.
 */
const DITHER =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n' color-interpolation-filters='sRGB'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0 0 0 0 1'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/**
 * The flat card, two slow waves of light that act as its gradient, a dither
 * against banding, and the dotted map — decoration only. Everything sits in one
 * layer so the map's color-burn blends with the light beneath it.
 */
function HeroArt({ map = true }: { map?: boolean }) {
  return (
    // Behind the content: the surface is isolated, so -z-10 still sits above its fill.
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 [contain:paint]"
      style={{ background: "var(--hero-surface)" }}
    >
      <div
        className="hero-wave-a absolute -left-[20%] h-[95%] rounded-[50%] will-change-transform [backface-visibility:hidden]"
        style={{
          background: WAVE_A_FILL,
          bottom: "calc(var(--wave-lift) - 95%)",
          width: "var(--wave-size)",
        }}
      />
      <div
        className="hero-wave-b absolute -right-[15%] h-[85%] rounded-[50%] will-change-transform [backface-visibility:hidden]"
        style={{
          background: WAVE_B_FILL,
          bottom: "calc(var(--wave-lift) - 100%)",
          width: "calc(var(--wave-size) * 0.89)",
          opacity: "var(--wave-second)",
        }}
      />
      <div className="absolute inset-0 mix-blend-overlay" style={{ backgroundImage: DITHER, opacity: "var(--wave-grain)" }} />
      {map && (
        <Image
          alt=""
          src={`${ASSETS}/hero-map.svg`}
          width={471}
          height={238}
          unoptimized
          // Above the fold, and the splash already fetched it: load now, not lazily.
          priority
          className="absolute hidden mix-blend-color-burn [--eagle-opacity:var(--eagle-opacity-light)] sm:block dark:[--eagle-opacity:var(--eagle-opacity-dark)]"
          style={{
            right: "var(--eagle-right)",
            bottom: "var(--eagle-bottom)",
            opacity: "var(--eagle-opacity)",
            scale: "var(--eagle-scale)",
            transformOrigin: "bottom right",
          }}
        />
      )}
    </div>
  );
}

/** The hero panel with its gradient and art. Shape, padding and layout come from `className`. */
export function HeroSurface({
  children,
  className,
  map = true,
}: {
  children: React.ReactNode;
  className?: string;
  /** The dotted map sits bottom-right; drop it where controls would sit on top of it. */
  map?: boolean;
}) {
  // The wave tuner's settings arrive as CSS variables here, so the text, glass
  // controls and art underneath all pick them up.
  const wave = useHeroWave();
  // On first load, the splash waits for the dotted map so the card appears whole.
  useEffect(() => {
    if (map) holdSplash(decodeImage(`${ASSETS}/hero-map.svg`));
  }, [map]);
  // The two waves drift forever. Off screen (scrolled past, or another tab) nobody sees them, but the browser still
  // repaints the blended layers and the glass buttons over them, which is where the flicker comes from.
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) el.removeAttribute("data-hero-offscreen");
      else el.setAttribute("data-hero-offscreen", "");
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <section
      ref={ref}
      className={cn(
        "relative isolate overflow-hidden border border-[var(--hero-border)] bg-[var(--hero-surface)] text-[var(--hero-foreground)]",
        className,
      )}
      style={heroWaveVars(wave)}
    >
      <HeroArt map={map} />
      {children}
    </section>
  );
}

/* ── Sheet ───────────────────────────────────────────────────────────────── */

/** The share of the sheet's height, from its top edge, that the rim light reaches. */
const RIM_BAND = 0.2;
/** How far from that top band the pointer can be and still light the rim, px. */
const RIM_REACH = 160;

/**
 * The sheet's border as a rim light: the hero card reflecting light onto the
 * top of the container. The pointer's x moves the highlight along the top edge;
 * it never travels further than the top fifth of the sheet, and it fades out as
 * the pointer leaves that band (e.g. after scrolling down). The pointer is
 * tracked on the window, throttled to a frame, and written straight to CSS
 * variables, so nothing re-renders. `--rim-o` is a registered property
 * (globals.css), so it eases rather than jumps.
 */
function useRimLight() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !window.matchMedia("(hover: hover)").matches) return;
    let frame = 0;
    let x = 0;
    let y = 0;
    const paint = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      const bandBottom = r.top + r.height * RIM_BAND;
      const dx = Math.max(r.left - x, 0, x - r.right);
      const dy = Math.max(r.top - y, 0, y - bandBottom);
      const reach = Math.max(0, 1 - Math.hypot(dx, dy) / RIM_REACH);
      el.style.setProperty("--rim-x", `${Math.min(Math.max(x - r.left, 0), r.width)}px`);
      el.style.setProperty("--rim-o", reach.toFixed(3));
    };
    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!frame) frame = requestAnimationFrame(paint);
    };
    // Scrolling moves the sheet under a still pointer.
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const onLeave = () => el.style.setProperty("--rim-o", "0");
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll, { capture: true });
      document.documentElement.removeEventListener("pointerleave", onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  return ref;
}

/**
 * The sheet's background, layered so its own 1px CSS border *is* the rim light:
 * the card fill is clipped to the padding box, and under it — showing only
 * through the transparent border — the reflected light (an ellipse centred on
 * the top edge under the pointer, as tall as the top fifth) over the base
 * border colour. A real border, so the browser anti-aliases the curve as one
 * smooth edge; a masked overlay ring left a hard fringe where two edges met.
 */
const SHEET_BACKGROUND = [
  "linear-gradient(var(--card), var(--card)) padding-box",
  "radial-gradient(ellipse 340px 20% at var(--rim-x, 50%) 0%, color-mix(in srgb, var(--sheet-rim) calc(var(--rim-o) * 100%), transparent), transparent) border-box",
  "linear-gradient(var(--hero-sheet-border), var(--hero-sheet-border)) border-box",
].join(", ");

/** The rounded sheet the panels sit on, with the soft glow along its top in dark mode and a rim-lit border. */
/**
 * The soft glow along the container's top (Figma: a 1205×462 ellipse, 100px
 * blur, centred just above the edge), drawn with the same band-free falloff as
 * the waves. Colour, strength and size come from the tuner; it adds light in
 * dark mode and is off in light mode by default.
 */
const SHEET_GLOW = softFalloff("var(--sheet-glow)");

export function HeroSheet({ children, className }: { children: React.ReactNode; className?: string }) {
  const rimRef = useRimLight();
  const wave = useHeroWave();
  return (
    <div
      ref={rimRef}
      className={cn(
        // Concentric with the rounded-3xl panels inside: outer radius = their radius
        // (--radius-3xl, 20px) + this padding (p-2 / sm:p-5) + the 1px border.
        "@container relative flex flex-col gap-3 overflow-hidden border border-transparent p-2 sm:gap-5 sm:p-5",
        "rounded-[calc(var(--radius-3xl)+var(--spacing)*2+1px)] sm:rounded-[calc(var(--radius-3xl)+var(--spacing)*5+1px)]",
        className,
      )}
      style={{ background: SHEET_BACKGROUND, transition: "--rim-o 300ms ease-out", ...heroWaveVars(wave) }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-560px] h-[862px] w-[1605px] max-w-none -translate-x-1/2 [--sheet-glow:var(--hero-glow)] dark:mix-blend-plus-lighter"
        style={{ background: SHEET_GLOW, scale: "var(--glow-size)" }}
      />
      {children}
    </div>
  );
}

/**
 * The hero with the sheet rising 32px over its foot.
 * Flush with the sheet on smaller viewports; sits 12px inside the sheet's edge on sm+.
 */
export function HeroStack({ hero, children }: { hero: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <div className="-mb-7 px-0 sm:px-3">{hero}</div>
      <HeroSheet>{children}</HeroSheet>
    </div>
  );
}

