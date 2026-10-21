"use client";

import React from "react";
import { Classic } from "loading-dev";
import { cn } from "@/lib/utils";

export interface SpinnerProps {
  size?: number;
  className?: string;
  color?: string;
}

/**
 * The one spinner in the app: twelve dashes around a ring that fade as they turn (`Classic` from `loading-dev`).
 * It takes the current text colour unless told otherwise. Use this for every "working on it" state, never a
 * hand-made rotating icon.
 */
export function AppLoader({ size = 20, className, color }: SpinnerProps) {
  return (
    <span
      className={cn("inline-flex items-center justify-center shrink-0", className)}
      role="status"
      aria-label="Loading"
    >
      <Classic size={size} color={color} />
    </span>
  );
}

export default AppLoader;
