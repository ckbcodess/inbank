"use client";

/**
 * The action tile from the Send & Pay hub (Figma 916:36785): tile fill, white
 * icon chip, 16px label, chevron. One component so every "go somewhere" tile
 * (Send & Pay, Account Details, Place a request) is the same element.
 *
 * Renders a Link with `href`, otherwise a button.
 */

import Link from "next/link";
import { ChevronRight } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

type TileIcon = React.ComponentType<{
  size?: number;
  strokeWidth?: number;
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}>;

interface ActionTileProps {
  icon?: TileIcon;
  /** Chip content when a plain icon won't do — a wordmark ("GCB") or a tinted icon. */
  leading?: React.ReactNode;
  title: string;
  /** Optional second line — only when the title alone doesn't say what's behind it. */
  description?: string;
  /** `attention` sets the second line in amber, for something that needs the customer. */
  descriptionTone?: "default" | "attention";
  /** Recognition marks before the chevron — network logos, a card — so tiles differ at a glance. */
  trailing?: React.ReactNode;
  /** The hub's amber icon (INTERFACE §E) instead of the neutral one. */
  accent?: boolean;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  /** Phone layout for two tiles per row: chip and label stay side by side, the label may wrap, no chevron. */
  compactOnMobile?: boolean;
  /** Draw the icon straight on the tile, with no chip behind it (used with the two-tone hub icons). */
  bareIcon?: boolean;
  /** `modal`: a lighter fill, for a tile that sits on a modal, dialog or sheet instead of the page. */
  variant?: "default" | "modal";
  className?: string;
}

/**
 * The tile's icon holder: the icon alone, with no chip behind it, in a fixed box so labels line up. `tone` is
 * kept so existing callers still compile; it no longer changes anything.
 */
export function TileChip({
  children,
  accent = false,
}: {
  children: React.ReactNode;
  tone?: "onTile" | "onCard";
  accent?: boolean;
}) {
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center transition-transform duration-150",
        accent ? "text-[var(--tile-accent)]" : "text-foreground",
      )}
    >
      {children}
    </span>
  );
}

/**
 * The tile's fill is opaque, so the glass stroke (the list box's `--edge-glass-*` tokens) is a gradient border: the fill
 * on the padding box, the gradient on the border box. The fill is a variable so hover can swap it.
 */
const TILE =
  "group flex w-full items-center justify-between gap-3 rounded-2xl border border-transparent border-[length:var(--edge-glass-width)] p-3 text-left transition duration-150 active:scale-[0.99] " +
  "[--tile-fill:var(--tile-rest)] hover:[--tile-fill:var(--tile-over)] " +
  "[background:linear-gradient(var(--tile-fill),var(--tile-fill))_padding-box,linear-gradient(var(--edge-glass-angle),var(--edge-glass-start),var(--edge-glass-mid)_var(--edge-glass-mid-at),var(--edge-glass-end))_border-box]";

/** The two fills of each variant: at rest, and under the pointer. */
const TILE_FILL = {
  default: "[--tile-rest:var(--tile)] [--tile-over:var(--tile-hover)]",
  modal: "[--tile-rest:var(--tile-modal)] [--tile-over:var(--tile-modal-hover)]",
} as const;

export function ActionTile({
  icon: Icon,
  leading,
  title,
  description,
  descriptionTone = "default",
  trailing,
  accent = false,
  href,
  onClick,
  disabled,
  compactOnMobile = false,
  bareIcon = false,
  variant = "default",
  className,
}: ActionTileProps) {
  const body = (
    <>
      <div className={cn("flex min-w-0 items-center gap-3", compactOnMobile && "max-sm:gap-2")}>
        {bareIcon && Icon ? (
          <span className="flex size-10 shrink-0 items-center justify-center text-foreground">
            <Icon size={24} strokeWidth={1.6} aria-hidden="true" />
          </span>
        ) : (
          <TileChip accent={accent}>{leading ?? (Icon && <Icon size={20} strokeWidth={1.8} aria-hidden="true" />)}</TileChip>
        )}
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className={cn("truncate text-[16px] font-medium tracking-[var(--ls-tight)] text-foreground", compactOnMobile && "max-sm:line-clamp-2 max-sm:whitespace-normal max-sm:text-[14px] max-sm:leading-[1.25]")}>{title}</span>
          {description && (
            <span className={cn("text-[13px] leading-snug", descriptionTone === "attention" ? "text-warning-text" : "text-muted-foreground")}>{description}</span>
          )}
        </span>
      </div>
      {trailing && <span className="ml-auto flex shrink-0 items-center">{trailing}</span>}
      <ChevronRight
        size={20}
        aria-hidden="true"
        className={cn("shrink-0 text-muted-foreground transition-transform duration-150 group-hover:text-foreground", compactOnMobile && "max-sm:hidden")}
      />
    </>
  );

  if (href && !disabled) {
    return (
      <Link href={href} onClick={onClick} className={cn(TILE, TILE_FILL[variant], compactOnMobile && "max-sm:p-3", className)}>
        {body}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        TILE,
        TILE_FILL[variant],
        compactOnMobile && "max-sm:p-3",
        "cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:[--tile-fill:var(--tile-rest)] disabled:active:scale-100",
        className,
      )}
    >
      {body}
    </button>
  );
}
