"use client";

import React from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode } from "@/components/ui/qr-code";
import { GCBLogo } from "@/components/ui/GCBLogo";
import { toast } from "sonner";
import { accountsForProfile } from "@/lib/mock-data";
import { useSession } from "@/lib/session-store";
import { ScanLine, Share2, Download } from "@/components/ui/icons";

interface PersonalQrModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PersonalQrModal({ open, onOpenChange }: PersonalQrModalProps) {
  const { actor } = useSession();
  const userName = actor?.name || "Ransford Gyasi";
  const accounts = accountsForProfile("RETAIL");
  const primaryAccount = accounts[0] || {
    name: "Operating Account",
    number: "0313",
  };

  const handleShare = async () => {
    const shareText = `GCB GhQR Payment Details\nName: ${userName}\nAccount: ${primaryAccount.name} (∗∗∗∗ ${primaryAccount.number.replace(/\s+/g, "").slice(-4)})\nBank: GCB Bank PLC`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "My GCB QR Code",
          text: shareText,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    await navigator.clipboard.writeText(shareText);
    toast.success("Account QR details copied to clipboard");
  };

  const handleDownload = () => {
    toast.success("Personal QR code saved to downloads");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>My QR Code</DialogTitle>
        </DialogHeader>

        <DialogBody className="flex flex-col items-center py-3 gap-3">
          {/* Centered White Rounded QR Card */}
          <div className="flex flex-col items-center justify-center rounded-2xl bg-white text-slate-900 p-5 shadow-sm border border-border/60 w-[240px] sm:w-[260px] aspect-square">
            <QrCode
              value={`00020101021226500010com.ghana.pay0115GCB-0313-982105204541153039365802GH59${String(userName.length).padStart(2, "0")}${userName.toUpperCase()}6005ACCRA62140110GCB03139826304${primaryAccount.number.replace(/\s+/g, "").slice(-4)}`}
              size={190}
              className="size-full"
              centerLogo={
                <GCBLogo
                  className="size-5 text-black"
                  eagleColor="#1C1C1E"
                  wordmarkColor="#1C1C1E"
                />
              }
            />
          </div>

          {/* User & Account details */}
          <div className="flex flex-col items-center text-center">
            <span className="text-[15px] font-semibold text-foreground">
              {userName}
            </span>
            <span className="text-[12px] text-muted-foreground font-mono">
              {primaryAccount.name} ∗∗∗∗ {primaryAccount.number.replace(/\s+/g, "").slice(-4)}
            </span>
            <p className="text-[11px] text-muted-foreground/80 pt-2 max-w-[260px] text-center">
              Scan with any GhQR, GhanaPay, or mobile banking app to receive instant payments.
            </p>
          </div>
        </DialogBody>

        <DialogFooter className="flex flex-col gap-2 sm:flex-col">
          <div className="flex w-full gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-9"
              onClick={handleShare}
            >
              <Share2 size={14} className="mr-2" />
              Share
            </Button>
            <Button
              type="button"
              className="flex-1 h-9 bg-primary text-primary-foreground hover:bg-primary-hover shadow-xs"
              onClick={handleDownload}
            >
              <Download size={14} className="mr-2" />
              Download
            </Button>
          </div>

          <Link
            href="/payments/send?rail=qr&mode=myqr"
            onClick={() => onOpenChange(false)}
            className="flex items-center justify-center gap-2 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors pt-1 cursor-pointer"
          >
            <ScanLine size={13} />
            <span>Open scanner to pay a merchant</span>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
