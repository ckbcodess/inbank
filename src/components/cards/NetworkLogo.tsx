import Image from "next/image";
import { cn } from "@/lib/utils";
import type { CardScheme } from "@/lib/card-schemes";

/**
 * The network mark on a card face and in the network picker. One component, so the Visa on a card is the very
 * same artwork the Request a Card flow shows. Visa and the GH-Link wordmark take the surrounding text colour
 * (white on a dark card, near-black on a light one); Mastercard and UnionPay keep their own colours.
 *
 * Sized by height: pass `h-*` (or a `cqw` height inside a card). Width follows the artwork.
 */

function Visa({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 39 13" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn("aspect-[39/13] shrink-0", className)} role="img" aria-label="Visa">
      <path
        d="M14.545 0.282L9.537 11.718H6.264L3.818 2.518C3.67 1.942 3.525 1.724 3.072 1.48C2.33 1.08 1.09 0.702 0 0.463L0.068 0.282H5.518C6.216 0.282 6.837 0.742 6.993 1.543L8.32 8.575L11.602 0.282H14.545ZM27.355 7.957C27.368 4.931 23.109 4.766 23.138 3.42C23.148 3.01 23.548 2.569 24.444 2.454C24.887 2.397 26.115 2.348 27.38 2.932L27.902 0.54C27.186 0.282 26.265 0.05 25.109 0.05C22.062 0.05 19.92 1.637 19.902 3.905C19.873 5.589 21.41 6.529 22.584 7.094C23.789 7.676 24.195 8.048 24.189 8.571C24.179 9.369 23.218 9.728 22.334 9.742C20.764 9.766 19.845 9.336 19.124 9.006L18.583 11.492C19.349 11.839 20.771 12.14 22.241 12.158C25.438 12.158 27.34 10.612 27.355 7.957ZM35.438 11.718H38.297L35.807 0.282H33.16C32.568 0.282 32.066 0.623 31.848 1.139L27.202 11.718H30.434L31.082 9.967H35.032L35.438 11.718ZM31.977 7.551L33.606 3.167L34.54 7.551H31.977ZM19.263 0.282L16.714 11.718H13.629L16.178 0.282H19.263Z"
        fill="currentColor"
      />
    </svg>
  );
}

function Mastercard({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 36 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn("aspect-[36/24] shrink-0", className)} role="img" aria-label="Mastercard">
      <circle cx="12" cy="12" r="11" className="fill-[var(--mc-red)]" />
      <circle cx="24" cy="12" r="11" className="fill-[var(--mc-orange)]" fillOpacity="0.95" />
      <path
        d="M18 4.223A10.96 10.96 0 0 0 13.633 12 10.96 10.96 0 0 0 18 19.777 10.96 10.96 0 0 0 22.367 12 10.96 10.96 0 0 0 18 4.223Z"
        className="fill-[var(--mc-overlap)]"
      />
    </svg>
  );
}

/** The GH-Link (GhIPSS) network logo from `/ghlink.svg`. */
function GhLink({ className }: { className?: string }) {
  return <Image src="/ghlink.svg" alt="GH-Link" width={56} height={34} unoptimized className={cn("aspect-[56/34] shrink-0 object-contain", className)} />;
}

/** The UnionPay mark, from `public/images/unionpay.svg`. Its own colours, like Mastercard's. */
function UnionPay({ className }: { className?: string }) {
  return <Image src="/images/unionpay.svg" alt="UnionPay" width={56} height={34} unoptimized className={cn("aspect-[56/34] shrink-0 object-contain", className)} />;
}

export function NetworkLogo({ scheme, className }: { scheme: CardScheme | string; className?: string }) {
  const cls = cn("w-auto shrink-0", className);
  switch (scheme) {
    case "Mastercard":
      return <Mastercard className={cls} />;
    case "GH-Link":
      return <GhLink className={cls} />;
    case "UnionPay":
      return <UnionPay className={cls} />;
    default:
      return <Visa className={cls} />;
  }
}

/** Per-network heights that fit the marks into the same 48 by 24 box, so a list of them lines up. */
const CHIP_HEIGHT: Record<string, string> = {
  Visa: "h-3",
  Mastercard: "h-4.5",
  "GH-Link": "h-3",
  UnionPay: "h-5",
};

/**
 * A network mark in a fixed chip, the way a wallet shows in the Network Provider list: mark on the left, name
 * beside it. Use it wherever networks are listed so they read the same.
 */
export function NetworkChip({
  scheme,
  size = "sm",
  className,
}: {
  scheme: CardScheme | string;
  /** `lg` is the height of a wallet's round mark, so cards and wallets line up in one list. */
  size?: "sm" | "lg";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex w-12 shrink-0 items-center justify-center",
        size === "lg" ? "h-9 rounded-lg border border-black/5 bg-muted/60 dark:border-white/10" : "h-6 rounded-md bg-muted/40",
        className,
      )}
    >
      <NetworkLogo scheme={scheme} className={cn(CHIP_HEIGHT[scheme] ?? "h-3", "text-foreground")} />
    </span>
  );
}
