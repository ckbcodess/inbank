"use client";

/**
 * S05 Banking Overview — section 1.
 *
 * Role-aware home: surfaces balances, quick actions, recent activity and actions
 * requiring attention. The "requires attention" block only renders for an Approver,
 * and administration shortcuts only for a Corporate Admin — matching the nav matrix.
 */

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileSpreadsheet,
  Receipt,
  Send,
  SlidersHorizontal,
  Users,
  Wallet,
} from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { SummaryCard } from "@/components/SummaryCard";
import { TransactionStatusBadge } from "@/components/StatusBadge";
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
import { useSession } from "@/lib/session-store";
import { isApprover, isCorporateAdmin } from "@/lib/roles";
import { accountsForProfile, cardsForProfile, transactionsForProfile, APPROVAL_QUEUE, BILLERS, formatMoney, formatDate } from "@/lib/mock-data";
import { MiniCardThumbnail } from "@/components/cards/MiniCardThumbnail";

type QuickModalType = "transfer" | "pay-bill" | "customize" | null;

export default function OverviewPage() {
  const actor = useSession((s) => s.actor);
  const activeProfile = useSession((s) => s.activeProfile);

  const [activeModal, setActiveModal] = useState<QuickModalType>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Transfer Modal state
  const [transferFrom, setTransferFrom] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferRef, setTransferRef] = useState("");

  // Pay Bill Modal state
  const [selectedBillerId, setSelectedBillerId] = useState(BILLERS[0]?.id ?? "");
  const [payBillAccount, setPayBillAccount] = useState("");
  const [billerRefNo, setBillerRefNo] = useState("");
  const [billPayAmount, setBillPayAmount] = useState("");

  if (!actor || !activeProfile) return null;

  const accounts = accountsForProfile(activeProfile.kind);
  const cards = cardsForProfile(activeProfile.kind);
  const transactions = transactionsForProfile(activeProfile.kind);

  const totalBalance = accounts.filter((a) => a.currency === "GHS").reduce((sum, a) => sum + a.balance, 0);
  const recent = transactions.slice(0, 5);
  const pendingCount = transactions.filter((t) => t.state === "pending" || t.state === "awaiting-approval").length;

  const isCorporate = activeProfile.kind === "CORPORATE";
  const showApprovals = isCorporate && isApprover(actor.role);
  const showAdmin = isCorporate && isCorporateAdmin(actor.role);

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

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={`Good day, ${actor.name.split(" ")[0]}`}
        description={`${activeProfile.name} · ${activeProfile.reference}`}
      />

      {/* Quick Actions Bar — Mercury / Wise Usability Pattern */}
      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              className="gap-2 bg-primary text-primary-foreground shadow-sm hover:opacity-90"
              nativeButton={false}
              render={<Link href="/payments" />}
            >
              <Send size={15} strokeWidth={1.9} aria-hidden="true" />
              <span>Send</span>
            </Button>

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
              <span>Transfer</span>
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
              <span>Pay Bills</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              nativeButton={false}
              render={<Link href="/payments/bulk" />}
            >
              <FileSpreadsheet size={15} strokeWidth={1.9} aria-hidden="true" />
              <span>Bulk Pay</span>
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

      {/* Notice Banner */}
      {notice && (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/60 px-4 py-3 text-[13px] text-foreground">
          <CheckCircle2 size={16} strokeWidth={1.8} className="shrink-0 text-emerald-500" />
          <span className="flex-1">{notice}</span>
        </div>
      )}

      {/* Balances */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Total balance (GHS)"
          value={formatMoney(totalBalance)}
          hint={`Across ${accounts.filter((a) => a.currency === "GHS").length} accounts`}
          icon={<Wallet size={15} strokeWidth={1.8} />}
        />
        <SummaryCard
          label="USD balance"
          value={formatMoney(accounts.find((a) => a.currency === "USD")?.balance ?? 0, "USD")}
          hint="USD Trade Account"
          icon={<Wallet size={15} strokeWidth={1.8} />}
        />
        <SummaryCard
          label="In progress"
          value={String(pendingCount)}
          hint="Payments not yet settled"
          icon={<Clock size={15} strokeWidth={1.8} />}
          tone="warning"
        />
        {showApprovals ? (
          <SummaryCard
            label="Awaiting your approval"
            value={String(APPROVAL_QUEUE.length)}
            hint="Across payments and trade"
            icon={<CheckCircle2 size={15} strokeWidth={1.8} />}
            tone="warning"
          />
        ) : (
          <SummaryCard
            label="Accounts"
            value={String(accounts.length)}
            hint="Active banking accounts"
            icon={<Wallet size={15} strokeWidth={1.8} />}
          />
        )}
      </section>

      {/* Requires attention — Approver only (section 12.3) */}
      {showApprovals && (
        <section className="rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="text-[15px] text-foreground">Requires your attention</h2>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                Transactions waiting on your decision
              </p>
            </div>
            <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/approvals" />}>
              Open queue
              <ArrowRight size={14} strokeWidth={1.8} aria-hidden="true" />
            </Button>
          </div>
          <ul className="divide-y divide-border">
            {APPROVAL_QUEUE.slice(0, 3).map((item) => (
              <li key={item.id}>
                <Link
                  href={
                    item.type === "payment"
                      ? `/approvals/payment/${item.id}`
                      : `/approvals/trade/${item.id}`
                  }
                  className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-muted/50 active:scale-[0.99] transition-transform"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[13px] text-foreground">{item.description}</span>
                    <span className="mt-0.5 text-[12px] text-muted-foreground">
                      {item.submittedBy} · {item.submittedAt}
                    </span>
                  </span>
                  <span className="shrink-0 text-[13px] text-foreground tabular">
                    {formatMoney(item.amount, item.currency)}
                  </span>
                  <ArrowUpRight size={15} strokeWidth={1.8} aria-hidden="true" className="shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Accounts + Available cards + recent activity */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-[15px] text-foreground">Accounts</h2>
            <Link href="/accounts" className="text-[12px] text-primary underline-offset-4 hover:underline">
              View all accounts
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {accounts.slice(0, 4).map((acc) => (
              <li key={acc.id}>
                <Link
                  href={`/accounts/${acc.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-muted/50 active:scale-[0.99] transition-transform"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-[13px] text-foreground">{acc.name}</span>
                    <span className="mt-0.5 text-[12px] text-muted-foreground tabular">{acc.number}</span>
                  </span>
                  <span className="shrink-0 text-[13px] text-foreground tabular">
                    {formatMoney(acc.balance, acc.currency)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-[15px] text-foreground">Available cards</h2>
            <Link href="/cards" className="text-[12px] text-primary underline-offset-4 hover:underline">
              View all cards
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {cards.slice(0, 4).map((c) => (
              <li key={c.id}>
                <Link
                  href={`/cards/${c.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-muted/50 active:scale-[0.99] transition-transform"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <MiniCardThumbnail card={c} />
                    <div className="flex flex-col min-w-0">
                      <span className="truncate text-[13px] font-medium text-foreground">{c.name}</span>
                      <span className="mt-0.5 text-[11px] text-muted-foreground tabular">
                        {c.scheme} {c.type}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[13px] text-foreground tabular">
                      {c.type === "Prepaid" && c.balance !== null
                        ? formatMoney(c.balance, c.currency)
                        : "Debit Card"}
                    </span>
                    <ChevronRight size={15} strokeWidth={1.8} className="text-muted-foreground" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-[15px] text-foreground">Recent activity</h2>
            <Link href="/transactions" className="text-[12px] text-primary underline-offset-4 hover:underline">
              View all transactions
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {recent.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/transactions/${t.id}`}
                  className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-muted/50 active:scale-[0.99] transition-transform"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[13px] text-foreground">{t.description}</span>
                    <span className="mt-0.5 text-[12px] text-muted-foreground tabular">{formatDate(t.date)}</span>
                  </span>
                  <span className="shrink-0 text-[13px] text-foreground tabular">
                    {t.direction === "debit" ? "−" : "+"}
                    {formatMoney(t.amount, t.currency)}
                  </span>
                  <TransactionStatusBadge state={t.state} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Administration shortcut — Corporate Admin only (section 12.3) */}
      {showAdmin && (
        <section className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Users size={17} strokeWidth={1.8} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-[14px] text-foreground">User administration</h2>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                Manage users, roles, limits and approval matrices
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/administration" />}>
            Open administration
            <ArrowRight size={14} strokeWidth={1.8} aria-hidden="true" />
          </Button>
        </section>
      )}

      {/* ── MODALS FOR DASHBOARD QUICK ACTIONS ── */}

      {/* 1. Transfer Modal */}
      <Dialog open={activeModal === "transfer"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Internal Account Transfer</DialogTitle>
            <DialogDescription>
              Move funds instantly between your linked InBank accounts.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label>From Account</Label>
              <select
                value={transferFrom}
                onChange={(e) => setTransferFrom(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({formatMoney(acc.available, acc.currency)})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>To Account</Label>
              <select
                value={transferTo}
                onChange={(e) => setTransferTo(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
              <Label htmlFor="t-ref">Reference / Purpose</Label>
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
              Execute Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. Pay Bill Modal */}
      <Dialog open={activeModal === "pay-bill"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Pay Utility or Service Bill</DialogTitle>
            <DialogDescription>
              Select a registered biller and make an instant bill payment from your account.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label>Select Biller</Label>
              <select
                value={selectedBillerId}
                onChange={(e) => setSelectedBillerId(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {BILLERS.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.category})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Pay From Account</Label>
              <select
                value={payBillAccount}
                onChange={(e) => setPayBillAccount(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({formatMoney(acc.available, acc.currency)})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="biller-ref">
                {BILLERS.find((b) => b.id === selectedBillerId)?.reference ?? "Customer Reference / Account No"}
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveModal(null)}>
              Cancel
            </Button>
            <Button disabled={!billPayAmount} onClick={handleExecutePayBill}>
              Execute Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. Customize Actions Modal */}
      <Dialog open={activeModal === "customize"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Customize Quick Actions</DialogTitle>
            <DialogDescription>
              Select which shortcuts appear on your primary dashboard toolbar.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2 text-[13px]">
            {["Send Payment", "Internal Transfer", "Pay Utility/Service Bill", "Bulk Payment"].map(
              (act) => (
                <label key={act} className="flex items-center justify-between rounded-xl border border-border p-3 cursor-pointer hover:bg-muted/40">
                  <span className="text-foreground">{act}</span>
                  <input type="checkbox" defaultChecked className="size-4 rounded border-border" />
                </label>
              )
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setActiveModal(null)}>Save Preferences</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

