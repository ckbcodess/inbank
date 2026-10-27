import { CreditCard } from "@/components/ui/icons";
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
  large,
}: {
  type: "momo" | "card";
  operator?: Operator | null;
  /** How the source is named, for a card on a network we can recognise ("Ecobank Visa Debit"). */
  title?: string | null;
  /** A detail view's mark, about twice the size of the list one. */
  large?: boolean;
}) {
  if (type === "momo") {
    return large ? (
      <span className="flex size-16 shrink-0 items-center justify-center">
        <OperatorLogo operator={operator} name={title} size={64} />
      </span>
    ) : (
      <span className="flex h-8 w-10 shrink-0 items-center justify-center">
        <OperatorLogo operator={operator} name={title} size={36} />
      </span>
    );
  }
  const scheme = schemeFromText(title);
  if (scheme) {
    return large ? (
      <span className="my-3 inline-flex origin-center scale-[1.75]">
        <NetworkChip scheme={scheme} size="lg" />
      </span>
    ) : (
      <NetworkChip scheme={scheme} size="lg" />
    );
  }
  return (
    <span
      className={
        large
          ? "flex h-14 w-20 shrink-0 items-center justify-center rounded-xl border border-black/5 bg-muted/60 text-foreground dark:border-white/10"
          : "flex h-8 w-10 shrink-0 items-center justify-center rounded-lg border border-black/5 bg-muted/60 text-foreground dark:border-white/10"
      }
    >
      <CreditCard size={large ? 28 : 18} aria-hidden="true" />
    </span>
  );
}
