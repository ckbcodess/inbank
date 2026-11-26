"use client";

import { Suspense } from "react";
import LocateUs from "@/components/locations/LocateUs";

export default function LocateUsPage() {
  return (
    <Suspense fallback={null}>
      <LocateUs />
    </Suspense>
  );
}
