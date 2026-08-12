import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

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
   * Object detail screens carry parent link info which maps to breadcrumb parent
   */
  backTo?: { href: string; label: string };
  /** Explicit breadcrumbs override, e.g. [{ label: "Cards", href: "/cards" }, { label: "Details" }] */
  breadcrumbs?: BreadcrumbItem[];
}

export default function PageHeader({ title, badge, description, actions, backTo, breadcrumbs }: PageHeaderProps) {
  // Construct breadcrumb items: [Page 1] / [Current Page]
  let items: BreadcrumbItem[] = [];

  if (breadcrumbs && breadcrumbs.length > 0) {
    items = breadcrumbs;
  } else if (backTo) {
    items = [
      { label: backTo.label, href: backTo.href },
      { label: title },
    ];
  }

  // Only render breadcrumbs when two levels or more deep
  const showBreadcrumbs = items.length >= 2;

  return (
    <div className="mb-4">
      {/* Standard Breadcrumb Format: [Page 1] > [Current Page] */}
      {showBreadcrumbs && (
        <nav aria-label="Breadcrumb" className="mb-8 flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
          {items.map((item, idx) => {
            const isLast = idx === items.length - 1;
            return (
              <div key={idx} className="flex items-center gap-1.5">
                {idx > 0 && <ChevronRight size={12} className="text-muted-foreground/50 shrink-0" />}
                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    className="transition-colors hover:text-foreground hover:underline underline-offset-4"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className={isLast ? "font-medium text-foreground" : "text-muted-foreground"}>
                    {item.label}
                  </span>
                )}
              </div>
            );
          })}
        </nav>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-[22px] leading-tight tracking-[-0.01em] text-foreground">{title}</h1>
            {badge && <div className="shrink-0">{badge}</div>}
          </div>
          {description && (
            <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2 pt-0.5">{actions}</div>}
      </div>
    </div>
  );
}
