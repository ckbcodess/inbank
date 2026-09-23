export default function TransactionDetailLoading() {
  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto animate-in fade-in duration-200">
      {/* Back button & Title Skeleton */}
      <div className="flex items-center gap-3">
        <div className="size-9 rounded-lg bg-muted/60 animate-pulse shrink-0" />
        <div className="space-y-1.5 flex-1">
          <div className="h-6 w-48 rounded bg-muted/60 animate-pulse" />
          <div className="h-3.5 w-32 rounded bg-muted/40 animate-pulse" />
        </div>
        <div className="h-9 w-20 rounded-xl bg-muted/50 animate-pulse" />
      </div>

      {/* Hero Amount Card Skeleton */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 flex flex-col items-center justify-center gap-3 text-center shadow-xs">
        <div className="h-4 w-28 rounded bg-muted/40 animate-pulse" />
        <div className="h-10 w-44 rounded-lg bg-muted/70 animate-pulse" />
        <div className="h-5 w-24 rounded-full bg-muted/50 animate-pulse" />
      </div>

      {/* Detail Attributes List Skeleton */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 divide-y divide-border/50 shadow-xs">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="py-3.5 flex items-center justify-between gap-4">
            <div className="h-3.5 w-28 rounded bg-muted/50 animate-pulse" />
            <div className="h-4 w-36 rounded bg-muted/60 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
