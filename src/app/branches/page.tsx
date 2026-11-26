"use client";

/**
 * Branches and ATMs before login: the same list as /locate-us, under the login header. Every "Find a Branch" on the
 * login, activation, reset and business onboarding screens opens this instead of sending people to the bank's website
 * (designer, 2026-11-26). Back returns to the screen they came from.
 */

import { Suspense } from "react";
import AuthHeader from "@/components/auth/AuthHeader";
import LocateUs from "@/components/locations/LocateUs";
import { useContextualBack } from "@/lib/contextual-back";

function Branches() {
  const { handleBack } = useContextualBack("/login");
  return <LocateUs backTo={{ href: "/login", label: "previous page", onClick: handleBack }} />;
}

export default function BranchesPage() {
  return (
    <div className="min-h-dvh bg-background">
      <AuthHeader />
      <main className="px-3 pt-20 pb-16 sm:px-6">
        <Suspense fallback={null}>
          <Branches />
        </Suspense>
      </main>
    </div>
  );
}
