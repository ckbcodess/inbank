"use client";

/**
 * Manage for Pay again. The tiles are worked out from who the customer pays, not saved, so this is not the
 * beneficiaries page: it lists what the dashboard is suggesting and lets them hide anyone, or show them again.
 * Saved people stay on /beneficiaries, linked from the foot.
 */

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PayeeAvatar } from "@/components/ui/payee-avatar";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { formatMoney } from "@/lib/mock-data";
import { payeeKey, payeeLastAmount, type PayAgainPayee } from "@/lib/payees";
import type { PayAgainHistory } from "@/lib/pay-again-rank";
import { usePayAgainStore } from "@/lib/pay-again-store";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";

/** Why a suggestion is here, in one short line read from the payments behind it: how often, and whether it is due. */
function whyLine(h: PayAgainHistory, t: ReturnType<typeof useTranslation>["t"]): string {
  const parts = [t("dashboard.payAgainTimes", { count: h.count })];
  if (h.due) parts.push(t("dashboard.payAgainDue", "Due about now"));
  else if (h.usualDay) parts.push(t("dashboard.payAgainMonthly", { day: h.usualDay }));
  else if (h.everyDays) parts.push(t("dashboard.payAgainEvery", { days: h.everyDays }));
  return parts.join(" · ");
}

function Row({ payee, action, onAction }: { payee: PayAgainPayee; action: string; onAction: () => void }) {
  const { t } = useTranslation();
  const { showAmounts } = useAmountVisibility();
  const amount = payeeLastAmount(payee);
  const h = payee.history;
  const money = amount === null ? null : formatMoney(amount, "GHS", showAmounts);
  // With history the second line is why it is here and the amount sits on the right; without it, what it is and the last amount.
  const second = h
    ? whyLine(h, t)
    : money === null
      ? payee.detail
      : `${payee.detail} · ${t("dashboard.payAgainLast", { amount: money })}`;
  return (
    <li className="flex items-center gap-3 py-2">
      <PayeeAvatar name={payee.name} size="sm" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[14px] text-foreground">{payee.name}</span>
        <span className="tabular truncate text-[12px] text-muted-foreground">{second}</span>
      </span>
      {h && money !== null && (
        <span className="tabular shrink-0 text-[13px] text-foreground">
          {h.usualAmount ? money : t("dashboard.payAgainLast", { amount: money })}
        </span>
      )}
      <Button type="button" variant="ghost" size="sm" onClick={onAction}>
        {action}
      </Button>
    </li>
  );
}

export function PayAgainManage({
  open,
  onOpenChange,
  actorId,
  payees,
  hiddenKeys,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actorId: string;
  /** Every suggestion for this customer, hidden or not. */
  payees: PayAgainPayee[];
  hiddenKeys: readonly string[];
}) {
  const { t } = useTranslation();
  const hide = usePayAgainStore((s) => s.hide);
  const show = usePayAgainStore((s) => s.show);
  const shown = payees.filter((p) => !hiddenKeys.includes(payeeKey(p)));
  const hidden = payees.filter((p) => hiddenKeys.includes(payeeKey(p)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{t("dashboard.payAgain", "Pay again")}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <p className="pb-2 text-[13px] text-muted-foreground">
            {t("dashboard.payAgainIntro", "From who you've paid before. Hide anyone you don't want here.")}
          </p>
          <ul className="flex flex-col">
            {shown.map((p) => (
              <Row key={payeeKey(p)} payee={p} action={t("dashboard.payAgainHide", "Hide")} onAction={() => hide(actorId, payeeKey(p))} />
            ))}
          </ul>
          {hidden.length > 0 && (
            <section className="flex flex-col gap-1 pt-6">
              <h3 className="text-[14px] font-medium text-foreground">{t("dashboard.payAgainHidden", "Hidden")}</h3>
              <ul className="flex flex-col">
                {hidden.map((p) => (
                  <Row
                    key={payeeKey(p)}
                    payee={p}
                    action={t("dashboard.payAgainShow", "Show again")}
                    onAction={() => show(actorId, payeeKey(p))}
                  />
                ))}
              </ul>
            </section>
          )}
        </DialogBody>
        <DialogFooter>
          <Button size="md" variant="outline" nativeButton={false} className="w-full" render={<Link href="/beneficiaries" />}>
            {t("dashboard.payAgainSaved", "Saved beneficiaries")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
