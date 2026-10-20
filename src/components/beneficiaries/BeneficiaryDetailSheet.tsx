"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Pencil, Send, Smartphone, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTitle, SheetDescription, SheetCard, SheetRow } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { PayeeAvatar } from "@/components/ui/payee-avatar";
import { type BeneficiaryRecord, type TransactionType } from "@/lib/beneficiaries-store";
import { RoundAction } from "@/components/ui/round-action";

interface BeneficiaryDetailSheetProps {
  beneficiary: BeneficiaryRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (beneficiary: BeneficiaryRecord) => void;
  onRemove: (beneficiary: BeneficiaryRecord) => void;
}

function getBeneficiaryCategory(type: TransactionType): string {
  switch (type) {
    case "bill":
      return "Bill";
    case "airtime":
      return "Airtime and data";
    case "wallet":
      return "Mobile wallet";
    case "proxy":
      return "Proxy ID";
    case "swift":
      return "International wire";
    case "papss":
      return "Cross-border (PAPSS)";
    case "bank":
    default:
      return "Bank account";
  }
}

export function BeneficiaryDetailSheet({
  beneficiary,
  open,
  onOpenChange,
  onEdit,
  onRemove,
}: BeneficiaryDetailSheetProps) {
  const router = useRouter();
  const [copied, setCopied] = React.useState(false);

  if (!beneficiary) return null;

  const isCompany = beneficiary.transactionType === "bill" || beneficiary.transactionType === "airtime";
  const identifier =
    beneficiary.accountNumber ||
    beneficiary.phoneNumber ||
    beneficiary.proxyId ||
    beneficiary.billerReference ||
    "";

  const identifierLabel =
    beneficiary.transactionType === "bill"
      ? "Account / Meter"
      : beneficiary.transactionType === "wallet" || beneficiary.transactionType === "airtime"
      ? "Phone Number"
      : beneficiary.transactionType === "proxy"
      ? "Proxy ID"
      : "Account Number";

  const providerName = beneficiary.billerName || beneficiary.bankName || beneficiary.network || "GCB Bank";
  const copyText = async (text: string, done: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(done);
      return true;
    } catch {
      toast.error("Failed to copy");
      return false;
    }
  };

  const handleCopyIdentifier = async () => {
    if (!identifier) return;
    if (await copyText(identifier, `${identifierLabel} copied`)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSendMoney = () => {
    onOpenChange(false);
    let sendHref = `/payments/send?recipient=${encodeURIComponent(beneficiary.name)}`;
    if (beneficiary.accountNumber) sendHref += `&account=${encodeURIComponent(beneficiary.accountNumber)}`;
    else if (beneficiary.phoneNumber) sendHref += `&account=${encodeURIComponent(beneficiary.phoneNumber)}`;
    else if (beneficiary.proxyId) sendHref += `&proxy=${encodeURIComponent(beneficiary.proxyId)}`;
    else if (beneficiary.billerReference) sendHref += `&ref=${encodeURIComponent(beneficiary.billerReference)}`;
    router.push(sendHref);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col">
        {/* Who it is, then the details listed out; the block is centred in the space above the actions, like the receipt */}
        <div className="flex flex-1 flex-col justify-center overflow-y-auto px-5 pt-12 pb-5 no-scrollbar sm:px-8">
          <div className="flex flex-col items-center gap-1 pb-6 text-center">
            <PayeeAvatar
              name={beneficiary.name}
              size="xl"
              icon={isCompany ? (beneficiary.transactionType === "bill" ? Zap : Smartphone) : undefined}
            />
            <SheetTitle className="mt-3">{beneficiary.name}</SheetTitle>
            <SheetDescription className="flex flex-wrap items-center justify-center gap-2 text-[13px] text-muted-foreground">
              {getBeneficiaryCategory(beneficiary.transactionType)}
              {!beneficiary.verified && (
                <Badge variant="warning" className="text-[10px] py-0 px-2">
                  Pending approval
                </Badge>
              )}
            </SheetDescription>
          </div>

          <SheetCard>
            {identifier && (
              <SheetRow>
                <span className="text-muted-foreground font-normal">{identifierLabel}</span>
                <button
                  type="button"
                  onClick={handleCopyIdentifier}
                  className="group flex items-center gap-2 text-foreground font-medium tabular cursor-pointer"
                  title="Copy"
                >
                  <span>{identifier}</span>
                  {copied ? (
                    <Check size={13} strokeWidth={1.8} className="text-success-text" />
                  ) : (
                    <Copy
                      size={13}
                      strokeWidth={1.7}
                      className="text-muted-foreground group-hover:text-foreground transition-colors"
                    />
                  )}
                </button>
              </SheetRow>
            )}
            <SheetRow
              label={beneficiary.transactionType === "bill" ? "Biller" : "Bank / Provider"}
              value={providerName}
            />
            {beneficiary.currency && <SheetRow label="Currency" value={beneficiary.currency} />}
            {beneficiary.country && <SheetRow label="Country" value={beneficiary.country} />}
          </SheetCard>
        </div>

        {/* Round actions, pinned to the foot of the sheet */}
        <div className="shrink-0 px-5 pb-6 pt-3 sm:px-8">
          <div className="flex items-center justify-center gap-5">
            <RoundAction label="Send" icon={Send} onClick={handleSendMoney} />
            <RoundAction
              label="Edit"
              icon={Pencil} chipClassName="bg-muted text-foreground group-hover:bg-muted/70"
              onClick={() => {
                onOpenChange(false);
                onEdit(beneficiary);
              }}
            />
            <RoundAction
              label="Remove"
              icon={Trash2} chipClassName="bg-muted text-destructive-text group-hover:bg-muted/70"
              onClick={() => {
                onOpenChange(false);
                onRemove(beneficiary);
              }}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
