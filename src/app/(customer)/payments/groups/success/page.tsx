"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Users, MessageSquare, ArrowDownToLine } from "lucide-react";
import { useGroupsStore } from "@/lib/groups-store";
import { formatMoney } from "@/lib/mock-data";
import { PaymentSuccessScreen } from "@/components/payments/PaymentSuccessScreen";

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

  const receiptRows: Array<[string, React.ReactNode]> = [
    ["Reference ID", queryRef],
    ["Group Name", groupName],
    ...(group?.description ? [["Description", group.description] as [string, React.ReactNode]] : []),
    ["Split Type", splitType === "equal" ? "Equal Split" : "Custom Split"],
    ["Total Members", `${memberCount} members`],
    [
      "Amount per Member",
      splitType === "equal" ? formatMoney(defaultAmount, "GHS", true) : "Custom per member",
    ],
    ["Total Outflow", formatMoney(totalAmount, "GHS", true)],
    ["Status", "Active"],
    ["Date & Time", createdAt],
  ];

  return (
    <PaymentSuccessScreen
      title="Group Created"
      message={`Group “${groupName}” with ${memberCount} members is ready for group payments.`}
      receiptRows={receiptRows}
      onSecondaryAction={() => router.push("/payments/groups/new")}
      secondaryActionLabel="Create another"
      onPrimaryAction={() => router.push("/beneficiaries")}
      primaryActionLabel="Back to Overview"
      showSaveBeneficiary={true}
      saveBeneficiaryLabel="Save as favourite group?"
      initialSaveBeneficiary={true}
      customActionCards={[
        {
          id: "feedback",
          label: "Share Feedback",
          icon: MessageSquare,
        },
        {
          id: "pay",
          label: "Pay Group",
          icon: Users,
          onClick: () => {
            router.push(
              `/payments/send?rail=group&group=${encodeURIComponent(groupName)}`
            );
          },
        },
        {
          id: "download",
          label: "Download Receipt",
          icon: ArrowDownToLine,
        },
      ]}
    />
  );
}

export default function GroupSuccessPage() {
  return (
    <Suspense fallback={null}>
      <SuccessContent />
    </Suspense>
  );
}
