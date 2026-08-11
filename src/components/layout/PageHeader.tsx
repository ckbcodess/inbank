import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  /**
   * Object detail screens are reached only from their parent list (12.4/12.5),
   * so they carry an explicit way back rather than a nav entry.
   */
  backTo?: { href: string; label: string };
}

export default function PageHeader({ title, description, actions, backTo }: PageHeaderProps) {
  return (
    <div className="mb-7">
      {backTo && (
        <Link
          href={backTo.href}
          className="mb-3 inline-flex items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft size={15} strokeWidth={1.8} aria-hidden="true" />
          {backTo.label}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[22px] leading-tight tracking-[-0.01em] text-foreground">{title}</h1>
          {description && (
            <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
