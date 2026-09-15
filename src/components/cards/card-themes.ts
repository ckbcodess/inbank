export interface CardTheme {
  id: string;
  name: string;
  /** Background gradient used for full-size and mini card previews */
  cardGradient: string;
  /** Swatch circle gradient */
  swatchGradient: string;
  textColor: string;
  borderColor?: string;
  chipColor?: string;
  contrastLogo?: boolean;
}

export const CARD_THEMES: readonly CardTheme[] = [
  {
    id: "crimson",
    name: "Crimson Red",
    cardGradient: "from-[#ef4444] via-[#dc2626] to-[#b91c1c]",
    swatchGradient: "bg-gradient-to-br from-red-400 via-red-500 to-red-600",
    textColor: "text-white",
    borderColor: "border-red-400/20",
    chipColor: "bg-amber-300/90 border-amber-500/40",
    contrastLogo: false,
  },
  {
    id: "gold",
    name: "Golden Sun",
    cardGradient: "from-[#fddc07] via-[#fdc307] to-[#e5a600]",
    swatchGradient: "bg-gradient-to-br from-yellow-300 via-amber-400 to-amber-500",
    textColor: "text-zinc-950",
    borderColor: "border-amber-400/30",
    chipColor: "bg-amber-700/80 border-amber-900/40",
    contrastLogo: true,
  },
  {
    id: "emerald",
    name: "Emerald Mint",
    cardGradient: "from-[#22c55e] via-[#16a34a] to-[#15803d]",
    swatchGradient: "bg-gradient-to-br from-emerald-400 via-emerald-500 to-green-600",
    textColor: "text-white",
    borderColor: "border-emerald-400/20",
    chipColor: "bg-yellow-300/90 border-amber-500/40",
    contrastLogo: false,
  },
  {
    id: "blue",
    name: "Ocean Blue",
    cardGradient: "from-[#3b82f6] via-[#2563eb] to-[#1d4ed8]",
    swatchGradient: "bg-gradient-to-br from-sky-400 via-blue-500 to-blue-600",
    textColor: "text-white",
    borderColor: "border-blue-400/20",
    chipColor: "bg-yellow-300/90 border-amber-500/40",
    contrastLogo: false,
  },
  {
    id: "navy",
    name: "Midnight Navy",
    cardGradient: "from-[#334155] via-[#1e293b] to-[#0f172a]",
    swatchGradient: "bg-gradient-to-br from-slate-600 via-slate-700 to-slate-900",
    textColor: "text-white",
    borderColor: "border-slate-500/30",
    chipColor: "bg-yellow-300/90 border-amber-500/40",
    contrastLogo: false,
  },
  {
    id: "black",
    name: "Obsidian",
    cardGradient: "from-[#27272a] via-[#18181b] to-[#09090b]",
    swatchGradient: "bg-gradient-to-br from-zinc-700 via-zinc-800 to-black",
    textColor: "text-white",
    borderColor: "border-zinc-700/40",
    chipColor: "bg-yellow-300/90 border-amber-500/40",
    contrastLogo: false,
  },
  {
    id: "pink",
    name: "Rose Quartz",
    cardGradient: "from-[#ec4899] via-[#db2777] to-[#be185d]",
    swatchGradient: "bg-gradient-to-br from-pink-400 via-rose-500 to-pink-600",
    textColor: "text-white",
    borderColor: "border-pink-400/20",
    chipColor: "bg-yellow-300/90 border-amber-500/40",
    contrastLogo: false,
  },
] as const;

export function getCardTheme(themeId?: string): CardTheme {
  const found = CARD_THEMES.find((t) => t.id === themeId);
  return found ?? CARD_THEMES[1]; // default to gold
}
