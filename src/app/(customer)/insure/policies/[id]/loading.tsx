import { FactsPageSkeleton } from "@/components/states/PageSkeletons";

export default function Loading() {
  return <FactsPageSkeleton facts={6} actions={3} />;
}
