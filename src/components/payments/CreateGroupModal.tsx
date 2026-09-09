"use client";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { type PaymentGroup } from "@/lib/groups-store";
import CreateGroupFlow from "@/components/payments/CreateGroupFlow";

interface CreateGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupToEdit?: PaymentGroup | null;
  onSuccess?: (group: PaymentGroup) => void;
}

export default function CreateGroupModal({
  open,
  onOpenChange,
  groupToEdit,
  onSuccess,
}: CreateGroupModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-2xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 rounded-[20px] border border-border/80 bg-card shadow-2xl"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">
          {groupToEdit ? "Edit Payment Group" : "Create Payment Group"}
        </DialogTitle>
        <CreateGroupFlow
          groupToEdit={groupToEdit}
          onCancel={() => onOpenChange(false)}
          onSuccess={(group) => {
            onSuccess?.(group);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
