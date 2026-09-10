import { Hammer } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";

/**
 * Placeholder for a surface that is not built yet. Honest and quiet — no
 * marketing, no fake progress bar. Just says where things stand.
 */
export function WorkInProgress({ title }: { title: string }) {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={title} />
      <div className="flex min-h-[52vh] flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-card px-6 py-16 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Hammer size={20} strokeWidth={1.8} aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1.5">
          <h2 className="text-[18px] tracking-[-0.01em] text-foreground">Work in progress</h2>
          <p className="max-w-[340px] text-[13.5px] leading-relaxed text-muted-foreground">
            {title} is on the way — we&rsquo;re still building it.
          </p>
        </div>
      </div>
    </div>
  );
}
