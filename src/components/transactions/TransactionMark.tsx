import {
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
  HandCoins,
} from "@/components/ui/icons";
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
    case "loan":
      return HandCoins;
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
 * decoration. It says nothing about direction: no arrow or badge on the corner, whatever the mark shows (designer,
 * 2026-10-29). Which way the money went is the + or − on the amount, and only that.
 */
export function TransactionMark({
  transaction,
  className,
}: {
  transaction: Pick<Transaction, "paymentMethod" | "direction"> & Partial<Pick<Transaction, "counterparty">>;
  className?: string;
}) {
  const Icon = iconFor(transaction);
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
          // Drawn at 36px, and the files in /public/brands are already cut to 144px at most (a few KB each), so they are
          // served as they are: going through the image optimizer cost a round trip and an encode for every new logo.
          unoptimized
          width={72}
          height={72}
          className={logo.round ? "size-full rounded-full object-cover" : "size-5 object-contain"}
        />
      ) : <Icon size={17} strokeWidth={1.6} />}
    </div>
  );
}
