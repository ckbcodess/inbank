"use client";

import { usePathname } from "next/navigation";
import { AdminDashboardSkeleton, ListPageSkeleton } from "@/components/states/PageSkeletons";

/** The dashboard has its own shape; every other admin page that has no loading file of its own is a list. */
export default function Loading() {
  const pathname = usePathname();
  return pathname === "/admin" ? <AdminDashboardSkeleton /> : <ListPageSkeleton action={false} />;
}
