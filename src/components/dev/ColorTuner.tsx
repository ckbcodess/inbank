"use client";

/**
 * Dev tool: change the colour tokens live. A floating palette button (bottom right, left of the wave tuner) opens a
 * panel with every main token as a swatch and a hex field. Edits apply to the theme that is on screen, update the
 * whole app as you drag, and persist in this browser; switch theme to edit the other one. "Copy CSS" puts the
 * changed tokens on the clipboard in the shape of globals.css. Hidden in capture mode; only mounted in dev.
 */

import { useEffect, useMemo, useState } from "react";
import { Copy, Palette, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCaptureMode } from "@/lib/capture-mode";
import {
  TUNER_GROUPS,
  hydrateColorTuner,
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
  const open = useTunerOpen();
  const captureMode = useCaptureMode();

  // Put any saved changes on the page as soon as the app is up, even when the panel is closed.
  useEffect(() => {
    hydrateColorTuner();
  }, []);

  if (captureMode) return null;

  return (
    <div className="fixed bottom-5 right-[4.75rem] z-50 flex flex-col items-end gap-3">
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
  // The stylesheet's own values for this theme, read again when the theme changes.
  const defaults = useMemo(() => (typeof document === "undefined" ? {} : readTunerDefaults()), [theme]); // eslint-disable-line react-hooks/exhaustive-deps
  const changedCount = Object.keys(overrides.light).length + Object.keys(overrides.dark).length;

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
      className="flex max-h-[calc(100dvh-6.5rem)] w-[320px] flex-col gap-4 overflow-y-auto rounded-2xl border border-border bg-card p-4 shadow-lg"
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-[14px] text-foreground">Colour tuner</span>
        <span className="text-[12px] text-muted-foreground">
          Editing {theme} mode. Switch theme to edit the other.
        </span>
      </div>

      {TUNER_GROUPS.map((group) => (
        <div key={group.label} className="flex flex-col gap-2">
          <span className="border-b border-border pb-1.5 text-[12px] text-muted-foreground">{group.label}</span>
          {group.tokens.map((t) => {
            const changed = t.id in mine;
            const value = mine[t.id] ?? defaults[t.id] ?? "#000000";
            return (
              <ColorRow
                key={t.id}
                label={t.label}
                token={t.id}
                value={value}
                changed={changed}
                onChange={(hex) => setTunerColor(theme, t.id, hex)}
                onReset={() => resetTunerColor(theme, t.id)}
              />
            );
          })}
        </div>
      ))}

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

function ColorRow({
  label,
  token,
  value,
  changed,
  onChange,
  onReset,
}: {
  label: string;
  token: string;
  value: string;
  changed: boolean;
  onChange: (hex: string) => void;
  onReset: () => void;
}) {
  // The text field keeps what is being typed until it is a whole colour.
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex min-w-0 flex-col">
        <span className={cn("truncate text-[12.5px]", changed ? "text-foreground" : "text-muted-foreground")}>{label}</span>
        <span className="truncate text-[11px] text-muted-foreground/70">--{token}</span>
      </span>
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
            if (/^#[0-9a-f]{6}$/i.test(hex)) onChange(hex.toLowerCase());
          }}
          onBlur={() => setDraft(null)}
          className="tabular h-7 w-[76px] rounded-md border border-border bg-transparent px-1.5 text-[12px] text-foreground outline-none focus:border-foreground"
        />
        <input
          type="color"
          value={value}
          aria-label={`${label} colour`}
          onChange={(e) => {
            setDraft(null);
            onChange(e.target.value);
          }}
          className="size-7 shrink-0 cursor-pointer rounded-lg border border-border bg-transparent p-0.5"
        />
      </span>
    </div>
  );
}
