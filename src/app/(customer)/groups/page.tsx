"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GroupsIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/beneficiaries?tab=groups");
  }, [router]);

  return null;
}
