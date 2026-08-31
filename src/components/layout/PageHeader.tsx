import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  badge?: ReactNode;
  description?: string;
  actions?: ReactNode;
  /**
   * Object detail screens carry parent link info which renders a back navigation button
   */
  backTo?: { href: string; label: string };
  /** Explicit breadcrumbs override (optional) */
  breadcrumbs?: BreadcrumbItem[];
}

export default function PageHeader({ title, badge, actions, backTo }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3 min-w-0">
        {backTo && (
          <Link
            href={backTo.href}
            className="group flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-95"
            title={`Back to ${backTo.label}`}
            aria-label={`Back to ${backTo.label}`}
          >
            <ChevronLeft size={16} strokeWidth={2} className="transition-transform group-hover:-translate-x-0.5" />
          </Link>
        )}
        <h1 className="text-[26px] font-medium leading-[32px] tracking-[-0.02em] text-foreground truncate">{title}</h1>
        {badge && <div className="shrink-0">{badge}</div>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
    </div>
  );
}
