import {
  ArrowDownLeft,
  ArrowLeftRight,
  Banknote,
  CreditCard,
  Globe,
  Landmark,
  Layers,
  PiggyBank,
  QrCode,
  Signal,
  Smartphone,
  Wallet,
  Wifi,
  FileText,
} from "lucide-react";
import { CediReceiptIcon } from "@/components/ui/cedi-receipt-icon";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { brandLogo } from "@/lib/brands";
import type { Transaction } from "@/lib/mock-data";

type IconType = React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

/** What kind of payment it was, as a picture: the same kinds the Send & Pay hub offers. */
function iconFor(t: Pick<Transaction, "paymentMethod">): IconType {
  switch (t.paymentMethod) {
    case "momo":
      return Smartphone;
    case "wallet-to-bank":
      return Wallet;
    case "airtime":
      return Signal;
    case "data":
      return Wifi;
    case "bill":
      return CediReceiptIcon as IconType;
    case "card":
      return CreditCard;
    case "qr":
      return QrCode;
    case "papss":
      return Globe;
    case "own-account":
      return ArrowLeftRight;
    case "cardless":
      return Banknote;
    case "bulk":
      return Layers;
    case "trade":
      return FileText;
    case "term-deposit":
      return PiggyBank;
    default:
      // GIP, ACH, RTGS and any plain bank transfer
      return Landmark;
  }
}

/**
 * A logo is a claim: "this is the real company". So it is only drawn where the name comes from the system (a biller
 * list, a merchant record, the card network, the customer's own wallet), never from a name a person typed. Payments to
 * people (mobile money, bank transfers, PAPSS, cash-out codes) keep the grey kind icon, so a payee nicknamed "MTN
 * Ghana" cannot borrow MTN's logo. The lasting fix is a biller or merchant id on the transaction (WORKING_LOG).
 */
const LOGO_RAILS = new Set(["bill", "qr", "card", "airtime", "data", "wallet-to-bank"]);

/**
 * The leading mark of a transaction row: one quiet circle, a hairline outline with a grey line icon for the kind of
 * payment (what it was). A company we have a logo for shows its logo instead, because that is recognition rather than
 * decoration. Money that came in gets a small grey arrow on the corner, a hairline disc with no colour; money out has
 * none (the minus sign on the amount already says it). The arrow sits over whatever the mark shows, a logo or an icon.
 */
export function TransactionMark({
  transaction,
  className,
}: {
  transaction: Pick<Transaction, "paymentMethod" | "direction"> & Partial<Pick<Transaction, "counterparty">>;
  className?: string;
}) {
  const Icon = iconFor(transaction);
  const incoming = transaction.direction === "credit";
  // A company we have a logo for is shown by its logo filling the circle; between my own accounts it is GCB. Everything else is the kind icon.
  const logo =
    transaction.paymentMethod === "own-account"
      ? brandLogo("GCB")
      : LOGO_RAILS.has(transaction.paymentMethod ?? "")
        ? brandLogo(transaction.counterparty)
        : null;
  return (
    <div
      className={cn(
        "relative flex size-9 shrink-0 items-center justify-center rounded-full",
        logo ? (!logo.round || logo.disc) && "bg-[var(--logo-disc)]" : "border border-border bg-card text-muted-foreground",
        className,
      )}
    >
      {logo ? (
        <Image
          src={logo.src}
          alt=""
          // Asked for at twice the drawn size, so phone screens (2x and 3x) get a sharp copy
          width={72}
          height={72}
          className={logo.round ? "size-full rounded-full object-cover" : "size-5 object-contain"}
        />
      ) : <Icon size={17} strokeWidth={1.6} />}
      {/* Only money in is marked: most rows are money out, so the exception is what gets the arrow */}
      {incoming && (
        <span
          role="img"
          aria-label="Money in"
          className="absolute -bottom-1 -right-1 flex size-[17px] items-center justify-center rounded-full bg-card text-muted-foreground shadow-[0_0_0_2px_var(--card),0_0_0_3px_var(--border)]"
        >
          <ArrowDownLeft size={10} strokeWidth={2.2} aria-hidden="true" />
        </span>
      )}
    </div>
  );
}
