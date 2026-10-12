"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// GF(256) tables with primitive polynomial 0x11d (285)
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
let x = 1;
for (let i = 0; i < 255; i++) {
  EXP[i] = x;
  EXP[i + 255] = x;
  LOG[x] = i;
  x = (x << 1) ^ (x >= 128 ? 0x11d : 0);
}

function gmul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

function rsGenPoly(n: number): number[] {
  let g = [1];
  for (let i = 0; i < n; i++) {
    const next = new Array(g.length + 1).fill(0);
    for (let j = 0; j < g.length; j++) {
      next[j] ^= gmul(g[j], EXP[i]);
      next[j + 1] ^= g[j];
    }
    g = next;
  }
  return g;
}

function rsCompute(data: number[], numEc: number): Uint8Array {
  const gen = rsGenPoly(numEc);
  const res = new Uint8Array(numEc);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ res[0];
    for (let j = 0; j < numEc - 1; j++) {
      res[j] = res[j + 1] ^ gmul(gen[j + 1], factor);
    }
    res[numEc - 1] = gmul(gen[numEc], factor);
  }
  return res;
}

/**
 * Standard QR Code Matrix Generator (Version 3: 29x29, Error Correction Level M)
 * Fully compliant matrix generation with finders, timing, alignment, and masked payload.
 */
function generateQrMatrix(text: string): boolean[][] {
  const size = 29;
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const isFunction: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  function setModule(r: number, c: number, val: boolean) {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      matrix[r][c] = val;
      isFunction[r][c] = true;
    }
  }

  // 1. Finder patterns at top-left, top-right, bottom-left
  function addFinder(r0: number, c0: number) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = r0 + r;
        const nc = c0 + c;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          if (r === -1 || r === 7 || c === -1 || c === 7) {
            setModule(nr, nc, false);
          } else if (r === 0 || r === 6 || c === 0 || c === 6) {
            setModule(nr, nc, true);
          } else if (r >= 2 && r <= 4 && c >= 2 && c <= 4) {
            setModule(nr, nc, true);
          } else {
            setModule(nr, nc, false);
          }
        }
      }
    }
  }
  addFinder(0, 0);
  addFinder(0, size - 7);
  addFinder(size - 7, 0);

  // 2. Alignment pattern at (22, 22) for V3
  function addAlignment(r0: number, c0: number) {
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        const nr = r0 + r;
        const nc = c0 + c;
        if (Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0)) {
          setModule(nr, nc, true);
        } else {
          setModule(nr, nc, false);
        }
      }
    }
  }
  addAlignment(22, 22);

  // 3. Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (!isFunction[6][i]) setModule(6, i, i % 2 === 0);
    if (!isFunction[i][6]) setModule(i, 6, i % 2 === 0);
  }

  // Dark module
  setModule(size - 8, 8, true);

  // Format info area reserve
  for (let i = 0; i < 9; i++) {
    if (!isFunction[8][i]) setModule(8, i, false);
    if (!isFunction[i][8]) setModule(i, 8, false);
  }
  for (let i = size - 8; i < size; i++) {
    if (!isFunction[8][i]) setModule(8, i, false);
    if (!isFunction[i][8]) setModule(i, 8, false);
  }

  // Format bits: Level M, Mask 2 (00 010) -> 101111101101010
  const formatBits = [1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 0, 1, 0];
  const formatCoords = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]
  ];
  for (let i = 0; i < 15; i++) {
    const [r, c] = formatCoords[i];
    matrix[r][c] = formatBits[i] === 1;
    if (i < 8) {
      matrix[size - 1 - i][8] = formatBits[i] === 1;
    } else {
      matrix[8][size - 15 + i] = formatBits[i] === 1;
    }
  }

  // 4. Encode data bits (Byte mode)
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);
  const bits: number[] = [];
  function pushBits(val: number, len: number) {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >> i) & 1);
    }
  }
  pushBits(0b0100, 4); // Byte mode
  pushBits(bytes.length, 8); // Character count
  for (const b of bytes) pushBits(b, 8);
  pushBits(0, 4); // Terminator
  while (bits.length % 8 !== 0) bits.push(0);

  const dataCodewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
    dataCodewords.push(b);
  }

  // Pad to 44 codewords (V3 Level M)
  const pad = [0xec, 0x11];
  let padIdx = 0;
  while (dataCodewords.length < 44) {
    dataCodewords.push(pad[padIdx % 2]);
    padIdx++;
  }

  // Compute 26 error correction codewords
  const ec = rsCompute(dataCodewords, 26);
  const allCodewords = [...dataCodewords, ...Array.from(ec)];
  const allBits: number[] = [];
  for (const cw of allCodewords) {
    for (let i = 7; i >= 0; i--) {
      allBits.push((cw >> i) & 1);
    }
  }

  // 5. Fill matrix (zigzag right-to-left) with Mask 2 (col % 3 === 0)
  let bitIdx = 0;
  let up = true;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col = 5; // skip timing col
    for (let rowStep = 0; rowStep < size; rowStep++) {
      const row = up ? size - 1 - rowStep : rowStep;
      for (let c = col; c >= col - 1; c--) {
        if (!isFunction[row][c]) {
          const bit = bitIdx < allBits.length ? allBits[bitIdx++] : 0;
          const mask = c % 3 === 0;
          matrix[row][c] = (bit ^ (mask ? 1 : 0)) === 1;
        }
      }
    }
    up = !up;
  }

  return matrix;
}

export interface QrCodeProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  size?: number;
  centerLogo?: React.ReactNode;
  centerRadius?: number; // radius in modules (e.g. 4.4)
  moduleColor?: string;
  bgColor?: string;
  cutoutColor?: string;
}

export function QrCode({
  value,
  size = 200,
  centerLogo,
  centerRadius = 4.4,
  moduleColor = "currentColor",
  bgColor = "transparent",
  cutoutColor,
  className,
  ...props
}: QrCodeProps) {
  const matrix = React.useMemo(() => generateQrMatrix(value), [value]);
  const numModules = matrix.length; // 29
  const centerCoord = (numModules - 1) / 2; // 14

  // Merge consecutive modules in each row into continuous horizontal rectangles (standard QR code appearance)
  const moduleRuns = React.useMemo(() => {
    const runs: { r: number; c: number; len: number }[] = [];
    for (let r = 0; r < numModules; r++) {
      let inRun = false;
      let startCol = 0;
      for (let c = 0; c < numModules; c++) {
        const isDark = matrix[r][c];
        const isCutout =
          Boolean(centerLogo) &&
          centerRadius > 0 &&
          Math.hypot(r - centerCoord, c - centerCoord) < centerRadius;
        const cellActive = isDark && !isCutout;

        if (cellActive) {
          if (!inRun) {
            inRun = true;
            startCol = c;
          }
        } else {
          if (inRun) {
            runs.push({ r, c: startCol, len: c - startCol });
            inRun = false;
          }
        }
      }
      if (inRun) {
        runs.push({ r, c: startCol, len: numModules - startCol });
      }
    }
    return runs;
  }, [matrix, numModules, centerLogo, centerRadius, centerCoord]);

  return (
    <div
      className={cn("relative flex items-center justify-center select-none", className)}
      style={{ width: size, height: size }}
      {...props}
    >
      <svg
        viewBox={`0 0 ${numModules} ${numModules}`}
        className="size-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        shapeRendering="crispEdges"
      >
        {/* Optional background fill */}
        {bgColor && bgColor !== "transparent" && (
          <rect width={numModules} height={numModules} fill={bgColor} />
        )}

        {/* Render Modules as crisp, standard rectangular blocks */}
        <g fill={moduleColor}>
          {moduleRuns.map((run) => (
            <rect
              key={`${run.r}-${run.c}`}
              x={run.c}
              y={run.r}
              width={run.len}
              height={1}
            />
          ))}
        </g>

        {/* Center Circular Cutout */}
        {centerLogo && centerRadius > 0 && (
          <circle
            cx={centerCoord + 0.5}
            cy={centerCoord + 0.5}
            r={centerRadius}
            fill={cutoutColor || (bgColor && bgColor !== "transparent" ? bgColor : undefined)}
            className={!cutoutColor && (!bgColor || bgColor === "transparent") ? "fill-background" : undefined}
          />
        )}
      </svg>

      {/* Center Logo Slot */}
      {centerLogo && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          {centerLogo}
        </div>
      )}
    </div>
  );
}
