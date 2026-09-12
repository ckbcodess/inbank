"use client";

import EditGroupModal from "@/components/payments/EditGroupModal";
import type { PaymentGroup } from "@/lib/groups-store";

export interface EditGroupMembersModalProps {
  group: PaymentGroup | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (group: PaymentGroup) => void;
  onDeleted?: (groupId: string) => void;
}

export default function EditGroupMembersModal({
  group,
  open,
  onOpenChange,
  onSaved,
  onDeleted,
}: EditGroupMembersModalProps) {
  return (
    <EditGroupModal
      group={group}
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={onSaved}
      onDeleted={onDeleted}
    />
  );
}
