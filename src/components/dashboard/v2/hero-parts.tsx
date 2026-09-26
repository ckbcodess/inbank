"use client";

/**
 * Building blocks for the Hero layout family (Figma, Internet Banking,
 * node 1945:5108): the hero surface and its art, the balance in hero type,
 * the sheet the panels sit on (with its pointer rim light), and the gold app promo. The Hero
 * variants in ./layouts only arrange these.
 */

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, Eye, EyeOff, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { LAST_LOGIN_AT } from "@/lib/mock-data";
import { heroWaveVars, useHeroWave } from "@/lib/hero-wave";
import { RevealingAmount } from "@/components/providers/AmountVisibilityProvider";
import {
  SPRING,
  selectedAccount,
  useUpdatedLabel,
  usePromoDismissal,
  type DashData,
} from "./parts";

const ASSETS = "/dashboard/hero";

/* ── Header ──────────────────────────────────────────────────────────────── */

function formatLastLogin(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const time = d.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${date} ${time}`;
}

export function LastLogin({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <span className={cn("tabular text-[12px] tracking-[-0.01em] text-muted-foreground", className)} suppressHydrationWarning>
      {t("dashboard.lastLogin", "Last login: {0}", { 0: formatLastLogin(LAST_LOGIN_AT) })}
    </span>
  );
}

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

const WAVE_FILL = softFalloff("var(--hero-wave)");

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
      className="pointer-events-none absolute inset-0 -z-10 [--hero-card:var(--wave-card-light)] [--hero-wave:var(--wave-color-light)] dark:[--hero-card:var(--wave-card-dark)] dark:[--hero-wave:var(--wave-color-dark)]"
      style={{ background: "var(--hero-card, var(--hero-surface))" }}
    >
      <div
        className="hero-wave-a absolute -left-[20%] h-[95%] rounded-[50%] will-change-transform"
        style={{
          background: WAVE_FILL,
          bottom: "calc(var(--wave-lift) - 95%)",
          width: "var(--wave-size)",
        }}
      />
      <div
        className="hero-wave-b absolute -right-[15%] h-[85%] rounded-[50%] will-change-transform"
        style={{
          background: WAVE_FILL,
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
          className="absolute bottom-[4px] right-[-110px] hidden opacity-35 mix-blend-color-burn sm:block dark:opacity-100"
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
  // The wave tuner's settings (Dev Mode → Tools) arrive as CSS variables here,
  // so the text, glass controls and art underneath all pick them up.
  const wave = useHeroWave();
  return (
    <section
      className={cn(
        "relative isolate overflow-hidden border border-[var(--hero-border)] bg-[var(--hero-surface)] text-[var(--hero-foreground)]",
        "[--hero-foreground:var(--wave-text-light)] dark:[--hero-foreground:var(--wave-text-dark)]",
        className,
      )}
      style={heroWaveVars(wave)}
    >
      <HeroArt map={map} />
      {children}
    </section>
  );
}

export function ManageAccountsLink({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <Link
      href="/accounts"
      className={cn(
        "relative flex w-fit items-center gap-0.5 rounded-lg py-1.5 text-[14px] leading-none transition-opacity hover:opacity-80 sm:text-[16px]",
        className,
      )}
    >
      {t("dashboard.manageAccounts", "Manage Accounts")}
      <ChevronRight size={16} strokeWidth={1.8} />
    </Link>
  );
}

/* ── Balance ─────────────────────────────────────────────────────────────── */

const HERO_FIGURE = {
  md: "text-[28px] leading-[32px] sm:text-[32px]",
  lg: "text-[30px] leading-[32px] sm:text-[36px]",
  xl: "text-[32px] leading-[36px] sm:text-[44px] sm:leading-[48px]",
} as const;

/** The selected account's balance in hero type, with the eye toggle. */
export function HeroBalance({
  data,
  loading,
  showAmounts,
  onToggle,
  size = "lg",
  className,
}: {
  data: DashData;
  loading: boolean;
  showAmounts: boolean;
  onToggle: () => void;
  size?: keyof typeof HERO_FIGURE;
  className?: string;
}) {
  const { t } = useTranslation();
  const account = selectedAccount(data);
  if (!account) return null;
  return (
    <div className={cn("relative flex items-center gap-2", className)}>
      {loading ? (
        <span
          className="h-[32px] w-56 animate-pulse rounded-lg bg-[color-mix(in_oklch,var(--hero-foreground)_15%,transparent)] sm:w-72"
          aria-label={t("dashboard.loadingBalance", "Loading balance")}
        />
      ) : (
        <span className={cn("tabular tracking-[-0.02em]", HERO_FIGURE[size])}>
          {account.currency} <RevealingAmount amount={account.balance ?? 0} currency="" />
        </span>
      )}
      <button
        type="button"
        onClick={onToggle}
        className="flex size-8 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-[color-mix(in_oklch,var(--hero-foreground)_12%,transparent)] cursor-pointer"
        aria-label={showAmounts ? t("header.hideAmounts", "Hide balances") : t("header.showAmounts", "Show balances")}
      >
        {showAmounts ? <Eye size={18} strokeWidth={1.8} /> : <EyeOff size={18} strokeWidth={1.8} />}
      </button>
    </div>
  );
}

export function HeroUpdated({ updatedAt, className }: { updatedAt: number; className?: string }) {
  const label = useUpdatedLabel(updatedAt);
  return (
    <span className={cn("relative text-[14px] leading-5 tracking-[-0.005em]", className)} suppressHydrationWarning>
      {label}
    </span>
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
  "linear-gradient(var(--border), var(--border)) border-box",
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
        // (--radius × 2.2, as in globals.css) + this padding + the 1px border — all
        // rem-based or fixed, so it holds at any root font size.
        "relative flex flex-col gap-4 overflow-hidden border border-transparent p-3 sm:gap-6 sm:p-6",
        "rounded-[calc(var(--radius)*2.2+var(--spacing)*3+1px)] sm:rounded-[calc(var(--radius)*2.2+var(--spacing)*6+1px)]",
        className,
      )}
      style={{ background: SHEET_BACKGROUND, transition: "--rim-o 300ms ease-out", ...heroWaveVars(wave) }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-560px] h-[862px] w-[1605px] max-w-none -translate-x-1/2 [--sheet-glow:var(--glow-color-light)] dark:mix-blend-plus-lighter dark:[--sheet-glow:var(--glow-color-dark)]"
        style={{ background: SHEET_GLOW, scale: "var(--glow-size)" }}
      />
      {children}
    </div>
  );
}

/** The hero with the sheet rising 32px over its foot; the hero sits 12px inside the sheet's edge. */
export function HeroStack({ hero, children }: { hero: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <div className="-mb-8 px-2 sm:px-3">{hero}</div>
      <HeroSheet>{children}</HeroSheet>
    </div>
  );
}

/** Re-keyed per account so a switch visibly reloads the account's panels. */
export function AccountScoped({
  accountId,
  className,
  children,
}: {
  accountId: string | null;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      key={accountId ?? "none"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={SPRING}
      className={cn("relative", className)}
    >
      {children}
    </motion.div>
  );
}

/* ── Promo ───────────────────────────────────────────────────────────────── */

/**
 * The app-download banner as designed: gold panel, QR code, phone in hand.
 * Hidden on a phone (a QR code can't be scanned by the screen showing it) and
 * dismissible, sharing the dismissal with the other layouts' banner.
 */
export function HeroPromo() {
  const { t } = useTranslation();
  const [dismissed, dismiss] = usePromoDismissal();
  if (dismissed !== false) return null;

  return (
    <div className="relative hidden rounded-2xl border border-border bg-card p-6 sm:block">
      <div
        className="relative h-[294px] overflow-hidden rounded-2xl text-primary-foreground"
        style={{
          // The Figma fill: an ellipse ~74% × 50% of the panel, four gold stops.
          background:
            "radial-gradient(74.4% 50% at 50.6% 50%, var(--promo-gold-1) 0%, var(--promo-gold-2) 50%, var(--promo-gold-3) 75%, var(--promo-gold-4) 100%)",
        }}
      >
        {/* The design's "pattern refraction" shader needs WebGPU; this is its look in CSS —
            110px lenses at 45°, bright through the middle, a faint seam at each edge. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "repeating-linear-gradient(135deg, var(--promo-shade) 0px, transparent 26px, var(--promo-sheen) 56px, transparent 88px, var(--promo-shade) 110px)",
          }}
        />
        <h3 className="absolute left-9 top-12 w-[295px] text-[28px] leading-[38px] tracking-[-0.035em]">
          {t("dashboard.promoTitle", "Banking made easier, wherever you are.")}
        </h3>
        <div className="absolute left-9 top-[167px] size-[189px] overflow-hidden rounded-xl">
          <Image alt={t("dashboard.promoScan", "Scan to get the GCB mobile app")} src={`${ASSETS}/promo-qr-1.png`} fill sizes="189px" className="object-cover" />
          <Image alt="" src={`${ASSETS}/promo-qr-2.png`} fill sizes="189px" className="object-cover" />
        </div>
        <Image
          alt=""
          src="/promo-phone.png"
          width={255}
          height={302}
          className="pointer-events-none absolute left-[356px] top-[30px] hidden h-[302px] w-[255px] object-cover md:block"
        />
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full opacity-70 transition-opacity hover:opacity-100 cursor-pointer"
          aria-label={t("common.dismiss", "Dismiss")}
        >
          <X size={17} strokeWidth={1.8} />
        </button>
      </div>
    </div>
  );
}
