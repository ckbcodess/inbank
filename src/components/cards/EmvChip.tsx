"use client";

import React from "react";
import { motion, useTransform } from "framer-motion";
import { useTiltContext } from "./TiltCard3D";

interface EmvChipProps {
  className?: string;
}

export function EmvChip({ className = "" }: EmvChipProps) {
  const tilt = useTiltContext();

  // Map mouse tilt springX directly to horizontal sweeping position across the chip
  const sweepX = tilt?.springX
    ? useTransform(tilt.springX, [-1, 1], ["-120%", "220%"])
    : undefined;

  return (
    <div
      className={`relative w-[46px] sm:w-[50px] aspect-[262/207] shrink-0 select-none ${className}`}
    >
      {/* High-Resolution Gold EMV Chip Asset */}
      <img
        src="/images/cards/chip.png"
        alt="EMV Chip"
        className="size-full object-contain pointer-events-none drop-shadow-sm"
      />

      {/* Stationary Masked Container with Sweeping Line Metallic Sheen */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        style={{
          maskImage: "url(/images/cards/chip.png)",
          WebkitMaskImage: "url(/images/cards/chip.png)",
          maskSize: "contain",
          WebkitMaskSize: "contain",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
          maskPosition: "center",
          WebkitMaskPosition: "center",
        }}
      >
        {sweepX ? (
          <>
            {/* Soft wider sweep diffusion */}
            <motion.div
              className="absolute top-[-50%] bottom-[-50%] w-[44px] -skew-x-[24deg] blur-[2px]"
              style={{
                left: sweepX,
                mixBlendMode: "color-dodge",
                background:
                  "linear-gradient(to right, transparent, rgba(255,255,255,0.6) 45%, rgba(255,240,160,0.3) 75%, transparent)",
                opacity: tilt?.isHovered ? 0.75 : 0.3,
              }}
            />

            {/* Crisp focused sweeping metallic slit */}
            <motion.div
              className="absolute top-[-50%] bottom-[-50%] w-[22px] -skew-x-[24deg]"
              style={{
                left: sweepX,
                mixBlendMode: "color-dodge",
                background:
                  "linear-gradient(to right, transparent, rgba(255,255,255,0.98) 50%, rgba(255,240,160,0.4) 80%, transparent)",
                opacity: tilt?.isHovered ? 1 : 0.45,
              }}
            />
          </>
        ) : (
          <div
            className="absolute top-[-50%] bottom-[-50%] left-[30%] w-[24px] -skew-x-[24deg]"
            style={{
              mixBlendMode: "color-dodge",
              background:
                "linear-gradient(to right, transparent, rgba(255,255,255,0.85) 50%, rgba(255,240,160,0.3) 80%, transparent)",
              opacity: 0.5,
            }}
          />
        )}
      </div>
    </div>
  );
}
