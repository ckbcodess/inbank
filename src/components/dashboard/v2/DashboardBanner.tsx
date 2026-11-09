"use client";

import { useMemo } from "react";
import { ProductBanner } from "@/components/ui/product-banner";
import type { AttentionItem } from "@/lib/dashboard-insights";
import type { AlertItem, ProductAlert } from "@/lib/product-alerts";
import { selectedAccount, type DashViewProps } from "./parts";

/** The row's one action, named for where it goes. */
function attentionAction(item: AttentionItem): { label: string; href: string } {
  if (item.id.startsWith("fail-")) return { label: "Retry", href: item.href };
  if (item.id.startsWith("acct-")) return { label: "View account", href: item.href };
  return { label: "View card", href: item.href };
}

/** A failed payment or a card that has stopped working is amber; a dormant account or a card to collect is calm. */
function attentionAlert(item: AttentionItem): AlertItem {
  const action = attentionAction(item);
  return {
    key: item.id,
    label: item.detail,
    alert: { tone: item.tone === "muted" ? "wait" : "act", headline: item.title, detail: item.detail, action },
  };
}

/**
 * The one alert strip at the top of the dashboard, above the greeting: everything that needs the customer, or that
 * they should know, in the same banner Loans, Invest and Insure use. One item is a line; several count themselves and
 * open in place. Failed payments and card trouble come first. While the wallet is empty, "Fund your virtual wallet to start transacting" is
 * an amber row like them and cannot be put away: the wallet can't send or pay until it is funded, so it stays until it is.
 */
export function DashboardBanner({ data, onOpenFundModal }: Pick<DashViewProps, "data" | "onOpenFundModal">) {
  // Text is written in English; the DOM translator swaps it for the customer's language.

  const account = selectedAccount(data);
  const unfunded = (account?.balance ?? 0) === 0 && data.latestTxns.length === 0;
  const offerFunding = unfunded && !!onOpenFundModal;

  const items = useMemo<AlertItem[]>(() => {
    const list = data.attention.map(attentionAlert);
    if (offerFunding && onOpenFundModal) {
      const fund: ProductAlert = {
        tone: "act",
        headline: "Fund your virtual wallet to start transacting",
        action: { label: "Fund wallet", onClick: onOpenFundModal },
      };
      list.push({ key: "fund-wallet", label: "", alert: fund });
    }
    // Needs-you first; the sort is stable, so the calm rows keep their order.
    return list.sort((a, b) => Number(b.alert.tone === "act") - Number(a.alert.tone === "act"));
  }, [data.attention, offerFunding, onOpenFundModal]);

  if (items.length === 0) return null;
  return (
    <ProductBanner
      items={items}
      summary={(total, acting) =>
        acting === 1 ? "1 thing needs you" : acting > 1 ? `${acting} things need you` : `${total} things to look at`
      }
    />
  );
}
