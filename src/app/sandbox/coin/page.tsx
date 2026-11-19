"use client";

/**
 * Coin prototype (`/sandbox/coin`): the success-milestone coin, centred, with a tweak panel for how the pointer moves
 * it. Development only; the page is hidden when SHOW_DEMO_TOOLS is off.
 */

import { useState } from "react";
import { notFound } from "next/navigation";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Switch } from "@/components/ui/switch";
import { DEFAULT_TILT, SuccessCoin, type CoinTilt } from "@/components/success/SuccessCoin";
import { SHOW_DEMO_TOOLS } from "@/lib/demo-tools";

export default function CoinSandboxPage() {
  if (!SHOW_DEMO_TOOLS) notFound();
  return <CoinSandbox />;
}

function CoinSandbox() {
  const [tilt, setTilt] = useState<CoinTilt>(DEFAULT_TILT);

  function set<K extends keyof CoinTilt>(key: K, value: CoinTilt[K]) {
    setTilt((t) => ({ ...t, [key]: value }));
  }

  return (
    <div className="flex min-h-[70vh] flex-col items-center gap-10 p-5 text-center">
      <div className="flex flex-col items-center gap-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-h2">Success coin</h1>
          <p className="text-[14px] text-muted-foreground">
            A prototype for the success milestone. It turns once into place, then follows the pointer.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3">
          <SuccessCoin size={220} followPointer tilt={tilt} />
          <span className="text-[12px] text-muted-foreground">220 px</span>
        </div>
      </div>

      <section className="flex w-full max-w-md flex-col gap-6 text-left" aria-label="Pointer tweaks">
        <div className="flex flex-col gap-3">
          <span className="text-[13px] font-medium text-foreground">Follow the pointer across</span>
          <SegmentedControl<CoinTilt["scope"]>
            aria-label="Follow the pointer across"
            fullWidth
            value={tilt.scope}
            onChange={(v) => set("scope", v)}
            options={[
              { value: "page", label: "Whole page" },
              { value: "coin", label: "Coin only" },
            ]}
          />
        </div>

        <Range label="Max turn (degrees)" min={0} max={180} step={1} value={tilt.maxTurn} onChange={(v) => set("maxTurn", v)} />
        <Range label="Max lean (degrees)" min={0} max={30} step={1} value={tilt.maxLean} onChange={(v) => set("maxLean", v)} />
        <Range label="Reach (px from the coin)" min={50} max={1200} step={10} value={tilt.reach} onChange={(v) => set("reach", v)} />
        <Range label="Stiffness" min={40} max={400} step={5} value={tilt.stiffness} onChange={(v) => set("stiffness", v)} />
        <Range label="Damping" min={8} max={40} step={1} value={tilt.damping} onChange={(v) => set("damping", v)} />
        <Range label="Idle spin (degrees per second)" min={0} max={90} step={1} value={tilt.spinSpeed} onChange={(v) => set("spinSpeed", v)} />
        <Range label="Resume spin after (ms)" min={50} max={4000} step={50} value={tilt.resumeDelay} onChange={(v) => set("resumeDelay", v)} />
        <Range label="Inertia (seconds to settle)" min={0} max={6} step={0.1} value={tilt.inertia} onChange={(v) => set("inertia", v)} />
        <Range label="Flick strength" min={0} max={0.5} step={0.01} value={tilt.flick} onChange={(v) => set("flick", v)} />

        <div className="flex items-center justify-between gap-4">
          <span className="text-[13px] font-medium text-foreground">Invert the lean</span>
          <Switch
            aria-label="Invert the lean"
            checked={tilt.invertLean}
            onCheckedChange={(v) => set("invertLean", v)}
          />
        </div>

        <div>
          <button
            type="button"
            className="text-[13px] text-muted-foreground underline underline-offset-4 hover:text-foreground"
            onClick={() => setTilt(DEFAULT_TILT)}
          >
            Reset to defaults
          </button>
        </div>
      </section>
    </div>
  );
}

function Range({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-[13px] font-medium text-foreground">{label}</label>
        <span className="text-[13px] tabular-nums text-muted-foreground">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--foreground)]"
      />
    </div>
  );
}
