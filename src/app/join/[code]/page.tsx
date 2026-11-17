"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { rememberReferralFromLink } from "@/lib/referrals";

/**
 * Where a shared referral link lands. It keeps the code, then sends the friend to the start of onboarding. The referral
 * step after onboarding opens with the code already filled in and its owner named.
 */
export default function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  useEffect(() => {
    rememberReferralFromLink(decodeURIComponent(code));
    router.replace("/get-started");
  }, [code, router]);
  return null;
}
