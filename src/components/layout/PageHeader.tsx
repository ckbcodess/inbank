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
  backTo?: { href: string; label: string; onClick?: () => void };
}

export default function PageHeader({ title, badge, actions, backTo }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3 w-full">
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
        {backTo && (
          backTo.onClick ? (
            <button
              type="button"
              onClick={backTo.onClick}
              className="flex size-8 sm:size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
              title={`Back to ${backTo.label}`}
              aria-label={`Back to ${backTo.label}`}
            >
              <ChevronLeft size={20} strokeWidth={1.8} />
            </button>
          ) : (
            <Link
              href={backTo.href}
              className="flex size-8 sm:size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
              title={`Back to ${backTo.label}`}
              aria-label={`Back to ${backTo.label}`}
            >
              <ChevronLeft size={20} strokeWidth={1.8} />
            </Link>
          )
        )}
        <h1 className="text-[20px] sm:text-[24px] lg:text-[26px] font-medium leading-[26px] sm:leading-[32px] tracking-[-0.02em] text-foreground truncate">
          {title}
        </h1>
        {badge && <div className="shrink-0">{badge}</div>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2 sm:gap-3">{actions}</div>}
    </div>
  );
}
