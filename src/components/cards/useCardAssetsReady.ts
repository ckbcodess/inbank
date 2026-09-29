"use client";

import { useEffect, useState } from "react";
import type { PaymentCard } from "@/lib/mock-data";
import { themeForCard } from "@/components/cards/CardFace";

const CHIP = "/images/cards/chip.png";
/** Never hold the page hostage to a slow image. */
const GIVE_UP_MS = 3000;

function preload(url: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => (img.decode ? img.decode().catch(() => undefined).then(() => resolve()) : resolve());
    img.onerror = () => resolve();
    img.src = url;
  });
}

/**
 * True once every card's artwork (and the chip) is decoded, so a card face never
 * paints bare and then pops into place. Sticky: once ready it stays ready, so a
 * new card added later doesn't blank the page. Falls back to ready after a few
 * seconds, and immediately when there's nothing to load.
 */
export function useCardAssetsReady(cards: PaymentCard[]): boolean {
  const [ready, setReady] = useState(false);
  const key = [...new Set(cards.map((c) => themeForCard(c).bgImage))].sort().join("|");

  useEffect(() => {
    if (ready) return;
    const urls = key ? [...key.split("|"), CHIP] : [];
    let cancelled = false;
    const done = () => {
      if (!cancelled) setReady(true);
    };
    const timer = setTimeout(done, GIVE_UP_MS);
    Promise.all(urls.map(preload)).then(done);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [key, ready]);

  return ready;
}
