"use client";

/**
 * The action tile from the Send & Pay hub (Figma 916:36785): tile fill, white
 * icon chip, 16px label, chevron. One component so every "go somewhere" tile
 * (Send & Pay, Account Details, Place a request) is the same element.
 *
 * Renders a Link with `href`, otherwise a button.
 */

import Link from "next/link";
import { ChevronRight } from "lucide-react";
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
        "flex size-[38.5px] shrink-0 items-center justify-center transition-transform duration-150",
        accent ? "text-[var(--tile-accent)]" : "text-foreground",
      )}
    >
      {children}
    </span>
  );
}

const TILE =
  "group flex w-full items-center justify-between gap-4 rounded-[16px] bg-[var(--tile)] p-4 text-left transition-all duration-150 hover:bg-[var(--tile-hover)] active:scale-[0.99]";

export function ActionTile({
  icon: Icon,
  leading,
  title,
  description,
  trailing,
  accent = false,
  href,
  onClick,
  disabled,
  compactOnMobile = false,
  bareIcon = false,
  className,
}: ActionTileProps) {
  const body = (
    <>
      <div className={cn("flex min-w-0 items-center gap-4", compactOnMobile && "max-sm:gap-3")}>
        {bareIcon && Icon ? (
          <span className="flex size-[38.5px] shrink-0 items-center justify-center text-foreground">
            <Icon size={24} strokeWidth={1.6} aria-hidden="true" />
          </span>
        ) : (
          <TileChip accent={accent}>{leading ?? (Icon && <Icon size={20} strokeWidth={1.8} aria-hidden="true" />)}</TileChip>
        )}
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className={cn("truncate text-[16px] font-medium tracking-[-0.01em] text-foreground", compactOnMobile && "max-sm:line-clamp-2 max-sm:whitespace-normal max-sm:text-[14px] max-sm:leading-[1.25]")}>{title}</span>
          {description && <span className="truncate text-[13px] text-muted-foreground">{description}</span>}
        </span>
      </div>
      {trailing && <span className="ml-auto flex shrink-0 items-center">{trailing}</span>}
      <ChevronRight
        size={20}
        strokeWidth={1.8}
        aria-hidden="true"
        className={cn("shrink-0 text-[#737373] transition-transform duration-150 group-hover:text-foreground dark:text-[#999999]", compactOnMobile && "max-sm:hidden")}
      />
    </>
  );

  if (href && !disabled) {
    return (
      <Link href={href} className={cn(TILE, compactOnMobile && "max-sm:p-3.5", className)}>
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
        compactOnMobile && "max-sm:p-3.5",
        "cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[var(--tile)] disabled:active:scale-100",
        className,
      )}
    >
      {body}
    </button>
  );
}
