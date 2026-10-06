import Image from "next/image";
import { Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { operatorFromName, OPERATORS, type Operator } from "@/lib/operators";

/**
 * A mobile network's mark in a round chip. The one place that draws it: pickers, wallet lists, receipts and
 * badges all use this, so MTN, Telecel and AT look the same wherever they show. Give it the network (`operator`)
 * or any way of writing its name (`name`); a network we don't know gets a phone icon instead.
 */
export function OperatorLogo({
  operator,
  name,
  size = 36,
  className,
}: {
  operator?: Operator | null;
  name?: string | null;
  /** Diameter in px. */
  size?: number;
  className?: string;
}) {
  const op = operator ?? operatorFromName(name);
  const box = { width: size, height: size };

  if (!op) {
    return (
      <span
        style={box}
        className={cn("flex shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground", className)}
      >
        <Smartphone size={Math.round(size * 0.47)} strokeWidth={1.8} aria-hidden="true" />
      </span>
    );
  }

  return (
    <span
      style={box}
      className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-black/5 bg-muted/60 dark:border-white/10", className)}
    >
      <Image src={OPERATORS[op].logo} alt={OPERATORS[op].wallet} width={size} height={size} className="size-full rounded-full object-cover" />
    </span>
  );
}
