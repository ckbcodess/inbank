import { ListPageSkeleton } from "@/components/states/PageSkeletons";

export default function Loading() {
  return <ListPageSkeleton rows={4} toolbar={false} />;
}
