import { Bone } from "@/components/states/PageSkeletons";

/**
 * What the card detail page shows while it loads, shaped like the page that is coming: back arrow and name, the card,
 * its one-line caption, three round actions spread across the card's width, then the list of tiles. The classes and gaps
 * mirror `VirtualCardDetailsView` so nothing moves when the real page lands.
 */
export default function CardDetailsLoading() {
  return (
    <div role="status" aria-busy="true" className="mx-auto flex w-full max-w-[440px] flex-col gap-10 sm:gap-12">
      <span className="sr-only">Loading</span>

      {/* Back arrow and the card's name */}
      <div className="flex min-w-0 items-center gap-3">
        <Bone className="size-9 shrink-0 rounded-lg" />
        <Bone className="h-6 w-44 rounded-lg" />
      </div>

      <div className="flex w-full flex-col gap-10">
        <div className="flex flex-col gap-9">
          {/* The card and its caption line */}
          <div className="flex flex-col gap-3">
            <Bone className="mx-auto aspect-[1.586/1] w-full max-w-[360px] rounded-2xl" />
            <div className="flex h-8 items-center justify-center">
              <Bone className="h-4 w-48 rounded" />
            </div>
          </div>

          {/* Three round actions with their labels */}
          <div className="mx-auto flex w-full max-w-[360px] items-start justify-between">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <Bone className="size-14 rounded-full" />
                <Bone className="h-3.5 w-16 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* The list of tiles */}
        <div className="flex flex-col gap-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4 rounded-[16px] bg-[var(--tile)] p-4">
              <Bone className="size-[38.5px] shrink-0 rounded-lg bg-muted" />
              <Bone className="h-4 w-40 rounded bg-muted" />
              <Bone className="ml-auto h-4 w-20 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
