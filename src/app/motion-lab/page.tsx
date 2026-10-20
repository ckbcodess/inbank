"use client";

import React, { useState, useEffect, useRef, useId } from "react";
import {
  Play,
  RotateCcw,
  Copy,
  Check,
  Sliders,
  Sparkles,
  Zap,
  MousePointer,
  Layers,
  ArrowRight,
  Maximize2,
  Bell,
  Code,
  Download,
  Upload,
  RefreshCw,
  Eye,
  Info,
} from "lucide-react";

// Types
export interface CubicBezierCurve {
  p1x: number;
  p1y: number;
  p2x: number;
  p2y: number;
}

export interface DurationsConfig {
  press: number; // in seconds
  hover: number;
  reveal: number;
  move: number;
  entrance: number;
  modal: number;
  toast: number;
}

export interface EasesConfig {
  standard: [number, number, number, number];
  inOut: [number, number, number, number];
  settle: [number, number, number, number];
  snappy: [number, number, number, number];
  bounce: [number, number, number, number];
}

export interface SpringConfig {
  stiffness: number;
  damping: number;
  mass: number;
}

const DEFAULT_DURATIONS: DurationsConfig = {
  press: 0.4,
  hover: 0.2,
  reveal: 0.4,
  move: 0.4,
  entrance: 0.2,
  modal: 0.2,
  toast: 0.2,
};

const DEFAULT_EASES: EasesConfig = {
  settle: [0.2, 0.8, 0.2, 1], // NIBS main design token
  standard: [0, 0, 0.2, 1],
  inOut: [0.4, 0, 0.2, 1],
  snappy: [0.16, 1, 0.3, 1],
  bounce: [0.34, 1.56, 0.64, 1],
};

const DEFAULT_SPRINGS: Record<string, SpringConfig> = {
  settle: { stiffness: 280, damping: 30, mass: 1 },
  snappy: { stiffness: 400, damping: 32, mass: 1 },
  gentle: { stiffness: 180, damping: 24, mass: 1 },
};

export default function MotionLabPage() {
  // Active selected ease token being edited
  const [selectedEaseKey, setSelectedEaseKey] = useState<keyof EasesConfig>("settle");
  const [eases, setEases] = useState<EasesConfig>(DEFAULT_EASES);
  const [durations, setDurations] = useState<DurationsConfig>(DEFAULT_DURATIONS);
  const [springs, setSprings] = useState<Record<string, SpringConfig>>(DEFAULT_SPRINGS);

  // Playground state
  const [activeDurationKey, setActiveDurationKey] = useState<keyof DurationsConfig>("reveal");
  const [liveTestKey, setLiveTestKey] = useState<number>(0);
  const [motionType, setMotionType] = useState<"css-cubic" | "spring">("css-cubic");
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Interactive component simulation states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isToastOpen, setIsToastOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [accordionOpen, setAccordionOpen] = useState(false);
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  // Sync with runtime CSS variables so test widgets in the whole page react live!
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--dur-press", `${Math.round(durations.press * 1000)}ms`);
    root.style.setProperty("--dur-hover", `${Math.round(durations.hover * 1000)}ms`);
    root.style.setProperty("--dur-reveal", `${Math.round(durations.reveal * 1000)}ms`);
    root.style.setProperty("--dur-move", `${Math.round(durations.move * 1000)}ms`);
    root.style.setProperty("--dur-entrance", `${Math.round(durations.entrance * 1000)}ms`);
    
    const settleEase = eases.settle.join(", ");
    root.style.setProperty("--ease-settle", `cubic-bezier(${settleEase})`);
    
    const standardEase = eases.standard.join(", ");
    root.style.setProperty("--ease-standard", `cubic-bezier(${standardEase})`);

    const inOutEase = eases.inOut.join(", ");
    root.style.setProperty("--ease-in-out", `cubic-bezier(${inOutEase})`);
  }, [durations, eases]);

  const currentEase = eases[selectedEaseKey];
  const currentEaseCss = `cubic-bezier(${currentEase[0]}, ${currentEase[1]}, ${currentEase[2]}, ${currentEase[3]})`;
  const activeDurationSec = durations[activeDurationKey];

  const handleEaseCoordChange = (index: number, val: number) => {
    setEases((prev) => {
      const updated = [...prev[selectedEaseKey]] as [number, number, number, number];
      updated[index] = Number(val.toFixed(3));
      return { ...prev, [selectedEaseKey]: updated };
    });
  };

  const handleDurationChange = (key: keyof DurationsConfig, val: number) => {
    setDurations((prev) => ({ ...prev, [key]: Number(val.toFixed(3)) }));
  };

  const triggerReplay = () => {
    setLiveTestKey((k) => k + 1);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const resetDefaults = () => {
    setEases(DEFAULT_EASES);
    setDurations(DEFAULT_DURATIONS);
    setSprings(DEFAULT_SPRINGS);
  };

  // Generate tokens code
  const motionTsExport = `/**
 * Motion tokens for Framer Motion and JS runtime.
 * Generated from NIBS Motion Lab (/motion-lab)
 */

/** Seconds, for transition.duration */
export const DURATION = {
  press: ${durations.press},
  hover: ${durations.hover},
  reveal: ${durations.reveal},
  move: ${durations.move},
  entrance: ${durations.entrance},
  modal: ${durations.modal},
  toast: ${durations.toast},
} as const;

/** Cubic-bezier curves, for transition.ease */
export const EASE = {
  settle: [${eases.settle.join(", ")}],
  standard: [${eases.standard.join(", ")}],
  inOut: [${eases.inOut.join(", ")}],
  snappy: [${eases.snappy.join(", ")}],
  bounce: [${eases.bounce.join(", ")}],
} as const;

/** Spring physics presets */
export const SPRING = {
  settle: { type: "spring", stiffness: ${springs.settle.stiffness}, damping: ${springs.settle.damping}, mass: ${springs.settle.mass} },
  snappy: { type: "spring", stiffness: ${springs.snappy.stiffness}, damping: ${springs.snappy.damping}, mass: ${springs.snappy.mass} },
  gentle: { type: "spring", stiffness: ${springs.gentle.stiffness}, damping: ${springs.gentle.damping}, mass: ${springs.gentle.mass} },
} as const;
`;

  const globalsCssTokens = `/* Paste into src/app/globals.css @theme and :root */
@theme {
  --ease-settle: cubic-bezier(${eases.settle.join(", ")});
  --ease-standard: cubic-bezier(${eases.standard.join(", ")});
  --ease-in-out: cubic-bezier(${eases.inOut.join(", ")});
  --ease-snappy: cubic-bezier(${eases.snappy.join(", ")});
}

:root {
  --dur-press: ${Math.round(durations.press * 1000)}ms;
  --dur-hover: ${Math.round(durations.hover * 1000)}ms;
  --dur-reveal: ${Math.round(durations.reveal * 1000)}ms;
  --dur-move: ${Math.round(durations.move * 1000)}ms;
  --dur-entrance: ${Math.round(durations.entrance * 1000)}ms;
  --dur-modal: ${Math.round(durations.modal * 1000)}ms;
  --dur-toast: ${Math.round(durations.toast * 1000)}ms;
}
`;

  return (
    <div className="min-h-screen bg-[#090b10] text-slate-100 p-3 md:p-6 font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Header */}
      <header className="max-w-7xl mx-auto mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                NIBS Motion Lab & Tokenizer
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Live Runtime Sync
                </span>
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Calibrate easing curves, test every animation timing interactively, and export verified tokens for the banking UI.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={resetDefaults}
            className="flex items-center gap-2 px-2 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            <RotateCcw className="w-3 h-3" />
            Reset Defaults
          </button>
          <button
            onClick={triggerReplay}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20 transition active:scale-95"
          >
            <Play className="w-3 h-3 fill-current" />
            Play All Previews
          </button>
        </div>
      </header>

      {/* Main Grid: Left Control Panel, Right Live Inspection View */}
      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ========================================================= */}
        {/* LEFT COLUMN: Easing Curve Editor & All Timing Controls    */}
        {/* ========================================================= */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Curve Editor Card */}
          <section className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                  Curve & Easing Presets
                </h2>
              </div>
              <span className="text-xs font-mono text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded-sm border border-amber-500/20">
                {currentEaseCss}
              </span>
            </div>

            {/* Ease Token Picker */}
            <div className="grid grid-cols-5 gap-2 p-1 bg-slate-950 rounded-xl mb-4 border border-slate-800/80">
              {(Object.keys(eases) as (keyof EasesConfig)[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setSelectedEaseKey(key)}
                  className={`py-2 px-2 rounded-lg text-xs font-medium capitalize transition-all ${
                    selectedEaseKey === key
                      ? "bg-amber-500 text-slate-950 font-bold shadow-sm"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>

            {/* Bezier Canvas Graph */}
            <div className="relative mb-4 bg-[#05070a] rounded-xl border border-slate-800/80 p-3">
              <BezierCurveCanvas
                points={currentEase}
                onChange={(newPoints) => {
                  setEases((prev) => ({ ...prev, [selectedEaseKey]: newPoints }));
                }}
              />
              <div className="mt-2 text-[11px] text-slate-400 text-center flex items-center justify-center gap-2">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block"></span> Handle 1 (p1x, p1y)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span> Handle 2 (p2x, p2y)
                </span>
              </div>
            </div>

            {/* 4 Coordinate Sliders */}
            <div className="grid grid-cols-2 gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-cyan-400 font-mono">P1.X</span>
                  <span className="text-slate-400 font-mono">{currentEase[0]}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={currentEase[0]}
                  onChange={(e) => handleEaseCoordChange(0, parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-cyan-400 font-mono">P1.Y</span>
                  <span className="text-slate-400 font-mono">{currentEase[1]}</span>
                </div>
                <input
                  type="range"
                  min="-0.5"
                  max="2"
                  step="0.01"
                  value={currentEase[1]}
                  onChange={(e) => handleEaseCoordChange(1, parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-amber-400 font-mono">P2.X</span>
                  <span className="text-slate-400 font-mono">{currentEase[2]}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={currentEase[2]}
                  onChange={(e) => handleEaseCoordChange(2, parseFloat(e.target.value))}
                  className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-amber-400 font-mono">P2.Y</span>
                  <span className="text-slate-400 font-mono">{currentEase[3]}</span>
                </div>
                <input
                  type="range"
                  min="-0.5"
                  max="2"
                  step="0.01"
                  value={currentEase[3]}
                  onChange={(e) => handleEaseCoordChange(3, parseFloat(e.target.value))}
                  className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </section>

          {/* All Animation Durations Card */}
          <section className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                  Every Animation Timing (Durations)
                </h2>
              </div>
              <span className="text-xs text-slate-400">Total: 7 tokens</span>
            </div>

            <div className="space-y-3">
              {(Object.keys(durations) as (keyof DurationsConfig)[]).map((key) => {
                const val = durations[key];
                const isActive = activeDurationKey === key;
                return (
                  <div
                    key={key}
                    onClick={() => setActiveDurationKey(key)}
                    className={`p-2 rounded-xl border transition-all cursor-pointer ${
                      isActive
                        ? "bg-slate-800/80 border-amber-500/50 shadow-md ring-1 ring-amber-500/30"
                        : "bg-slate-950/60 border-slate-800/80 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold capitalize text-slate-200">
                          {key}
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          {key === "press" && "(Tactile touch down)"}
                          {key === "hover" && "(Color & micro feedback)"}
                          {key === "reveal" && "(Dropdowns & popovers)"}
                          {key === "move" && "(Drawers & sliding panels)"}
                          {key === "entrance" && "(Cards & dashboard cascade)"}
                          {key === "modal" && "(Dialog zoom & backdrops)"}
                          {key === "toast" && "(Slide-up alert toasts)"}
                        </span>
                      </div>
                      <span className="font-mono text-xs font-bold text-amber-400">
                        {Math.round(val * 1000)}ms ({val}s)
                      </span>
                    </div>

                    <input
                      type="range"
                      min="0.05"
                      max="1.5"
                      step="0.025"
                      value={val}
                      onChange={(e) => handleDurationChange(key, parseFloat(e.target.value))}
                      className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>
                );
              })}
            </div>
          </section>

          {/* Spring Physics Parameters (Optional tuning) */}
          <section className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                  Framer Spring Physics
                </h2>
              </div>
              <span className="text-xs text-slate-400">Physics Tokens</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <span className="text-[11px] text-slate-400 block mb-1">Stiffness</span>
                <input
                  type="number"
                  value={springs.settle.stiffness}
                  onChange={(e) =>
                    setSprings((s) => ({
                      ...s,
                      settle: { ...s.settle, stiffness: Number(e.target.value) },
                    }))
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-sm px-2 py-1 text-xs font-mono text-cyan-300"
                />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block mb-1">Damping</span>
                <input
                  type="number"
                  value={springs.settle.damping}
                  onChange={(e) =>
                    setSprings((s) => ({
                      ...s,
                      settle: { ...s.settle, damping: Number(e.target.value) },
                    }))
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-sm px-2 py-1 text-xs font-mono text-cyan-300"
                />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block mb-1">Mass</span>
                <input
                  type="number"
                  step="0.1"
                  value={springs.settle.mass}
                  onChange={(e) =>
                    setSprings((s) => ({
                      ...s,
                      settle: { ...s.settle, mass: Number(e.target.value) },
                    }))
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-sm px-2 py-1 text-xs font-mono text-cyan-300"
                />
              </div>
            </div>
          </section>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: Interactive Playgrounds & Visual Verifiers */}
        {/* ========================================================= */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Active Preview Hero Banner */}
          <section className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-5 pb-3 border-b border-slate-800/80">
              <div>
                <div className="text-xs uppercase tracking-wider text-slate-400 mb-0.5">
                  Live Timing & Curve Tester
                </div>
                <div className="text-lg font-bold text-white flex items-center gap-2">
                  <span>Curve: <span className="text-amber-400 capitalize">{selectedEaseKey}</span></span>
                  <span className="text-slate-600">/</span>
                  <span>Duration: <span className="text-emerald-400 capitalize">{activeDurationKey}</span> ({Math.round(activeDurationSec * 1000)}ms)</span>
                </div>
              </div>

              <button
                onClick={triggerReplay}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition active:scale-95 border border-slate-700"
              >
                <RefreshCw className="w-3 h-3" />
                Re-trigger
              </button>
            </div>

            {/* Visual Runway Runners */}
            <div className="space-y-3 mb-5">
              {/* Linear comparison runner */}
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Linear (Standard robotic benchmark)</span>
                  <span className="font-mono text-[10px]">linear</span>
                </div>
                <div className="h-9 bg-slate-950/80 rounded-xl border border-slate-800 relative overflow-hidden flex items-center px-1">
                  <div
                    key={`linear-${liveTestKey}`}
                    className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center text-xs font-bold shadow"
                    style={{
                      animation: `runway ${activeDurationSec}s linear infinite alternate`,
                    }}
                  >
                    1
                  </div>
                </div>
              </div>

              {/* Your Tuned Easing runner */}
              <div>
                <div className="flex justify-between text-xs text-amber-300 font-medium mb-1">
                  <span>Your Tuned Easing ({selectedEaseKey})</span>
                  <span className="font-mono text-[10px] text-amber-400">{currentEaseCss}</span>
                </div>
                <div className="h-10 bg-slate-950 rounded-xl border border-amber-500/30 relative overflow-hidden flex items-center px-1 shadow-inner">
                  <div
                    key={`tuned-${liveTestKey}`}
                    className="w-9 h-9 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex items-center justify-center font-bold text-sm shadow-lg shadow-amber-500/30"
                    style={{
                      animation: `runway ${activeDurationSec}s ${currentEaseCss} infinite alternate`,
                    }}
                  >
                    ✦
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Micro Simulation Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2">
              {/* Card 1: Scale In */}
              <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800/80 text-center flex flex-col items-center justify-center h-24">
                <span className="text-[11px] text-slate-400 mb-2">Scale & Settle</span>
                <div
                  key={`scale-${liveTestKey}`}
                  className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-300 font-bold"
                  style={{
                    animation: `pulse-scale ${activeDurationSec}s ${currentEaseCss} infinite alternate`,
                  }}
                >
                  <Eye className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Card 2: Fade Slide */}
              <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800/80 text-center flex flex-col items-center justify-center h-24">
                <span className="text-[11px] text-slate-400 mb-2">Fade & Translate</span>
                <div
                  key={`slide-${liveTestKey}`}
                  className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-400 flex items-center justify-center text-purple-300 font-bold"
                  style={{
                    animation: `slide-fade ${activeDurationSec}s ${currentEaseCss} infinite alternate`,
                  }}
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Card 3: Button Press Effect */}
              <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800/80 text-center flex flex-col items-center justify-center h-24">
                <span className="text-[11px] text-slate-400 mb-2">Tactile Press</span>
                <button
                  className="px-2 py-2 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs shadow hover:bg-amber-400 active:scale-90 transition-transform"
                  style={{
                    transitionDuration: `${durations.press}s`,
                    transitionTimingFunction: currentEaseCss,
                  }}
                >
                  Press Me
                </button>
              </div>

              {/* Card 4: Hover Elevation */}
              <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800/80 text-center flex flex-col items-center justify-center h-24">
                <span className="text-[11px] text-slate-400 mb-2">Card Hover</span>
                <div
                  className="w-14 h-7 rounded-sm bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] text-slate-300 hover:-translate-y-1 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/10 cursor-pointer"
                  style={{
                    transitionDuration: `${durations.hover}s`,
                    transitionTimingFunction: currentEaseCss,
                  }}
                >
                  Hover
                </div>
              </div>
            </div>
          </section>

          {/* Real-World NIBS Banking Component Simulators */}
          <section className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                  Real Banking Component Playground
                </h2>
              </div>
              <span className="text-xs text-slate-400">Click to preview in action</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Simulation 1: Modal Dialog */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-200">Confirmation Modal</span>
                    <span className="text-[10px] text-slate-400">Uses dur.modal ({Math.round(durations.modal * 1000)}ms)</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">
                    Tests backdrop fade + modal zoom settling curve.
                  </p>
                </div>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-xs font-medium rounded-lg text-slate-200 border border-slate-700 transition"
                >
                  Trigger Modal
                </button>
              </div>

              {/* Simulation 2: Toast Notification */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-200">Payment Toast Alert</span>
                    <span className="text-[10px] text-slate-400">Uses dur.toast ({Math.round(durations.toast * 1000)}ms)</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">
                    Tests bottom slide-up bounce and settlement.
                  </p>
                </div>
                <button
                  onClick={() => setIsToastOpen(!isToastOpen)}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-xs font-medium rounded-lg text-slate-200 border border-slate-700 transition"
                >
                  {isToastOpen ? "Dismiss Toast" : "Trigger Toast Alert"}
                </button>
              </div>

              {/* Simulation 3: Side Drawer / Sheet */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-200">Slide Sheet / Drawer</span>
                    <span className="text-[10px] text-slate-400">Uses dur.move ({Math.round(durations.move * 1000)}ms)</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">
                    Tests large sheet translation with smooth soft landing.
                  </p>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-xs font-medium rounded-lg text-slate-200 border border-slate-700 transition"
                >
                  {isDrawerOpen ? "Close Drawer" : "Open Drawer (Slide)"}
                </button>
              </div>

              {/* Simulation 4: Expanding Accordion / Reveal */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-200">Account Details Accordion</span>
                    <span className="text-[10px] text-slate-400">Uses dur.reveal ({Math.round(durations.reveal * 1000)}ms)</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">
                    Tests height expansion without jitter or sudden stops.
                  </p>
                </div>
                <button
                  onClick={() => setAccordionOpen(!accordionOpen)}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-xs font-medium rounded-lg text-slate-200 border border-slate-700 transition"
                >
                  {accordionOpen ? "Collapse Accordion" : "Expand Accordion"}
                </button>
              </div>
            </div>

            {/* Accordion Expand Area */}
            {accordionOpen && (
              <div
                className="mt-3 p-3 rounded-xl bg-slate-950 border border-amber-500/30 overflow-hidden"
                style={{
                  animation: `accordion-down ${durations.reveal}s ${currentEaseCss}`,
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-amber-400">Ghana Commercial Bank (GCB)</span>
                  <span className="text-xs font-mono text-emerald-400">GHS 24,850.00</span>
                </div>
                <p className="text-xs text-slate-400">
                  Account No: 1041129384910 • Swift: GCBGHAC • Branch: High Street Accra.
                </p>
              </div>
            )}
          </section>

          {/* Export & Tokenize Section */}
          <section className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Code className="w-3.5 h-3.5 text-amber-400" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                  Export & Tokenize Across App
                </h2>
              </div>
              <span className="text-xs text-slate-400">Click Copy to sync directly</span>
            </div>

            <div className="space-y-3">
              {/* Token Block 1: TypeScript (motion.ts) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-slate-300">src/lib/motion.ts</span>
                  <button
                    onClick={() => copyToClipboard(motionTsExport, "motion-ts")}
                    className="flex items-center gap-2 text-xs text-amber-400 hover:text-amber-300 font-medium"
                  >
                    {copiedSection === "motion-ts" ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy TypeScript Tokens</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-2 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-42 scrollbar-thin">
                  {motionTsExport}
                </pre>
              </div>

              {/* Token Block 2: CSS Theme (globals.css) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-slate-300">src/app/globals.css</span>
                  <button
                    onClick={() => copyToClipboard(globalsCssTokens, "globals-css")}
                    className="flex items-center gap-2 text-xs text-amber-400 hover:text-amber-300 font-medium"
                  >
                    {copiedSection === "globals-css" ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy CSS Tokens</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-2 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-31 scrollbar-thin">
                  {globalsCssTokens}
                </pre>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Floating Modal Preview Simulator */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm"
          style={{
            animation: `backdrop-fade ${durations.modal}s ${currentEaseCss}`,
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl relative"
            style={{
              animation: `modal-pop ${durations.modal}s ${currentEaseCss}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Authorize Transfer of GHS 1,500?</h3>
            <p className="text-sm text-slate-400 mb-5">
              This modal tested the configured <code className="text-amber-300">modal ({Math.round(durations.modal * 1000)}ms)</code> duration and <code className="text-amber-300">{selectedEaseKey}</code> easing curve.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-medium text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-sm font-semibold text-slate-950"
              >
                Confirm & Pay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification Preview Simulator */}
      {isToastOpen && (
        <div
          className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-slate-900 border border-emerald-500/30 p-3 rounded-xl shadow-2xl flex items-center justify-between"
          style={{
            animation: `toast-slide ${durations.toast}s ${currentEaseCss}`,
          }}
        >
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
              ✓
            </span>
            <div>
              <p className="text-xs font-bold text-white">Transfer Successful</p>
              <p className="text-[11px] text-slate-400">GHS 500.00 sent to Kwame Mensah</p>
            </div>
          </div>
          <button
            onClick={() => setIsToastOpen(false)}
            className="text-slate-400 hover:text-white text-xs px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Floating Side Drawer Preview Simulator */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end"
          onClick={() => setIsDrawerOpen(false)}
        >
          <div
            className="w-full max-w-sm h-full bg-slate-900 border-l border-slate-800 p-5 flex flex-col justify-between shadow-2xl"
            style={{
              animation: `drawer-slide ${durations.move}s ${currentEaseCss}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between mb-5 pb-2 border-b border-slate-800">
                <h3 className="text-base font-bold text-white">Quick Beneficiaries</h3>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="text-slate-400 hover:text-white text-sm"
                >
                  ✕
                </button>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                Animated using <code className="text-amber-300">move ({Math.round(durations.move * 1000)}ms)</code>. Notice how smoothly it decelerates as it parks into view.
              </p>
              <div className="space-y-2">
                {["Kofi Boateng", "Ama Serwaa", "MTN Momo Wallet", "Vodafone Cash"].map((name) => (
                  <div key={name} className="p-2 bg-slate-950 rounded-lg border border-slate-800/80 text-xs font-medium text-slate-200">
                    {name}
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={() => setIsDrawerOpen(false)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg text-slate-300"
            >
              Close Drawer
            </button>
          </div>
        </div>
      )}

      {/* Embedded CSS Keyframes for the Lab */}
      <style jsx global>{`
        @keyframes runway {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(calc(100% - 2.5rem));
          }
        }
        @keyframes pulse-scale {
          0% {
            transform: scale(0.7);
            opacity: 0.3;
          }
          100% {
            transform: scale(1.1);
            opacity: 1;
          }
        }
        @keyframes slide-fade {
          0% {
            transform: translateX(-15px);
            opacity: 0.1;
          }
          100% {
            transform: translateX(15px);
            opacity: 1;
          }
        }
        @keyframes backdrop-fade {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes modal-pop {
          from {
            opacity: 0;
            transform: scale(0.88) translateY(12px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes toast-slide {
          from {
            opacity: 0;
            transform: translateY(24px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes drawer-slide {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        @keyframes accordion-down {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

// =========================================================================
// Interactive Cubic Bezier Curve Canvas Component
// Allows direct drag-and-drop or visual feedback of P1 & P2 handles
// =========================================================================
interface BezierCurveCanvasProps {
  points: [number, number, number, number];
  onChange: (newPoints: [number, number, number, number]) => void;
}

function BezierCurveCanvas({ points, onChange }: BezierCurveCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [activeDrag, setActiveDrag] = useState<"p1" | "p2" | null>(null);

  const [p1x, p1y, p2x, p2y] = points;

  // Viewport dimensions for SVG: 300x200
  const width = 300;
  const height = 180;
  const paddingX = 40;
  const paddingY = 40;
  const plotWidth = width - paddingX * 2;
  const plotHeight = height - paddingY * 2;

  // Coordinate mapping:
  // x: 0 -> paddingX, 1 -> paddingX + plotWidth
  // y: 0 -> paddingY + plotHeight, 1 -> paddingY
  const toSvgX = (x: number) => paddingX + x * plotWidth;
  const toSvgY = (y: number) => paddingY + (1 - y) * plotHeight;

  const fromSvgX = (svgX: number) => {
    const val = (svgX - paddingX) / plotWidth;
    return Math.max(0, Math.min(1, Number(val.toFixed(3))));
  };

  const fromSvgY = (svgY: number) => {
    const val = 1 - (svgY - paddingY) / plotHeight;
    return Math.max(-0.5, Math.min(2, Number(val.toFixed(3))));
  };

  const startX = toSvgX(0);
  const startY = toSvgY(0);
  const endX = toSvgX(1);
  const endY = toSvgY(1);

  const p1SvgX = toSvgX(p1x);
  const p1SvgY = toSvgY(p1y);
  const p2SvgX = toSvgX(p2x);
  const p2SvgY = toSvgY(p2y);

  const pathData = `M ${startX} ${startY} C ${p1SvgX} ${p1SvgY}, ${p2SvgX} ${p2SvgY}, ${endX} ${endY}`;

  const handlePointerDown = (handle: "p1" | "p2", e: React.PointerEvent) => {
    e.stopPropagation();
    setActiveDrag(handle);
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeDrag || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const newX = fromSvgX(mouseX);
    const newY = fromSvgY(mouseY);

    if (activeDrag === "p1") {
      onChange([newX, newY, p2x, p2y]);
    } else {
      onChange([p1x, p1y, newX, newY]);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (activeDrag) {
      try {
        (e.target as Element).releasePointerCapture(e.pointerId);
      } catch {}
      setActiveDrag(null);
    }
  };

  return (
    <div className="w-full flex items-center justify-center">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full max-w-[340px] h-[190px] select-none touch-none overflow-visible"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Grid Background */}
        <line
          x1={paddingX}
          y1={paddingY}
          x2={paddingX + plotWidth}
          y2={paddingY}
          stroke="#1e293b"
          strokeDasharray="3 3"
        />
        <line
          x1={paddingX}
          y1={paddingY + plotHeight}
          x2={paddingX + plotWidth}
          y2={paddingY + plotHeight}
          stroke="#1e293b"
          strokeDasharray="3 3"
        />
        <line
          x1={paddingX}
          y1={paddingY}
          x2={paddingX}
          y2={paddingY + plotHeight}
          stroke="#1e293b"
          strokeDasharray="3 3"
        />
        <line
          x1={paddingX + plotWidth}
          y1={paddingY}
          x2={paddingX + plotWidth}
          y2={paddingY + plotHeight}
          stroke="#1e293b"
          strokeDasharray="3 3"
        />

        {/* Diagonal Reference line (Linear) */}
        <line
          x1={startX}
          y1={startY}
          x2={endX}
          y2={endY}
          stroke="#334155"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />

        {/* Handle arms */}
        <line
          x1={startX}
          y1={startY}
          x2={p1SvgX}
          y2={p1SvgY}
          stroke="#22d3ee"
          strokeWidth="1.5"
          strokeOpacity="0.8"
        />
        <line
          x1={endX}
          y1={endY}
          x2={p2SvgX}
          y2={p2SvgY}
          stroke="#fbbf24"
          strokeWidth="1.5"
          strokeOpacity="0.8"
        />

        {/* The Cubic Curve */}
        <path d={pathData} fill="none" stroke="#f59e0b" strokeWidth="3.5" strokeLinecap="round" />

        {/* Start / End Anchors */}
        <circle cx={startX} cy={startY} r="4" fill="#64748b" />
        <circle cx={endX} cy={endY} r="4" fill="#64748b" />

        {/* Interactive Handle 1 (Cyan) */}
        <circle
          cx={p1SvgX}
          cy={p1SvgY}
          r="8"
          fill="#06b6d4"
          stroke="#ffffff"
          strokeWidth="2"
          className="cursor-grab active:cursor-grabbing hover:scale-125 transition-transform"
          onPointerDown={(e) => handlePointerDown("p1", e)}
        />

        {/* Interactive Handle 2 (Amber) */}
        <circle
          cx={p2SvgX}
          cy={p2SvgY}
          r="8"
          fill="#f59e0b"
          stroke="#ffffff"
          strokeWidth="2"
          className="cursor-grab active:cursor-grabbing hover:scale-125 transition-transform"
          onPointerDown={(e) => handlePointerDown("p2", e)}
        />
      </svg>
    </div>
  );
}
