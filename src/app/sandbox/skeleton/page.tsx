"use client";

/**
 * Skeleton tuner (`/sandbox/skeleton`): the real loading skeletons, with sliders for the bone's strength, the moving
 * highlight, the animation, its pace and the corner radius. Edits apply to this page only; "Copy CSS" gives the lines
 * to bake into globals.css and layout.tsx. Development only.
 */

import { useEffect, useMemo, useState, useSyncExternalStore, type CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { ArrowUpRight, Copy, RotateCcw } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  DashboardSkeleton,
  DetailPageSkeleton,
  FormPageSkeleton,
  ListPageSkeleton,
} from "@/components/states/PageSkeletons";
import { SHOW_DEMO_TOOLS } from "@/lib/demo-tools";
import { switchTheme } from "@/lib/theme-transition";
import {
  SKELETON_DEFAULTS,
  hydrateSkeletonTuner,
  resetSkeletonTuner,
  setSkeletonShine,
  setSkeletonTune,
  skeletonExport,
  skeletonIsDefault,
  skeletonVariables,
  useSkeletonTune,
  type SkeletonAnimation,
  type SkeletonSpeed,
  type SkeletonTheme,
  type TextBottom,
  type TextTop,
} from "@/lib/skeleton-tuner";

const VIEWS = [
  { value: "dashboard", label: "Dashboard", Body: DashboardSkeleton },
  { value: "list", label: "List", Body: ListPageSkeleton },
  { value: "detail", label: "Detail", Body: DetailPageSkeleton },
  { value: "form", label: "Form", Body: FormPageSkeleton },
] as const;
type ViewId = (typeof VIEWS)[number]["value"];

export default function SkeletonTunerPage() {
  if (!SHOW_DEMO_TOOLS) notFound();
  return <Tuner />;
}

function Tuner() {
  const { resolvedTheme, setTheme } = useTheme();
  const tune = useSkeletonTune();
  const [view, setView] = useState<ViewId>("dashboard");
  // Bumped by Replay. The animation, pace, radius and text bars are read when a skeleton is drawn, so changing them redraws.
  const [replay, setReplay] = useState(0);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const theme: SkeletonTheme = mounted && resolvedTheme === "dark" ? "dark" : "light";

  useEffect(() => hydrateSkeletonTuner(), []);

  const style = useMemo(() => skeletonVariables(tune, theme) as CSSProperties, [tune, theme]);
  const drawKey = `${view}-${tune.animation}-${tune.speed}-${tune.radius}-${tune.textTop}-${tune.textBottom}-${replay}`;
  const View = VIEWS.find((v) => v.value === view)!.Body;
  const changed = !skeletonIsDefault(tune);

  function copy() {
    const css = skeletonExport(tune);
    if (!css) {
      toast.info("Nothing changed yet", { id: "skeleton-copy" });
      return;
    }
    void navigator.clipboard.writeText(css).then(
      () => toast.success("CSS copied", { id: "skeleton-copy" }),
      () => toast.error("Could not copy", { id: "skeleton-copy" }),
    );
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-8 px-3 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="type-page-title font-medium tracking-[var(--ls-heading)]">Skeleton tuner</h1>
            <p className="text-[13px] text-muted-foreground">The real loading skeletons. Tune them on the right; this page only.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl
              aria-label="Theme"
              value={theme}
              onChange={(v) => switchTheme(v as SkeletonTheme, () => setTheme(v))}
              options={[
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
              ]}
            />
            <Button nativeButton={false} variant="outline" size="md" render={<Link href="/sandbox/components" />}>
              Components
              <ArrowUpRight aria-hidden="true" />
            </Button>
          </div>
        </header>

        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex min-w-0 flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <SegmentedControl aria-label="Skeleton to preview" value={view} onChange={(v) => setView(v as ViewId)} options={VIEWS.map(({ value, label }) => ({ value, label }))} />
              <Button type="button" variant="outline" size="default" onClick={() => setReplay((n) => n + 1)}>
                <RotateCcw aria-hidden="true" />
                Replay
              </Button>
            </div>
            <div style={style} className="min-w-0">
              <View key={drawKey} />
            </div>
          </div>

          <aside aria-label="Skeleton tweaks" className="flex flex-col gap-4 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-48px)] lg:overflow-y-auto lg:pr-1">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[16px] font-medium">Tweaks</h2>
              <span className="text-[12px] text-muted-foreground">{changed ? "Changed" : "As shipped"}</span>
            </div>

            <Section title="Bone">
              <SliderRow label="Strength" value={tune.base} initial={SKELETON_DEFAULTS.base} min={0} max={100} unit="%" onChange={(v) => setSkeletonTune({ base: v })} />
              <SliderRow label="Corner radius" value={tune.radius} initial={SKELETON_DEFAULTS.radius} min={0} max={24} unit="px" onChange={(v) => setSkeletonTune({ radius: v })} />
            </Section>

            <Section title="Highlight">
              <SliderRow
                label={`Strength, ${theme} mode`}
                value={tune.shine[theme]}
                initial={SKELETON_DEFAULTS.shine[theme]}
                min={0}
                max={100}
                unit="%"
                onChange={(v) => setSkeletonShine(theme, v)}
              />
              <ChoiceRow
                label="Animation"
                value={tune.animation}
                onChange={(v) => setSkeletonTune({ animation: v as SkeletonAnimation })}
                options={[
                  { value: "shimmer", label: "Shimmer" },
                  { value: "group-shimmer", label: "Per block" },
                  { value: "pulse", label: "Pulse" },
                  { value: "none", label: "None" },
                ]}
              />
              <ChoiceRow
                label="Pace"
                value={tune.speed}
                onChange={(v) => setSkeletonTune({ speed: v as SkeletonSpeed })}
                options={[
                  { value: "slow", label: "Slow" },
                  { value: "fast", label: "Fast" },
                ]}
              />
            </Section>

            <Section title="Text bars">
              <ChoiceRow
                label="Top of the bar"
                value={tune.textTop}
                onChange={(v) => setSkeletonTune({ textTop: v as TextTop })}
                options={[
                  { value: "ascender", label: "Ascender" },
                  { value: "cap-height", label: "Cap" },
                  { value: "x-height", label: "x-height" },
                ]}
              />
              <ChoiceRow
                label="Bottom of the bar"
                value={tune.textBottom}
                onChange={(v) => setSkeletonTune({ textBottom: v as TextBottom })}
                options={[
                  { value: "descender", label: "Descender" },
                  { value: "baseline", label: "Baseline" },
                ]}
              />
            </Section>

            <div className="flex gap-2">
              <Button type="button" size="md" className="flex-1" onClick={copy}>
                <Copy aria-hidden="true" />
                Copy CSS
              </Button>
              <Button type="button" size="md" variant="outline" disabled={!changed} onClick={resetSkeletonTuner}>
                Reset all
              </Button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t border-border/60 pt-3">
      <h3 className="text-[14px] font-medium text-foreground">{title}</h3>
      {children}
    </section>
  );
}

function SliderRow({
  label,
  value,
  initial,
  min,
  max,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  initial: number;
  min: number;
  max: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] text-foreground">{label}</span>
        <span className="flex items-center gap-1">
          <input
            type="number"
            aria-label={`${label} value`}
            value={value}
            min={min}
            max={max}
            step={1}
            onChange={(e) => e.target.value !== "" && onChange(Math.min(max, Math.max(min, Number(e.target.value))))}
            className="tabular field-surface h-6 w-14 rounded-sm border border-transparent bg-field px-1 text-right text-[12px] text-foreground outline-none"
          />
          <span className="w-4 text-[11px] text-muted-foreground">{unit}</span>
          <button
            type="button"
            aria-label={`Reset ${label}`}
            disabled={value === initial}
            onClick={() => onChange(initial)}
            className="flex size-5 cursor-pointer items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground disabled:cursor-default disabled:opacity-30"
          >
            <RotateCcw size={12} aria-hidden="true" />
          </button>
        </span>
      </div>
      <input
        type="range"
        aria-label={label}
        value={value}
        min={min}
        max={max}
        step={1}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1 w-full cursor-pointer accent-primary"
      />
    </div>
  );
}

function ChoiceRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] text-foreground">{label}</span>
      <SegmentedControl aria-label={label} value={value} onChange={onChange} options={options} fullWidth />
    </div>
  );
}
