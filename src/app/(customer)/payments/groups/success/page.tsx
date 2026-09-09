"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { useGroupsStore } from "@/lib/groups-store";
import { formatMoney } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const groups = useGroupsStore((s) => s.groups);

  const groupId = searchParams.get("id");
  const queryName = searchParams.get("name");
  const queryRef = searchParams.get("ref") || `GRP-${Math.floor(100000 + Math.random() * 900000)}`;

  // Find group from store or fallback
  const group = groupId
    ? groups.find((g) => g.id === groupId)
    : queryName
    ? groups.find((g) => g.name === queryName)
    : groups[0];

  const groupName = group?.name || queryName || "Payment Group";
  const memberCount = group?.members.length || Number(searchParams.get("members")) || 2;
  const splitType = group?.splitType || "equal";
  const defaultAmount = group?.defaultPerMemberAmount || Number(searchParams.get("amount")) || 200;
  const totalAmount =
    splitType === "equal"
      ? memberCount * defaultAmount
      : group?.members.reduce((s, m) => s + (m.defaultAmount ?? defaultAmount), 0) || memberCount * defaultAmount;

  const createdAt = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-6 animate-in fade-in duration-200">
      <div className="flex flex-col items-center text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mb-3">
          <CheckCircle2 size={32} strokeWidth={2.2} />
        </span>
        <h1 className="text-[24px] font-medium text-foreground">
          Group Created Successfully
        </h1>
        <p className="mt-1 text-[14px] text-muted-foreground">
          Group “{groupName}” is ready for group payments.
        </p>
      </div>

      {/* Structured Receipt Card */}
      <div className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-card p-5 text-[13.5px]">
        <div className="flex items-center justify-between py-2.5">
          <span className="text-muted-foreground">Reference ID</span>
          <span className="font-medium text-foreground tabular">{queryRef}</span>
        </div>

        <div className="flex items-center justify-between py-2.5">
          <span className="text-muted-foreground">Group Name</span>
          <span className="font-medium text-foreground">{groupName}</span>
        </div>

        {group?.description && (
          <div className="flex items-center justify-between py-2.5">
            <span className="text-muted-foreground">Description</span>
            <span className="font-medium text-foreground text-right max-w-[280px] truncate">
              {group.description}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between py-2.5">
          <span className="text-muted-foreground">Split Type</span>
          <span className="font-medium text-foreground capitalize">
            {splitType === "equal" ? "Equal Split" : "Custom Split"}
          </span>
        </div>

        <div className="flex items-center justify-between py-2.5">
          <span className="text-muted-foreground">Total Members</span>
          <span className="font-medium text-foreground tabular">
            {memberCount} members
          </span>
        </div>

        <div className="flex items-center justify-between py-2.5">
          <span className="text-muted-foreground">Amount per Member</span>
          <span className="font-medium text-foreground tabular">
            {splitType === "equal"
              ? formatMoney(defaultAmount, "GHS", true)
              : "Custom per member"}
          </span>
        </div>

        <div className="flex items-center justify-between py-2.5">
          <span className="text-muted-foreground">Total Outflow</span>
          <span className="font-semibold text-foreground tabular">
            {formatMoney(totalAmount, "GHS", true)}
          </span>
        </div>

        <div className="flex items-center justify-between py-2.5">
          <span className="text-muted-foreground">Status</span>
          <span className="font-medium text-emerald-600 dark:text-emerald-400">Active</span>
        </div>

        <div className="flex items-center justify-between py-2.5">
          <span className="text-muted-foreground">Date & Time</span>
          <span className="font-medium text-foreground tabular">{createdAt}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Button
          variant="outline"
          className="w-full sm:flex-1 h-11 rounded-lg text-[14px] font-medium border-border"
          onClick={() => router.push("/payments/groups/new")}
        >
          Create another
        </Button>

        <Button
          variant="outline"
          className="w-full sm:flex-1 h-11 rounded-lg text-[14px] font-medium border-border"
          onClick={() => {
            router.push(
              `/payments/send?rail=group&group=${encodeURIComponent(groupName)}`
            );
          }}
        >
          Pay group
        </Button>

        <Button
          className="w-full sm:flex-1 h-11 rounded-lg text-[14px] font-medium bg-primary text-primary-foreground drop-shadow-sm active:scale-[0.98] cursor-pointer"
          onClick={() => router.push("/beneficiaries")}
        >
          Done
        </Button>
      </div>
    </div>
  );
}

export default function GroupSuccessPage() {
  return (
    <Suspense fallback={null}>
      <SuccessContent />
    </Suspense>
  );
}
