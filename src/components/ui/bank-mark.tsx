import Image from "next/image";
import { Landmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { brandLogo } from "@/lib/brands";

/**
 * A bank's mark in a round chip, the counterpart of `OperatorLogo` for banks. A bank we have a logo for shows it;
 * any other gets a quiet grey circle with a bank icon, never initials or a lookalike, because a logo is a claim
 * that this is the real bank.
 */
export function BankMark({ name, size = 28, className }: { name?: string | null; size?: number; className?: string }) {
  const logo = brandLogo(name);
  const box = { width: size, height: size };

  if (!logo) {
    return (
      <span
        style={box}
        className={cn("flex shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground", className)}
      >
        <Landmark size={Math.round(size * 0.5)} strokeWidth={1.8} aria-hidden="true" />
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
      {/* The files in /public/brands are already small, so they are served as they are (see TransactionMark). */}
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
