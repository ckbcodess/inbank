export default function CardDetailsLoading() {
  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-200">
      {/* Breadcrumb Skeleton */}
      <div className="flex items-center gap-2">
        <div className="h-4 w-12 rounded bg-muted/60 animate-pulse" />
        <div className="h-3 w-3 rounded-full bg-muted/40" />
        <div className="h-4 w-32 rounded bg-muted/60 animate-pulse" />
      </div>

      {/* Main 2-Column Layout Skeleton matching Figma Node 5383:9189 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start w-full">
        {/* Left Column: Virtual Card Mockup & Action Buttons */}
        <div className="flex flex-col gap-4 w-full">
          {/* Virtual Card Frame */}
          <div className="relative aspect-[1.586/1] w-full max-w-[420px] rounded-2xl border border-border/80 bg-card/60 p-6 flex flex-col justify-between overflow-hidden shadow-xs">
            {/* Shimmer overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-muted/20 via-muted/40 to-muted/10 animate-pulse" />

            {/* Top row: Chip & Logo */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="h-7 w-9 rounded-md bg-muted/70" />
              <div className="h-5 w-16 rounded bg-muted/70" />
            </div>

            {/* Middle: Masked number placeholder */}
            <div className="relative z-10 flex items-center gap-3">
              <div className="h-4 w-14 rounded bg-muted/70" />
              <div className="h-4 w-14 rounded bg-muted/70" />
              <div className="h-4 w-14 rounded bg-muted/70" />
              <div className="h-4 w-14 rounded bg-muted/70" />
            </div>

            {/* Bottom: Name & Expiry */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="h-3.5 w-28 rounded bg-muted/70" />
              <div className="h-3.5 w-16 rounded bg-muted/70" />
            </div>
          </div>

          {/* 3 Action Buttons */}
          <div className="grid grid-cols-3 gap-2 w-full max-w-[420px]">
            <div className="h-11 rounded-xl bg-muted/50 animate-pulse border border-border/60" />
            <div className="h-11 rounded-xl bg-muted/50 animate-pulse border border-border/60" />
            <div className="h-11 rounded-xl bg-muted/50 animate-pulse border border-border/60" />
          </div>

          {/* Settings list placeholder */}
          <div className="rounded-2xl border border-border/80 bg-card/50 p-4 space-y-3 max-w-[420px]">
            <div className="h-4 w-1/3 rounded bg-muted/60 animate-pulse" />
            <div className="h-10 rounded-xl bg-muted/30 animate-pulse" />
            <div className="h-10 rounded-xl bg-muted/30 animate-pulse" />
          </div>
        </div>

        {/* Right Column: Spending Limits & Activity */}
        <div className="flex flex-col gap-5 w-full">
          {/* Spending Limits Box */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 flex flex-col gap-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="h-4 w-32 rounded bg-muted/60 animate-pulse" />
              <div className="h-4 w-16 rounded bg-muted/40" />
            </div>

            {/* Daily limit bar skeleton */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <div className="h-3.5 w-24 rounded bg-muted/50 animate-pulse" />
                <div className="h-3.5 w-20 rounded bg-muted/50 animate-pulse" />
              </div>
              <div className="h-2 w-full rounded-full bg-muted/50 overflow-hidden">
                <div className="h-full w-2/5 rounded-full bg-muted animate-pulse" />
              </div>
            </div>

            {/* Monthly limit bar skeleton */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <div className="h-3.5 w-28 rounded bg-muted/50 animate-pulse" />
                <div className="h-3.5 w-20 rounded bg-muted/50 animate-pulse" />
              </div>
              <div className="h-2 w-full rounded-full bg-muted/50 overflow-hidden">
                <div className="h-full w-3/5 rounded-full bg-muted animate-pulse" />
              </div>
            </div>
          </div>

          {/* Activity Section Skeleton */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 flex flex-col gap-3 shadow-xs">
            <div className="flex items-center justify-between mb-1">
              <div className="h-4 w-28 rounded bg-muted/60 animate-pulse" />
              <div className="h-3.5 w-14 rounded bg-muted/40" />
            </div>
            <div className="divide-y divide-border/50">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-full bg-muted/60 animate-pulse" />
                    <div className="space-y-1.5">
                      <div className="h-3.5 w-28 rounded bg-muted/60 animate-pulse" />
                      <div className="h-2.5 w-16 rounded bg-muted/40 animate-pulse" />
                    </div>
                  </div>
                  <div className="h-3.5 w-16 rounded bg-muted/60 animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
