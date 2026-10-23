/**
 * The business home's panels, drawn the same way as personal banking's dashboard panels (a rounded panel on the
 * hero sheet, a 16px medium title, a quiet "View all"), so the two homes read as one product. Business has its own
 * copy because the personal ones live in the personal app (components/dashboard), which business can't import.
 */

import Link from "next/link";
import { cn } from "@/lib/utils";

export function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2 overflow-hidden rounded-3xl border border-border bg-panel p-3 sm:h-[260px] sm:p-4", className)}>
      {children}
    </div>
  );
}

export function PanelHeader({ title, href, cta = "View all" }: { title: string; href?: string; cta?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[14px] font-medium leading-none text-foreground sm:text-[16px]">{title}</span>
      {href && (
        <Link href={href} className="-my-2 py-2 text-[12px] text-muted-foreground transition-colors duration-hover hover:text-foreground">
          {cta}
        </Link>
      )}
    </div>
  );
}

/** One row in a panel: what, a quiet line under it, and a figure on the right. The whole row is the link. */
export function PanelRow({
  href,
  title,
  meta,
  figure,
}: {
  href: string;
  title: string;
  meta?: React.ReactNode;
  figure?: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="-mx-2 flex items-center justify-between gap-3 rounded-xl px-2 py-2 transition-colors duration-hover ease-settle hover:bg-[var(--item-hover)]"
      >
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[14px] text-foreground">{title}</span>
          {meta && <span className="truncate text-[12px] text-muted-foreground">{meta}</span>}
        </span>
        {figure && <span className="tabular shrink-0 text-[14px] text-foreground">{figure}</span>}
      </Link>
    </li>
  );
}

/** A panel with nothing in it yet: what's missing, quietly. */
export function PanelEmpty({ text }: { text: string }) {
  return (
    <div className="flex flex-1 items-center justify-center py-6 text-center">
      <p className="text-[13px] text-muted-foreground">{text}</p>
    </div>
  );
}
