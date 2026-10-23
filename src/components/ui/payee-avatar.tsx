import { cn } from "@/lib/utils";

type IconType = React.ElementType;

/** The tints a person can take (`--avatar-<name>`). Picked from the name, so one person looks the same everywhere. */
const TINTS = ["teal", "sand", "green", "lilac", "blue", "yellow", "pink"] as const;

function tintFor(name: string): (typeof TINTS)[number] {
  let h = 0;
  for (const ch of name.trim().toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TINTS[h % TINTS.length];
}

export function payeeInitials(name: string): string {
  const clean = name.replace(/[()[\]]/g, " ").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
  return (clean.slice(0, 2) || "??").toUpperCase();
}

const SIZE = {
  sm: "size-8 text-[13px]",
  md: "size-9 text-[13px] sm:size-10 sm:text-[13px]",
  lg: "size-12 text-[16px]",
  xl: "size-17 text-[26px]",
} as const;

/**
 * The one picture of a saved person or business: a tinted circle with their initials (or an icon for a biller).
 * Every list, picker and strip uses this, so a beneficiary never changes shape or colour between screens.
 */
export function PayeeAvatar({
  name,
  initials,
  icon: Icon,
  size = "md",
  className,
}: {
  name: string;
  /** Overrides the initials drawn from the name (for example "ECG" for a biller). */
  initials?: string;
  /** Shown in place of initials, for a biller or an airtime provider. */
  icon?: IconType;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 select-none items-center justify-center rounded-full border border-black/5 bg-[var(--tint)] on-tint tracking-[var(--ls-label)] transition-[filter] duration-150 dark:border-white/10",
        "group-hover:saturate-150 group-hover:brightness-[0.97] dark:group-hover:saturate-200 dark:group-hover:brightness-[0.85]",
        SIZE[size],
        className,
      )}
      style={{ "--tint": `var(--avatar-${tintFor(name)})` } as React.CSSProperties}
      aria-hidden="true"
    >
      {Icon ? <Icon size={size === "xl" ? 30 : size === "lg" ? 22 : 17} /> : (initials ?? payeeInitials(name))}
    </span>
  );
}
