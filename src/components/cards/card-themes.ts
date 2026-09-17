import type React from "react";

export interface CardTheme {
  id: "gold" | "silver" | "black" | "blue" | "maroon" | "emerald";
  name: string;
  bgImage: string;
  colorHex: string;
  cardGradient: string;
  /** Optional 3D tactile sphere CSS properties */
  sphereStyle?: React.CSSProperties;
  textColor: string;
  borderColor?: string;
  chipColor?: string;
  contrastLogo?: boolean;
}

export const CARD_THEMES: readonly CardTheme[] = [
  {
    id: "gold",
    name: "GCB Golden Sun",
    bgImage: "/images/cards/card-gold.png",
    colorHex: "#f5be18",
    cardGradient: "from-[#ffe033] via-[#f5be18] to-[#d99b00]",
    sphereStyle: {
      background: "radial-gradient(circle at 35% 30%, #fff7a1 0%, #ffd000 35%, #e5a500 70%, #9a6500 100%)",
      boxShadow: "inset 0 2px 4px rgba(255,255,255,0.8), inset 0 -3px 6px rgba(120,70,0,0.6), 0 4px 8px rgba(0,0,0,0.2)",
    },
    textColor: "text-zinc-950",
    borderColor: "border-amber-400/40",
    chipColor: "bg-amber-700/80 border-amber-900/40",
    contrastLogo: true,
  },
  {
    id: "silver",
    name: "Slate Silver",
    bgImage: "/images/cards/card-silver.png",
    colorHex: "#64748b",
    cardGradient: "from-[#94a3b8] via-[#475569] to-[#1e293b]",
    sphereStyle: {
      background: "radial-gradient(circle at 35% 30%, #e2e8f0 0%, #94a3b8 35%, #475569 70%, #1e293b 100%)",
      boxShadow: "inset 0 2px 4px rgba(255,255,255,0.8), inset 0 -3px 6px rgba(30,41,59,0.6), 0 4px 8px rgba(0,0,0,0.2)",
    },
    textColor: "text-white",
    borderColor: "border-slate-500/30",
    chipColor: "bg-yellow-300/90 border-amber-500/40",
    contrastLogo: false,
  },
  {
    id: "black",
    name: "Obsidian Black",
    bgImage: "/images/cards/card-black.png",
    colorHex: "#18181b",
    cardGradient: "from-[#27272a] via-[#18181b] to-[#09090b]",
    sphereStyle: {
      background: "radial-gradient(circle at 35% 30%, #52525b 0%, #27272a 40%, #18181b 70%, #09090b 100%)",
      boxShadow: "inset 0 2px 4px rgba(255,255,255,0.35), inset 0 -3px 6px rgba(0,0,0,0.85), 0 4px 8px rgba(0,0,0,0.35)",
    },
    textColor: "text-white",
    borderColor: "border-zinc-700/40",
    chipColor: "bg-yellow-300/90 border-amber-500/40",
    contrastLogo: false,
  },
  {
    id: "blue",
    name: "Azure Cyan Blue",
    bgImage: "/images/cards/card-blue.png",
    colorHex: "#0284c7",
    cardGradient: "from-[#38bdf8] via-[#0284c7] to-[#0369a1]",
    sphereStyle: {
      background: "radial-gradient(circle at 35% 30%, #bae6fd 0%, #38bdf8 35%, #0284c7 70%, #075985 100%)",
      boxShadow: "inset 0 2px 4px rgba(255,255,255,0.8), inset 0 -3px 6px rgba(3,105,161,0.6), 0 4px 8px rgba(0,0,0,0.2)",
    },
    textColor: "text-[#082f49]",
    borderColor: "border-sky-400/30",
    chipColor: "bg-yellow-300/90 border-amber-500/40",
    contrastLogo: false,
  },
  {
    id: "maroon",
    name: "Crimson Maroon",
    bgImage: "/images/cards/card-maroon.png",
    colorHex: "#991b1b",
    cardGradient: "from-[#dc2626] via-[#991b1b] to-[#450a0a]",
    sphereStyle: {
      background: "radial-gradient(circle at 35% 30%, #fca5a5 0%, #dc2626 35%, #991b1b 70%, #450a0a 100%)",
      boxShadow: "inset 0 2px 4px rgba(255,255,255,0.6), inset 0 -3px 6px rgba(69,10,10,0.7), 0 4px 8px rgba(0,0,0,0.25)",
    },
    textColor: "text-white",
    borderColor: "border-red-500/30",
    chipColor: "bg-yellow-300/90 border-amber-500/40",
    contrastLogo: false,
  },
  {
    id: "emerald",
    name: "Neon Emerald",
    bgImage: "/images/cards/card-emerald.png",
    colorHex: "#10b981",
    cardGradient: "from-[#34d399] via-[#10b981] to-[#064e3b]",
    sphereStyle: {
      background: "radial-gradient(circle at 35% 30%, #a7f3d0 0%, #34d399 35%, #059669 70%, #064e3b 100%)",
      boxShadow: "inset 0 2px 4px rgba(255,255,255,0.7), inset 0 -3px 6px rgba(6,78,59,0.7), 0 4px 8px rgba(0,0,0,0.25)",
    },
    textColor: "text-white",
    borderColor: "border-emerald-400/30",
    chipColor: "bg-yellow-300/90 border-amber-500/40",
    contrastLogo: false,
  },
] as const;

export function getCardTheme(themeId?: string): CardTheme {
  if (!themeId) return CARD_THEMES[0]; // default to gold
  if (themeId === "crimson" || themeId === "pink") return CARD_THEMES.find((t) => t.id === "maroon") ?? CARD_THEMES[4];
  if (themeId === "navy") return CARD_THEMES.find((t) => t.id === "silver") ?? CARD_THEMES[1];
  if (themeId === "green" || themeId === "mint" || themeId === "emerald") return CARD_THEMES.find((t) => t.id === "emerald") ?? CARD_THEMES[5];
  const found = CARD_THEMES.find((t) => t.id === themeId);
  return found ?? CARD_THEMES[0];
}

