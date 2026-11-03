"use client";

/**
 * The sandbox's shadow editor: a shadow token as layers, each with offset, blur, spread, colour, opacity and inset, plus
 * add and remove, a live preview, and the raw CSS for anyone who wants it. A colour token (the field's drop) gets the
 * colour and opacity alone. Edits are written back as plain `rgba()` layers through `setTweak`.
 */

import { useEffect, useState, type ReactNode } from "react";
import { RotateCcw } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import {
  colourCss,
  fromHex,
  parseColour,
  parseShadow,
  readComputed,
  shadowCss,
  toHex,
  type Rgba,
  type ShadowLayer,
} from "@/lib/shadow-css";
import { resetTweak, setTweak, tweakValue, useSandboxTweaks, type Tweak, type TweakTheme } from "@/lib/sandbox-tweaks";

const NEW_LAYER: ShadowLayer = { inset: false, x: 0, y: 1, blur: 2, spread: 0, r: 0, g: 0, b: 0, a: 0.1 };

function Num({ label, value, onChange, step = 1, min }: { label: string; value: number; onChange: (n: number) => void; step?: number; min?: number }) {
  return (
    <label className="flex flex-col gap-0.5 text-[11px] text-muted-foreground">
      {label}
      <input
        type="number"
        value={value}
        step={step}
        min={min}
        onChange={(e) => e.target.value !== "" && onChange(Number(e.target.value))}
        className="tabular h-6 w-full min-w-0 rounded-sm bg-field px-1 text-right text-[12px] text-foreground outline-none field-surface border border-transparent"
      />
    </label>
  );
}

function ColourControls({ value, onChange }: { value: Rgba; onChange: (c: Rgba) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        aria-label="Colour"
        value={toHex(value)}
        onChange={(e) => onChange({ ...value, ...fromHex(e.target.value) })}
        className="size-6 shrink-0 cursor-pointer rounded-sm border-0 bg-transparent p-0"
      />
      <input
        type="range"
        aria-label="Opacity"
        min={0}
        max={1}
        step={0.01}
        value={value.a}
        onChange={(e) => onChange({ ...value, a: Number(e.target.value) })}
        className="h-1 min-w-0 flex-1 cursor-pointer accent-primary"
      />
      <span className="tabular w-9 text-right text-[11px] text-muted-foreground">{Math.round(value.a * 100)}%</span>
    </div>
  );
}

function useStart(tweak: Tweak, theme: TweakTheme, as: "shadow" | "colour") {
  const current = useSandboxTweaks();
  const set = tweakValue(tweak, theme, current);
  // What the token resolves to now: the override when there is one, else what the stylesheet gives for this theme.
  const [text, setText] = useState<string>("");
  useEffect(() => {
    const frame = requestAnimationFrame(() => setText(set !== undefined && set !== "" ? String(set) : readComputed(tweak.id, as)));
    return () => cancelAnimationFrame(frame);
  }, [set, theme, tweak.id, as]);
  return { text, changed: set !== undefined };
}

function Header({ tweak, theme, locate, changed }: { tweak: Tweak; theme: TweakTheme; locate: ReactNode; changed: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[13px] text-foreground">{`${tweak.label} (${theme})`}</span>
      <span className="flex items-center gap-1">
        {locate}
        <button
          type="button"
          aria-label={`Reset ${tweak.label}`}
          disabled={!changed}
          onClick={() => resetTweak(tweak, theme)}
          className="flex size-5 cursor-pointer items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground disabled:cursor-default disabled:opacity-30"
        >
          <RotateCcw size={12} aria-hidden="true" />
        </button>
      </span>
    </div>
  );
}

export function ShadowRow({ tweak, theme, locate }: { tweak: Tweak; theme: TweakTheme; locate: ReactNode }) {
  const { text, changed } = useStart(tweak, theme, "shadow");
  const layers = parseShadow(text);
  const write = (next: ShadowLayer[]) => setTweak(tweak, theme, shadowCss(next));
  const edit = (i: number, patch: Partial<ShadowLayer>) => write(layers.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  return (
    <div className="flex flex-col gap-2">
      <Header tweak={tweak} theme={theme} locate={locate} changed={changed} />
      <div className="flex h-14 items-center justify-center rounded-xl bg-card text-[11px] text-muted-foreground" style={{ boxShadow: text || undefined }}>
        Preview
      </div>
      {layers.map((l, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-xl bg-muted/60 p-2">
          <div className="grid grid-cols-4 gap-1">
            <Num label="X" value={l.x} onChange={(x) => edit(i, { x })} />
            <Num label="Y" value={l.y} onChange={(y) => edit(i, { y })} />
            <Num label="Blur" value={l.blur} min={0} onChange={(blur) => edit(i, { blur })} />
            <Num label="Spread" value={l.spread} onChange={(spread) => edit(i, { spread })} />
          </div>
          <ColourControls value={l} onChange={(c) => edit(i, c)} />
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <label className="flex cursor-pointer items-center gap-1">
              <input type="checkbox" checked={l.inset} onChange={(e) => edit(i, { inset: e.target.checked })} className="accent-primary" />
              Inset
            </label>
            <button type="button" onClick={() => write(layers.filter((_, j) => j !== i))} className="cursor-pointer underline underline-offset-2 hover:text-foreground">
              Remove layer
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => write([...layers, NEW_LAYER])}
        className="w-fit cursor-pointer text-[12px] text-foreground underline underline-offset-2"
      >
        Add layer
      </button>
      <details className="text-[11px] text-muted-foreground">
        <summary className="cursor-pointer">CSS</summary>
        <Input
          aria-label={`${tweak.label} CSS`}
          value={text}
          onChange={(e) => (e.target.value.trim() === "" ? resetTweak(tweak, theme) : setTweak(tweak, theme, e.target.value))}
          className="mt-1 h-8 text-[12px]"
        />
      </details>
    </div>
  );
}

export function ColourRow({ tweak, theme, locate }: { tweak: Tweak; theme: TweakTheme; locate: ReactNode }) {
  const { text, changed } = useStart(tweak, theme, "colour");
  const colour = parseColour(text);
  return (
    <div className="flex flex-col gap-2">
      <Header tweak={tweak} theme={theme} locate={locate} changed={changed} />
      <ColourControls value={colour} onChange={(c) => setTweak(tweak, theme, colourCss(c))} />
    </div>
  );
}
