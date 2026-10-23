"use client";

/**
 * Dev tool: tune the hero's motion and shape live: the wave of light (cycle, drift, size, lift, second wave), grain,
 * the size of the panel container's glow and the dotted eagle (its size, position and opacity). Its colours are tokens, so they live in the Colour
 * tuner (Dashboard hero group), not here. A floating button at the bottom right of the Hero layouts
 * opens the panel above it. Changes apply as you drag and persist in this
 * browser; "Copy values" puts them on the clipboard to bake in as defaults.
 * Hidden in capture mode so it stays out of Figma captures.
 */

import { Copy, Pause, Play, RotateCcw, Waves } from "@/components/ui/icons";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCaptureMode } from "@/lib/capture-mode";
import { useDevToolsHidden } from "@/lib/dev-tools-visibility";
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
  { key: "second", label: "Second wave", min: 0, max: 100, step: 1, unit: "%" },
  { key: "speed", label: "Cycle", min: 4, max: 60, step: 1, unit: "s" },
  { key: "drift", label: "Drift", min: 0, max: 20, step: 0.5, unit: "%" },
  { key: "grain", label: "Grain (anti-banding)", min: 0, max: 60, step: 1, unit: "%" },
  { key: "size", label: "Size", min: 40, max: 160, step: 1, unit: "%" },
  { key: "lift", label: "Lift", min: 0, max: 80, step: 1, unit: "%" },
  { key: "eagleScale", label: "Eagle size", min: 30, max: 200, step: 1, unit: "%" },
  { key: "eagleRight", label: "Eagle from the right", min: -300, max: 100, step: 1, unit: "px" },
  { key: "eagleBottom", label: "Eagle from the bottom", min: -100, max: 100, step: 1, unit: "px" },
  { key: "eagleOpacityLight", label: "Eagle opacity · light", min: 0, max: 100, step: 1, unit: "%" },
  { key: "eagleOpacityDark", label: "Eagle opacity · dark", min: 0, max: 100, step: 1, unit: "%" },
  { key: "glowSize", label: "Container glow size", min: 40, max: 200, step: 1, unit: "%" },
];

export function HeroWaveTuner() {
  const open = useWaveTunerOpen();
  const captureMode = useCaptureMode();
  const devToolsHidden = useDevToolsHidden();
  if (captureMode || devToolsHidden) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {open && <TunerPanel />}
      <button
        type="button"
        onClick={() => setWaveTunerOpen(!open)}
        aria-expanded={open}
        aria-label={open ? "Close the wave tuner" : "Open the wave tuner"}
        title="Wave tuner"
        className={cn(
          "flex size-10 items-center justify-center rounded-full border shadow-lg transition-colors cursor-pointer",
          open
            ? "border-transparent bg-primary text-primary-foreground hover:bg-primary-hover"
            : "border-border bg-card text-foreground hover:bg-muted",
        )}
      >
        <Waves size={18} />
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
      className="flex max-h-[calc(100dvh-6.5rem)] w-[300px] flex-col gap-3 overflow-y-auto rounded-2xl border border-border bg-card p-3 shadow-lg"
    >
      <div className="flex items-center justify-between">
        <span className="text-[14px] text-foreground">Wave tuner</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setHeroWave({ moving: !wave.moving })}
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
            aria-label={wave.moving ? "Pause the wave" : "Play the wave"}
          >
            {wave.moving ? <Pause size={16} /> : <Play size={16} />}
          </button>
        </div>
      </div>

      <p className="text-[12px] text-muted-foreground">
        Colours (card, text, wave, glow) are in the Colour tuner, under Dashboard hero.
      </p>

      <div className="flex flex-col gap-2">
        {SLIDERS.map(({ key, label, min, max, step, unit }) => {
          const changed = wave[key] !== HERO_WAVE_DEFAULTS[key];
          return (
            <label key={key} className="flex flex-col gap-2">
              <span className="flex items-center justify-between text-[12px] text-muted-foreground">
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

      <div className="flex items-center gap-2 border-t border-border pt-2">
        <button
          type="button"
          onClick={resetHeroWave}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border px-2 py-2 text-[13px] text-foreground transition-colors hover:bg-muted cursor-pointer"
        >
          <RotateCcw size={15} />
          Reset
        </button>
        <button
          type="button"
          onClick={copy}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-2 py-2 text-[13px] text-primary-foreground transition-colors hover:bg-primary-hover cursor-pointer"
        >
          <Copy size={15} />
          Copy values
        </button>
      </div>
    </div>
  );
}
