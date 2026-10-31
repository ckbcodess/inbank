/**
 * The cash-out code as a ticket: warm paper with scalloped top and bottom edges and a bite out of each
 * side, the colour GCB eagle, the code large, a dashed rule, then the amount and where it goes. It is
 * paper in both themes, so its colours are the ticket tokens (`--ticket-*`), not the page colours.
 * Used by the success page and by the dialog that opens an existing code.
 */

import Image from "next/image";
import { cn } from "@/lib/utils";

const W = 278;
const H = 396;
/**
 * Scallop (bite) radius; how many bites run along the top and bottom (evenly spaced, so the row is symmetrical
 * and the half-bites at the corners match); and the height of the side bites, which sit on the dashed tear line.
 */
const R = 10;
const COUNT = 8;
const RULE_Y = 244;
const SIDE_Y = RULE_Y + 0.5;

/** The ticket outline: a rectangle with a semicircular bite along the top and bottom and one on each side. */
function outline(): string {
  const xs: number[] = [];
  for (let k = 0; k < COUNT; k++) xs.push((k + 0.5) * (W / COUNT));
  let d = "M0 0";
  for (const cx of xs) d += ` L${(cx - R).toFixed(2)} 0 A${R} ${R} 0 0 0 ${(cx + R).toFixed(2)} 0`;
  d += ` L${W} 0 L${W} ${SIDE_Y - R} A${R} ${R} 0 0 0 ${W} ${SIDE_Y + R} L${W} ${H}`;
  for (const cx of [...xs].reverse()) d += ` L${(cx + R).toFixed(2)} ${H} A${R} ${R} 0 0 0 ${(cx - R).toFixed(2)} ${H}`;
  d += ` L0 ${H} L0 ${SIDE_Y + R} A${R} ${R} 0 0 0 0 ${SIDE_Y - R} Z`;
  return d;
}
const OUTLINE = outline();

export function CashoutTicket({
  code,
  amount,
  recipientPhone,
  expires,
  className,
}: {
  code: string;
  /** Already formatted, without the currency (e.g. "500.00"). */
  amount: string;
  recipientPhone: string;
  /** When it stops working, already worded (e.g. "30 Oct, 14:32"). */
  expires?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative h-[396px] w-[278px] max-w-full shrink-0 text-[var(--ticket-ink)]", className)}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden className="absolute inset-0">
        <path d={OUTLINE} fill="var(--ticket-paper)" />
      </svg>

      <div className="absolute inset-x-0 top-9 flex h-9 justify-center">
        <Image
          src="/illustrations/cashout-ticket-logo-color-v2.svg"
          alt="GCB"
          width={46.5}
          height={40}
          unoptimized
          draggable={false}
          className="h-9 w-auto select-none"
        />
      </div>

      <p className="absolute inset-x-0 top-[125px] text-center text-[16px] font-semibold leading-[22px] tracking-[0.01em]">
        YOUR CODE
      </p>
      <p
        className="absolute inset-x-0 top-[149px] whitespace-nowrap text-center text-[56px] font-bold leading-none tabular"
        aria-label={`Code ${code.replace("-", " ")}`}
      >
        {code}
      </p>

      <div
        className="absolute inset-x-7 top-[244px] h-px"
        style={{ backgroundImage: "repeating-linear-gradient(to right, var(--ticket-rule) 0 8px, transparent 8px 15px)" }}
      />

      <div className="absolute inset-x-7 top-[272px] flex items-center justify-between text-[14px] leading-5">
        <span>Amount</span>
        <span className="tabular">GHS {amount}</span>
      </div>
      <div className="absolute inset-x-7 top-[306px] flex items-center justify-between text-[14px] leading-5">
        <span>To</span>
        <span className="tabular">•••• {recipientPhone.replace(/\D/g, "").slice(-4)}</span>
      </div>
      {expires && (
        <div className="absolute inset-x-7 top-[340px] flex items-center justify-between text-[14px] leading-5">
          <span>Expires</span>
          <span className="tabular">{expires}</span>
        </div>
      )}
    </div>
  );
}
