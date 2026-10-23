import AuthLayout from "@/components/auth/AuthLayout";
import { Bone } from "@/components/states/PageSkeletons";

/**
 * A sign-up or sign-in step (business registration, activation). These routes have no app shell, so the skeleton sits
 * inside the real `AuthLayout` (header, banner, column) and only the step's content is bones: a title, a line of
 * description, labelled fields and the primary button.
 */
export function AuthPageSkeleton({ fields = 2 }: { fields?: number }) {
  return (
    <AuthLayout>
      <div role="status" aria-busy="true" className="flex w-full flex-col gap-6">
        <span className="sr-only">Loading</span>
        <div className="flex flex-col gap-3">
          <Bone className="h-7 w-56 rounded-lg" />
          <Bone className="h-4 w-full max-w-[380px]" />
        </div>
        <div className="flex flex-col gap-4">
          {Array.from({ length: fields }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Bone className="h-3 w-24" style={{ animationDelay: `${i * 70}ms` }} />
              <Bone className="h-10 w-full rounded-lg" style={{ animationDelay: `${i * 70}ms` }} />
            </div>
          ))}
          <Bone className="mt-1 h-10 w-full rounded-lg" />
        </div>
      </div>
    </AuthLayout>
  );
}
