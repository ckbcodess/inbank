import Image from "next/image";
import { CediReceiptIcon } from "@/components/ui/cedi-receipt-icon";
import { cn } from "@/lib/utils";
import { brandLogo } from "@/lib/brands";
import { GCB_PAY_CATEGORIES } from "@/lib/payment-options";
import type { BillerCategory } from "@/lib/mock-data";

/**
 * A biller's mark in a round chip, the counterpart of `BankMark` for the companies and services paid in Bills. A
 * biller we have a logo for shows it; any other gets a quiet grey circle with its kind's icon (utilities, education,
 * giving and so on), never initials or a lookalike, because a logo is a claim that this is the real company.
 */
export function BillerMark({
  name,
  category,
  size = 36,
  className,
}: {
  name?: string | null;
  category?: BillerCategory;
  size?: number;
  className?: string;
}) {
  const logo = brandLogo(name);
  const box = { width: size, height: size };

  if (!logo) {
    const Icon = GCB_PAY_CATEGORIES.find((c) => c.id === category)?.icon ?? CediReceiptIcon;
    return (
      <span
        style={box}
        className={cn("flex shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground", className)}
      >
        <Icon size={Math.round(size * 0.48)} aria-hidden="true" />
      </span>
    );
  }

  return (
    <span
      style={box}
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-black/5 dark:border-white/10",
        (!logo.round || logo.disc) && "bg-[var(--logo-disc)]",
        className,
      )}
    >
      <Image
        src={logo.src}
        alt=""
        width={72}
        height={72}
        unoptimized
        className={logo.round ? "size-full rounded-full object-cover" : "size-[60%] object-contain"}
      />
    </span>
  );
}
