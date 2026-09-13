"use client";

import { Suspense } from "react";
import CreateGroupFlow from "@/components/payments/CreateGroupFlow";

export default function NewGroupPage() {
  return (
    <Suspense fallback={null}>
      <CreateGroupFlow />
    </Suspense>
  );
}
