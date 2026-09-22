"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock,
} from "lucide-react";
import { AppLoader } from "@/components/ui/loader";
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

const BOOKLET_SIZES = [
  { leaves: 25, fee: 35.0, label: "25 Leaves (Standard Personal)" },
  { leaves: 50, fee: 60.0, label: "50 Leaves (Regular Usage)" },
  { leaves: 100, fee: 110.0, label: "100 Leaves (Commercial & Frequent)" },
];

const CHEQUE_TYPES = [
  "Standard Account Payee (Crossed)",
  "Order Cheque (Payable to Specified Name)",
  "Bearer Cheque (Standard)",
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

export default function ChequeBookRequestPage() {
  const router = useRouter();
  const { activeProfile, actor } = useSession();
  const accounts = useMemo(() => accountsForProfile(activeProfile?.kind), [activeProfile?.kind]);

  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const [sizeIndex, setSizeIndex] = useState(0);
  const [chequeType, setChequeType] = useState(CHEQUE_TYPES[0]);
  const [printedName, setPrintedName] = useState(actor?.name || "KODJO MENSAH");
  const [pickupBranch, setPickupBranch] = useState(BRANCHES[0]);
  const [notifyPhone, setNotifyPhone] = useState("+233 24 412 3456");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [requestRef, setRequestRef] = useState("");

  const selectedAccount = accounts.find((a) => a.id === accountId) || accounts[0];
  const selectedSize = BOOKLET_SIZES[sizeIndex];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAccount) return;
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      const generatedRef = `CHQ-2026-${Math.floor(10000 + Math.random() * 90000)}`;
      setRequestRef(generatedRef);
      setIsCompleted(true);
      toast.success("Cheque book request submitted successfully");
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
            Cheque Book Request Received
          </h1>
          <p className="text-[13.5px] text-muted-foreground max-w-sm mb-6">
            Your requisition has been dispatched to central clearing. You will receive an SMS alert when your booklet is ready for collection.
          </p>

          {/* Details Card */}
          <div className="w-full rounded-xl border border-border bg-muted/30 p-4 divide-y divide-border/60 text-[13px] mb-6">
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Order Reference</span>
              <span className="font-mono text-foreground">{requestRef}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Account</span>
              <span className="text-foreground">{selectedAccount?.name} ({selectedAccount?.number.slice(-4)})</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Booklet Size</span>
              <span className="text-foreground">{selectedSize.leaves} Leaves</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Cheque Type</span>
              <span className="text-foreground">{chequeType}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Pickup Branch</span>
              <span className="text-foreground">{pickupBranch}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Estimated Ready Date</span>
              <span className="text-foreground font-medium">Within 3 Business Days</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Issuance Fee</span>
              <span className="text-foreground tabular-nums">GHS {selectedSize.fee.toFixed(2)}</span>
            </div>
          </div>

          <Button
            type="button"
            className="w-full h-10 text-[13.5px]"
            onClick={() => router.push("/accounts")}
          >
            Done & Return to Accounts
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-2">
      <PageHeader
        title="Cheque Book Request"
        description="Order a personalized cheque booklet for your current or business account."
        backTo={{ href: "/accounts", label: "Accounts" }}
      />

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 flex flex-col gap-5 shadow-xs">
          {/* Account Selection */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="account-select" className="text-[13px] text-muted-foreground">
              Select Checking / Current Account
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

          {/* Booklet Size Options */}
          <div className="flex flex-col gap-2">
            <Label className="text-[13px] text-muted-foreground">
              Booklet Size & Fee
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {BOOKLET_SIZES.map((opt, idx) => (
                <button
                  key={opt.leaves}
                  type="button"
                  onClick={() => setSizeIndex(idx)}
                  className={`flex flex-col rounded-xl border p-3.5 text-left transition-colors cursor-pointer ${
                    sizeIndex === idx
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border bg-card text-muted-foreground hover:bg-muted/40"
                  }`}
                >
                  <span className="text-[14px] font-medium text-foreground mb-1">
                    {opt.leaves} Leaves
                  </span>
                  <span className="text-[12px] text-primary font-medium">
                    GHS {opt.fee.toFixed(2)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Cheque Type */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="type-select" className="text-[13px] text-muted-foreground">
              Cheque Crossing / Type
            </Label>
            <Select value={chequeType} onValueChange={(val) => { if (val) setChequeType(val); }}>
              <SelectTrigger id="type-select" className="h-11">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {CHEQUE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Name Printed on Cheque */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="printed-name" className="text-[13px] text-muted-foreground">
              Title / Name to Print on Cheque Leaves
            </Label>
            <Input
              id="printed-name"
              value={printedName}
              onChange={(e) => setPrintedName(e.target.value)}
              className="h-11 uppercase"
              required
            />
            <span className="text-[11.5px] text-muted-foreground">
              Must match the legal account holder title or registered trading entity.
            </span>
          </div>

          {/* Pickup Branch */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="branch-select" className="text-[13px] text-muted-foreground">
              Collection Branch
            </Label>
            <Select value={pickupBranch} onValueChange={(val) => { if (val) setPickupBranch(val); }}>
              <SelectTrigger id="branch-select" className="h-11">
                <SelectValue placeholder="Select pickup branch" />
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

          {/* Notification Phone */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notify-phone" className="text-[13px] text-muted-foreground">
              SMS Notification Number
            </Label>
            <Input
              id="notify-phone"
              value={notifyPhone}
              onChange={(e) => setNotifyPhone(e.target.value)}
              className="h-11"
              required
            />
          </div>
        </div>

        {/* Notice */}
        <div className="flex items-start gap-3 rounded-xl border border-border/80 bg-muted/40 p-4 text-[12.5px] text-muted-foreground">
          <Clock size={18} className="text-primary mt-0.5 shrink-0" />
          <p>
            Standard processing time is 3 business days from order confirmation. A valid national photo ID is required when picking up your cheque book from the branch.
          </p>
        </div>

        {/* Actions */}
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
                <AppLoader size={16} />
                Processing Order...
              </span>
            ) : (
              `Confirm Order & Pay GHS ${selectedSize.fee.toFixed(2)}`
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
