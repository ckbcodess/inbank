"use client";

/**
 * One plan as a card on Insure, in the four looks Dev Mode can switch between (see `insure-cards-store.ts`):
 *  - plain:  a quiet tile, the plan's coloured disc at the corner, name and one line at the bottom.
 *  - colour: the whole card in the plan's colour.
 *  - art:    a picture slot on top (the plan's icon until StarLife's illustrations arrive), then the name and line.
 *  - price:  plain, plus what the plan costs from, so cost can be compared before opening anything.
 * A card opens the plan in a side panel; it never navigates away from the list.
 */

import { formatMoney } from "@/lib/mock-data";
import type { InsurancePlan } from "@/lib/insurance-plans";
import { planFromMonthly } from "@/lib/insurance";
import type { PlanCardLayout, PlanCardLook } from "@/lib/insure-cards-store";
import { PlanArt, PlanDisc, planToneStyle } from "@/components/insure/parts";
import { cn } from "@/lib/utils";

/**
 * The same glass edge as `ListCard`, around a card filled with the tile colour (or with the plan's own colour).
 * Written out in full for each fill, because Tailwind only picks up class names it can read whole.
 */
const EDGE = "border border-transparent border-[length:var(--edge-glass-width)]";
const TILE_FILL =
  "[background:linear-gradient(var(--tile),var(--tile))_padding-box,linear-gradient(var(--edge-glass-angle),var(--edge-glass-start),var(--edge-glass-mid)_var(--edge-glass-mid-at),var(--edge-glass-end))_border-box] " +
  "hover:[background:linear-gradient(var(--tile-hover),var(--tile-hover))_padding-box,linear-gradient(var(--edge-glass-angle),var(--edge-glass-start),var(--edge-glass-mid)_var(--edge-glass-mid-at),var(--edge-glass-end))_border-box]";
const PLAN_FILL =
  "[background:linear-gradient(var(--plan),var(--plan))_padding-box,linear-gradient(var(--edge-glass-angle),var(--edge-glass-start),var(--edge-glass-mid)_var(--edge-glass-mid-at),var(--edge-glass-end))_border-box]";

export function PlanCard({ plan, look, layout, onOpen }: { plan: InsurancePlan; look: PlanCardLook; layout: PlanCardLayout; onOpen: () => void }) {
  const from = planFromMonthly(plan);
  const single = layout === "single";
  const onColour = look === "colour";

  return (
    <button
      type="button"
      onClick={onOpen}
      style={planToneStyle(plan.id)}
      className={cn(
        "group relative flex w-full flex-col overflow-hidden rounded-2xl text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        EDGE,
        onColour ? cn(PLAN_FILL, "text-primary-foreground hover:brightness-[1.04]") : cn(TILE_FILL, "text-foreground"),
        look === "art" ? "p-0" : "justify-end gap-1 p-5 sm:p-6",
        look !== "art" && (single ? "min-h-[120px]" : "min-h-[148px] sm:min-h-[176px]"),
      )}
    >
      {look === "art" && <PlanArt planId={plan.id} className={single ? "h-24" : "h-32"} />}

      {look !== "art" && <PlanDisc planId={plan.id} size={single ? 44 : 52} onColour={onColour} className="absolute right-5 top-5 sm:right-6 sm:top-6" />}

      <span className={cn("flex flex-col gap-1", look === "art" && "p-5 sm:p-6")}>
        <span className="text-[16px] font-medium tracking-[var(--ls-tight)] sm:text-[18px]">{plan.name}</span>
        {plan.line && <span className={cn("text-[13px] leading-snug", onColour ? "text-primary-foreground/75" : "text-muted-foreground")}>{plan.line}</span>}
        {look === "price" && from !== null && (
          <span className="mt-3 flex flex-col">
            <span className="text-[12px] text-muted-foreground">From</span>
            <span className="tabular text-[20px] leading-tight text-foreground">{formatMoney(from, "GHS", true)}</span>
            <span className="text-[12px] text-muted-foreground">a month</span>
          </span>
        )}
      </span>
    </button>
  );
}
