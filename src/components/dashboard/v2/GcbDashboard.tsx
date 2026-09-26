"use client";

/**
 * GCB dashboard — one data model, several presentations (switchable from Dev
 * Mode → "Dashboard layout"). Each layout leans on a different strength:
 *
 *   overview  — everything at a glance (default)
 *   focus     — calm, balance first, forward-looking
 *   timeline  — past and upcoming in one chronological feed
 *   insights  — where the money goes
 *   actions   — the Send & Pay hub on the dashboard
 *   hero      — the Figma design (1945:5108), actions by the greeting
 *   hero-split — the same, balance left and actions right on the hero
 *
 * Shared blocks live in ./parts; the layouts only arrange them.
 */

import type { DashboardLayout } from "@/lib/dashboard-simulations";
import type { DashViewProps } from "./parts";
import { OverviewLayout } from "./layouts/OverviewLayout";
import { FocusLayout } from "./layouts/FocusLayout";
import { TimelineLayout } from "./layouts/TimelineLayout";
import { InsightsLayout } from "./layouts/InsightsLayout";
import { ActionsLayout } from "./layouts/ActionsLayout";
import { HeroLayout } from "./layouts/HeroLayout";
import { HeroSplitLayout } from "./layouts/HeroSplitLayout";

export type { DashData, DashStatus } from "./parts";

const LAYOUTS: Record<DashboardLayout, (props: DashViewProps) => React.JSX.Element> = {
  overview: OverviewLayout,
  focus: FocusLayout,
  timeline: TimelineLayout,
  insights: InsightsLayout,
  actions: ActionsLayout,
  hero: HeroLayout,
  "hero-split": HeroSplitLayout,
};

export function GcbDashboard({ layout, ...props }: DashViewProps & { layout: DashboardLayout }) {
  const Layout = LAYOUTS[layout] ?? OverviewLayout;
  return <Layout {...props} />;
}
