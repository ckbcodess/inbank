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
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * The tile's icon chip. `onTile` (default) is the white chip on the grey tile
 * surface; `onCard` is the muted chip for rows on a white card (Accounts,
 * Cards), where a white chip would disappear.
 */
export function TileChip({ children, tone = "onTile" }: { children: React.ReactNode; tone?: "onTile" | "onCard" }) {
  return (
    <span
      className={cn(
        "flex size-[38.5px] shrink-0 items-center justify-center rounded-[12.25px] text-foreground transition-transform duration-150 group-hover:scale-105",
        tone === "onTile"
          ? "border border-black/[0.04] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] dark:border-white/[0.06] dark:bg-[#252525] dark:shadow-none"
          : "bg-muted",
      )}
    >
      {children}
    </span>
  );
}

const TILE =
  "group flex w-full items-center justify-between gap-4 rounded-[16px] border border-[var(--tile-border)] bg-[var(--tile)] p-4 text-left transition-all duration-150 hover:bg-[var(--tile-hover)] active:scale-[0.99]";

export function ActionTile({
  icon: Icon,
  leading,
  title,
  description,
  href,
  onClick,
  disabled,
  className,
}: ActionTileProps) {
  const body = (
    <>
      <div className="flex min-w-0 items-center gap-4">
        <TileChip>{leading ?? (Icon && <Icon size={20} strokeWidth={1.8} aria-hidden="true" />)}</TileChip>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[16px] font-medium tracking-[-0.01em] text-foreground">{title}</span>
          {description && <span className="truncate text-[13px] text-muted-foreground">{description}</span>}
        </span>
      </div>
      <ChevronRight
        size={20}
        strokeWidth={1.8}
        aria-hidden="true"
        className="shrink-0 text-[#737373] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-foreground dark:text-[#999999]"
      />
    </>
  );

  if (href && !disabled) {
    return (
      <Link href={href} className={cn(TILE, className)}>
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
        "cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[var(--tile)] disabled:active:scale-100",
        className,
      )}
    >
      {body}
    </button>
  );
}
