"use client";

/**
 * Dev tool: change the colour tokens live. A floating palette button (bottom right, left of the wave tuner) opens a
 * panel with every colour token the stylesheet defines, found automatically, grouped and searchable. Each has a swatch
 * and a hex field, and see-through ones get an opacity slider. Edits apply to the theme that is on screen, update the
 * whole app as you drag, and persist in this browser; switch theme to edit the other one. "Copy CSS" puts the changed
 * tokens on the clipboard in the shape of globals.css. Hidden in capture mode; only mounted in dev.
 */

import { useEffect, useMemo, useState } from "react";
import { Copy, Crosshair, Palette, RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCaptureMode } from "@/lib/capture-mode";
import {
  discoverTunerGroups,
  hydrateColorTuner,
  locateToken,
  readTunerDefaults,
  resetTunerAll,
  resetTunerColor,
  setTunerColor,
  setTunerOpen,
  tunerExport,
  useTunerOpen,
  useTunerOverrides,
  type TunerTheme,
} from "@/lib/color-tuner";

/** The theme on screen, read from the <html> class so it follows every switch. */
function useShownTheme(): TunerTheme {
  const [theme, setTheme] = useState<TunerTheme>("light");
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

export function ColorTuner() {
  // Development only: the layout does not mount it in production, and this is the second lock on the door.
  if (process.env.NODE_ENV === "production") return null;
  return <ColorTunerInner />;
}

function ColorTunerInner() {
  const open = useTunerOpen();
  const captureMode = useCaptureMode();

  // Put any saved changes on the page as soon as the app is up, even when the panel is closed.
  useEffect(() => {
    hydrateColorTuner();
  }, []);

  if (captureMode) return null;

  return (
    <div data-color-tuner className="fixed bottom-5 right-[4.75rem] z-50 flex flex-col items-end gap-3">
      {open && <TunerPanel />}
      <button
        type="button"
        onClick={() => setTunerOpen(!open)}
        aria-expanded={open}
        aria-label={open ? "Close the colour tuner" : "Open the colour tuner"}
        title="Colour tuner"
        className={cn(
          "flex size-12 cursor-pointer items-center justify-center rounded-full border shadow-lg transition-colors",
          open ? "border-transparent bg-primary text-primary-foreground hover:bg-primary-hover" : "border-border bg-card text-foreground hover:bg-muted",
        )}
      >
        <Palette size={18} strokeWidth={1.8} />
      </button>
    </div>
  );
}

function TunerPanel() {
  const theme = useShownTheme();
  const overrides = useTunerOverrides();
  const mine = overrides[theme];
  const [query, setQuery] = useState("");

  // Found in the stylesheet once; the values are read again whenever the theme changes.
  const groups = useMemo(() => (typeof document === "undefined" ? [] : discoverTunerGroups()), []);
  const defaults = useMemo(
    () => (typeof document === "undefined" ? {} : readTunerDefaults(groups.flatMap((g) => g.tokens.map((t) => t.id)))),
    [groups, theme], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const changedCount = Object.keys(overrides.light).length + Object.keys(overrides.dark).length;
  const q = query.trim().toLowerCase();
  const allIds = useMemo(() => groups.flatMap((g) => g.tokens.map((t) => t.id)), [groups]);
  const locate = (id: string) => {
    const hit = locateToken(id, allIds);
    if (!hit) toast.message(`Nothing on this page uses --${id}`, { description: "Try another page, or one with it open." });
  };

  const copy = async () => {
    const css = tunerExport();
    if (!css) {
      toast.message("Nothing changed yet");
      return;
    }
    try {
      await navigator.clipboard.writeText(css);
      toast.success("Colour CSS copied");
    } catch {
      toast.error("Couldn't copy: clipboard blocked");
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Colour tuner"
      className="flex max-h-[calc(100dvh-6.5rem)] w-[340px] flex-col gap-3 overflow-y-auto rounded-2xl border border-border bg-card p-4 shadow-lg"
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-[14px] text-foreground">Colour tuner</span>
        <span className="text-[12px] text-muted-foreground">
          Editing {theme} mode. Switch theme to edit the other.
        </span>
      </div>

      <label className="relative block">
        <Search size={14} strokeWidth={1.8} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Find among ${groups.reduce((n, g) => n + g.tokens.length, 0)} colours`}
          aria-label="Find a colour token"
          className="h-8 w-full rounded-lg border border-field-border bg-field pl-8 pr-2 text-[12.5px] text-foreground outline-none placeholder:text-muted-foreground focus:border-field-border-focus"
        />
      </label>

      {groups.map((group, gi) => {
        const tokens = q ? group.tokens.filter((t) => t.id.includes(q) || t.label.toLowerCase().includes(q)) : group.tokens;
        if (tokens.length === 0) return null;
        const changed = group.tokens.filter((t) => t.id in mine).length;
        return (
          <details key={group.label} open={q ? true : gi === 0} className="group/section">
            <summary className="flex cursor-pointer list-none items-center justify-between border-b border-border pb-1.5 text-[12px] text-muted-foreground [&::-webkit-details-marker]:hidden">
              <span>
                {group.label} <span className="tabular opacity-70">{group.tokens.length}</span>
              </span>
              {changed > 0 && <span className="text-foreground">{changed} changed</span>}
            </summary>
            <div className="flex flex-col gap-2 pt-2.5">
              {tokens.map((t) => (
                <ColorRow
                  key={t.id}
                  label={t.label}
                  token={t.id}
                  value={mine[t.id] ?? defaults[t.id] ?? "#000000"}
                  changed={t.id in mine}
                  onChange={(v) => setTunerColor(theme, t.id, v)}
                  onReset={() => resetTunerColor(theme, t.id)}
                  onLocate={() => locate(t.id)}
                />
              ))}
            </div>
          </details>
        );
      })}

      <div className="flex items-center gap-2 border-t border-border pt-3">
        <button
          type="button"
          onClick={resetTunerAll}
          disabled={changedCount === 0}
          className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[13px] text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RotateCcw size={15} strokeWidth={1.8} />
          Reset all
        </button>
        <button
          type="button"
          onClick={copy}
          className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-[13px] text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          <Copy size={15} strokeWidth={1.8} />
          Copy CSS
        </button>
      </div>
    </div>
  );
}

const alphaOf = (v: string) => (v.length === 9 ? parseInt(v.slice(7, 9), 16) / 255 : 1);

function ColorRow({
  label,
  token,
  value,
  changed,
  onChange,
  onReset,
  onLocate,
}: {
  label: string;
  token: string;
  /** #rrggbb, or #rrggbbaa for a see-through colour. */
  value: string;
  changed: boolean;
  onChange: (value: string) => void;
  onReset: () => void;
  /** Scroll to something on the page that uses this token. */
  onLocate: () => void;
}) {
  // The text field keeps what is being typed until it is a whole colour.
  const [draft, setDraft] = useState<string | null>(null);
  const base = value.slice(0, 7);
  const alpha = alphaOf(value);
  const seeThrough = alpha < 1 || value.length === 9;
  const withAlpha = (a: number) => (a >= 1 ? base : base + Math.round(a * 255).toString(16).padStart(2, "0"));

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onLocate}
          title="Show where this is used on the page"
          className="flex min-w-0 cursor-pointer flex-col rounded-md text-left outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          <span className={cn("truncate text-[12.5px]", changed ? "text-foreground" : "text-muted-foreground")}>{label}</span>
          <span className="flex items-center gap-1 truncate text-[11px] text-muted-foreground/70">
            <Crosshair size={10} strokeWidth={1.8} aria-hidden="true" />--{token}
          </span>
        </button>
        <span className="flex shrink-0 items-center gap-1.5">
          {changed && (
            <button
              type="button"
              onClick={onReset}
              aria-label={`Reset ${label}`}
              className="flex size-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <RotateCcw size={13} strokeWidth={1.8} aria-hidden="true" />
            </button>
          )}
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
            className={cn(
              "tabular h-7 rounded-md border border-field-border bg-field px-1.5 text-[12px] text-foreground outline-none focus:border-field-border-focus",
              seeThrough ? "w-[84px]" : "w-[76px]",
            )}
          />
          <input
            type="color"
            value={base}
            aria-label={`${label} colour`}
            onChange={(e) => {
              setDraft(null);
              onChange(e.target.value + value.slice(7));
            }}
            className="size-7 shrink-0 cursor-pointer rounded-lg border border-border bg-transparent p-0.5"
          />
        </span>
      </div>
      {seeThrough && (
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
          <span className="tabular w-8 text-right">{Math.round(alpha * 100)}%</span>
        </label>
      )}
    </div>
  );
}
