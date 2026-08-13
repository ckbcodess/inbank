"use client";

/**
 * Capture mode — strips dev-only affordances so screens can be captured into
 * Figma cleanly.
 *
 * Enabled with `?capture=1` and remembered for the rest of the tab session, so
 * a capture run can navigate between screens by clicking without re-appending
 * the parameter each time. `?capture=0` clears it.
 *
 * Read from `window.location` in an effect rather than via `useSearchParams`,
 * which would force every consumer under a Suspense boundary.
 */

import { useEffect, useState } from "react";

const KEY = "nibs-capture-mode";

export function useCaptureMode(): boolean {
  // Always starts false so server and first client render agree.
  const [capture, setCapture] = useState(false);

  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("capture");

    if (param === "1") {
      sessionStorage.setItem(KEY, "1");
      setCapture(true);
      return;
    }

    if (param === "0") {
      sessionStorage.removeItem(KEY);
      setCapture(false);
      return;
    }

    setCapture(sessionStorage.getItem(KEY) === "1");
  }, []);

  return capture;
}
