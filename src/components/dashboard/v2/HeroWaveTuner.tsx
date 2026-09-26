"use client";

/**
 * Dev tool: tune the hero card live — its colours, the wave of light, grain,
 * the pill shadow and the panel container's glow. A floating button at the bottom right of the Hero layouts
 * opens the panel above it. Changes apply as you drag and persist in this
 * browser; "Copy values" puts them on the clipboard to bake in as defaults.
 * Hidden in capture mode so it stays out of Figma captures.
 */

import { Copy, Pause, Play, RotateCcw, Waves } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCaptureMode } from "@/lib/capture-mode";
import {
  HERO_WAVE_DEFAULTS,
  heroWaveExport,
  resetHeroWave,
  setHeroWave,
  setWaveTunerOpen,
  useHeroWave,
  useWaveTunerOpen,
  type HeroWaveSettings,
} from "@/lib/hero-wave";

type NumericKey = { [K in keyof HeroWaveSettings]: HeroWaveSettings[K] extends number ? K : never }[keyof HeroWaveSettings];

const SLIDERS: { key: NumericKey; label: string; min: number; max: number; step: number; unit: string }[] = [
  { key: "strength", label: "Wave strength · dark", min: 0, max: 100, step: 1, unit: "%" },
  { key: "strengthLight", label: "Wave strength · light", min: 0, max: 100, step: 1, unit: "%" },
  { key: "second", label: "Second wave", min: 0, max: 100, step: 1, unit: "%" },
  { key: "speed", label: "Cycle", min: 4, max: 60, step: 1, unit: "s" },
  { key: "drift", label: "Drift", min: 0, max: 20, step: 0.5, unit: "%" },
  { key: "grain", label: "Grain (anti-banding)", min: 0, max: 60, step: 1, unit: "%" },
  { key: "size", label: "Size", min: 40, max: 160, step: 1, unit: "%" },
  { key: "lift", label: "Lift", min: 0, max: 80, step: 1, unit: "%" },
  { key: "pillShadow", label: "Pill shadow", min: 0, max: 100, step: 1, unit: "%" },
  { key: "glowStrengthDark", label: "Container glow · dark", min: 0, max: 100, step: 1, unit: "%" },
  { key: "glowStrengthLight", label: "Container glow · light", min: 0, max: 100, step: 1, unit: "%" },
  { key: "glowSize", label: "Container glow size", min: 40, max: 200, step: 1, unit: "%" },
];

export function HeroWaveTuner() {
  const open = useWaveTunerOpen();
  const captureMode = useCaptureMode();
  if (captureMode) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {open && <TunerPanel />}
      <button
        type="button"
        onClick={() => setWaveTunerOpen(!open)}
        aria-expanded={open}
        aria-label={open ? "Close the wave tuner" : "Open the wave tuner"}
        title="Wave tuner"
        className={cn(
          "flex size-12 items-center justify-center rounded-full border shadow-lg transition-colors cursor-pointer",
          open
            ? "border-transparent bg-primary text-primary-foreground hover:bg-primary-hover"
            : "border-border bg-card text-foreground hover:bg-muted",
        )}
      >
        <Waves size={18} strokeWidth={1.8} />
      </button>
    </div>
  );
}

function TunerPanel() {
  const wave = useHeroWave();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(heroWaveExport(wave));
      toast.success("Wave settings copied");
    } catch {
      toast.error("Couldn't copy — clipboard blocked");
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Wave tuner"
      className="flex max-h-[calc(100dvh-6.5rem)] w-[300px] flex-col gap-4 overflow-y-auto rounded-2xl border border-border bg-card p-4 shadow-lg"
    >
      <div className="flex items-center justify-between">
        <span className="text-[14px] text-foreground">Wave tuner</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setHeroWave({ moving: !wave.moving })}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
            aria-label={wave.moving ? "Pause the wave" : "Play the wave"}
          >
            {wave.moving ? <Pause size={16} strokeWidth={1.8} /> : <Play size={16} strokeWidth={1.8} />}
          </button>
        </div>
      </div>

      {/* Each theme has its own card and light; the card shows whichever theme is on. */}
      {([
        ["cardDark", "Card · dark"],
        ["cardLight", "Card · light"],
        ["textDark", "Text · dark"],
        ["textLight", "Text · light"],
        ["color", "Wave · dark"],
        ["colorLight", "Wave · light"],
        ["glowDark", "Container glow · dark"],
        ["glowLight", "Container glow · light"],
      ] as const).map(([key, label]) => (
        <label key={key} className="flex items-center justify-between gap-3 text-[12.5px] text-muted-foreground">
          {label}
          <span className="flex items-center gap-2">
            <span className="tabular text-foreground">{wave[key]}</span>
            <input
              type="color"
              value={wave[key]}
              onChange={(e) => setHeroWave({ [key]: e.target.value })}
              className="size-7 cursor-pointer rounded-lg border border-border bg-transparent p-0.5"
            />
          </span>
        </label>
      ))}

      <div className="flex flex-col gap-3">
        {SLIDERS.map(({ key, label, min, max, step, unit }) => {
          const changed = wave[key] !== HERO_WAVE_DEFAULTS[key];
          return (
            <label key={key} className="flex flex-col gap-1.5">
              <span className="flex items-center justify-between text-[12.5px] text-muted-foreground">
                {label}
                <span className={cn("tabular", changed ? "text-foreground" : "text-muted-foreground")}>
                  {wave[key]}
                  {unit}
                </span>
              </span>
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={wave[key]}
                onChange={(e) => setHeroWave({ [key]: Number(e.target.value) })}
                className="h-1.5 w-full cursor-pointer accent-[var(--primary)]"
              />
            </label>
          );
        })}
      </div>

      <div className="flex items-center gap-2 border-t border-border pt-3">
        <button
          type="button"
          onClick={resetHeroWave}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[13px] text-foreground transition-colors hover:bg-muted cursor-pointer"
        >
          <RotateCcw size={15} strokeWidth={1.8} />
          Reset
        </button>
        <button
          type="button"
          onClick={copy}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-[13px] text-primary-foreground transition-colors hover:bg-primary-hover cursor-pointer"
        >
          <Copy size={15} strokeWidth={1.8} />
          Copy values
        </button>
      </div>
    </div>
  );
}
