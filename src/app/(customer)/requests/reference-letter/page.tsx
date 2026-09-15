"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Download,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "@/lib/session-store";
import { accountsForProfile, formatMoney } from "@/lib/mock-data";
import { toast } from "sonner";

const PURPOSES = [
  "Visa & Embassy Application",
  "Proof of Financial Standing / Solvency",
  "Account Confirmation & Status",
  "Academic & University Enrollment",
  "Business Tender & Contract Award",
  "To Whom It May Concern (General)",
];

const COMMON_RECIPIENTS = [
  "Embassy of the United States of America",
  "British High Commission, Accra",
  "Canadian High Commission, Ghana",
  "German Embassy, Accra",
  "VFS Global Visa Application Centre",
  "TLScontact Visa Processing Centre",
  "To Whom It May Concern",
  "Other (Specify Below)",
];

const BRANCHES = [
  "Accra Main Branch — High Street",
  "Airport City Branch — Silver Star Tower",
  "Legon Branch — University of Ghana",
  "Tema Main Branch — Community 1",
  "Kumasi Main Branch — Harper Road",
  "Takoradi Main Branch — Market Circle",
  "Tamale Main Branch — Central Market",
];

export default function ReferenceLetterPage() {
  const router = useRouter();
  const { activeProfile } = useSession();
  const accounts = useMemo(() => accountsForProfile(activeProfile?.kind), [activeProfile?.kind]);

  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const [purpose, setPurpose] = useState(PURPOSES[0]);
  const [recipientChoice, setRecipientChoice] = useState(COMMON_RECIPIENTS[0]);
  const [customRecipient, setCustomRecipient] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [includeBalance, setIncludeBalance] = useState<"yes" | "no">("yes");
  const [deliveryMethod, setDeliveryMethod] = useState<"digital" | "physical">("digital");
  const [pickupBranch, setPickupBranch] = useState(BRANCHES[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [letterRef, setLetterRef] = useState("");

  const selectedAccount = accounts.find((a) => a.id === accountId) || accounts[0];
  const fee = deliveryMethod === "digital" ? 50 : 75;

  const resolvedRecipient =
    recipientChoice === "Other (Specify Below)"
      ? customRecipient || "To Whom It May Concern"
      : recipientChoice;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAccount) return;
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      const generatedRef = `LTR-2026-${Math.floor(10000 + Math.random() * 90000)}`;
      setLetterRef(generatedRef);
      setIsCompleted(true);
      toast.success("Bank reference letter generated successfully");
    }, 1200);
  }

  if (isCompleted) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6 py-4 animate-in fade-in duration-200">
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 flex flex-col items-center text-center shadow-xs">
          <div className="flex size-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-4">
            <CheckCircle2 size={32} strokeWidth={1.9} />
          </div>

          <h1 className="text-[20px] font-medium tracking-tight text-foreground mb-1.5">
            Reference Letter {deliveryMethod === "digital" ? "Generated" : "Requested"}
          </h1>
          <p className="text-[13.5px] text-muted-foreground max-w-sm mb-6">
            {deliveryMethod === "digital"
              ? "Your certified bank reference letter with verifiable QR security seal is ready for download."
              : `Your request has been submitted. Your physical embossed letter will be ready at ${pickupBranch} within 2 business days.`}
          </p>

          {/* Receipt / Details Card */}
          <div className="w-full rounded-xl border border-border bg-muted/30 p-4 divide-y divide-border/60 text-[13px] mb-6">
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Reference Number</span>
              <span className="font-mono text-foreground">{letterRef}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Account</span>
              <span className="text-foreground">{selectedAccount?.name} ({selectedAccount?.number.slice(-4)})</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Addressed To</span>
              <span className="text-foreground text-right max-w-[220px] truncate">{resolvedRecipient}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Purpose</span>
              <span className="text-foreground">{purpose}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Delivery Format</span>
              <span className="text-foreground">{deliveryMethod === "digital" ? "Digital PDF with QR Seal" : "Embossed Hard Copy"}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Issuance Fee</span>
              <span className="text-foreground tabular-nums">GHS {fee.toFixed(2)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            {deliveryMethod === "digital" && (
              <Button
                type="button"
                className="w-full gap-2 h-10 text-[13.5px]"
                onClick={() => {
                  toast.success("Downloading certified PDF reference letter...");
                }}
              >
                <Download size={15} strokeWidth={2} />
                Download Certified Letter
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              className="w-full h-10 text-[13.5px]"
              onClick={() => router.push("/accounts")}
            >
              Done & Return to Accounts
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-2">
      <PageHeader
        title="Bank Reference Letter"
        description="Request an official bank reference or embassy confirmation letter for your account."
        backTo={{ href: "/accounts", label: "Accounts" }}
      />

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 flex flex-col gap-5 shadow-xs">
          {/* Source Account */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="account-select" className="text-[13px] text-muted-foreground">
              Select Account
            </Label>
            <Select value={accountId} onValueChange={(val) => { if (val) setAccountId(val); }}>
              <SelectTrigger id="account-select" className="h-11">
                <SelectValue placeholder="Choose an account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    <div className="flex items-center justify-between w-full gap-4">
                      <span>{acc.name} · {acc.number}</span>
                      <span className="text-muted-foreground text-xs tabular-nums">
                        {formatMoney(acc.balance, acc.currency)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Purpose */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="purpose-select" className="text-[13px] text-muted-foreground">
              Purpose of Letter
            </Label>
            <Select value={purpose} onValueChange={(val) => { if (val) setPurpose(val); }}>
              <SelectTrigger id="purpose-select" className="h-11">
                <SelectValue placeholder="Select purpose" />
              </SelectTrigger>
              <SelectContent>
                {PURPOSES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Recipient */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="recipient-select" className="text-[13px] text-muted-foreground">
              Addressed To / Recipient
            </Label>
            <Select value={recipientChoice} onValueChange={(val) => { if (val) setRecipientChoice(val); }}>
              <SelectTrigger id="recipient-select" className="h-11">
                <SelectValue placeholder="Select destination embassy or organization" />
              </SelectTrigger>
              <SelectContent>
                {COMMON_RECIPIENTS.map((rec) => (
                  <SelectItem key={rec} value={rec}>
                    {rec}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {recipientChoice === "Other (Specify Below)" && (
            <div className="flex flex-col gap-1.5 animate-in fade-in duration-150">
              <Label htmlFor="custom-recipient" className="text-[13px] text-muted-foreground">
                Organization / Recipient Name
              </Label>
              <Input
                id="custom-recipient"
                value={customRecipient}
                onChange={(e) => setCustomRecipient(e.target.value)}
                placeholder="e.g. Embassy of France / University of Ghana"
                className="h-11"
                required
              />
            </div>
          )}

          {/* Optional Attention/Address */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="recipient-address" className="text-[13px] text-muted-foreground">
              Specific Address or Department <span className="text-xs text-muted-foreground/80">(Optional)</span>
            </Label>
            <Input
              id="recipient-address"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              placeholder="e.g. Visa Section, Consular Division, Cantonments, Accra"
              className="h-11"
            />
          </div>

          {/* Balance Disclosure Option */}
          <div className="flex flex-col gap-2 pt-2 border-t border-border/60">
            <Label className="text-[13px] text-muted-foreground">
              Financial Information to Include
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIncludeBalance("yes")}
                className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors cursor-pointer ${
                  includeBalance === "yes"
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-muted/40"
                }`}
              >
                <span className="flex size-4 mt-0.5 rounded-full border border-current items-center justify-center">
                  {includeBalance === "yes" && <span className="size-2 rounded-full bg-primary" />}
                </span>
                <div className="flex flex-col">
                  <span className="text-[13px] font-medium text-foreground">Include Available Balance</span>
                  <span className="text-[11.5px] text-muted-foreground">Shows current & 6-month average balance</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIncludeBalance("no")}
                className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors cursor-pointer ${
                  includeBalance === "no"
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-muted/40"
                }`}
              >
                <span className="flex size-4 mt-0.5 rounded-full border border-current items-center justify-center">
                  {includeBalance === "no" && <span className="size-2 rounded-full bg-primary" />}
                </span>
                <div className="flex flex-col">
                  <span className="text-[13px] font-medium text-foreground">Confirmation Only</span>
                  <span className="text-[11.5px] text-muted-foreground">Confirms active status without account figures</span>
                </div>
              </button>
            </div>
          </div>

          {/* Delivery Method */}
          <div className="flex flex-col gap-2 pt-2 border-t border-border/60">
            <Label className="text-[13px] text-muted-foreground">
              Delivery Method
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDeliveryMethod("digital")}
                className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors cursor-pointer ${
                  deliveryMethod === "digital"
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-muted/40"
                }`}
              >
                <span className="flex size-4 mt-0.5 rounded-full border border-current items-center justify-center">
                  {deliveryMethod === "digital" && <span className="size-2 rounded-full bg-primary" />}
                </span>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-medium text-foreground">Certified Digital PDF</span>
                    <span className="text-[10.5px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-medium">Instant</span>
                  </div>
                  <span className="text-[11.5px] text-muted-foreground">QR code verification · Fee: GHS 50.00</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDeliveryMethod("physical")}
                className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors cursor-pointer ${
                  deliveryMethod === "physical"
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-muted/40"
                }`}
              >
                <span className="flex size-4 mt-0.5 rounded-full border border-current items-center justify-center">
                  {deliveryMethod === "physical" && <span className="size-2 rounded-full bg-primary" />}
                </span>
                <div className="flex flex-col">
                  <span className="text-[13px] font-medium text-foreground">Embossed Physical Copy</span>
                  <span className="text-[11.5px] text-muted-foreground">Branch collection in 2 days · Fee: GHS 75.00</span>
                </div>
              </button>
            </div>
          </div>

          {deliveryMethod === "physical" && (
            <div className="flex flex-col gap-1.5 animate-in fade-in duration-150">
              <Label htmlFor="branch-select" className="text-[13px] text-muted-foreground">
                Pickup Branch
              </Label>
              <Select value={pickupBranch} onValueChange={(val) => { if (val) setPickupBranch(val); }}>
                <SelectTrigger id="branch-select" className="h-11">
                  <SelectValue placeholder="Choose collection branch" />
                </SelectTrigger>
                <SelectContent>
                  {BRANCHES.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Security / Legal Notice */}
        <div className="flex items-start gap-3 rounded-xl border border-border/80 bg-muted/40 p-4 text-[12.5px] text-muted-foreground">
          <ShieldCheck size={18} className="text-primary mt-0.5 shrink-0" />
          <p>
            Official bank letters are digitally signed and contain a secure QR code that embassies and institutions scan to verify legitimacy directly against GCB core banking servers.
          </p>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/accounts")}
            className="h-11 px-5 text-[13.5px]"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !selectedAccount}
            className="h-11 px-6 text-[13.5px] font-medium"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Generating Letter...
              </span>
            ) : (
              `Authorize & Pay GHS ${fee.toFixed(2)}`
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
