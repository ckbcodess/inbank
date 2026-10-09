"use client";

/**
 * Building blocks for the Hero layout family (Figma, Internet Banking,
 * node 1945:5108): the hero surface and its art, the balance in hero type,
 * the sheet the panels sit on (with its pointer rim light), and the gold app promo. The Hero
 * variants in ./layouts only arrange these.
 */

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeftRight,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  LayoutGrid,
  FileText,
  MoreVertical,
  QrCode,
  Share2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { useSession } from "@/lib/session-store";
import { heroWaveVars, useHeroWave } from "@/lib/hero-wave";
import { decodeImage, holdSplash } from "@/lib/app-splash";
import { RevealingAmount } from "@/components/providers/AmountVisibilityProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { accountHolderName } from "@/lib/account-holder";
import { CurrencyLogo } from "@/components/ui/currency-logo";
import { FX_RATES, findFxRate } from "@/lib/mock-data";
import { FxRatesDialog } from "./FxRatesDialog";
import { ShareDetailsDialog, groupDigits } from "@/components/accounts/ShareDetailsDialog";
import {
  SPRING,
  selectedAccount,
  useUpdatedLabel,
  type DashData,
} from "./parts";

const ASSETS = "/dashboard/hero";

/* ── Header ──────────────────────────────────────────────────────────────── */

function formatLastLogin(ms: number): string {
  const d = new Date(ms);
  const date = d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const time = d.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${date} ${time}`;
}

/** This customer's previous sign-in — a quiet security cue. Hidden on their very first. */
export function LastLogin({ className }: { className?: string }) {
  const { t } = useTranslation();
  const previous = useSession((s) => s.previousSignIn);
  if (!previous) return null;
  return (
    <span className={cn("tabular text-[12px] tracking-[-0.01em] text-muted-foreground", className)} suppressHydrationWarning>
      {t("dashboard.lastLogin", "Last login: {0}", { 0: formatLastLogin(previous) })}
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
      className="pointer-events-none absolute inset-0 -z-10 [contain:paint] [--hero-card:var(--wave-card-light)] [--hero-wave:var(--wave-color-light)] dark:[--hero-card:var(--wave-card-dark)] dark:[--hero-wave:var(--wave-color-dark)]"
      style={{ background: "var(--hero-card, var(--hero-surface))" }}
    >
      <div
        className="hero-wave-a absolute -left-[20%] h-[95%] rounded-[50%] will-change-transform [backface-visibility:hidden]"
        style={{
          background: WAVE_FILL,
          bottom: "calc(var(--wave-lift) - 95%)",
          width: "var(--wave-size)",
        }}
      />
      <div
        className="hero-wave-b absolute -right-[15%] h-[85%] rounded-[50%] will-change-transform [backface-visibility:hidden]"
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
          // Above the fold, and the splash already fetched it: load now, not lazily.
          priority
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

/** What the hero's glass buttons add to the `glass` Button variant: the squarer corner and the inner top light. */
const HERO_GLASS_EXTRA = "rounded-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] active:scale-95";

/** The kebab icon menu for account options (Share, Copy, Statements, etc.) placed next to the account switcher. */
export function HeroAccountOptionsMenu({
  data,
  className,
}: {
  data: DashData;
  className?: string;
}) {
  const router = useRouter();
  const [shareOpen, setShareOpen] = useState(false);
  const activeProfile = useSession((s) => s.activeProfile);
  const actor = useSession((s) => s.actor);

  const account = selectedAccount(data);
  if (!account) return null;

  const holderName = accountHolderName(account, activeProfile, actor);

  const handleCopyNumber = () => {
    const cleanNumber = account.number.replace(/\s+/g, "");
    navigator.clipboard.writeText(cleanNumber);
    toast.success("Account number copied", {
      description: `${groupDigits(account.number)} · ${account.name}`,
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="glass"
              size="icon"
              className={cn(HERO_GLASS_EXTRA, "h-9 w-9 sm:h-10 sm:w-10 aria-expanded:bg-white/18", className)}
              aria-label={`Account options for ${account.name}`}
            />
          }
        >
          <MoreVertical size={17} strokeWidth={1.9} className="size-[17px]" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={6} className="w-[240px] rounded-2xl p-1.5">
          {/* Inbound & Sharing */}
          <DropdownMenuItem onClick={handleCopyNumber} className="cursor-pointer gap-3 rounded-lg px-3 py-2 hover:bg-muted/70">
            <Copy size={16} strokeWidth={1.8} className="text-muted-foreground shrink-0" />
            <span className="text-[13.5px]">Copy Account Number</span>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => setShareOpen(true)} className="cursor-pointer gap-3 rounded-lg px-3 py-2 hover:bg-muted/70">
            <Share2 size={16} strokeWidth={1.8} className="text-muted-foreground shrink-0" />
            <span className="text-[13.5px]">Share Account Details</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Records & Activity */}
          <DropdownMenuItem
            onClick={() => router.push(`/accounts/${account.id}/requests?type=statement`)}
            className="cursor-pointer gap-3 rounded-lg px-3 py-2 hover:bg-muted/70"
          >
            <FileText size={16} strokeWidth={1.8} className="text-muted-foreground shrink-0" />
            <span className="text-[13.5px]">Download E-Statement</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => router.push(`/transactions?account=${account.id}`)}
            className="cursor-pointer gap-3 rounded-lg px-3 py-2 hover:bg-muted/70"
          >
            <ArrowLeftRight size={16} strokeWidth={1.8} className="text-muted-foreground shrink-0" />
            <span className="text-[13.5px]">View Transactions</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => router.push("/accounts")}
            className="cursor-pointer gap-3 rounded-lg px-3 py-2 hover:bg-muted/70"
          >
            <LayoutGrid size={16} strokeWidth={1.8} className="text-muted-foreground shrink-0" />
            <span className="text-[13.5px]">View All Accounts</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ShareDetailsDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        account={account}
        holderName={holderName}
      />
    </>
  );
}

/** Top right CTA container on the hero surface: FX Rates + QR Code CTA. */
export function HeroTopActions({
  className,
}: {
  data?: DashData;
  className?: string;
}) {
  const [ratesOpen, setRatesOpen] = useState(false);
  const usd = findFxRate("USD") ?? FX_RATES[0];
  const RateTrend = usd.changePct >= 0 ? TrendingUp : TrendingDown;

  return (
    <>
      <div className={cn("relative z-10 flex items-center gap-2", className)}>
        <Button
          type="button"
          variant="glass"
          onClick={() => setRatesOpen(true)}
          className={cn(HERO_GLASS_EXTRA, "h-10 gap-2.5 px-2.5 max-sm:h-9 max-sm:gap-1.5 max-sm:px-2")}
          aria-label={`FX Rates. 1 USD is ${usd.mid.toFixed(2)} GHS`}
          title="FX Rates"
        >
          <span className="relative flex shrink-0 items-center">
            <span className="max-sm:hidden"><CurrencyLogo currency="GHS" size={20} showBorder={false} /></span>
            <CurrencyLogo currency="USD" size={20} showBorder={false} className="-ml-1.5 max-sm:ml-0" />
          </span>
          <span className="tabular text-[14px] tracking-[-0.01em] max-sm:text-[13px]"><span className="max-sm:hidden">USD </span>{usd.mid.toFixed(2)}</span>
          <RateTrend size={15} strokeWidth={2} className={cn("size-[15px]", usd.changePct >= 0 ? "text-success-text" : "text-destructive-text")} />
        </Button>

        <Button
          variant="glass"
          size="icon-lg"
          className={cn(HERO_GLASS_EXTRA, "h-10 w-10 max-sm:h-9 max-sm:w-9")}
          aria-label="Scan & Pay with QR"
          title="Scan & Pay with QR"
          nativeButton={false}
          render={<Link href="/payments/send?rail=qr" />}
        >
          <QrCode size={18} strokeWidth={1.9} className="size-[18px]" />
        </Button>
      </div>

      <FxRatesDialog open={ratesOpen} onOpenChange={setRatesOpen} />
    </>
  );
}

/** Alias for backward compatibility */
export const HeroAccountMenu = HeroTopActions;

export function ManageAccountsLink({
  data,
  className,
}: {
  data?: DashData;
  className?: string;
}) {
  const { t } = useTranslation();
  if (data) return <HeroAccountMenu data={data} className={className} />;
  return (
    <Link
      href="/accounts"
      className={cn(
        "relative flex w-fit items-center gap-0.5 rounded-lg py-1.5 text-[13px] leading-none transition-opacity hover:opacity-80 sm:text-[16px]",
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
  md: "text-[24px] leading-[28px] sm:text-[32px] sm:leading-[32px]",
  lg: "text-[26px] leading-[30px] sm:text-[36px] sm:leading-[32px]",
  xl: "text-[28px] leading-[32px] sm:text-[44px] sm:leading-[48px]",
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
          className="h-[28px] w-56 skeleton-shimmer sm:h-[44px] rounded-lg bg-[color-mix(in_oklch,var(--hero-foreground)_15%,transparent)] sm:w-72"
          aria-label={t("dashboard.loadingBalance", "Loading balance")}
        />
      ) : (
        <span className={cn("tabular whitespace-nowrap tracking-[-0.02em]", HERO_FIGURE[size])}>
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
    <span className={cn("relative text-[12.5px] leading-5 tracking-[-0.005em] sm:text-[14px]", className)} suppressHydrationWarning>
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
        "@container relative flex flex-col gap-4 overflow-hidden border border-transparent p-3 sm:gap-6 sm:p-6",
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

/**
 * The hero with the sheet rising 32px over its foot.
 * Flush with the sheet on smaller viewports; sits 12px inside the sheet's edge on sm+.
 */
export function HeroStack({ hero, children }: { hero: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <div className="-mb-8 px-0 sm:px-3">{hero}</div>
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

