"use client";

import { createPortal } from "react-dom";
import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * Dev tool: fine-tune each dashboard backdrop (Settings → Appearance) per theme: the panel, its waves, glow and rim,
 * the text, Send Money and the glass buttons. A floating button beside the wave tuner opens it. Changes apply live and
 * persist in this browser; "Copy CSS" gives the rules to paste into globals.css. Hidden in capture mode.
 */

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Palette, RotateCcw } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { useCaptureMode } from "@/lib/capture-mode";
import { useDevToolsHidden } from "@/lib/dev-tools-visibility";
import { DASHBOARD_COLORS, useDashboardColor } from "@/lib/dashboard-color";
import {
  BACKDROP_TOKENS,
  overridesCss,
  readToken,
  useBackdropTuner,
  type BackdropTheme,
  type TunedColor,
} from "@/lib/backdrop-tuner";

const STYLE_ID = "nibs-backdrop-tuner";

/** Keeps the <style> element in step with the overrides, whether or not the panel is open. */
function useTunerStyle() {
  const overrides = useBackdropTuner((s) => s.overrides);
  useEffect(() => {
    let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = STYLE_ID;
      document.head.appendChild(el);
    }
    el.textContent = overridesCss(overrides);
  }, [overrides]);
}

export function BackdropTuner() {
  useTunerStyle();
  const open = useBackdropTuner((s) => s.open);
  const setOpen = useBackdropTuner((s) => s.setOpen);
  const captureMode = useCaptureMode();
  // True only in the browser, so the portal never runs during server rendering.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const devToolsHidden = useDevToolsHidden();
  if (captureMode || devToolsHidden) return null;

  if (!mounted) return null;
  // Portalled to <body>: a transformed ancestor on the dashboard would otherwise pin `fixed` to it, not the window.
  return createPortal(
    <div className="fixed bottom-4 left-16 z-[60] flex flex-col items-start gap-2">
      {open && <Panel />}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={open ? "Close the backdrop tuner" : "Open the backdrop tuner"}
        title="Backdrop tuner"
        className={cn(
          "flex size-10 cursor-pointer items-center justify-center rounded-full border shadow-lg transition-colors",
          open
            ? "border-transparent bg-primary text-primary-foreground hover:bg-primary-hover"
            : "border-border bg-card text-foreground hover:bg-muted",
        )}
      >
        <Palette size={18} />
      </button>
    </div>,
    document.body,
  );
}

function useTheme(): BackdropTheme {
  const [theme, setTheme] = useState<BackdropTheme>(() =>
    typeof document !== "undefined" && document.documentElement.classList.contains("dark") ? "dark" : "light",
  );
  useEffect(() => {
    const root = document.documentElement;
    const obs = new MutationObserver(() => setTheme(root.classList.contains("dark") ? "dark" : "light"));
    obs.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return theme;
}

function Panel() {
  const backdrop = useDashboardColor((s) => s.color);
  const setBackdrop = useDashboardColor((s) => s.setColor);
  const theme = useTheme();
  const overrides = useBackdropTuner((s) => s.overrides);
  const setToken = useBackdropTuner((s) => s.set);
  const reset = useBackdropTuner((s) => s.reset);
  const tuned = overrides[backdrop]?.[theme] ?? {};
  // Re-read the live values after the backdrop, theme or a reset changes what the tokens resolve to.
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = window.setTimeout(() => setTick((n) => n + 1), 30);
    return () => window.clearTimeout(t);
  }, [backdrop, theme, overrides]);

  const copy = async () => {
    const css = overridesCss(overrides);
    if (!css) {
      toast.message("Nothing tuned yet");
      return;
    }
    try {
      await navigator.clipboard.writeText(css);
      toast.success("Backdrop CSS copied");
    } catch {
      toast.error("Couldn't copy — clipboard blocked");
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Backdrop tuner"
      className="flex max-h-[calc(100dvh-6.5rem)] w-[320px] flex-col gap-4 overflow-y-auto rounded-2xl border border-border bg-card p-3 shadow-lg"
    >
      <div className="flex items-center justify-between">
        <span className="text-[14px] text-foreground">Backdrop tuner</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[12px] text-muted-foreground">{theme === "dark" ? "Dark" : "Light"}</span>
      </div>

      <div role="radiogroup" aria-label="Backdrop" className="flex flex-wrap gap-2">
        {DASHBOARD_COLORS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={backdrop === id}
            aria-label={label}
            title={label}
            onClick={() => setBackdrop(id)}
            className={cn(
              "flex size-8 cursor-pointer items-center justify-center rounded-full border-2 transition-colors",
              backdrop === id ? "border-foreground" : "border-transparent hover:border-border",
            )}
          >
            <span className="size-6 rounded-full" style={{ background: `var(--swatch-${id})` }} />
          </button>
        ))}
      </div>
      <p className="-mt-2 text-[12px] text-muted-foreground">Switch the app theme to tune the other mode.</p>

      {BACKDROP_TOKENS.map((group) => (
        <div key={group.group} className="flex flex-col gap-2">
          <span className="text-[12px] font-medium text-foreground">{group.group}</span>
          {group.tokens.map(({ id, label }) => {
            const value: TunedColor = tuned[id] ?? readToken(id);
            const changed = !!tuned[id];
            return (
              <div key={id} className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label={`${group.group}: ${label}`}
                  value={value.hex}
                  onChange={(e) => setToken(backdrop, theme, id, { ...value, hex: e.target.value })}
                  className="size-7 shrink-0 cursor-pointer rounded-sm border border-border bg-transparent p-0"
                />
                <span className={cn("min-w-0 flex-1 truncate text-[12px]", changed ? "text-foreground" : "text-muted-foreground")}>{label}</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={value.alpha}
                  aria-label={`${label} opacity`}
                  onChange={(e) => setToken(backdrop, theme, id, { ...value, alpha: Number(e.target.value) })}
                  className="h-1.5 w-20 cursor-pointer accent-[var(--primary)]"
                />
                <span className="tabular w-8 text-right text-[12px] text-muted-foreground">{value.alpha}%</span>
                <button
                  type="button"
                  onClick={() => reset(backdrop, theme, id)}
                  disabled={!changed}
                  aria-label={`Reset ${label}`}
                  className="flex size-6 cursor-pointer items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground disabled:invisible"
                >
                  <RotateCcw size={14} />
                </button>
              </div>
            );
          })}
        </div>
      ))}

      <div className="flex items-center gap-2 pt-2">
        <button
          type="button"
          onClick={() => reset(backdrop, theme)}
          className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border px-2 py-2 text-[13px] text-foreground transition-colors hover:bg-muted"
        >
          <RotateCcw size={14} /> Reset this one
        </button>
        <button
          type="button"
          onClick={copy}
          className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-2 py-2 text-[13px] text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          <Copy size={14} /> Copy CSS
        </button>
      </div>
    </div>
  );
}
