"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EAGLE_COLS, EAGLE_HEIGHT_CELLS, EAGLE_PITCH } from "@/lib/eagle-matrix";
import { EAGLE_ASPECT, eagleDots, lookFor, useEagleStore, type EagleConfig } from "@/lib/eagle-style-store";
import EagleStudio from "@/components/brand/EagleStudio";

/** Small deterministic hash: the same dot always gets the same surface texture. */
function hash(n: number): number {
  let h = (n + 0x9e3779b9) | 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

type RGB = [number, number, number];

function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

const RAMP_STEPS = 48;

/** Light intensity → colour, like a gradient map: resting gold, warm gold, then a hot near-white core. */
function buildRamp(cfg: EagleConfig): string[] {
  const rest = hexToRgb(cfg.color);
  const warm = hexToRgb(cfg.litColor);
  const hot = hexToRgb(cfg.hotColor);
  const white: RGB = [255, 252, 240];
  return Array.from({ length: RAMP_STEPS }, (_, i) => {
    const t = i / (RAMP_STEPS - 1);
    const c = t < 0.45 ? mix(rest, warm, t / 0.45) : t < 0.85 ? mix(warm, hot, (t - 0.45) / 0.4) : mix(hot, white, (t - 0.85) / 0.15);
    return `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;
  });
}

/** A plus as three rectangles that do not overlap, so translucent fills stay even. */
function drawDot(g: CanvasRenderingContext2D, shape: EagleConfig["shape"], x: number, y: number, s: number, t: number) {
  const h = s / 2;
  const ht = t / 2;
  switch (shape) {
    case "plus":
      g.fillRect(x - h, y - ht, s, t);
      g.fillRect(x - ht, y - h, t, h - ht);
      g.fillRect(x - ht, y + ht, t, h - ht);
      break;
    case "dot":
      g.beginPath();
      g.arc(x, y, h, 0, Math.PI * 2);
      g.fill();
      break;
    case "square":
      g.fillRect(x - h, y - h, s, s);
      break;
    case "diamond":
      g.beginPath();
      g.moveTo(x, y - h);
      g.lineTo(x + h, y);
      g.lineTo(x, y + h);
      g.lineTo(x - h, y);
      g.closePath();
      g.fill();
      break;
  }
}

interface Lamp {
  x: number;
  y: number;
  radius: number;
  stretch: number;
  power: number;
  specular: boolean;
}

/**
 * The dotted golden eagle behind the auth screens. Purely decorative.
 *
 * A dark room, a lamp sweeping across a foil surface. Each dot is a tiny mirror with its own random
 * tilt, so as the lamp passes it lights the dots by distance (soft falloff) and makes individual dots
 * glint where their tilt catches the reflection (Blinn-Phong). A dimmer, wider bounce light trails
 * behind and dust drifts through the beam. The resting eagle is painted once and cached; each frame
 * only repaints the dots the lamp is touching. Placement and style come from the Eagle studio (see EagleStudio.tsx).
 */
export default function EagleBackdrop() {
  const cfg = useEagleStore((s) => s.config);
  // Persisted settings live in localStorage; render after mount so server and
  // client markup agree.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const dots = useMemo(() => eagleDots({ edits: cfg.edits, spacing: cfg.spacing }), [cfg.edits, cfg.spacing]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cfgRef = useRef(cfg);
  cfgRef.current = cfg;
  const drawRef = useRef<((seconds: number) => void) | null>(null);

  const vw = EAGLE_COLS * EAGLE_PITCH;
  const vh = EAGLE_HEIGHT_CELLS * EAGLE_PITCH;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!mounted || !cfg.visible || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const still = document.createElement("canvas"); // the resting eagle, painted once
    let stillKey = "";
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const count = dots.length;
    const xs = new Float32Array(count);
    const ys = new Float32Array(count);
    const nx = new Float32Array(count); // each dot's random surface tilt
    const ny = new Float32Array(count);
    const invN = new Float32Array(count);
    dots.forEach((d, i) => {
      xs[i] = d.x;
      ys[i] = d.y;
      nx[i] = (hash(i * 3 + 1) + hash(i * 3 + 2) - 1) * 0.9;
      ny[i] = (hash(i * 3 + 3) + hash(i * 3 + 4) - 1) * 0.9;
      invN[i] = 1 / Math.hypot(nx[i], ny[i], 1);
    });

    let rampKey = "";
    let rampCache: string[] = [];
    let width = 0;
    let height = 0;
    let scale = 1;
    const ease = (u: number) => u * u * (3 - 2 * u) * 0.72 + u * 0.28;

    const draw = (seconds: number) => {
      if (width === 0) return;
      const dark = document.documentElement.classList.contains("dark");
      const c = lookFor(cfgRef.current, dark ? "dark" : "light");
      const key = c.color + c.litColor + c.hotColor;
      if (key !== rampKey) {
        rampKey = key;
        rampCache = buildRamp(c);
      }

      const opacity = dark ? c.opacityDark : c.opacityLight;
      const ambient = (c.sweep ? c.baseDim : 1) * opacity;

      // Where are the lamps?
      // Every loop is a different pass: the direction swings around the chosen angle (at full randomness,
      // any direction, including back the way it came), and the lane and lamp size shift a little.
      const loop = reduced ? 0 : Math.floor(seconds / c.sweepSeconds);
      const v = reduced ? 0 : c.sweepVariety;
      const ang = ((c.sweepAngle + (hash(loop * 5 + 1) * 2 - 1) * 180 * v) * Math.PI) / 180;
      const dir = [Math.cos(ang), Math.sin(ang)];
      const perp = [-dir[1], dir[0]];
      const lane = (hash(loop * 5 + 2) - 0.5) * vh * 0.5 * v;
      const bend = (hash(loop * 5 + 4) < 0.5 ? -1 : 1) * vh * 0.07;
      const r = ((vw * c.lightSize) / 100) * (1 + (hash(loop * 5 + 3) - 0.5) * 0.3 * v);
      const ON = 0.7; // share of the cycle the lamp is over the eagle; the rest is darkness
      const lamps: Lamp[] = [];
      const phase = reduced ? 0.32 : (seconds / c.sweepSeconds) % 1;
      const place = (p: number, radius: number, stretch: number, power: number, specular: boolean) => {
        const u = p / ON;
        if (u < 0 || u > 1) return;
        const reach = (Math.abs(dir[0]) * vw + Math.abs(dir[1]) * vh) / 2 + radius * 2.4;
        const along = (ease(u) * 2 - 1) * reach;
        const drift = Math.sin(u * Math.PI * 1.3 + 0.6) * bend + lane + vh * 0.04;
        lamps.push({
          x: vw / 2 + dir[0] * along + perp[0] * drift,
          y: vh / 2 + dir[1] * along + perp[1] * drift,
          radius,
          stretch,
          power: power * (0.72 + 0.28 * Math.sin(u * Math.PI)),
          specular,
        });
      };
      if (c.sweep) {
        place(phase, r, c.lightStretch, 1, true);
        if (c.fill > 0) place(phase - 0.08, r * 2.3, 1.3, c.fill * 0.55, false);
      }

      const step = Math.max(1, Math.round(c.spacing));
      const s = EAGLE_PITCH * step * c.size;
      const t = Math.max(0.8, s * c.thickness);
      const lampHeight = r * 0.85;

      const nextKey = `${width}|${c.shape}|${c.size}|${c.thickness}|${c.spacing}|${c.color}|${ambient}`;
      if (nextKey !== stillKey) {
        stillKey = nextKey;
        still.width = width;
        still.height = height;
        const g = still.getContext("2d");
        if (g) {
          g.setTransform(scale, 0, 0, scale, 0, 0);
          g.fillStyle = c.color;
          g.globalAlpha = ambient;
          for (let i = 0; i < count; i++) drawDot(g, c.shape, xs[i], ys[i], s, t);
        }
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(still, 0, 0);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);

      for (let i = 0; i < count; i++) {
        const x = xs[i];
        const y = ys[i];
        let diffuse = 0;
        let spec = 0;
        for (const lamp of lamps) {
          const dx = x - lamp.x;
          const dy = y - lamp.y;
          const bu = (dx * dir[0] + dy * dir[1]) / lamp.radius;
          const bv = (dx * perp[0] + dy * perp[1]) / (lamp.radius * lamp.stretch);
          const q2 = bu * bu + bv * bv;
          if (q2 > 14) continue;
          const w = (1 / Math.pow(1 + q2, 1.6)) * lamp.power * (q2 > 9 ? (14 - q2) / 5 : 1);
          diffuse += w;
          if (lamp.specular && c.sparkle > 0) {
            // Blinn-Phong: the dot glints when its tilted normal lines up with the half-vector.
            const len = Math.hypot(dx, dy, lampHeight);
            const hx = -dx / len;
            const hy = -dy / len;
            const hz = lampHeight / len + 1;
            const ndh = ((nx[i] * hx + ny[i] * hy + hz) * invN[i]) / Math.hypot(hx, hy, hz);
            if (ndh > 0.9) spec += Math.pow(ndh, 90) * Math.pow(w, 0.55) * c.sparkle * 2.4;
          }
        }
        let intensity = 0;
        if (diffuse > 0.002 || spec > 0.002) {
          // Dust drifting through the beam
          const dust = 1 - c.grain * 0.5 * (1 + Math.sin(x * 0.05 + seconds * 0.8 + Math.sin(y * 0.055 - seconds * 0.6) * 2));
          intensity = 1 - Math.exp(-1.7 * c.brightness * (0.9 * diffuse * dust + spec));
        }
        if (intensity < 0.01) continue;
        ctx.fillStyle = rampCache[Math.min(RAMP_STEPS - 1, Math.round(intensity * (RAMP_STEPS - 1)))];
        ctx.globalAlpha = intensity;
        drawDot(ctx, c.shape, x, y, s, t);
      }
      ctx.globalAlpha = 1;
    };
    drawRef.current = draw;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      width = Math.min(1600, Math.round(rect.width * dpr));
      height = Math.round(width / EAGLE_ASPECT);
      canvas.width = width;
      canvas.height = height;
      scale = width / vw;
      draw(performance.now() / 1000);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    let raf = 0;
    let onScreen = true;
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
    });
    io.observe(canvas);
    if (!reduced) {
      let last = 0;
      const tick = (now: number) => {
        raf = requestAnimationFrame(tick);
        // 30fps is plenty for a slow sweep and halves the work; skip entirely when nobody can see it.
        if (now - last < 33 || !onScreen || document.hidden) return;
        last = now;
        draw(now / 1000);
      };
      raf = requestAnimationFrame(tick);
    }
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      io.disconnect();
      drawRef.current = null;
    };
  }, [mounted, cfg.visible, dots, vw, vh]);

  // With reduced motion there is no animation loop, so repaint the still frame when settings change.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) drawRef.current?.(0);
  }, [cfg]);

  if (!mounted) return null;

  const mask = cfg.fade
    ? `linear-gradient(${cfg.fadeAngle}deg, #000 ${cfg.fadeSolid}%, transparent ${cfg.fadeClear}%)`
    : undefined;

  return (
    <>
      {cfg.visible && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <div
            className="absolute right-[var(--eagle-mr)] bottom-[var(--eagle-mb)] w-[var(--eagle-mw)] md:right-[var(--eagle-r)] md:bottom-[var(--eagle-b)] md:w-[var(--eagle-w)]"
            style={
              {
                "--eagle-w": `${cfg.width}vw`,
                "--eagle-mw": `${cfg.mWidth}vw`,
                "--eagle-r": `${cfg.right}%`,
                "--eagle-b": `${cfg.bottom}%`,
                "--eagle-mr": `${cfg.mRight}%`,
                "--eagle-mb": `${cfg.mBottom}%`,
                aspectRatio: EAGLE_ASPECT,
                transform: `rotate(${cfg.rotate}deg) scaleX(${cfg.flip ? -1 : 1})`,
                filter: cfg.blur ? `blur(${cfg.blur}px)` : undefined,
                maskImage: mask,
                WebkitMaskImage: mask,
              } as React.CSSProperties
            }
          >
            <canvas ref={canvasRef} className={`block size-full ${cfg.drift ? "eagle-drift" : ""}`} />
          </div>
        </div>
      )}
      <EagleStudio />
    </>
  );
}
