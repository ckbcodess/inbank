"use client";

/**
 * FR-05 / FR-33 — secondary actions and the action modals.
 *
 * The three highest-frequency actions (send, top up, quick pay) render as
 * large primary targets on LiquidityRail, right beside the balance they act
 * on. What's left here is genuinely lower-frequency — transfer between your
 * own accounts, pay a bill, customize the shortcuts — plus every dialog,
 * since a modal only needs to exist once regardless of which control opens
 * it (LiquidityRail's "Top up" tile reuses the same top-up dialog via
 * `topUpCardId`, the same way the cards panel already does).
 */

import { toast } from "sonner";
import { useEffect, useState } from "react";
import {
  ArrowLeftRight,
  Receipt,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BILLERS,
  formatMoney,
  fundCard,
  type Account,
  type PaymentCard,
} from "@/lib/mock-data";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";

type ModalType = "transfer" | "pay-bill" | "top-up" | "customize" | null;

export function QuickActionBar({
  accounts,
  cards,
  isCorporate,
  onCardFunded,
  topUpCardId: requestedCardId,
  onTopUpHandled,
}: {
  accounts: Account[];
  cards: PaymentCard[];
  isCorporate: boolean;
  /** Lets the dashboard re-read card balances after a top-up. */
  onCardFunded?: () => void;
  /**
   * Set by the cards panel's "Fund card" button. The top-up flow lives here
   * with the other action modals rather than being duplicated per panel, so
   * both entry points open the same dialog.
   */
  topUpCardId?: string | null;
  onTopUpHandled?: () => void;
}) {
  const { showAmounts } = useAmountVisibility();

  const [activeModal, setActiveModal] = useState<ModalType>(null);

  const [transferFrom, setTransferFrom] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferRef, setTransferRef] = useState("");

  const [selectedBillerId, setSelectedBillerId] = useState(BILLERS[0]?.id ?? "");
  const [payBillAccount, setPayBillAccount] = useState("");
  const [billerRefNo, setBillerRefNo] = useState("");
  const [billPayAmount, setBillPayAmount] = useState("");

  const fundableCards = cards.filter((c) => c.fundable && c.balance !== null);
  const [topUpCardId, setTopUpCardId] = useState("");
  const [topUpFrom, setTopUpFrom] = useState("");
  const [topUpAmount, setTopUpAmount] = useState("");

  // An external request (the cards panel) opens the same dialog, preselected.
  useEffect(() => {
    if (!requestedCardId) return;
    setTopUpCardId(requestedCardId);
    setTopUpFrom(accounts[0]?.id ?? "");
    setTopUpAmount("");
    setActiveModal("top-up");
    onTopUpHandled?.();
  }, [requestedCardId, accounts, onTopUpHandled]);

  function triggerNotice(msg: string) {
    toast.success(msg);
  }

  function handleExecuteTransfer() {
    if (!transferAmount) return;
    triggerNotice(`Transfer of GHS ${transferAmount} completed successfully.`);
    setActiveModal(null);
    setTransferAmount("");
    setTransferRef("");
  }

  function handleExecutePayBill() {
    if (!billPayAmount) return;
    const biller = BILLERS.find((b) => b.id === selectedBillerId) ?? BILLERS[0];
    triggerNotice(`Bill payment of GHS ${billPayAmount} to ${biller.name} completed successfully.`);
    setActiveModal(null);
    setBillerRefNo("");
    setBillPayAmount("");
  }

  function handleExecuteTopUp() {
    const amount = Number(topUpAmount.replace(/,/g, ""));
    if (!amount || amount <= 0) return;
    const card = fundableCards.find((c) => c.id === topUpCardId);
    if (!card || !fundCard(card.id, amount)) return;
    triggerNotice(`${card.name} topped up with ${formatMoney(amount, card.currency, true)}.`);
    onCardFunded?.();
    setActiveModal(null);
    setTopUpAmount("");
  }

  return (
    <>
      <section className="flex flex-col rounded-2xl border border-border bg-card p-4">
        {/* Secondary — real actions, lower frequency, deliberately quieter. */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                setTransferFrom(accounts[0]?.id ?? "");
                setTransferTo(accounts[1]?.id ?? accounts[0]?.id ?? "");
                setActiveModal("transfer");
              }}
            >
              <ArrowLeftRight size={15} strokeWidth={1.9} aria-hidden="true" />
              <span>Transfer between accounts</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                setSelectedBillerId(BILLERS[0]?.id ?? "");
                setPayBillAccount(accounts[0]?.id ?? "");
                setBillerRefNo("");
                setBillPayAmount("");
                setActiveModal("pay-bill");
              }}
            >
              <Receipt size={15} strokeWidth={1.9} aria-hidden="true" />
              <span>Pay bills</span>
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={() => setActiveModal("customize")}
          >
            <SlidersHorizontal size={14} strokeWidth={1.8} aria-hidden="true" />
            <span>Customize</span>
          </Button>
        </div>
      </section>


      {/* Top up a card — FR-33 */}
      <Dialog open={activeModal === "top-up"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Top Up Card</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              Move funds from an account onto a prepaid or virtual card.
            </p>
            <div className="flex flex-col gap-2">
              <Label>Card</Label>
              <Select
                value={topUpCardId}
                onValueChange={(val) => val && setTopUpCardId(val)}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="Select card" />
                </SelectTrigger>
                <SelectContent>
                  {fundableCards.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({formatMoney(c.balance ?? 0, c.currency, showAmounts)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Fund From</Label>
              <Select
                value={topUpFrom}
                onValueChange={(val) => val && setTopUpFrom(val)}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="Select funding account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} ({formatMoney(acc.available, acc.currency, showAmounts)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="topup-amount">Enter Amount</Label>
              <Input
                id="topup-amount"
                placeholder="0.00"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
                className="tabular"
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveModal(null)}>
              Cancel
            </Button>
            <Button disabled={!topUpAmount} onClick={handleExecuteTopUp}>
              Top up now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Internal transfer */}
      <Dialog open={activeModal === "transfer"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Internal Transfer</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="flex flex-col gap-2">
              <Label>From Account</Label>
              <Select
                value={transferFrom}
                onValueChange={(val) => val && setTransferFrom(val)}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="Select source account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} ({formatMoney(acc.available, acc.currency, showAmounts)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>To Account</Label>
              <Select
                value={transferTo}
                onValueChange={(val) => val && setTransferTo(val)}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="Select destination account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} ({acc.number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="t-amount">Enter Amount</Label>
              <Input
                id="t-amount"
                placeholder="0.00"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                className="tabular"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="t-ref">Reference / Purpose</Label>
              <Input
                id="t-ref"
                placeholder="e.g. Monthly liquidity rebalance"
                value={transferRef}
                onChange={(e) => setTransferRef(e.target.value)}
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveModal(null)}>
              Cancel
            </Button>
            <Button disabled={!transferAmount} onClick={handleExecuteTransfer}>
              Execute transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay a bill */}
      <Dialog open={activeModal === "pay-bill"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Pay a Bill</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="flex flex-col gap-2">
              <Label>Biller</Label>
              <Select
                value={selectedBillerId}
                onValueChange={(val) => val && setSelectedBillerId(val)}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="Select biller" />
                </SelectTrigger>
                <SelectContent>
                  {BILLERS.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Pay From Account</Label>
              <Select
                value={payBillAccount}
                onValueChange={(val) => val && setPayBillAccount(val)}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} ({formatMoney(acc.available, acc.currency, showAmounts)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="biller-ref">
                {BILLERS.find((b) => b.id === selectedBillerId)?.reference ??
                  "Customer reference / account no"}
              </Label>
              <Input
                id="biller-ref"
                placeholder="e.g. 1049284019"
                value={billerRefNo}
                onChange={(e) => setBillerRefNo(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="bill-amt">Payment Amount (GHS)</Label>
              <Input
                id="bill-amt"
                placeholder="0.00"
                value={billPayAmount}
                onChange={(e) => setBillPayAmount(e.target.value)}
                className="tabular"
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveModal(null)}>
              Cancel
            </Button>
            <Button disabled={!billPayAmount} onClick={handleExecutePayBill}>
              Execute payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customize */}
      <Dialog open={activeModal === "customize"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Customize Quick Actions</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="flex flex-col gap-2.5">
              {[
                "Send money",
                "Top up a card",
                "Quick pay",
                "Transfer between accounts",
                "Pay bills",
                ...(isCorporate ? ["Bulk pay"] : []),
              ].map((act) => (
                <label
                  key={act}
                  className="flex cursor-pointer items-center justify-between rounded-xl border border-border p-3 hover:bg-muted/40 transition-colors"
                >
                  <span className="text-[13px] text-foreground">{act}</span>
                  <input type="checkbox" defaultChecked className="size-4 rounded border-border" />
                </label>
              ))}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button onClick={() => setActiveModal(null)}>Save preferences</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
