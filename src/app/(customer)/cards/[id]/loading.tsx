import { Bone } from "@/components/states/PageSkeletons";

/**
 * What the card detail page shows while it loads, shaped like the page that is coming: back arrow and name, the card,
 * its one-line caption, three round actions spread across the card's width, then the list of tiles. The classes and gaps
 * mirror `VirtualCardDetailsView` so nothing moves when the real page lands.
 */
export default function CardDetailsLoading() {
  return (
    <div role="status" aria-busy="true" className="mx-auto flex w-full max-w-[440px] flex-col gap-10 sm:gap-10 lg:max-w-[1000px]">
      <span className="sr-only">Loading</span>

      {/* Back arrow and the card's name */}
      <div data-page-header className="flex min-w-0 items-center gap-2">
        <Bone className="size-8 shrink-0 rounded-lg" />
        <Bone className="h-5 w-38 rounded-lg" />
      </div>

      <div className="grid w-full gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start lg:gap-5">
        <div className="flex flex-col gap-8">
          {/* The card and its caption line */}
          <div className="flex flex-col gap-2">
            <Bone className="mx-auto aspect-[1.586/1] w-full max-w-[360px] rounded-2xl lg:w-[78%] lg:max-w-none" />
            <div className="flex h-7 items-center justify-center">
              <Bone className="h-3.5 w-42 rounded-sm" />
            </div>
          </div>

          {/* Three round actions with their labels */}
          <div className="mx-auto flex w-full max-w-[360px] items-start justify-between lg:w-[78%] lg:max-w-none">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <Bone className="size-12 rounded-full" />
                <Bone className="h-3 w-14 rounded-sm" />
              </div>
            ))}
          </div>
        </div>

        {/* The list of tiles */}
        <div className="flex flex-col gap-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-2xl bg-[var(--tile)] p-3">
              <Bone className="size-10 shrink-0 rounded-lg bg-muted" />
              <Bone className="h-3.5 w-35 rounded-sm bg-muted" />
              <Bone className="ml-auto h-3.5 w-17 rounded-sm bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
