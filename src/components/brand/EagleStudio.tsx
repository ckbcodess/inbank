"use client";

/**
 * Eagle studio — a dev tool for the dotted eagle behind the auth screens.
 * Move, size, rotate, recolour, reshape and fade it live, paint individual dots
 * on or off, then copy the JSON (to bake in as DEFAULT_EAGLE) or download the SVG.
 * Settings persist in this browser only.
 */

import { useEffect, useRef, useState } from "react";
import { Brush, Check, Copy, Download, RotateCcw, SlidersHorizontal, X } from "lucide-react";
import { EAGLE_COLS, EAGLE_HEIGHT_CELLS, EAGLE_PITCH } from "@/lib/eagle-matrix";
import {
  DEFAULT_EAGLE,
  EAGLE_VIEWBOX,
  eaglePath,
  isLit,
  LOOK_KEYS,
  lookFor,
  useEagleStore,
  type LookKey,
  type Theme,
  type EagleConfig,
  type EagleShape,
} from "@/lib/eagle-style-store";
import { cn } from "@/lib/utils";

const SHAPES: EagleShape[] = ["plus", "dot", "square", "diamond"];

type NumKey = {
  [K in keyof EagleConfig]: EagleConfig[K] extends number ? K : never;
}[keyof EagleConfig];

/** Which mode the page is in right now; look settings edit that mode's copy. */
function useTheme(): Theme {
  const [theme, setTheme] = useState<Theme>("light");
  useEffect(() => {
    const read = () => setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);
  return theme;
}

const isLookKey = (k: string): k is LookKey => (LOOK_KEYS as readonly string[]).includes(k);

function Slider({
  label,
  k,
  min,
  max,
  step,
  unit = "",
}: {
  label: string;
  k: NumKey;
  min: number;
  max: number;
  step: number;
  unit?: string;
}) {
  const theme = useTheme();
  const value = useEagleStore((s) => (isLookKey(k) ? lookFor(s.config, theme)[k] : s.config[k]));
  const set = useEagleStore((s) => s.set);
  const setLook = useEagleStore((s) => s.setLook);
  const write = (n: number) => (isLookKey(k) ? setLook(theme, { [k]: n }) : set({ [k]: n }));
  return (
    <label className="grid grid-cols-[92px_1fr_46px] items-center gap-2 text-[12px] text-foreground">
      {label}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => write(Number(e.target.value))}
        className="accent-primary"
      />
      <span className="tabular text-right text-foreground">
        {value}
        {unit}
      </span>
    </label>
  );
}

function LookColor({ label, k }: { label: string; k: "color" | "litColor" | "hotColor" }) {
  const theme = useTheme();
  const value = useEagleStore((s) => lookFor(s.config, theme)[k]);
  const setLook = useEagleStore((s) => s.setLook);
  return (
    <label className="grid grid-cols-[92px_1fr] items-center gap-2 text-[12px] text-foreground">
      {label}
      <span className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => setLook(theme, { [k]: e.target.value })}
          className="h-7 w-10 cursor-pointer rounded border border-border bg-transparent"
        />
        <span className="tabular text-foreground">{value}</span>
      </span>
    </label>
  );
}

/** Copies the other mode's look into the mode you are viewing, as a starting point. */
function MatchOtherMode() {
  const theme = useTheme();
  const other: Theme = theme === "dark" ? "light" : "dark";
  const setLook = useEagleStore((s) => s.setLook);
  return (
    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
      <span>
        Editing <span className="text-foreground">{theme} mode</span> look
      </span>
      <button
        type="button"
        className="underline underline-offset-2"
        onClick={() => {
          const src = lookFor(useEagleStore.getState().config, other);
          setLook(theme, Object.fromEntries(LOOK_KEYS.map((k) => [k, src[k]])));
        }}
      >
        Copy from {other}
      </button>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5 border-t border-border pt-3">
      <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{title}</span>
      {children}
    </div>
  );
}

function Toggle({ label, k }: { label: string; k: "visible" | "flip" | "fade" | "drift" | "sweep" }) {
  const value = useEagleStore((s) => s.config[k]);
  const set = useEagleStore((s) => s.set);
  return (
    <label className="flex items-center justify-between text-[12px] text-foreground">
      {label}
      <input type="checkbox" checked={value} onChange={(e) => set({ [k]: e.target.checked })} className="accent-primary" />
    </label>
  );
}

/** Click or drag across the dots to switch them on or off. */
function DotEditor({ onClose }: { onClose: () => void }) {
  const edits = useEagleStore((s) => s.config.edits);
  const set = useEagleStore((s) => s.set);
  const toggleCell = useEagleStore((s) => s.toggleCell);
  const svgRef = useRef<SVGSVGElement>(null);
  const paint = useRef<boolean | null>(null); // true = turn on, false = turn off
  const seen = useRef<Set<string>>(new Set());

  function cellAt(e: React.PointerEvent) {
    const box = svgRef.current?.getBoundingClientRect();
    if (!box) return null;
    const c = Math.floor(((e.clientX - box.left) / box.width) * EAGLE_COLS);
    const r = Math.floor(((e.clientY - box.top) / box.height) * EAGLE_HEIGHT_CELLS);
    return c >= 0 && c < EAGLE_COLS && r >= 0 && r < EAGLE_HEIGHT_CELLS ? { c, r } : null;
  }

  function apply(e: React.PointerEvent, first: boolean) {
    const cell = cellAt(e);
    if (!cell) return;
    const key = `${cell.c},${cell.r}`;
    if (seen.current.has(key)) return;
    const lit = isLit(cell.c, cell.r, edits);
    if (first) paint.current = !lit;
    if (paint.current === null || lit === paint.current) return;
    seen.current.add(key);
    toggleCell(key);
  }

  const cells: React.ReactNode[] = [];
  for (let r = 0; r < EAGLE_HEIGHT_CELLS; r++) {
    for (let c = 0; c < EAGLE_COLS; c++) {
      const lit = isLit(c, r, edits);
      const edited = edits.includes(`${c},${r}`);
      if (!lit && !edited) continue;
      cells.push(
        <circle
          key={`${c},${r}`}
          cx={c * EAGLE_PITCH + EAGLE_PITCH / 2}
          cy={r * EAGLE_PITCH + EAGLE_PITCH / 2}
          r={lit ? EAGLE_PITCH * 0.32 : EAGLE_PITCH * 0.22}
          className={lit ? "fill-primary" : "fill-none stroke-muted-foreground/60"}
          strokeWidth={lit ? 0 : EAGLE_PITCH * 0.08}
        />,
      );
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-label="Paint eagle dots">
      <div className="flex max-h-full w-full max-w-[860px] flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-xl">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[14px] text-foreground">Paint dots</span>
          <span className="hidden text-[12px] text-muted-foreground sm:block">
            Drag to turn dots on or off. Hollow rings are dots you removed.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => set({ edits: [] })}
              className="rounded-lg border border-border px-2.5 py-1.5 text-[12px] text-foreground hover:bg-muted"
            >
              Clear edits
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dot editor"
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X size={16} strokeWidth={1.8} />
            </button>
          </div>
        </div>
        <svg
          ref={svgRef}
          viewBox={EAGLE_VIEWBOX}
          className="min-h-0 w-full flex-1 cursor-crosshair touch-none select-none rounded-xl bg-muted/40"
          onPointerDown={(e) => {
            (e.currentTarget as Element).setPointerCapture(e.pointerId);
            seen.current = new Set();
            apply(e, true);
          }}
          onPointerMove={(e) => {
            if (e.buttons) apply(e, false);
          }}
          onPointerUp={() => {
            paint.current = null;
          }}
        >
          {cells}
        </svg>
      </div>
    </div>
  );
}

export default function EagleStudio() {
  const cfg = useEagleStore((s) => s.config);
  const set = useEagleStore((s) => s.set);
  const reset = useEagleStore((s) => s.reset);
  const [open, setOpen] = useState(false);
  const [painting, setPainting] = useState(false);
  const [copied, setCopied] = useState(false);

  function copyJson() {
    const { edits, ...rest } = cfg;
    const json = JSON.stringify({ ...rest, edits }, null, 2);
    void navigator.clipboard?.writeText(json).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    });
  }

  function downloadSvg() {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${EAGLE_VIEWBOX}" fill="${cfg.color}"><path d="${eaglePath(cfg)}"/></svg>`;
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "gcb-eagle.svg";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-[70] flex h-9 items-center gap-2 rounded-full border border-border bg-card px-3.5 text-[12px] text-muted-foreground shadow-sm transition-colors hover:text-foreground"
      >
        <SlidersHorizontal size={15} strokeWidth={1.8} aria-hidden="true" />
        Eagle
      </button>
    );
  }

  return (
    <>
      <div className="fixed bottom-4 left-4 z-[70] flex max-h-[80dvh] w-[320px] max-w-[calc(100vw-2rem)] flex-col gap-3 overflow-y-auto rounded-2xl border border-border bg-card p-4 shadow-xl">
        <div className="flex items-center justify-between">
          <span className="text-[14px] text-foreground">Eagle studio</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close eagle studio"
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X size={16} strokeWidth={1.8} />
          </button>
        </div>

        <Toggle label="Show eagle" k="visible" />

        <Group title="Placement">
          <Slider label="Width" k="width" min={20} max={140} step={1} unit="vw" />
          <Slider label="Right" k="right" min={-80} max={80} step={1} unit="%" />
          <Slider label="Bottom" k="bottom" min={-80} max={80} step={1} unit="%" />
          <Slider label="Rotate" k="rotate" min={-180} max={180} step={1} unit="°" />
          <Toggle label="Flip horizontally" k="flip" />
        </Group>

        <Group title="Phone (under 768px)">
          <Slider label="Width" k="mWidth" min={40} max={220} step={1} unit="vw" />
          <Slider label="Right" k="mRight" min={-90} max={60} step={1} unit="%" />
          <Slider label="Bottom" k="mBottom" min={-90} max={60} step={1} unit="%" />
          <p className="-mt-1 text-[11px] text-muted-foreground">Narrow the browser window under 768px to see these apply. Rotate, flip, dots and fade are shared.</p>
        </Group>

        <Group title="Dots">
          <div className="flex gap-1.5">
            {SHAPES.map((sh) => (
              <button
                key={sh}
                type="button"
                onClick={() => set({ shape: sh })}
                className={cn(
                  "h-8 flex-1 rounded-lg border text-[12px] capitalize transition-colors",
                  cfg.shape === sh
                    ? "border-[var(--active-border)] bg-[var(--active-bg)] text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {sh}
              </button>
            ))}
          </div>
          <Slider label="Spacing" k="spacing" min={1} max={8} step={1} unit="×" />
          <p className="-mt-1 text-[11px] text-muted-foreground">1 keeps every dot. Higher values thin the eagle to fewer, more spaced dots.</p>
          <Slider label="Dot size" k="size" min={0.1} max={1.8} step={0.05} />
          {cfg.shape === "plus" && <Slider label="Thickness" k="thickness" min={0.1} max={0.6} step={0.02} />}
          <LookColor label="Colour" k="color" />
          <Slider label="Opacity · light" k="opacityLight" min={0.02} max={1} step={0.02} />
          <Slider label="Opacity · dark" k="opacityDark" min={0.02} max={1} step={0.02} />
          <Slider label="Blur" k="blur" min={0} max={12} step={0.5} unit="px" />
          <button
            type="button"
            onClick={() => setPainting(true)}
            className="flex h-9 items-center justify-center gap-2 rounded-lg border border-border text-[12.5px] text-foreground hover:bg-muted"
          >
            <Brush size={15} strokeWidth={1.8} aria-hidden="true" />
            Paint dots{cfg.edits.length ? ` · ${cfg.edits.length} edited` : ""}
          </button>
        </Group>

        <Group title="Fade">
          <Toggle label="Fade out" k="fade" />
          {cfg.fade && (
            <>
              <Slider label="Direction" k="fadeAngle" min={0} max={360} step={5} unit="°" />
              <Slider label="Solid until" k="fadeSolid" min={0} max={100} step={1} unit="%" />
              <Slider label="Gone by" k="fadeClear" min={0} max={100} step={1} unit="%" />
            </>
          )}
        </Group>

        <Group title="Sweeping lamp">
          <MatchOtherMode />
          <Toggle label="Lamp on" k="sweep" />
          {cfg.sweep && (
            <>
              <Slider label="Pass length" k="sweepSeconds" min={4} max={30} step={0.5} unit="s" />
              <Slider label="Randomness" k="sweepVariety" min={0} max={1} step={0.05} />
              <Slider label="Direction" k="sweepAngle" min={-90} max={90} step={1} unit="°" />
              <Slider label="Lamp size" k="lightSize" min={5} max={40} step={1} unit="%" />
              <Slider label="Stretch" k="lightStretch" min={1} max={4} step={0.1} />
              <Slider label="Brightness" k="brightness" min={0.4} max={2.5} step={0.05} />
              <Slider label="Sparkle" k="sparkle" min={0} max={1.5} step={0.05} />
              <Slider label="Dust" k="grain" min={0} max={1} step={0.05} />
              <Slider label="Bounce light" k="fill" min={0} max={1} step={0.05} />
            </>
          )}
        </Group>

        <Group title="Light colour">
          <Slider label="Dim outside" k="baseDim" min={0} max={1} step={0.02} />
          <LookColor label="Warm colour" k="litColor" />
          <LookColor label="Hot colour" k="hotColor" />
        </Group>

        <Group title="Motion">
          <Toggle label="Slow drift" k="drift" />
        </Group>

        <div className="flex gap-2 border-t border-border pt-3">
          <button
            type="button"
            onClick={copyJson}
            className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border text-[12px] text-foreground hover:bg-muted"
          >
            {copied ? <Check size={15} strokeWidth={1.8} /> : <Copy size={15} strokeWidth={1.8} />}
            {copied ? "Copied" : "Copy JSON"}
          </button>
          <button
            type="button"
            onClick={downloadSvg}
            className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border text-[12px] text-foreground hover:bg-muted"
          >
            <Download size={15} strokeWidth={1.8} />
            SVG
          </button>
          <button
            type="button"
            onClick={reset}
            aria-label="Reset to defaults"
            title={`Reset (${DEFAULT_EAGLE.shape} defaults)`}
            className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <RotateCcw size={15} strokeWidth={1.8} />
          </button>
        </div>
      </div>
      {painting && <DotEditor onClose={() => setPainting(false)} />}
    </>
  );
}
