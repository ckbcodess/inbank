"use client";

/**
 * Send & Pay — Standing Orders Management Hub
 */

import { useReducer, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Pause,
  Play,
  Plus,
  Repeat,
  Trash2,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { FilteredEmptyState, TrueEmptyState } from "@/components/states/ListStates";
import PageHeader from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { SimpleTooltip } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  STANDING_INSTRUCTIONS,
  cancelStandingInstruction,
  findAccount,
  formatDate,
  formatMoney,
  setStandingStatus,
} from "@/lib/mock-data";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";

export default function StandingOrdersPage() {
  const { showAmounts } = useAmountVisibility();

  const [, force] = useReducer((x: number) => x + 1, 0);
  const [filterTab, setFilterTab] = useState<"all" | "active" | "paused">("all");
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function flash(msg: string) {
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 4000);
  }

  const items = [...STANDING_INSTRUCTIONS].sort((a, b) => a.nextRun.localeCompare(b.nextRun));
  const filteredItems = items.filter((item) => {
    if (filterTab === "active") return item.status === "Active";
    if (filterTab === "paused") return item.status === "Paused";
    return true;
  });

  function togglePause(id: string) {
    const si = STANDING_INSTRUCTIONS.find((s) => s.id === id);
    if (!si) return;
    const nextStatus = si.status === "Active" ? "Paused" : "Active";
    setStandingStatus(id, nextStatus);
    flash(nextStatus === "Paused" ? `Paused — ${si.beneficiary} won't execute on schedule.` : `Resumed — ${si.beneficiary} is active.`);
    force();
  }

  function handleCancel() {
    if (!cancelId) return;
    const si = STANDING_INSTRUCTIONS.find((s) => s.id === cancelId);
    cancelStandingInstruction(cancelId);
    setCancelId(null);
    flash(`Cancelled${si ? ` — ${si.beneficiary}` : ""}. It won't run again.`);
    force();
  }

  const toCancel = cancelId ? STANDING_INSTRUCTIONS.find((s) => s.id === cancelId) : undefined;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Standing Orders"
        backTo={{ href: "/payments", label: "Payments" }}
        actions={
          <Link href="/payments/standing/new" className={buttonVariants()}>
            <Plus size={15} strokeWidth={1.9} aria-hidden="true" />
            Add New Standing Order
          </Link>
        }
      />
      {notice && (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/60 px-4 py-3 text-[13px] text-foreground">
          <CheckCircle2 size={16} strokeWidth={1.8} className="shrink-0 text-emerald-500" aria-hidden="true" />
          <span className="flex-1">{notice}</span>
        </div>
      )}

      {/* Filter Tabs & Action */}
      <div className="flex items-center justify-between gap-3 border-b border-border pb-3 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setFilterTab("all")}
            className={`rounded-lg px-3 py-1.5 text-[13px] transition-colors shrink-0 ${
              filterTab === "all" ? "bg-muted text-foreground font-normal" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All Orders ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("active")}
            className={`rounded-lg px-3 py-1.5 text-[13px] transition-colors shrink-0 ${
              filterTab === "active" ? "bg-muted text-foreground font-normal" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Active ({items.filter((i) => i.status === "Active").length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("paused")}
            className={`rounded-lg px-3 py-1.5 text-[13px] transition-colors shrink-0 ${
              filterTab === "paused" ? "bg-muted text-foreground font-normal" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Paused ({items.filter((i) => i.status === "Paused").length})
          </button>
        </div>
      </div>

      {/* Standing Orders Cards List */}
      <section className="flex flex-col gap-3.5">
        {filteredItems.length === 0 ? (
          filterTab !== "all" ? (
            <FilteredEmptyState
              onReset={() => setFilterTab("all")}
              description={`No ${filterTab} standing orders found.`}
            />
          ) : (
            <TrueEmptyState
              icon={<Repeat size={22} strokeWidth={1.8} />}
              title="No standing orders found"
              description="Automate rent, susu contributions, family stipends, airtime, data or savings transfers."
              action={
                <Button size="sm" nativeButton={false} render={<Link href="/payments/standing/new" />}>
                  <Plus size={14} strokeWidth={2} className="mr-1.5" />
                  Create First Standing Order
                </Button>
              }
            />
          )
        ) : (
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            {filteredItems.map((si) => {
              const srcAccount = findAccount(si.accountId);
              const paused = si.status === "Paused";
              return (
                <div
                  key={si.id}
                  className="group flex flex-col justify-between gap-4 rounded-2xl border border-border bg-card p-5 transition-all duration-150 hover:border-foreground/20 hover:bg-muted/20"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
                        <Repeat size={19} strokeWidth={1.8} aria-hidden="true" />
                      </span>
                      <div className="flex flex-col min-w-0">
                        <span className="truncate text-[15px] text-foreground font-normal">{si.beneficiary}</span>
                        <span className="truncate text-[12px] text-muted-foreground">
                          {si.frequency} • Next run {formatDate(si.nextRun)}
                        </span>
                      </div>
                    </div>
                    <Badge variant={paused ? "secondary" : "success"}>{paused ? "Paused" : "Active"}</Badge>
                  </div>

                  <div className="flex items-end justify-between border-t border-border/80 pt-3.5">
                    <div className="flex flex-col">
                      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        From {srcAccount?.name || "Savings Account"}
                      </span>
                      <span className="tabular mt-0.5 text-[17px] font-normal text-foreground">
                        {formatMoney(si.amount, "GHS", showAmounts)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => togglePause(si.id)}
                        className="h-8 px-2.5 text-[12px]"
                      >
                        {paused ? (
                          <>
                            <Play size={12} strokeWidth={2} aria-hidden="true" /> Resume
                          </>
                        ) : (
                          <>
                            <Pause size={12} strokeWidth={2} aria-hidden="true" /> Pause
                          </>
                        )}
                      </Button>
                      <SimpleTooltip content="Cancel standing order">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setCancelId(si.id)}
                          className="size-8 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                          aria-label="Cancel standing order"
                        >
                          <Trash2 size={13} strokeWidth={1.8} />
                        </Button>
                      </SimpleTooltip>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>



      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelId !== null} onOpenChange={(open) => !open && setCancelId(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Cancel this standing order?</DialogTitle>
          </DialogHeader>
          <DialogBody className="gap-3.5">
            <p className="text-[13.5px] text-muted-foreground leading-relaxed">
              {toCancel ? `"${toCancel.beneficiary}" ` : "This instruction "}
              will stop running. You can set it up again anytime.
            </p>
            <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-3 text-[12.5px] text-muted-foreground">
              <AlertTriangle size={15} strokeWidth={1.8} className="mt-0.5 shrink-0 text-amber-500" aria-hidden="true" />
              <span>If you just want to pause it temporarily, use the pause button instead.</span>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setCancelId(null)}>
              Keep it
            </Button>
            <Button variant="destructive" size="sm" onClick={handleCancel}>
              <Trash2 size={14} strokeWidth={1.8} aria-hidden="true" className="mr-1.5" />
              Cancel order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
