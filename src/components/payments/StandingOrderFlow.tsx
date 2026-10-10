"use client";

/**
 * Send & Pay — Standing Order Unified Progressive Disclosure Flow
 *
 * Implements modern banking standards:
 *   1. Lead Screen: "Select a standing order" with iconic GCB amber highlights.
 *   2. Responsive Horizontal Scroll Beneficiary Avatar Strip with initials and bank cues.
 *   3. Dynamic collapsing: selecting a beneficiary or focusing amount automatically collapses
 *      beneficiary details into CollapsedDetailsBadge.
 *   4. Clean FromAccountSelector card at top with available liquidity.
 *   5. Real-time name resolution with GhIPSS / Network verification badge.
 *   6. High vertical-padding AmountInput with balance guard.
 *   7. Dedicated recurring schedule options (Frequency, First Run, End Condition).
 *   8. Progressive disclosure: recipient first; amount once the recipient is verified; then the
 *      schedule and name as one-line summaries (sensible defaults) that open on "Change".
 *   9. Review summary with fee breakdown and one-time code authorization.
 */

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeftRight,
  ChevronLeft,
  Landmark,
  PhoneCall,
  Plus,
  User,
  Users,
  Wallet,
  Wifi,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionTile } from "@/components/ui/action-tile";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  accountsForProfile,
  formatDate,
  formatMoney,
  saveStandingInstruction,
  recordTransaction,
  type SpendCategory,
  type InstructionFrequency,
} from "@/lib/mock-data";
import { useGroupsStore } from "@/lib/groups-store";
import { FREQUENCY_OPTIONS, frequencyLabel } from "@/lib/standing-display";
import { cn } from "@/lib/utils";
import CreateGroupModal from "@/components/payments/CreateGroupModal";
import { useSession } from "@/lib/session-store";
import { resolveDefaultAccountId, useAccountPrefs } from "@/lib/accounts-store";
import { PaymentSuccessScreen } from "./PaymentSuccessScreen";
import TransactionOtpModal from "./TransactionOtpModal";
import { useAuthorisation } from "./useAuthorisation";
import {
  FromAccountSelector,
  AmountInput,
  CategorySelect,
  NarrationInput,
  InsufficientFundsAlert,
  ProceedButton,
  AccountVerificationStatus,
  CollapsedDetailsBadge,
  BankSelect,
  NetworkSelect,
  PaymentMethodSelect,
  PAYMENT_METHODS,
  getPaymentMethodName,
  resolveAccountName,
} from "./flows/shared";
import {
  RailBeneficiaryStrip,
  RECENT_AVATARS,
  type RecentPayeeAvatar,
} from "./flows/beneficiaries";
import { useBeneficiariesStore } from "@/lib/beneficiaries-store";

export type TransactionType =
  | "bank"
  | "wallet"
  | "proxy"
  | "group"
  | "wallet-to-bank"
  | "data"
  | "airtime";

const STANDING_ORDER_OPTIONS = [
  { id: "bank" as TransactionType, title: "To Bank", icon: Landmark },
  { id: "wallet" as TransactionType, title: "To Wallet", icon: Wallet },
  { id: "proxy" as TransactionType, title: "To Proxy", icon: User },
  { id: "group" as TransactionType, title: "To Group", icon: Users },
  { id: "wallet-to-bank" as TransactionType, title: "Wallet to Bank", icon: ArrowLeftRight },
  { id: "data" as TransactionType, title: "Bundles", icon: Wifi },
  { id: "airtime" as TransactionType, title: "Airtime", icon: PhoneCall },
];

const WALLET_NETWORKS = ["MTN Mobile Money", "Telecel Cash", "AT Money", "GhanaPay", "G-Money"];
const AIRTIME_NETWORKS = ["MTN Ghana", "Telecel Ghana", "AT Ghana", "GhanaPay", "G-Money"];

const NETWORK_DATA_PACKAGES: Record<string, { id: string; name: string; price: string }[]> = {
  "MTN Ghana": [
    { id: "mtn-1", name: "2.5 GB Monthly (GHS 50)", price: "50" },
    { id: "mtn-2", name: "5.0 GB Monthly (GHS 100)", price: "100" },
    { id: "mtn-3", name: "10 GB Monthly (GHS 180)", price: "180" },
    { id: "mtn-4", name: "25 GB Monthly (GHS 350)", price: "350" },
    { id: "mtn-5", name: "50 GB Monthly (GHS 600)", price: "600" },
  ],
  "Telecel Ghana": [
    { id: "tel-1", name: "3.0 GB Monthly (GHS 50)", price: "50" },
    { id: "tel-2", name: "6.0 GB Monthly (GHS 100)", price: "100" },
    { id: "tel-3", name: "12 GB Monthly (GHS 180)", price: "180" },
    { id: "tel-4", name: "30 GB Monthly (GHS 350)", price: "350" },
  ],
  "AT Ghana": [
    { id: "at-1", name: "4.0 GB Big Time (GHS 50)", price: "50" },
    { id: "at-2", name: "8.0 GB Big Time (GHS 100)", price: "100" },
    { id: "at-3", name: "15 GB Big Time (GHS 170)", price: "170" },
    { id: "at-4", name: "40 GB Big Time (GHS 330)", price: "330" },
  ],
};


function detectNetworkFromPhone(phone: string): { airtimeNet: string; walletNet: string } | null {
  let clean = phone.replace(/[^0-9]/g, "");
  if (clean.startsWith("233") && clean.length > 9) {
    clean = "0" + clean.slice(3);
  }
  if (
    clean.startsWith("024") ||
    clean.startsWith("054") ||
    clean.startsWith("055") ||
    clean.startsWith("059") ||
    clean.startsWith("025")
  ) {
    return { airtimeNet: "MTN Ghana", walletNet: "MTN Mobile Money" };
  }
  if (clean.startsWith("020") || clean.startsWith("050")) {
    return { airtimeNet: "Telecel Ghana", walletNet: "Telecel Cash" };
  }
  if (
    clean.startsWith("027") ||
    clean.startsWith("057") ||
    clean.startsWith("026") ||
    clean.startsWith("056")
  ) {
    return { airtimeNet: "AT Ghana", walletNet: "AT Money" };
  }
  return null;
}

import { useContextualBack } from "@/lib/contextual-back";
import { PhoneInput } from "@/components/ui/phone-input";
import { useOwnWallets } from "./flows/OwnWalletPicker";
import { formatGhPhone } from "./flows/shared";

import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
export function StandingOrderFlow({ onDone }: { onDone?: () => void }) {
  const router = useRouter();
  const { handleBack: handleBackNavigation } = useContextualBack("/payments/standing");
  const activeProfile = useSession((s) => s.activeProfile);
  const accounts = useMemo(() => accountsForProfile(activeProfile?.kind), [activeProfile?.kind]);
  const auth = useAuthorisation();
  const { groups } = useGroupsStore();
  const savedBeneficiaries = useBeneficiariesStore((s) => s.beneficiaries);
  const ownWallets = useOwnWallets();
  const storedDefaultId = useAccountPrefs((s) => s.defaultAccountId);
  // Start from the account the customer came from (?from=), else their default.
  const fromParam = useSearchParams().get("from");
  const initialFromId =
    accounts.find((a) => a.id === fromParam)?.id ??
    resolveDefaultAccountId(accounts, storedDefaultId) ??
    accounts[0]?.id ??
    "";

  const [rail, setRail] = useState<TransactionType | null>(null);
  const [screen, setScreen] = useState<"form" | "review" | "success">("form");
  const [createdId, setCreatedId] = useState("");
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [detailsCollapsed, setDetailsCollapsed] = useState(false);
  // Progressive disclosure: everything after the recipient stays hidden until the recipient is real.
  const [revealed, setRevealed] = useState(false);

  // Form State
  const [f, setF] = useState({
    fromId: initialFromId,
    destination: "",
    bank: "GCB Bank",
    paymentMethod: "gip",
    network: "MTN Ghana",
    walletNetwork: "MTN Mobile Money",
    proxyId: "",
    groupName: "",
    dataPackageId: "mtn-2",
    amount: "",
    category: "",
    nickname: "",
    narration: "",
    frequency: "" as InstructionFrequency | "",
    intervalDays: "",
    firstRun: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    endCondition: "indefinite" as "indefinite" | "date",
    endDate: "",
    saveBeneficiary: false,
    beneficiaryNickname: "",
  });

  const set = (k: keyof typeof f, v: unknown) => setF((p) => ({ ...p, [k]: v }));

  // Live automatic name resolution
  const [resolving, setResolving] = useState(false);
  const [resolvedName, setResolvedName] = useState<string>("");

  const currentDest = rail === "proxy" ? f.proxyId : f.destination;

  useEffect(() => {
    if (!rail || rail === "group") {
      setResolvedName("");
      setResolving(false);
      return;
    }
    const clean = currentDest.replace(/[\s-]/g, "");
    if (!clean || clean.length < 5) {
      setResolvedName("");
      setResolving(false);
      return;
    }
    setResolving(true);
    const t = setTimeout(() => {
      setResolvedName(resolveAccountName(currentDest, ""));
      setResolving(false);
    }, 250);
    return () => clearTimeout(t);
  }, [currentDest, rail]);

  const fromAccount = useMemo(() => {
    return accounts.find((a) => a.id === f.fromId) ?? accounts[0];
  }, [accounts, f.fromId]);

  const railConfig = STANDING_ORDER_OPTIONS.find((t) => t.id === rail) ?? STANDING_ORDER_OPTIONS[0];

  const currentPackages = useMemo(() => {
    return NETWORK_DATA_PACKAGES[f.network] || NETWORK_DATA_PACKAGES["MTN Ghana"];
  }, [f.network]);

  // Beneficiaries Avatar Strip filtered by current rail + merging saved beneficiaries
  const activeRailBeneficiaries = useMemo(() => {
    if (!rail) return [];

    if (rail === "group") {
      return groups.map((g) => ({
        id: g.id,
        name: g.name,
        bank: `${g.members.length} members`,
        acct: g.splitType === "equal" ? `GHS ${g.defaultPerMemberAmount} each` : "Custom split",
        initials:
          g.name
            .replace(/[^a-zA-Z ]/g, "")
            .split(" ")
            .filter(Boolean)
            .map((w) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase() || "GP",
        rail: "group",
        colorBg: "var(--avatar-yellow)",
      }));
    }

    // Pull from static avatar list
    let list: RecentPayeeAvatar[] = [];
    if (rail === "wallet-to-bank") {
      list = RECENT_AVATARS.filter((r) => r.rail === "bank" || r.rail === "wallet-to-bank");
    } else {
      list = RECENT_AVATARS.filter((r) => r.rail === rail);
    }

    // Your own wallets / numbers first — a standing order to your own MoMo is a
    // common one. They replace the static single "self" entry.
    if (rail === "wallet" || rail === "airtime" || rail === "data") {
      const own = ownWallets.map<RecentPayeeAvatar>((w) => ({
        id: `own-${w.id}`,
        name: `My ${rail === "wallet" ? w.network : "number"}`,
        bank: w.network,
        acct: formatGhPhone(w.phone),
        subtitle: `${formatGhPhone(w.phone)} · ${w.tag}`,
        initials: "ME",
        rail,
        colorBg: "var(--avatar-yellow)",
      }));
      list = [...own, ...list.filter((r) => !r.id.includes("self"))];
    }

    // Merge in any custom saved beneficiaries from user store matching the rail
    const storeMatching = savedBeneficiaries
      .filter((sb) => sb.transactionType === rail)
      .map((sb) => ({
        id: sb.id,
        name: sb.name,
        bank: sb.bankName || sb.network || "GCB Bank",
        acct: sb.accountNumber || sb.phoneNumber || sb.proxyId || "",
        initials:
          sb.name
            .replace(/[^a-zA-Z ]/g, "")
            .split(" ")
            .filter(Boolean)
            .map((w) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase() || "BN",
        rail: rail as string,
        colorBg: "var(--avatar-green)",
      }));

    // Deduplicate by account/phone number
    const seen = new Set<string>();
    const merged: RecentPayeeAvatar[] = [];
    for (const item of [...storeMatching, ...list]) {
      const key = `${item.acct}-${item.name}`.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(item);
      }
    }
    return merged;
  }, [rail, groups, savedBeneficiaries, ownWallets]);

  /**
   * Selecting a beneficiary immediately fills details AND sets detailsCollapsed to TRUE.
   */
  const handleSelectBeneficiary = (item: RecentPayeeAvatar) => {
    if (rail === "group") {
      set("groupName", item.name);
      const matched = groups.find((g) => g.name === item.name || g.id === item.id);
      if (matched?.defaultPerMemberAmount) {
        set("amount", String(matched.defaultPerMemberAmount));
      }
      setDetailsCollapsed(true);
      return;
    }

    if (rail === "proxy") {
      set("proxyId", item.acct);
      setResolvedName(item.name);
    } else {
      set("destination", item.acct);
      setResolvedName(item.name);
    }

    if (item.bank) {
      if (rail === "bank" || rail === "wallet-to-bank") {
        set("bank", item.bank);
      } else if (rail === "wallet") {
        set("walletNetwork", item.bank);
      } else if (rail === "data" || rail === "airtime") {
        set("network", item.bank);
        if (rail === "data") {
          const pkgs = NETWORK_DATA_PACKAGES[item.bank] || [];
          if (pkgs.length > 0) {
            set("dataPackageId", pkgs[0].id);
            set("amount", pkgs[0].price);
          }
        }
      }
    }

    // Set field to collapsed state immediately upon clicking a beneficiary
    setDetailsCollapsed(true);
  };

  const handlePhoneChange = (val: string) => {
    set("destination", val);
    const detected = detectNetworkFromPhone(val);
    if (detected) {
      if (rail === "data" || rail === "airtime") {
        if (!f.network) {
          set("network", detected.airtimeNet);
          if (rail === "data") {
            const pkgs = NETWORK_DATA_PACKAGES[detected.airtimeNet] || [];
            if (pkgs.length > 0) {
              set("dataPackageId", pkgs[0].id);
              set("amount", pkgs[0].price);
            }
          }
        }
      } else if (rail === "wallet") {
        if (!f.walletNetwork) {
          set("walletNetwork", detected.walletNet);
        }
      }
    }
    const clean = val.replace(/[^0-9]/g, "");
    if (clean.length === 10) {
      setDetailsCollapsed(true);
    }
  };

  // Validation
  const numAmount = Number(f.amount.replace(/[^0-9.]/g, "")) || 0;
  const overBalance = numAmount > (fromAccount?.available ?? 0);

  const isDestinationValid = useMemo(() => {
    if (rail === "group") return Boolean(f.groupName);
    if (rail === "proxy") return f.proxyId.trim().length >= 4;
    return f.destination.replace(/[\s-]/g, "").length >= 8;
  }, [rail, f.groupName, f.proxyId, f.destination]);

  const isFormValid = useMemo(() => {
    return (
      Boolean(f.fromId) &&
      isDestinationValid &&
      numAmount > 0 &&
      !overBalance &&
      f.nickname.trim().length > 0 &&
      Boolean(f.frequency) &&
      (f.frequency !== "Custom" || Number(f.intervalDays) >= 1) &&
      Boolean(f.firstRun)
    );
  }, [f.fromId, isDestinationValid, numAmount, overBalance, f.nickname, f.frequency, f.intervalDays, f.firstRun]);

  // The rest of the form appears once the recipient is verified, and stays put while it is being edited
  // (so amount doesn't flicker away on every keystroke). It hides again if the recipient is cleared.
  const recipientReady = isDestinationValid && (rail === "group" || rail === "proxy" || (!resolving && Boolean(resolvedName)));
  useEffect(() => {
    if (recipientReady) setRevealed(true);
    else if (!isDestinationValid) setRevealed(false);
  }, [recipientReady, isDestinationValid]);

  // Fee Calculation
  const feeAmount = useMemo(() => {
    if (rail === "bank") {
      if (f.bank.includes("GCB")) return 0;
      const pm = PAYMENT_METHODS.find((m) => m.id === f.paymentMethod);
      return pm ? pm.fee : 5.0;
    }
    if (rail === "wallet" || rail === "airtime" || rail === "data") return 0;
    return 0.5;
  }, [rail, f.bank, f.paymentMethod]);

  const totalPerCycle = numAmount + feeAmount;
  const orderName = f.nickname.trim();
  const intervalDays = Math.max(1, Number(f.intervalDays) || 1);
  const frequencyText = f.frequency ? frequencyLabel({ frequency: f.frequency, intervalDays }) : "";

  const handleAuthorize = (code?: string) => {
    // The code modal keeps the entered code itself and hands it back; verify() here has no digits of its own.
    if (!auth.verify(code)) return;
    const newId = `SO-${Date.now().toString().slice(-6)}`;
    saveStandingInstruction({
      id: newId,
      beneficiary: (rail === "group" ? f.groupName : resolvedName) || "Standing Order",
      shortName: orderName,
      transactionType: railConfig.title,
      narration: f.narration.trim() || undefined,
      accountId: f.fromId,
      amount: numAmount,
      currency: "GHS",
      frequency: f.frequency || "Monthly",
      intervalDays: f.frequency === "Custom" ? intervalDays : undefined,
      nextRun: f.firstRun,
      startDate: f.firstRun,
      endDate: f.frequency !== "Once" && f.endCondition === "date" && f.endDate ? f.endDate : undefined,
      status: "Active",
    });

    // Save beneficiary if requested
    if (f.saveBeneficiary && (resolvedName || f.destination)) {
      const bTxType =
        rail === "wallet-to-bank"
          ? "bank"
          : rail === "data"
          ? "airtime"
          : rail === "group"
          ? "bank"
          : rail === "bank" || rail === "wallet" || rail === "proxy" || rail === "airtime"
          ? rail
          : "bank";

      useBeneficiariesStore.getState().addBeneficiary({
        name: f.beneficiaryNickname || resolvedName || f.destination,
        transactionType: bTxType,
        category: "person",
        detail: `${f.bank || f.network} · ${f.destination || f.proxyId}`,
        verified: true,
        bankName: f.bank,
        accountNumber: f.destination,
        network: f.network || f.walletNetwork,
        phoneNumber: f.destination,
        proxyId: f.proxyId,
      });
    }

    recordTransaction({
      id: newId,
      reference: newId,
      date: new Date().toISOString().slice(0, 10),
      valueDate: new Date().toISOString().slice(0, 10),
      description: `Standing Order — ${orderName}`,
      counterparty: resolvedName || f.destination || f.proxyId || f.groupName || "Beneficiary",
      counterpartyAccount: f.destination || f.proxyId || "",
      accountId: fromAccount?.id || "acc-ret-001",
      currency: "GHS",
      amount: numAmount,
      fee: 0,
      direction: "debit",
      kind: "single",
      state: "completed",
      paymentMethod: "ach",
      channel: "Internet Banking",
      profileKind: "RETAIL",
      category: (f.category || "Family & Friends") as SpendCategory,
    });

    setCreatedId(newId);
    setScreen("success");
  };

  const resetAll = () => {
    auth.reset();
    setRail(null);
    setScreen("form");
    setDetailsCollapsed(false);
    setRevealed(false);
    setF({
      fromId: initialFromId,
      destination: "",
      bank: "GCB Bank",
      paymentMethod: "gip",
      network: "MTN Ghana",
      walletNetwork: "MTN Mobile Money",
      proxyId: "",
      groupName: "",
      dataPackageId: "mtn-2",
      amount: "",
      category: "",
      nickname: "",
      narration: "",
      frequency: "",
      intervalDays: "",
      firstRun: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      endCondition: "indefinite",
      endDate: "",
      saveBeneficiary: false,
      beneficiaryNickname: "",
    });
    setResolvedName("");
  };

  /* =========================================================================
   * SCREEN 1: Lead Screen — "Select a standing order"
   * ========================================================================= */
  if (!rail) {
    return (
      <div className="mx-auto flex w-full max-w-[580px] flex-col gap-6 py-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (onDone) onDone();
              else handleBackNavigation();
            }}
            className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            aria-label="Back to Standing Orders"
          >
            <ChevronLeft size={22} strokeWidth={1.8} />
          </button>
          <h1 className="text-[18px] sm:text-[20px] lg:text-[22px] font-medium leading-[24px] sm:leading-[28px] tracking-[-0.02em] text-foreground">
            Select a standing order
          </h1>
        </div>

        <div className="flex flex-col gap-2.5">
          {STANDING_ORDER_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <ActionTile
                key={opt.id}
                icon={Icon}
                title={opt.title}
                onClick={() => {
                  setRail(opt.id);
                  setDetailsCollapsed(false);
                  setRevealed(false);
                  setScreen("form");
                  if (opt.id === "data") {
                    set("network", "MTN Ghana");
                    set("dataPackageId", "mtn-2");
                    set("amount", "100");
                  } else if (opt.id === "airtime") {
                    set("network", "MTN Ghana");
                  } else {
                    set("nickname", "");
                  }
                }}
              />
            );
          })}
        </div>
      </div>
    );
  }

  /* =========================================================================
   * SCREEN 2: Success Confirmation Receipt (1:1 Figma Node 1367:33535)
   * ========================================================================= */
  if (screen === "success") {
    const receiptRows: Array<[string, React.ReactNode]> = [
      ["Reference ID", createdId],
      ["Beneficiary", resolvedName || f.destination || f.proxyId || f.groupName],
      ["Short name", orderName],
      ["Schedule Frequency", `${frequencyText} · First run ${formatDate(f.firstRun)}`],
      ["Debit Account", `${fromAccount?.name} (•••${fromAccount?.number.slice(-4)})`],
      ["Total per Execution", formatMoney(totalPerCycle, "GHS", true)],
    ];

    return (
      <PaymentSuccessScreen
        title="Standing order set up"
        message={`We’ll automatically send ${formatMoney(numAmount, "GHS", true)} ${f.frequency === "Once" ? "once" : frequencyText.toLowerCase()} for “${orderName}”.`}
        transactionId={createdId}
        receiptRows={receiptRows}
        onViewReceipt={() => router.push(`/transactions/${createdId}`)}
        onSecondaryAction={resetAll}
        secondaryActionLabel="Create another"
        onPrimaryAction={() => {
          if (onDone) onDone();
          else router.push("/payments/standing");
        }}
        primaryActionLabel="Back to Overview"
        showSaveBeneficiary={false}
        hideSchedule
      />
    );
  }

  /* =========================================================================
   * SCREEN 3: Review Stage
   * ========================================================================= */
  if (screen === "review") {
    const detail =
      rail === "bank" || rail === "wallet-to-bank"
        ? `${f.bank} · ${f.destination}`
        : rail === "wallet"
          ? `${f.walletNetwork} · ${f.destination}`
          : rail === "proxy"
            ? f.proxyId
            : rail === "group"
              ? ""
              : `${f.network} · ${f.destination}`;
    const reviewRows: Array<[string, string]> = [
      ["Short name", orderName],
      ["Type", railConfig.title],
      ["To", (rail === "group" ? f.groupName : resolvedName) || f.destination || f.proxyId],
      ...(detail ? ([["Account", detail]] as Array<[string, string]>) : []),
      ["From", fromAccount?.name ?? ""],
      ["Frequency", frequencyText],
      [f.frequency === "Once" ? "Payment Date" : "First Payment", formatDate(f.firstRun)],
      ...(f.frequency === "Once" ? [] : ([["Ends", f.endCondition === "date" && f.endDate ? formatDate(f.endDate) : "Until cancelled"]] as Array<[string, string]>)),
      ...(rail === "bank" && !f.bank.includes("GCB") ? ([["Payment method", getPaymentMethodName(f.paymentMethod)]] as Array<[string, string]>) : []),
      ...(f.category ? ([["Category", f.category]] as Array<[string, string]>) : []),
      ...(f.narration.trim() ? ([["Narration", f.narration.trim()]] as Array<[string, string]>) : []),
      ["Amount", formatMoney(numAmount, "GHS", true)],
      ["Fee", feeAmount === 0 ? "Free" : formatMoney(feeAmount, "GHS", true)],
      ["Total per payment", formatMoney(totalPerCycle, "GHS", true)],
    ];
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 animate-in fade-in duration-200 ease-out">
        {/* Header with back button */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setScreen("form")}
            className="relative flex size-8 sm:size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer -ml-1 sm:ml-0"
            aria-label="Back to form"
          >
            <ChevronLeft size={20} strokeWidth={1.8} />
          </button>
          <h1 className="text-[18px] sm:text-[20px] lg:text-[22px] font-medium leading-[24px] sm:leading-[28px] tracking-[-0.02em] text-foreground truncate">
            Standing Order Summary
          </h1>
        </div>

        <div className="flex flex-col gap-5">
          {/* Review: label on the left, value on the right, one line each, no dividers */}
          <div className="flex flex-col rounded-2xl border border-border bg-card p-2 text-[14px]">
            {reviewRows.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-6 rounded-xl px-3 py-3.5">
                <span className="shrink-0 text-muted-foreground">{label}</span>
                <span className="tabular min-w-0 truncate text-right text-foreground">{value}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-13 rounded-2xl text-[15px]"
              onClick={() => setScreen("form")}
            >
              Back to Edit
            </Button>
            <Button
              type="button"
              className="flex-1 h-13 rounded-2xl text-[16px] bg-primary text-primary-foreground drop-shadow-sm active:scale-[0.98] cursor-pointer"
              onClick={() => setPinModalOpen(true)}
            >
              Authorize &amp; Schedule
            </Button>
          </div>
        </div>

        {/* Transaction authorisation: a one-time code */}
        <TransactionOtpModal
          open={pinModalOpen}
          onOpenChange={setPinModalOpen}
          onSuccess={(code) => {
            setPinModalOpen(false);
            handleAuthorize(code);
          }}
        />
      </div>
    );
  }

  /* =========================================================================
   * SCREEN 4: Form Screen (The New Unified Layout)
   * ========================================================================= */
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 animate-in fade-in duration-200 ease-out">
      {/* Header with back button */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <button
          type="button"
          onClick={() => setRail(null)}
          className="relative flex size-8 sm:size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer -ml-1 sm:ml-0"
          aria-label="Back to Select a standing order"
        >
          <ChevronLeft size={20} strokeWidth={1.8} />
        </button>
        <h1 className="text-[18px] sm:text-[20px] lg:text-[22px] font-medium leading-[24px] sm:leading-[28px] tracking-[-0.02em] text-foreground truncate">
          {railConfig.title} Standing Order
        </h1>
      </div>

      <div className="flex flex-col gap-6">
        {/* 1. Beneficiaries Avatars Strip */}
        {activeRailBeneficiaries.length > 0 && (
          <div className="flex flex-col gap-5 -mb-1 animate-in fade-in duration-150">
            <RailBeneficiaryStrip
              items={activeRailBeneficiaries}
              onSelect={handleSelectBeneficiary}
            />
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/60" />
              </div>
              <button
                type="button"
                onClick={() => {
                  setDetailsCollapsed(false);
                  set("destination", "");
                  set("proxyId", "");
                  set("groupName", "");
                  setResolvedName("");
                }}
                className="relative bg-background px-3 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Or enter new details
              </button>
            </div>
          </div>
        )}

        {/* 2. From Account Selector Card */}
        <FromAccountSelector
          accounts={accounts}
          value={f.fromId}
          onChange={(id) => set("fromId", id)}
        />

        {/* 3. Beneficiary Details Card */}
        <Field label="Beneficiary Details">

          {isDestinationValid && detailsCollapsed ? (
            <CollapsedDetailsBadge
              title={
                resolvedName ||
                (rail === "group" ? f.groupName : `Recipient ${f.destination || f.proxyId}`)
              }
              subtitle={
                rail === "bank" || rail === "wallet-to-bank"
                  ? `${f.bank} · ${f.destination}`
                  : rail === "wallet"
                  ? `${f.walletNetwork} · ${f.destination}`
                  : rail === "proxy"
                  ? `Proxy ID: ${f.proxyId}`
                  : rail === "group"
                  ? `Group: ${f.groupName}`
                  : `${f.network} · ${f.destination}`
              }
              onChange={() => setDetailsCollapsed(false)}
            />
          ) : (
            <div className="flex flex-col gap-3">
              {/* TO BANK / WALLET TO BANK */}
              {(rail === "bank" || rail === "wallet-to-bank") && (
                <>
                  <BankSelect
                    value={f.bank}
                    onChange={(val) => {
                      set("bank", val);
                      if (val.includes("GCB")) set("paymentMethod", "");
                      else if (!f.paymentMethod) set("paymentMethod", "gip");
                    }}
                  />

                  {/* Payment Method for Other Local Banks */}
                  {!f.bank.includes("GCB") && (
                    <PaymentMethodSelect value={f.paymentMethod || "gip"} onChange={(val) => set("paymentMethod", val)} />
                  )}

                  <Input
                    type="text"
                    inputMode="numeric"
                    value={f.destination}
                    onChange={(e) => set("destination", e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="Enter account number"
                    className="numorainput tabular"
                  />
                </>
              )}

              {/* TO MOBILE WALLET */}
              {rail === "wallet" && (
                <>
                  <NetworkSelect value={f.walletNetwork} onChange={(val) => set("walletNetwork", val)} options={WALLET_NETWORKS} />

                  <PhoneInput
                    value={f.destination}
                    onValueChange={handlePhoneChange}
                    aria-label="Mobile or wallet number"
                  />
                </>
              )}

              {/* TO PROXY */}
              {rail === "proxy" && (
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-[16px] font-semibold text-muted-foreground select-none pointer-events-none">
                    @
                  </span>
                  <Input
                    type="text"
                    value={f.proxyId.replace(/^@/, "")}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/^@/, "").trim();
                      set("proxyId", cleaned ? `@${cleaned}` : "");
                    }}
                    placeholder="kwame.b"
                    className="pl-9 pr-4 tabular"
                  />
                </div>
              )}

              {/* TO GROUP */}
              {rail === "group" && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-muted-foreground">Select Contribution Circle</span>
                    <button
                      type="button"
                      onClick={() => setCreateGroupOpen(true)}
                      className="text-[13px] text-foreground hover:underline font-medium cursor-pointer flex items-center gap-1"
                    >
                      <Plus size={13} />
                      Create new group
                    </button>
                  </div>
                  <Select
                    value={f.groupName}
                    onValueChange={(val) => {
                      if (!val) return;
                      if (val === "__create_new__") {
                        setCreateGroupOpen(true);
                        return;
                      }
                      const grp = groups.find((g) => g.name === val);
                      set("groupName", val);
                      if (grp?.defaultPerMemberAmount) {
                        set("amount", String(grp.defaultPerMemberAmount));
                      }
                    }}
                  >
                    <SelectTrigger >
                      <SelectValue placeholder="Select group" />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map((g) => (
                        <SelectItem key={g.id} value={g.name}>
                          {g.name} ({g.members.length} Members)
                        </SelectItem>
                      ))}
                      <SelectItem value="__create_new__" className="text-foreground font-medium">
                        + Create new group...
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* DATA BUNDLE */}
              {rail === "data" && (
                <>
                  <NetworkSelect
                    value={f.network}
                    options={AIRTIME_NETWORKS}
                    onChange={(newNet) => {
                      set("network", newNet);
                      const pkgs = NETWORK_DATA_PACKAGES[newNet] || [];
                      if (pkgs.length > 0) {
                        set("dataPackageId", pkgs[0].id);
                        set("amount", pkgs[0].price);
                      }
                    }}
                  />

                  <PhoneInput
                    value={f.destination}
                    onValueChange={handlePhoneChange}
                    aria-label="Phone number"
                  />

                  <Select
                    value={f.dataPackageId}
                    onValueChange={(val) => {
                      if (!val) return;
                      set("dataPackageId", val);
                      const dp = currentPackages.find((d) => d.id === val);
                      if (dp) set("amount", dp.price);
                      if (isDestinationValid) setDetailsCollapsed(true);
                    }}
                    onOpenChange={(open) => {
                      if (open && isDestinationValid) setDetailsCollapsed(true);
                    }}
                  >
                    <SelectTrigger >
                      <SelectValue placeholder="Select monthly bundle" />
                    </SelectTrigger>
                    <SelectContent>
                      {currentPackages.map((dp) => (
                        <SelectItem key={dp.id} value={dp.id}>
                          {dp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}

              {/* AIRTIME */}
              {rail === "airtime" && (
                <>
                  <NetworkSelect value={f.network} onChange={(val) => set("network", val)} options={AIRTIME_NETWORKS} />

                  <PhoneInput
                    value={f.destination}
                    onValueChange={handlePhoneChange}
                    aria-label="Phone number"
                  />
                </>
              )}

              {/* Live Resolving State / Verification Badge */}
              {rail !== "group" && (
                <AccountVerificationStatus
                  resolving={resolving}
                  name={resolvedName}
                  resolvingMessage="Verifying..."
                />
              )}
            </div>
          )}
</Field>

        {/* Everything below appears once the recipient is verified */}
        {revealed && (
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-1 duration-200">
            {/* 4. Amount Input */}
            <AmountInput
              value={f.amount}
              onChange={(val) => set("amount", val)}
              onFocus={() => {
                if (isDestinationValid) setDetailsCollapsed(true);
              }}
              error={
                overBalance ? (
                  <InsufficientFundsAlert />
                ) : undefined
              }
            />

            {numAmount > 0 && !overBalance && (
              <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-1 duration-200">
                {/* 5. Short name and category */}
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <Field label="Short Name" htmlFor="so-short-name">
                    <Input
                      id="so-short-name"
                      type="text"
                      value={f.nickname}
                      onChange={(e) => set("nickname", e.target.value)}
                      placeholder="e.g. Monthly rent, Susu"
                      
                    />
</Field>

                  <CategorySelect
                    value={f.category}
                    onChange={(val) => set("category", val)}
                  />
                </div>

                <NarrationInput value={f.narration} onChange={(val) => set("narration", val)} />

                {/* 6. Frequency */}
                <Field label="Frequency">
                  <Select
                    value={f.frequency}
                    onValueChange={(val) => val && set("frequency", val as InstructionFrequency)}
                  >
                    <SelectTrigger >
                      <span className={cn("truncate", !f.frequency && "text-muted-foreground")}>{FREQUENCY_OPTIONS.find((o) => o.id === f.frequency)?.label ?? "Select frequency"}</span>
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id} label={opt.label}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {f.frequency === "Custom" && (
                    <div className="flex items-center gap-3 animate-in fade-in duration-150">
                      <span className="text-[13px] text-muted-foreground">Repeat after</span>
                      <Input
                        type="text"
                        inputMode="numeric"
                        aria-label="Number of days"
                        value={f.intervalDays}
                        onChange={(e) => set("intervalDays", e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
                        className="tabular w-20 text-center"
                      />
                      <span className="text-[13px] text-muted-foreground">days</span>
                    </div>
                  )}
</Field>

                {/* Everything else waits for a frequency (and the days, when it is every X days) */}
                {f.frequency && (f.frequency !== "Custom" || Number(f.intervalDays) >= 1) && (
                  <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-1 duration-200">
                  {/* 7. First run, and when it stops */}
                  <div className={cn("grid grid-cols-1 gap-3.5", f.frequency !== "Once" && "sm:grid-cols-2")}>
                    <Field label={f.frequency === "Once" ? "Payment Date" : "First Payment"} htmlFor="so-first-run">
                      <Input
                        id="so-first-run"
                        type="date"
                        value={f.firstRun}
                        min={new Date().toISOString().slice(0, 10)}
                        onChange={(e) => set("firstRun", e.target.value)}
                        className="tabular"
                      />
</Field>

                    {f.frequency !== "Once" && (
                      <Field label="Ends">
                        <Select
                          value={f.endCondition}
                          onValueChange={(val) => val && set("endCondition", val as "indefinite" | "date")}
                        >
                          <SelectTrigger >
                            <span className="truncate">{f.endCondition === "date" ? "On a Date" : "Until I Cancel"}</span>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="indefinite" label="Until I Cancel">
                              Until I cancel
                            </SelectItem>
                            <SelectItem value="date" label="On a Date">
                              On a date
                            </SelectItem>
                          </SelectContent>
                        </Select>
</Field>
                    )}
                  </div>

                  {f.frequency !== "Once" && f.endCondition === "date" && (
                    <div className="animate-in fade-in slide-in-from-top-1 duration-150">
                      <Field label="Last Payment" htmlFor="so-end-date">
                        <Input
                          id="so-end-date"
                          type="date"
                          value={f.endDate}
                          min={f.firstRun}
                          onChange={(e) => set("endDate", e.target.value)}
                          className="tabular"
                        />
                      </Field>
                    </div>
                  )}

                  {/* 8. Action Button */}
                  <ProceedButton
                    disabled={!isFormValid}
                    onClick={() => {
                      setDetailsCollapsed(true);
                      setScreen("review");
                    }}
                    label="Continue to Summary"
                  />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <CreateGroupModal
        open={createGroupOpen}
        onOpenChange={setCreateGroupOpen}
        onSuccess={(newGroup) => {
          set("groupName", newGroup.name);
          if (newGroup.defaultPerMemberAmount) {
            set("amount", String(newGroup.defaultPerMemberAmount));
          }
          setDetailsCollapsed(true);
        }}
      />
    </div>
  );
}
