"use client";

/**
 * Component sandbox (`/sandbox/components`): every shared UI component in tabs, with a side panel to tune radius,
 * control heights, type, motion and shadows live, and the colour tuner one click away. This is where the design system's
 * look is decided; "Copy CSS" gives the values to bake into globals.css. Development only.
 */

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useTheme } from "next-themes";
import { Palette } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { TweakPanel } from "@/components/dev/sandbox/TweakPanel";
import {
  BannersTab,
  ButtonsTab,
  ChartsTab,
  DataTab,
  FeedbackTab,
  FieldsTab,
  OverlaysTab,
  SelectionTab,
  SurfacesTab,
  TypeTab,
} from "@/components/dev/sandbox/gallery";
import { SHOW_DEMO_TOOLS } from "@/lib/demo-tools";
import { setTunerOpen } from "@/lib/color-tuner";
import { mountSandboxTweaks, type TweakTheme } from "@/lib/sandbox-tweaks";
import { switchTheme } from "@/lib/theme-transition";

const TABS = [
  { value: "buttons", label: "Buttons", Body: ButtonsTab },
  { value: "fields", label: "Fields", Body: FieldsTab },
  { value: "selection", label: "Selection", Body: SelectionTab },
  { value: "overlays", label: "Overlays", Body: OverlaysTab },
  { value: "data", label: "Data", Body: DataTab },
  { value: "charts", label: "Charts", Body: ChartsTab },
  { value: "feedback", label: "Feedback", Body: FeedbackTab },
  { value: "banners", label: "Banners", Body: BannersTab },
  { value: "type", label: "Type", Body: TypeTab },
  { value: "surfaces", label: "Surfaces", Body: SurfacesTab },
] as const;

const TAB_KEY = "nibs-sandbox-tab";

export default function ComponentSandboxPage() {
  if (!SHOW_DEMO_TOOLS) notFound();
  return <Sandbox />;
}

function Sandbox() {
  const { resolvedTheme, setTheme } = useTheme();
  const [tab, setTab] = useState<string>("buttons");
  // The theme is only known in the browser, so the server and the first client render both say "light".
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const theme: TweakTheme = mounted && resolvedTheme === "dark" ? "dark" : "light";

  useEffect(() => mountSandboxTweaks(), []);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(TAB_KEY);
      if (saved && TABS.some((t) => t.value === saved)) setTab(saved);
    } catch {
      // A remembered tab is a convenience only.
    }
  }, []);

  function choose(value: string) {
    setTab(value);
    try {
      window.localStorage.setItem(TAB_KEY, value);
    } catch {
      // See above.
    }
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-8 px-3 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="type-page-title font-medium tracking-[var(--ls-heading)]">Component sandbox</h1>
            <p className="text-[13px] text-muted-foreground">The real components. Tune the tokens on the right; colours open in the tuner.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl
              aria-label="Theme"
              value={theme}
              onChange={(v) => switchTheme(v as TweakTheme, () => setTheme(v))}
              options={[
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
              ]}
            />
            <Button nativeButton={false} variant="outline" size="md" render={<Link href="/sandbox/skeleton" />}>
              Skeletons
            </Button>
            <Button type="button" variant="outline" size="md" onClick={() => setTunerOpen(true)}>
              <Palette aria-hidden="true" />
              Colours
            </Button>
          </div>
        </header>

        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Tabs value={tab} onValueChange={choose} id="sandbox-preview" className="min-w-0 gap-6">
            <div className="overflow-x-auto no-scrollbar">
              <TabsList className="h-auto min-h-7 flex-wrap justify-start">
                {TABS.map((t) => (
                  <TabsTrigger key={t.value} value={t.value}>
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            {TABS.map(({ value, Body }) => (
              <TabsContent key={value} value={value} className="min-w-0">
                <Body />
              </TabsContent>
            ))}
          </Tabs>
          <TweakPanel theme={theme} tab={tab} />
        </div>
      </div>
    </div>
  );
}
