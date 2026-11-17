"use client";

import { useEffect } from "react";
import { useDashboardColor } from "@/lib/dashboard-color";

/** Puts the chosen dashboard colour on <html> while the personal shell is open, and takes it off when it closes. */
export default function DashboardColorSync() {
  const color = useDashboardColor((s) => s.color);
  useEffect(() => {
    const root = document.documentElement;
    if (color === "slate") delete root.dataset.hero;
    else root.dataset.hero = color;
    return () => {
      delete root.dataset.hero;
    };
  }, [color]);
  return null;
}
