"use client";

import React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import CreateGroupFlow from "@/components/payments/CreateGroupFlow";
import { type PaymentGroup } from "@/lib/groups-store";

interface CreateGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupToEdit?: PaymentGroup | null;
  onSuccess?: (group: PaymentGroup) => void;
  onDeleted?: (groupId: string) => void;
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
        className="fixed inset-0 z-50 w-full h-full max-w-none max-h-none rounded-none border-none p-0 overflow-y-auto bg-background"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">
          {groupToEdit ? "Edit Payment Group" : "Create Payment Group"}
        </DialogTitle>
        <CreateGroupFlow
          groupToEdit={groupToEdit}
          onCancel={() => onOpenChange(false)}
          onSuccess={(g) => {
            onOpenChange(false);
            onSuccess?.(g);
          }}
          onDone={(g) => {
            onOpenChange(false);
            onSuccess?.(g);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
