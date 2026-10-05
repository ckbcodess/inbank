"use client";

import { MotionConfig } from "framer-motion";

/** Every Framer Motion animation in the app drops its movement for people who ask for reduced motion. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
