export default function CardsListLoading() {
  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-200">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between pb-2">
        <div className="space-y-1.5">
          <div className="h-7 w-24 rounded-lg bg-muted/60 animate-pulse" />
          <div className="h-4 w-52 rounded bg-muted/40 animate-pulse" />
        </div>
        <div className="h-10 w-32 rounded-xl bg-muted/60 animate-pulse" />
      </div>

      {/* Filter Tabs Skeleton */}
      <div className="flex items-center gap-2">
        <div className="h-8 w-20 rounded-full bg-muted/70 animate-pulse" />
        <div className="h-8 w-24 rounded-full bg-muted/40 animate-pulse" />
        <div className="h-8 w-20 rounded-full bg-muted/40 animate-pulse" />
        <div className="h-8 w-16 rounded-full bg-muted/40 animate-pulse" />
      </div>

      {/* Cards List Skeleton */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              {/* Mini Card Thumbnail placeholder */}
              <div className="h-10 w-16 rounded-lg bg-muted/60 animate-pulse shrink-0" />
              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                <div className="h-4 w-36 rounded bg-muted/60 animate-pulse" />
                <div className="h-3 w-28 rounded bg-muted/40 animate-pulse" />
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="h-4 w-20 rounded bg-muted/60 animate-pulse" />
              <div className="size-4 rounded bg-muted/40 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
