"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * A quick action: a round amber button with its label underneath. The one row of "do it now" on the card page
 * and the account page. Renders a link with `href`, otherwise a button. Every action is the same width, so a label
 * that changes ("Block card" to "Unblock card") never moves the row.
 */
export function RoundAction({
  icon: Icon,
  label,
  href,
  onClick,
  disabled,
  title,
  size = "md",
  fill = false,
  popup = false,
  chipClassName,
  labelClassName,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; "aria-hidden"?: boolean | "true" | "false" }>;
  label: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  /** `sm` is the 44px chip used inside a card (the dashboard hero); `md` is the 56px page-level one. */
  size?: "md" | "sm";
  /** Fill the column it sits in instead of the fixed 88px. */
  fill?: boolean;
  /** The action opens a dialog or sheet. */
  popup?: boolean;
  /** Replaces the amber chip colours (for example glass on the hero panel). */
  chipClassName?: string;
  labelClassName?: string;
}) {
  const body = (
    <>
      <span
        className={cn(
          size === "sm" ? "size-11" : "size-14",
          "flex items-center justify-center rounded-full transition-[background-color,transform] duration-hover ease-settle group-active:scale-95 group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-background",
          chipClassName ?? "bg-primary text-primary-foreground group-hover:bg-primary-hover",
        )}
      >
        <Icon size={size === "sm" ? 18 : 20} strokeWidth={1.8} aria-hidden="true" />
      </span>
      <span className={cn(fill ? "text-center leading-tight" : "whitespace-nowrap", "text-[13px] text-foreground", labelClassName)}>{label}</span>
    </>
  );
  const cls = cn(
    "group flex cursor-pointer flex-col items-center gap-2 outline-none disabled:cursor-not-allowed disabled:opacity-45",
    fill ? "w-full" : "w-[88px] shrink-0",
  );
  return href ? (
    <Link href={href} title={title} className={cls}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={onClick} disabled={disabled} title={title} aria-haspopup={popup ? "dialog" : undefined} className={cls}>
      {body}
    </button>
  );
}
