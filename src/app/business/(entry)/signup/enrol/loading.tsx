import AuthHeader from "@/components/auth/AuthHeader";
import { AuthPageSkeleton } from "@/components/states/AuthPageSkeleton";
import { Bone } from "@/components/states/PageSkeletons";
import { Skeleton } from "skullet/react";

/**
 * Shaped like the screen it stands in for, so nothing collapses when the page arrives (designer, 2026-11-26): the
 * card on phones and narrow windows, and on a wide screen the steps down the left with the form beside them and the
 * pinned button row (`EnrolmentDesktopShell`). CSS picks one, so it is right before any script runs.
 */
export default function Loading() {
  return (
    <>
      <div className="lg:hidden">
        <AuthPageSkeleton fields={3} />
      </div>
      <div data-auth-shell className="shell-backdrop hidden min-h-dvh lg:block">
        <AuthHeader />
        <div role="status" aria-busy="true" className="flex h-dvh pt-14">
          <span className="sr-only">Loading</span>
          <Skeleton loading label="Loading">
            <div className="flex w-full">
              <div className="flex w-64 shrink-0 flex-col gap-5 border-r border-border px-8 py-12">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Bone className="size-6 rounded-full" />
                    <Bone className="h-4 w-28" />
                  </div>
                ))}
              </div>
              <div className="shell-card flex min-w-0 flex-1 flex-col">
                <div className="flex-1 px-12 py-12">
                  <div className="mx-auto flex max-w-[600px] flex-col gap-8">
                    <Bone className="h-4 w-14" />
                    <div className="flex flex-col gap-3">
                      <Bone className="h-7 w-56 rounded-lg" />
                      <Bone className="h-4 w-full max-w-[420px]" />
                    </div>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex flex-col gap-2">
                        <Bone className="h-3 w-24" />
                        <Bone className="h-11 w-full rounded-xl" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border-t border-border px-12 py-5">
                  <div className="mx-auto flex max-w-[600px] justify-end">
                    <Bone className="h-11 w-40 rounded-xl" />
                  </div>
                </div>
              </div>
            </div>
          </Skeleton>
        </div>
      </div>
    </>
  );
}
