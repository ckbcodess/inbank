/* eslint-disable @next/next/no-img-element */
"use client";

import React from "react";

interface EmvChipProps {
  className?: string;
}

/** The gold EMV chip on a card face: the image alone, with no shimmer, sweep or shadow. */
export function EmvChip({ className = "" }: EmvChipProps) {
  return (
    <div
      className={`relative w-[46px] sm:w-[50px] aspect-[262/207] shrink-0 select-none ${className}`}
    >
      <img
        src="/images/cards/chip.png"
        alt="EMV Chip"
        className="size-full object-contain pointer-events-none"
      />
    </div>
  );
}
