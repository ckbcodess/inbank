import type { ReactNode } from "react";
import { Landmark } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

/**
 * The "which account is this about" tag that sits beside a page title, in place
 * of a sentence under it. Keeps the title row to one line and the account
 * findable at a glance. Pass `title` for the long-form meaning on hover.
 */
export function ContextChip({
  children,
  title,
  icon = true,
  className,
}: {
  children: ReactNode;
  title?: string;
  icon?: boolean;
  className?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex min-w-0 max-w-full items-center gap-2 rounded-full bg-muted px-2 py-1 text-[12px] leading-none text-muted-foreground",
        className,
      )}
    >
      {icon && <Landmark size={13} className="shrink-0" aria-hidden="true" />}
      <span className="truncate">{children}</span>
    </span>
  );
}
