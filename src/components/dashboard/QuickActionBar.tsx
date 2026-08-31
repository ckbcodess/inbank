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

import { useEffect, useState } from "react";
import {
  ArrowLeftRight,
  CheckCircle2,
  Receipt,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const [notice, setNotice] = useState<string | null>(null);

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
    setNotice(msg);
    setTimeout(() => setNotice(null), 5000);
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

  const selectClass =
    "flex h-10 w-full rounded-xl border border-border bg-background pl-3 pr-10 py-2 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer";

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

      {notice && (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/60 px-4 py-3 text-[13px] text-foreground">
          <CheckCircle2 size={16} strokeWidth={1.8} className="shrink-0 text-emerald-500" />
          <span className="flex-1">{notice}</span>
        </div>
      )}

      {/* Top up a card — FR-33 */}
      <Dialog open={activeModal === "top-up"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Top up a card</DialogTitle>
            <DialogDescription>
              Move funds from an account onto a prepaid or virtual card. Debit cards draw on their
              linked account and cannot be funded.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label>Card</Label>
              <select
                value={topUpCardId}
                onChange={(e) => setTopUpCardId(e.target.value)}
                className={selectClass}
              >
                {fundableCards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({formatMoney(c.balance ?? 0, c.currency, showAmounts)})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Fund from</Label>
              <select
                value={topUpFrom}
                onChange={(e) => setTopUpFrom(e.target.value)}
                className={selectClass}
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({formatMoney(acc.available, acc.currency, showAmounts)})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="topup-amount">Amount</Label>
              <Input
                id="topup-amount"
                placeholder="0.00"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
                className="tabular"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveModal(null)}>
              Cancel
            </Button>
            <Button disabled={!topUpAmount} onClick={handleExecuteTopUp}>
              Fund card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Internal transfer */}
      <Dialog open={activeModal === "transfer"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Internal account transfer</DialogTitle>
            <DialogDescription>
              Move funds instantly between your linked NIBS accounts.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label>From account</Label>
              <select
                value={transferFrom}
                onChange={(e) => setTransferFrom(e.target.value)}
                className={selectClass}
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({formatMoney(acc.available, acc.currency, showAmounts)})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>To account</Label>
              <select
                value={transferTo}
                onChange={(e) => setTransferTo(e.target.value)}
                className={selectClass}
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.number})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="t-amount">Amount</Label>
              <Input
                id="t-amount"
                placeholder="0.00"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                className="tabular"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="t-ref">Reference / purpose</Label>
              <Input
                id="t-ref"
                placeholder="e.g. Monthly liquidity rebalance"
                value={transferRef}
                onChange={(e) => setTransferRef(e.target.value)}
              />
            </div>
          </div>
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
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Pay a utility or service bill</DialogTitle>
            <DialogDescription>
              Select a registered biller and make an instant bill payment from your account.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label>Biller</Label>
              <select
                value={selectedBillerId}
                onChange={(e) => setSelectedBillerId(e.target.value)}
                className={selectClass}
              >
                {BILLERS.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.category})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Pay from account</Label>
              <select
                value={payBillAccount}
                onChange={(e) => setPayBillAccount(e.target.value)}
                className={selectClass}
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({formatMoney(acc.available, acc.currency, showAmounts)})
                  </option>
                ))}
              </select>
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
              <Label htmlFor="bill-amt">Payment amount (GHS)</Label>
              <Input
                id="bill-amt"
                placeholder="0.00"
                value={billPayAmount}
                onChange={(e) => setBillPayAmount(e.target.value)}
                className="tabular"
              />
            </div>
          </div>
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
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Customize quick actions</DialogTitle>
            <DialogDescription>
              Select which shortcuts appear on your dashboard action bar.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2 text-[13px]">
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
                className="flex cursor-pointer items-center justify-between rounded-xl border border-border p-3 hover:bg-muted/40"
              >
                <span className="text-foreground">{act}</span>
                <input type="checkbox" defaultChecked className="size-4 rounded border-border" />
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setActiveModal(null)}>Save preferences</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
