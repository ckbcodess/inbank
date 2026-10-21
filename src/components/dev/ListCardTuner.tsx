"use client";

/**
 * Dev tool: tune the gradient stroke of the list box live. A floating button (bottom right, left of the colour tuner)
 * opens a panel with the stroke's angle, middle stop, width and three stop colours. Every list box on the page follows
 * as you drag; colours are kept for the theme on screen, so switch theme to tune the other. Values persist in this
 * browser, and "Copy CSS" puts the changed tokens on the clipboard in the shape of globals.css. Hidden in capture mode;
 * only mounted in dev.
 */

import { useEffect, useMemo, useState } from "react";
import { Copy, RotateCcw, SquareDashed } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCaptureMode } from "@/lib/capture-mode";
import { useDevToolsHidden } from "@/lib/dev-tools-visibility";
import { parseColor } from "@/lib/color-tuner";
import { LIST_CARD_CLASS } from "@/components/ui/list-card";
import {
  COLOR_TOKENS,
  SHARED_TOKENS,
  hydrateListCardTuner,
  listCardTunerExport,
  readListCardDefaults,
  resetListCardTuner,
  setListCardColor,
  setListCardShared,
  setListCardTunerOpen,
  useListCardTuner,
  useListCardTunerOpen,
  type ListCardTheme,
} from "@/lib/list-card-tuner";

function useShownTheme(): ListCardTheme {
  const [theme, setTheme] = useState<ListCardTheme>("light");
  useEffect(() => {
    const root = document.documentElement;
    const read = () => setTheme(root.classList.contains("dark") ? "dark" : "light");
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return theme;
}

export function ListCardTuner() {
  // Development only: the layout does not mount it in production, and this is the second lock on the door.
  if (process.env.NODE_ENV === "production") return null;
  return <ListCardTunerInner />;
}

function ListCardTunerInner() {
  const open = useListCardTunerOpen();
  const captureMode = useCaptureMode();
  const devToolsHidden = useDevToolsHidden();

  // Put any saved changes on the page as soon as the app is up, even when the panel is closed.
  useEffect(() => {
    hydrateListCardTuner();
  }, []);

  if (captureMode || devToolsHidden) return null;

  return (
    <div className="fixed bottom-4 right-[8.5rem] z-50 flex flex-col items-end gap-2">
      {open && <Panel />}
      <button
        type="button"
        onClick={() => setListCardTunerOpen(!open)}
        aria-expanded={open}
        aria-label={open ? "Close the list box tuner" : "Open the list box tuner"}
        title="List box tuner"
        className={cn(
          "flex size-10 cursor-pointer items-center justify-center rounded-full border shadow-lg transition-colors",
          open ? "border-transparent bg-primary text-primary-foreground hover:bg-primary-hover" : "border-border bg-card text-foreground hover:bg-muted",
        )}
      >
        <SquareDashed size={18} strokeWidth={1.8} />
      </button>
    </div>
  );
}

const num = (v: string | undefined, fallback: number) => {
  const n = parseFloat(v ?? "");
  return Number.isFinite(n) ? n : fallback;
};

function Panel() {
  const theme = useShownTheme();
  const state = useListCardTuner();
  const mine = state[theme];
  const changed = Object.values(state).some((m) => Object.keys(m).length > 0);

  // Re-read when the theme flips, since the stylesheet has a value per theme.
  const defaults = useMemo(
    () => (typeof document === "undefined" ? {} : readListCardDefaults([...COLOR_TOKENS, ...SHARED_TOKENS])),
    [theme], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const angle = num(state.shared["edge-glass-angle"] ?? defaults["edge-glass-angle"], 180);
  const midAt = num(state.shared["edge-glass-mid-at"] ?? defaults["edge-glass-mid-at"], 50);
  const width = num(state.shared["edge-glass-width"] ?? defaults["edge-glass-width"], 1);

  const copy = async () => {
    const css = listCardTunerExport();
    if (!css) {
      toast.message("Nothing changed yet");
      return;
    }
    try {
      await navigator.clipboard.writeText(css);
      toast.success("List box CSS copied");
    } catch {
      toast.error("Couldn't copy: clipboard blocked");
    }
  };

  return (
    <div
      role="dialog"
      aria-label="List box tuner"
      className="flex max-h-[calc(100dvh-6.5rem)] w-[320px] flex-col gap-3 overflow-y-auto rounded-2xl border border-border bg-card p-3 shadow-lg"
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-[14px] text-foreground">List box tuner</span>
        <span className="text-[12px] text-muted-foreground">Colours are for {theme} mode. Switch theme to tune the other.</span>
      </div>

      <div className={cn(LIST_CARD_CLASS, "h-14 items-center justify-center text-[12px] text-muted-foreground")}>Preview</div>

      <Slider label="Angle" unit="°" min={0} max={360} step={1} value={angle} onChange={(v) => setListCardShared("edge-glass-angle", `${v}deg`)} />
      <Slider label="Middle stop" unit="%" min={0} max={100} step={1} value={midAt} onChange={(v) => setListCardShared("edge-glass-mid-at", `${v}%`)} />
      <Slider label="Width" unit="px" min={0.5} max={4} step={0.5} value={width} onChange={(v) => setListCardShared("edge-glass-width", `${v}px`)} />

      {COLOR_TOKENS.map((id) => (
        <StopRow
          key={`${theme}-${id}`}
          label={id.replace("edge-glass-", "")}
          value={mine[id] ?? parseColor(defaults[id] ?? "") ?? "#000000"}
          changed={id in mine}
          onChange={(v) => setListCardColor(theme, id, v)}
        />
      ))}

      <div className="flex items-center gap-2 border-t border-border pt-3">
        <button
          type="button"
          onClick={resetListCardTuner}
          disabled={!changed}
          className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border px-2 py-2 text-[13px] text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RotateCcw size={15} strokeWidth={1.8} />
          Reset
        </button>
        <button
          type="button"
          onClick={copy}
          className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-2 py-2 text-[13px] text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          <Copy size={15} strokeWidth={1.8} />
          Copy CSS
        </button>
      </div>
    </div>
  );
}

function Slider({
  label,
  unit,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
      <span className="w-[76px] shrink-0">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="h-1.5 flex-1 cursor-pointer accent-[var(--primary)]"
      />
      <span className="tabular w-10 text-right text-foreground">
        {value}
        {unit}
      </span>
    </label>
  );
}

const alphaOf = (v: string) => (v.length === 9 ? parseInt(v.slice(7, 9), 16) / 255 : 1);

function StopRow({ label, value, changed, onChange }: { label: string; value: string; changed: boolean; onChange: (v: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const base = value.slice(0, 7);
  const alpha = alphaOf(value);
  const withAlpha = (a: number) => (a >= 1 ? base : base + Math.round(a * 255).toString(16).padStart(2, "0"));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className={cn("text-[12.5px] capitalize", changed ? "text-foreground" : "text-muted-foreground")}>{label}</span>
        <span className="flex items-center gap-2">
          <input
            type="text"
            value={draft ?? value}
            spellCheck={false}
            aria-label={`${label} hex`}
            onChange={(e) => {
              const next = e.target.value.trim();
              setDraft(next);
              const hex = next.startsWith("#") ? next : `#${next}`;
              if (/^#([0-9a-f]{6}|[0-9a-f]{8})$/i.test(hex)) onChange(hex.toLowerCase());
            }}
            onBlur={() => setDraft(null)}
            className="tabular h-6 w-[84px] rounded-lg border border-field-border bg-field px-2 text-[12px] text-foreground outline-none focus:border-field-border-focus"
          />
          <input
            type="color"
            value={base}
            aria-label={`${label} colour`}
            onChange={(e) => {
              setDraft(null);
              onChange(e.target.value + value.slice(7));
            }}
            className="size-6 shrink-0 cursor-pointer rounded-lg border border-border bg-transparent p-0.5"
          />
        </span>
      </div>
      <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
        Opacity
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(alpha * 100)}
          onChange={(e) => onChange(withAlpha(Number(e.target.value) / 100))}
          aria-label={`${label} opacity`}
          className="h-1.5 flex-1 cursor-pointer accent-[var(--primary)]"
        />
        <span className="tabular w-7 text-right">{Math.round(alpha * 100)}%</span>
      </label>
    </div>
  );
}
