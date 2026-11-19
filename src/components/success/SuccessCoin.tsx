"use client";

/**
 * A gold coin with a raised W, for a real success milestone (see CONSTITUTION §1 "Warmth matches the moment").
 * Pure SVG in CSS 3D: a disc with a thickness, a plain back, and the W lifted off the face on its own layer.
 * No 3D engine is loaded.
 *
 * On mount the coin turns into place once. With `followPointer`, the pointer turns the coin on its Y axis and leans
 * it on X. `tilt` sets how that behaves: whether the whole page or only the coin is watched, how far it turns, how
 * far it leans, how far from the coin the pointer still counts, and how springy the motion is.
 *
 * The colours are raw values on purpose: this is an illustration family (CONSTITUTION §4). The W is a placeholder
 * outline; swap `W_PATH` for the exact brand letterform when the designer supplies it.
 *
 * Reduced motion is handled globally by MotionProvider, so there is no per-component check here.
 */

import { useCallback, useEffect, useRef, type PointerEvent } from "react";
import { animate, motion, useAnimationFrame, useMotionValue, useSpring, useTransform } from "framer-motion";
import { DURATION, EASE } from "@/lib/motion";

/** Placeholder W in a 200 × 200 box, centred on the coin. */
const W_PATH =
  "M48 62 L66 62 L80 124 L98 70 L102 70 L120 124 L134 62 L152 62 L122 138 L110 138 L100 96 L90 138 L78 138 Z";

/** Number of slices that build the coin's edge. More slices make the rim look smoother from an angle. */
const EDGE_SLICES = 12;

/** How the pointer moves the coin. Exported so a tuner can start from the same defaults. */
export type CoinTilt = {
  /** "page": the whole window is watched. "coin": only the pointer over the coin counts. */
  scope: "page" | "coin";
  /** Degrees the coin turns on its Y axis at full reach (left = −maxTurn, right = +maxTurn). */
  maxTurn: number;
  /** Degrees the coin leans on its X axis at full reach. */
  maxLean: number;
  /** Pixels from the coin's centre at which the pointer counts as full reach. */
  reach: number;
  /** Spring stiffness. Higher reacts faster. */
  stiffness: number;
  /** Spring damping. Higher settles with less wobble. */
  damping: number;
  /** Flips the lean direction, so the coin tips away from the pointer instead of toward it. */
  invertLean: boolean;
  /** Degrees per second the coin spins on its own when the pointer is still. 0 turns the spin off. */
  spinSpeed: number;
  /** Milliseconds of stillness before the spin picks up again after the pointer has moved. */
  resumeDelay: number;
  /**
   * Seconds the spin takes to settle back to its idle speed. Higher feels heavier: a flick takes longer to die away,
   * and a coin at rest takes longer to reach full speed. 0 snaps straight to the idle speed.
   */
  inertia: number;
  /** Degrees per second of spin for each pixel per second of pointer speed. Sets how hard a flick throws the coin. */
  flick: number;
};

export const DEFAULT_TILT: CoinTilt = {
  scope: "page",
  maxTurn: 180,
  maxLean: 10,
  reach: 400,
  stiffness: 180,
  damping: 24,
  invertLean: false,
  spinSpeed: 24,
  resumeDelay: 200,
  inertia: 2,
  flick: 0.1,
};

/** Where the coin should turn and lean for a pointer at (x, y), given the coin's box on screen. */
function targetFor(box: DOMRect, x: number, y: number, tilt: CoinTilt) {
  const cx = box.left + box.width / 2;
  const cy = box.top + box.height / 2;
  const nx = Math.max(-1, Math.min(1, (x - cx) / tilt.reach));
  const ny = Math.max(-1, Math.min(1, (y - cy) / tilt.reach));
  const sign = tilt.invertLean ? 1 : -1; // pointer above the coin leans its top back (positive X), by default
  return { turn: nx * tilt.maxTurn, lean: sign * ny * tilt.maxLean };
}

/**
 * The coin's thickness, built from stacked discs between the two faces. From the front the discs sit behind the face,
 * so the edge only shows as the coin turns, which is what gives it body.
 */
function CoinEdge({ size, depth }: { size: number; depth: number }) {
  return (
    <>
      {Array.from({ length: EDGE_SLICES }, (_, i) => {
        const z = -depth / 2 + (depth * i) / (EDGE_SLICES - 1);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              inset: 0,
              width: size,
              height: size,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #c48a5c 0%, #f5d7b8 45%, #9c6036 100%)",
              transform: `translateZ(${z}px)`,
            }}
          />
        );
      })}
    </>
  );
}

/** A disc face: the rim, the gradient face and an engraved ring. Used for the front and back. */
function CoinFace({ size, id, transform }: { size: number; id: string; transform: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        display: "block",
        overflow: "visible",
        backfaceVisibility: "hidden",
        transform,
      }}
    >
      <defs>
        <radialGradient id={`${id}-face`} cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#f8e7d4" />
          <stop offset="55%" stopColor="#efd0b0" />
          <stop offset="100%" stopColor="#dcaa7f" />
        </radialGradient>
        <linearGradient id={`${id}-rim`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c48a5c" />
          <stop offset="45%" stopColor="#f5d7b8" />
          <stop offset="100%" stopColor="#9c6036" />
        </linearGradient>
      </defs>

      {/* Rim, then the face sitting inside it, then a fine engraved ring. */}
      <circle cx="100" cy="100" r="96" fill={`url(#${id}-rim)`} />
      <circle cx="100" cy="100" r="86" fill={`url(#${id}-face)`} />
      <circle cx="100" cy="100" r="80" fill="none" stroke="#c99a70" strokeOpacity="0.45" strokeWidth="0.8" />
    </svg>
  );
}

/**
 * The raised W, on its own layer in front of the face. A bevel highlight from the top left gives its edges a lit
 * top, and a drop shadow falls onto the face beneath it.
 */
function CoinLetter({ size, transform }: { size: number; transform: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        display: "block",
        overflow: "visible",
        backfaceVisibility: "hidden",
        pointerEvents: "none",
        transform,
      }}
    >
      <defs>
        <linearGradient id="coin-letter-fill" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f3d2b0" />
          <stop offset="100%" stopColor="#c08256" />
        </linearGradient>
        <filter id="coin-letter-bevel" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.4" result="blur" />
          <feSpecularLighting
            in="blur"
            surfaceScale="4"
            specularConstant="1.2"
            specularExponent="20"
            lightingColor="#fff4e6"
            result="spec"
          >
            <fePointLight x="-40" y="-60" z="160" />
          </feSpecularLighting>
          <feComposite in="spec" in2="SourceAlpha" operator="in" result="specClip" />
          <feComposite in="SourceGraphic" in2="specClip" operator="arithmetic" k1="0" k2="1" k3="0.7" k4="0" result="lit" />
          <feMerge>
            <feMergeNode in="lit" />
          </feMerge>
        </filter>
        <filter id="coin-letter-shadow" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="2.5" dy="4" stdDeviation="2.5" floodColor="#4a2a12" floodOpacity="0.45" />
        </filter>
      </defs>

      <g filter="url(#coin-letter-shadow)">
        <path d={W_PATH} fill="url(#coin-letter-fill)" filter="url(#coin-letter-bevel)" />
      </g>
    </svg>
  );
}

export function SuccessCoin({
  size = 160,
  decorative = true,
  label = "Gold coin with a W",
  followPointer = false,
  tilt = DEFAULT_TILT,
}: {
  size?: number;
  /** Set false when the coin carries meaning on its own; the label is then read out. */
  decorative?: boolean;
  label?: string;
  /** Lets the pointer turn and lean the coin. */
  followPointer?: boolean;
  /** How the pointer moves the coin. Only used when `followPointer` is on. */
  tilt?: CoinTilt;
}) {
  const depth = size * 0.08; // the coin's thickness, about 8% of its diameter
  const lift = depth * 0.7; // how far the W stands proud of the face
  const ref = useRef<HTMLDivElement>(null);

  // The one-time entrance turn, from edge-on to face-on.
  const entrance = useMotionValue(-80);
  useEffect(() => {
    const controls = animate(entrance, 0, { duration: DURATION.slow, ease: EASE.settle });
    return controls.stop;
  }, [entrance]);

  // Where the pointer wants the coin.
  const targetTurn = useMotionValue(0);
  const targetLean = useMotionValue(0);

  // The idle spin. While the pointer is still, `spinAngle` keeps advancing and `goal` follows it. When the pointer
  // moves, spinning pauses and `goal` follows the pointer instead. The spring between them makes the handover smooth.
  const spinAngle = useMotionValue(0);
  const goal = useMotionValue(0);
  const spinning = useRef(true);
  const spinVel = useRef(0); // the coin's spin speed in degrees per second
  const pointerVel = useRef(0); // the pointer's horizontal speed in pixels per second, smoothed
  const lastPoint = useRef<{ x: number; y: number; t: number } | null>(null);
  const resumeTimer = useRef<number | undefined>(undefined);
  const tiltRef = useRef(tilt);
  useEffect(() => {
    tiltRef.current = tilt;
  }, [tilt]);

  const springConfig = { type: "spring" as const, stiffness: tilt.stiffness, damping: tilt.damping, mass: 0.8 };
  const turn = useSpring(goal, springConfig);
  const lean = useSpring(targetLean, springConfig);
  const rotateY = useTransform([entrance, turn], ([entry, t]) => Number(entry) + Number(t));

  useAnimationFrame((_, delta) => {
    if (spinning.current) {
      const seconds = delta / 1000;
      // The spin eases from its current speed toward the idle speed, so a flick decays and a standstill ramps up.
      const tau = Math.max(tiltRef.current.inertia, 0.001);
      spinVel.current += (tiltRef.current.spinSpeed - spinVel.current) * (1 - Math.exp(-seconds / tau));
      spinAngle.set(spinAngle.get() + spinVel.current * seconds);
      goal.set(spinAngle.get());
    } else {
      goal.set(targetTurn.get());
    }
  });

  // Stops the spin at once. Once the pointer has been still for the resume delay, the coin picks up from where it is,
  // carrying whatever speed the pointer had when it stopped.
  const pauseSpin = useCallback(() => {
    spinning.current = false;
    window.clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(() => {
      spinAngle.set(turn.get());
      const flung = pointerVel.current * tiltRef.current.flick;
      spinVel.current = Math.max(-720, Math.min(720, flung));
      pointerVel.current = 0;
      spinning.current = true;
    }, tiltRef.current.resumeDelay);
  }, [spinAngle, turn]);

  // Measures how fast the pointer is moving across the screen, smoothed so one jittery event doesn't set the flick.
  const trackPointer = useCallback((x: number, y: number) => {
    const now = performance.now();
    const last = lastPoint.current;
    lastPoint.current = { x, y, t: now };
    if (!last) return;
    const seconds = (now - last.t) / 1000;
    if (seconds <= 0) return;
    pointerVel.current = pointerVel.current * 0.6 + ((x - last.x) / seconds) * 0.4;
  }, []);

  // Whole-page scope: listen on the window, so the coin follows the pointer wherever it is.
  useEffect(() => {
    if (!followPointer || tilt.scope !== "page") return;
    const onMove = (e: globalThis.PointerEvent) => {
      trackPointer(e.clientX, e.clientY);
      pauseSpin();
      const box = ref.current?.getBoundingClientRect();
      if (!box) return;
      const t = targetFor(box, e.clientX, e.clientY, tilt);
      targetTurn.set(t.turn);
      targetLean.set(t.lean);
    };
    const onLeaveWindow = (e: globalThis.PointerEvent) => {
      if (e.relatedTarget) return;
      pauseSpin();
      targetTurn.set(0);
      targetLean.set(0);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerout", onLeaveWindow);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerout", onLeaveWindow);
    };
  }, [followPointer, tilt, targetTurn, targetLean, pauseSpin, trackPointer]);

  // Coin-only scope: the pointer counts while it is over the coin.
  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    trackPointer(e.clientX, e.clientY);
    pauseSpin();
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    const t = targetFor(box, e.clientX, e.clientY, tilt);
    targetTurn.set(t.turn);
    targetLean.set(t.lean);
  }

  function handlePointerLeave() {
    pauseSpin();
    targetTurn.set(0);
    targetLean.set(0);
  }

  const coinScope = followPointer && tilt.scope === "coin";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: DURATION.slow, ease: EASE.settle }}
      style={{ width: size, height: size, perspective: 800, display: "inline-block" }}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative ? true : undefined}
    >
      <motion.div
        ref={ref}
        onPointerMove={coinScope ? handlePointerMove : undefined}
        onPointerLeave={coinScope ? handlePointerLeave : undefined}
        style={{
          position: "relative",
          width: size,
          height: size,
          transformStyle: "preserve-3d",
          rotateY,
          rotateX: followPointer ? lean : 0,
        }}
      >
        <CoinEdge size={size} depth={depth} />
        <CoinFace size={size} id="coin-front" transform={`translateZ(${depth / 2}px)`} />
        <CoinFace size={size} id="coin-back" transform={`rotateY(180deg) translateZ(${depth / 2}px)`} />
        <CoinLetter size={size} transform={`translateZ(${depth / 2 + lift}px)`} />
      </motion.div>
    </motion.div>
  );
}
