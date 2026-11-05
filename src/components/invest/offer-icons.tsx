"use client";

/**
 * The icons on an offer row, in the same duotone glass look as the Send & Pay hub: GCB amber, with a graphite accent on
 * the lower part of the bill and the bond. A term deposit is time you commit, so it is a gold clock with graphite hands.
 */

import { forwardRef } from "react";
import type { IconComponent } from "reicon-react/createIcon";
import { Bank, DocumentText } from "reicon-react";
import { glassOf, pathRegion, rectRegion } from "@/components/ui/glass-icon";

/** Reicon's clock draws its hands as holes in the disc; here the disc is solid and the hands are the accent region. */
const CLOCK_HANDS =
  "M12.75 6C12.75 5.58579 12.4142 5.25 12 5.25C11.5858 5.25 11.25 5.58579 11.25 6V12C11.25 12.2586 11.3832 12.4989 11.6025 12.636L15.6025 15.136C15.9538 15.3555 16.4165 15.2488 16.636 14.8975C16.8555 14.5462 16.7488 14.0835 16.3975 13.864L12.75 11.5843V6Z";

const ClockDisc = forwardRef<SVGSVGElement, { size?: number | string; color?: string; className?: string }>(function ClockDisc(
  { size = 24, color = "currentColor", className },
  ref,
) {
  return (
    <svg ref={ref} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size} fill={color} className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="11.75" />
    </svg>
  );
}) as unknown as IconComponent;

const GLASS = { tone: "slate" } as const;

export const OFFER_ICONS = {
  deposit: glassOf(ClockDisc, "amber", { ...GLASS, region: pathRegion(CLOCK_HANDS) }),
  bill: glassOf(DocumentText as unknown as IconComponent, "amber", { ...GLASS, region: rectRegion(0, 13, 24, 12) }),
  bond: glassOf(Bank as unknown as IconComponent, "amber", { ...GLASS, region: rectRegion(0, 17.6, 24, 7) }),
} as const;
