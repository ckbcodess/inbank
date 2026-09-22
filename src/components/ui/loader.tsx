"use client";

import React from "react";
import { Snake } from "loading-dev";
import { cn } from "@/lib/utils";

export interface SpinnerProps {
  size?: number;
  className?: string;
  color?: string;
}

/**
 * Standard app-wide loader component powered by `Snake` from `loading-dev`.
 * Automatically inherits current text color unless specified otherwise.
 */
export function AppLoader({ size = 20, className, color }: SpinnerProps) {
  return (
    <span
      className={cn("inline-flex items-center justify-center shrink-0", className)}
      role="status"
      aria-label="Loading"
    >
      <Snake size={size} color={color} />
    </span>
  );
}

export function SnakeDemo() {
  return <Snake size={48} />;
}

export { Snake };
export default AppLoader;
