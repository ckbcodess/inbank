import { Bone } from "@/components/states/PageSkeletons";

export default function RequestCardLoading() {
  return (
    <div role="status" aria-busy="true" className="mx-auto flex w-full max-w-[540px] flex-col gap-6">
      <span className="sr-only">Loading</span>
      <Bone className="h-7 w-48 rounded-lg" />
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <Bone key={i} className="h-[76px] w-full rounded-2xl" style={{ animationDelay: `${i * 60}ms` }} />
        ))}
      </div>
    </div>
  );
}
