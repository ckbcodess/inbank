/* eslint-disable @next/next/no-img-element */
"use client";

/**
 * Renders the drawing registered for a state, or `fallback` until it exists.
 *
 * The registry's `drawn` flag decides, not a network probe: no 404s, no icon that
 * swaps to art after paint. The art is decorative (`alt=""`); the words next to it
 * carry the meaning. If a file that's marked drawn fails to load, the fallback
 * shows instead of a broken image.
 */

import { useState, type ReactNode } from "react";
import { PLACEMENT_SIZE, STATE_ILLUSTRATIONS, type StateIllustrationId } from "@/lib/state-illustrations";
import { cn } from "@/lib/utils";
import {
  EmptyArtActivity,
  EmptyArtCards,
  EmptyArtCaughtUp,
  EmptyArtChart,
  EmptyArtGroups,
  EmptyArtPeople,
  EmptyArtRates,
  EmptyArtSources,
  EmptyArtStanding,
  EmptyArtStatements,
} from "@/components/states/EmptyArt";

/** Drawings that live in code (they follow the theme) rather than as files. */
const INLINE_ART: Partial<Record<StateIllustrationId, () => React.JSX.Element>> = {
  "empty-cards": EmptyArtCards,
  "empty-activity": EmptyArtActivity,
  "empty-sources": EmptyArtSources,
  "empty-people": EmptyArtPeople,
  "empty-groups": EmptyArtGroups,
  "empty-standing": EmptyArtStanding,
  "empty-statements": EmptyArtStatements,
  "empty-rates": EmptyArtRates,
  "empty-chart": EmptyArtChart,
  "caught-up": EmptyArtCaughtUp,
};

export function StateIllustration({
  id,
  fallback = null,
  className,
}: {
  id: StateIllustrationId;
  fallback?: ReactNode;
  className?: string;
}) {
  const Inline = INLINE_ART[id];
  const entry: { placement: keyof typeof PLACEMENT_SIZE; drawn: boolean; dark?: boolean } = STATE_ILLUSTRATIONS[id];
  const [failed, setFailed] = useState(false);
  const [darkFailed, setDarkFailed] = useState(false);

  if (Inline) return <Inline />;
  if (!entry.drawn || failed) return <>{fallback}</>;

  const { w, h } = PLACEMENT_SIZE[entry.placement];
  const src = `/illustrations/${id}.svg`;
  const hasDark = Boolean(entry.dark) && !darkFailed;

  return (
    <div className={cn("relative mx-auto max-w-full select-none", className)} style={{ width: w, aspectRatio: `${w} / ${h}` }}>
      <img
        src={src}
        alt=""
        width={w}
        height={h}
        onError={() => setFailed(true)}
        className={cn("absolute inset-0 size-full object-contain", hasDark && "dark:hidden")}
      />
      {hasDark && (
        <img
          src={`/illustrations/${id}.dark.svg`}
          alt=""
          width={w}
          height={h}
          onError={() => setDarkFailed(true)}
          className="absolute inset-0 hidden size-full object-contain dark:block"
        />
      )}
    </div>
  );
}
