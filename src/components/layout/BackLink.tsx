"use client";

import type { ReactNode } from "react";
import { useContextualBack } from "@/lib/contextual-back";

/**
 * A back arrow that behaves like Back, not like a link: pops to the previous
 * in-app page when there is one, otherwise replaces to `href`. Stays an <a> so
 * middle-click / open-in-new-tab still reach the parent.
 */
export function BackLink({
  href,
  className,
  title,
  children,
}: {
  href: string;
  className?: string;
  title?: string;
  children: ReactNode;
}) {
  const { handleBack } = useContextualBack(href);
  return (
    <a
      href={href}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        handleBack();
      }}
      className={className}
      title={title}
      aria-label={title}
    >
      {children}
    </a>
  );
}
