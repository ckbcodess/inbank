import PageHeader from "@/components/layout/PageHeader";
import { AppLoader } from "@/components/ui/loader";

/**
 * Placeholder for a surface that is not built yet. Honest and quiet — no
 * marketing, no fake progress bar. A spinner (the app's own loader) marks it as still being worked on, and the
 * words say where things stand.
 */
export function WorkInProgress({ title }: { title: string }) {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={title} />
      <div className="flex min-h-[52vh] flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card px-5 py-12 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <AppLoader size={22} />
        </span>
        <div className="flex flex-col gap-2">
          <h2 className="text-[18px] tracking-[var(--ls-tight)] text-foreground">Work in progress</h2>
          <p className="max-w-[340px] text-[13px] leading-relaxed text-muted-foreground">
            {title} is on the way — we&rsquo;re still building it.
          </p>
        </div>
      </div>
    </div>
  );
}
