"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * A quick action: a round amber button with its label underneath. The one row of "do it now" on the card page
 * and the account page. Renders a link with `href`, otherwise a button.
 */
export function RoundAction({
  icon: Icon,
  label,
  href,
  onClick,
  disabled,
  title,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; "aria-hidden"?: boolean | "true" | "false" }>;
  label: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
}) {
  const body = (
    <>
      <span
        className={cn(
          "flex size-14 items-center justify-center rounded-full transition-[background-color,transform] duration-hover ease-settle group-active:scale-95 group-focus-visible:ring-2 group-focus-visible:ring-focus-ring group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-background",
          "bg-primary text-primary-foreground group-hover:bg-primary-hover",
        )}
      >
        <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
      </span>
      <span className="text-[13px] text-foreground">{label}</span>
    </>
  );
  const cls =
    "group flex cursor-pointer flex-col items-center gap-2 outline-none disabled:cursor-not-allowed disabled:opacity-45";
  return href ? (
    <Link href={href} title={title} className={cls}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={onClick} disabled={disabled} title={title} className={cls}>
      {body}
    </button>
  );
}
