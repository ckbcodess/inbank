"use client";

/**
 * The sandbox's side panel: one row per non-colour design token, each a slider with a number field (or a text field
 * for a shadow), a reset for that row, and Copy CSS / Reset all at the foot. Edits apply to the sandbox page at once
 * (see `lib/sandbox-tweaks.ts`). Colours are the colour tuner's job, opened from the sandbox header.
 */

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Crosshair, RotateCcw } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { ColourRow, ShadowRow } from "@/components/dev/sandbox/ShadowEditor";
import { canLocate, clearHighlight, highlight, locateTweak } from "@/lib/sandbox-locate";
import {
  TWEAK_GROUPS,
  changedCount,
  readLiveCss,
  resetAllTweaks,
  resetTweak,
  setTweak,
  tweakValue,
  tweaksExport,
  useSandboxTweaks,
  type Tweak,
  type TweakTheme,
} from "@/lib/sandbox-tweaks";

function LocateButton({ tweak, active, onPick }: { tweak: Tweak; active: boolean; onPick: (id: string | null) => void }) {
  if (!canLocate(tweak)) return null;
  return (
    <button
      type="button"
      aria-label={`Show where ${tweak.label} is used`}
      aria-pressed={active}
      onClick={() => onPick(active ? null : tweak.id)}
      className={`flex size-5 cursor-pointer items-center justify-center rounded-sm transition-colors ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
    >
      <Crosshair size={12} aria-hidden="true" />
    </button>
  );
}

function NumberRow({ tweak, theme, active, onPick }: { tweak: Tweak; theme: TweakTheme; active: boolean; onPick: (id: string | null) => void }) {
  const current = useSandboxTweaks();
  const set = tweakValue(tweak, theme, current);
  const value = Number(set ?? tweak.initial);
  const changed = set !== undefined;
  const suffix = tweak.kind === "em" ? "em" : tweak.kind === "ms" ? "ms" : "px";
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] text-foreground">{tweak.label}</span>
        <span className="flex items-center gap-1">
          <input
            type="number"
            aria-label={`${tweak.label} value`}
            value={value}
            min={tweak.min}
            max={tweak.max}
            step={tweak.step}
            onChange={(e) => e.target.value !== "" && setTweak(tweak, theme, Number(e.target.value))}
            className="tabular h-6 w-16 rounded-sm bg-field px-1 text-right text-[12px] text-foreground outline-none field-surface border border-transparent"
          />
          <span className="w-5 text-[11px] text-muted-foreground">{suffix}</span>
          <LocateButton tweak={tweak} active={active} onPick={onPick} />
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
      <input
        type="range"
        aria-label={tweak.label}
        value={value}
        min={tweak.min}
        max={tweak.max}
        step={tweak.step}
        onChange={(e) => setTweak(tweak, theme, Number(e.target.value))}
        className="h-1 w-full cursor-pointer accent-primary"
      />
    </div>
  );
}

export function TweakPanel({ theme, tab }: { theme: TweakTheme; tab: string }) {
  const current = useSandboxTweaks();
  const [picked, setPicked] = useState<string | null>(null);
  const [hits, setHits] = useState(0);
  const pickedTweak = TWEAK_GROUPS.flatMap((g) => g.tweaks).find((t) => t.id === picked);
  const pickedValue = pickedTweak ? (tweakValue(pickedTweak, theme, current) ?? pickedTweak.initial) : undefined;

  // Outline where the picked token is used, and again whenever its value, the theme or the tab changes.
  useEffect(() => {
    const root = document.getElementById("sandbox-preview");
    if (!pickedTweak || !root || pickedValue === undefined) {
      clearHighlight();
      setHits(0);
      return;
    }
    const frame = requestAnimationFrame(() => {
      const found = locateTweak(pickedTweak, pickedValue === "" ? readLiveCss(pickedTweak) : pickedValue, root);
      setHits(found.length);
      highlight(found);
    });
    return () => cancelAnimationFrame(frame);
  }, [pickedTweak, pickedValue, theme, tab]);
  useEffect(() => clearHighlight, []);
  const count = changedCount(current);
  const [open, setOpen] = useState<string | null>("Radius");

  function copy() {
    const css = tweaksExport();
    if (!css) {
      toast.info("Nothing changed yet", { id: "sandbox-copy" });
      return;
    }
    void navigator.clipboard.writeText(css).then(
      () => toast.success("CSS copied", { id: "sandbox-copy" }),
      () => toast.error("Could not copy", { id: "sandbox-copy" }),
    );
  }

  return (
    <aside aria-label="Design tweaks" className="flex flex-col gap-4 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-48px)] lg:overflow-y-auto lg:pr-1">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[16px] font-medium">Tweaks</h2>
        <span className="tabular text-[12px] text-muted-foreground">{count === 0 ? "Nothing changed" : `${count} changed`}</span>
      </div>
      {pickedTweak && (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-muted px-3 py-2 text-[12px]">
          <span>{hits === 0 ? `${pickedTweak.label} is not used on this tab.` : `${pickedTweak.label}: ${hits} on this tab.`}</span>
          <button type="button" onClick={() => setPicked(null)} className="cursor-pointer text-foreground underline underline-offset-2">
            Clear
          </button>
        </div>
      )}
      <div className="flex flex-col">
        {TWEAK_GROUPS.map((group) => {
          const isOpen = open === group.label;
          return (
            <section key={group.label} className="border-t border-border/60 py-3">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : group.label)}
                className="flex w-full cursor-pointer items-center justify-between text-left text-[14px] font-medium text-foreground"
              >
                {group.label}
                <span className="text-[12px] font-normal text-muted-foreground">{isOpen ? "Hide" : "Show"}</span>
              </button>
              {isOpen && (
                <div className="mt-3 flex flex-col gap-3">
                  {group.tweaks.map((tweak) =>
                    tweak.kind === "css" ? (
                      tweak.id.startsWith("shadow-") ? (
                        <ShadowRow key={tweak.id} tweak={tweak} theme={theme} locate={<LocateButton tweak={tweak} active={picked === tweak.id} onPick={setPicked} />} />
                      ) : (
                        <ColourRow key={tweak.id} tweak={tweak} theme={theme} locate={<LocateButton tweak={tweak} active={picked === tweak.id} onPick={setPicked} />} />
                      )
                    ) : (
                      <NumberRow key={tweak.id} tweak={tweak} theme={theme} active={picked === tweak.id} onPick={setPicked} />
                    ),
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>
      <div className="flex gap-2">
        <Button type="button" size="md" className="flex-1" onClick={copy}>
          <Copy aria-hidden="true" />
          Copy CSS
        </Button>
        <Button type="button" size="md" variant="outline" disabled={count === 0} onClick={resetAllTweaks}>
          Reset all
        </Button>
      </div>
    </aside>
  );
}
