import { CreditCard } from "lucide-react";
import { NetworkChip } from "@/components/cards/NetworkLogo";
import { OperatorLogo } from "@/components/ui/operator-logo";
import { schemeFromText } from "@/lib/card-schemes";
import type { Operator } from "@/lib/operators";

/**
 * The mark for a source of funds: a wallet wears its network's round logo, a card wears its network's mark. Both
 * sit in the same 48 by 36 slot, so wallets and cards line up in one list. Every list of sources (saved wallets
 * and cards, the Add money picker, the save prompt) draws it here.
 */
export function SourceMark({
  type,
  operator,
  title,
}: {
  type: "momo" | "card";
  operator?: Operator | null;
  /** How the source is named, for a card on a network we can recognise ("Ecobank Visa Debit"). */
  title?: string | null;
}) {
  if (type === "momo") {
    return (
      <span className="flex h-9 w-12 shrink-0 items-center justify-center">
        <OperatorLogo operator={operator} name={title} size={36} />
      </span>
    );
  }
  const scheme = schemeFromText(title);
  if (scheme) return <NetworkChip scheme={scheme} size="lg" />;
  return (
    <span className="flex h-9 w-12 shrink-0 items-center justify-center rounded-lg border border-black/5 bg-muted/60 text-foreground dark:border-white/10">
      <CreditCard size={18} strokeWidth={1.8} aria-hidden="true" />
    </span>
  );
}
