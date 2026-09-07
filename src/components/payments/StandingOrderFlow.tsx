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
 *   8. Review summary with fee breakdown and Transaction PIN modal authorization.
 */

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Landmark,
  Loader2,
  PhoneCall,
  Plus,
  User,
  Users,
  Wallet,
  Wifi,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  type InstructionFrequency,
} from "@/lib/mock-data";
import { useGroupsStore } from "@/lib/groups-store";
import CreateGroupModal from "@/components/payments/CreateGroupModal";
import { useSession } from "@/lib/session-store";
import TransactionPinModal from "./TransactionPinModal";
import { useAuthorisation } from "./useAuthorisation";
import {
  FromAccountSelector,
  AmountInput,
  CategorySelect,
  InsufficientFundsAlert,
  ProceedButton,
  VerifiedAccountBadge,
  CollapsedDetailsBadge,
  SaveBeneficiaryCheckbox,
  BANKS,
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
  { id: "data" as TransactionType, title: "Data Bundle", icon: Wifi },
  { id: "airtime" as TransactionType, title: "Airtime", icon: PhoneCall },
];

const WALLET_NETWORKS = ["MTN Mobile Money", "Telecel Cash", "AT Money"];
const AIRTIME_NETWORKS = ["MTN Ghana", "Telecel Ghana", "AT Ghana"];

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

const CATEGORIES = [
  { id: "susu", label: "Susu Contribution", defaultName: "Monthly Susu" },
  { id: "rent", label: "Rent & Housing", defaultName: "Monthly Rent" },
  { id: "education", label: "School Fees & Tuition", defaultName: "School Fees" },
  { id: "utilities", label: "Utilities (Power / Water)", defaultName: "Utility Bill" },
  { id: "family", label: "Family Support & Allowance", defaultName: "Family Allowance" },
  { id: "bills", label: "General Subscriptions & Bills", defaultName: "Recurring Bill" },
  { id: "savings", label: "Savings & Investments", defaultName: "Monthly Savings" },
];

const FREQUENCIES: InstructionFrequency[] = [
  "Daily",
  "Weekly",
  "Monthly",
  "Quarterly",
  "Yearly",
];

function detectNetworkFromPhone(phone: string): { airtimeNet: string; walletNet: string } | null {
  const clean = phone.replace(/[^0-9]/g, "");
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

export function StandingOrderFlow({ onDone }: { onDone?: () => void }) {
  const router = useRouter();
  const activeProfile = useSession((s) => s.activeProfile);
  const accounts = useMemo(() => accountsForProfile(activeProfile?.kind), [activeProfile?.kind]);
  const auth = useAuthorisation();
  const { groups } = useGroupsStore();
  const savedBeneficiaries = useBeneficiariesStore((s) => s.beneficiaries);

  const [rail, setRail] = useState<TransactionType | null>(null);
  const [screen, setScreen] = useState<"form" | "review" | "success">("form");
  const [createdId, setCreatedId] = useState("");
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [detailsCollapsed, setDetailsCollapsed] = useState(false);

  // Form State
  const [f, setF] = useState({
    fromId: accounts[0]?.id ?? "",
    destination: "",
    bank: "GCB Bank",
    paymentMethod: "gip",
    network: "MTN Ghana",
    walletNetwork: "MTN Mobile Money",
    proxyId: "",
    groupName: "",
    dataPackageId: "mtn-2",
    amount: "",
    category: "bills",
    nickname: "",
    frequency: "Monthly" as InstructionFrequency,
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
  const selectedCat = CATEGORIES.find((c) => c.id === f.category) ?? CATEGORIES[0];

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
        colorBg: "#fef3c7",
      }));
    }

    // Pull from static avatar list
    let list: RecentPayeeAvatar[] = [];
    if (rail === "wallet-to-bank") {
      list = RECENT_AVATARS.filter((r) => r.rail === "bank" || r.rail === "wallet-to-bank");
    } else {
      list = RECENT_AVATARS.filter((r) => r.rail === rail);
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
        colorBg: "#e0eedd",
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
  }, [rail, groups, savedBeneficiaries]);

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
            set("nickname", `Monthly ${item.bank.split(" ")[0]} Data`);
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
        set("network", detected.airtimeNet);
        if (rail === "data") {
          const pkgs = NETWORK_DATA_PACKAGES[detected.airtimeNet] || [];
          if (pkgs.length > 0) {
            set("dataPackageId", pkgs[0].id);
            set("amount", pkgs[0].price);
            set("nickname", `Monthly ${detected.airtimeNet.split(" ")[0]} Data`);
          }
        }
      } else if (rail === "wallet") {
        set("walletNetwork", detected.walletNet);
      }
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
      Boolean(f.frequency) &&
      Boolean(f.firstRun)
    );
  }, [f.fromId, isDestinationValid, numAmount, overBalance, f.frequency, f.firstRun]);

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

  const handleAuthorize = () => {
    if (!auth.verify()) return;
    const newId = `SO-${Date.now().toString().slice(-6)}`;
    saveStandingInstruction({
      id: newId,
      beneficiary: f.nickname || (rail === "group" ? f.groupName : resolvedName) || "Standing Order",
      accountId: f.fromId,
      amount: numAmount,
      currency: "GHS",
      frequency: f.frequency,
      nextRun: f.firstRun,
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

    setCreatedId(newId);
    setScreen("success");
  };

  const resetAll = () => {
    auth.reset();
    setRail(null);
    setScreen("form");
    setDetailsCollapsed(false);
    setF({
      fromId: accounts[0]?.id ?? "",
      destination: "",
      bank: "GCB Bank",
      paymentMethod: "gip",
      network: "MTN Ghana",
      walletNetwork: "MTN Mobile Money",
      proxyId: "",
      groupName: "",
      dataPackageId: "mtn-2",
      amount: "",
      category: "bills",
      nickname: "",
      frequency: "Monthly",
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
              else router.push("/payments/standing");
            }}
            className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            aria-label="Back to Standing Orders"
          >
            <ChevronLeft size={22} strokeWidth={1.8} />
          </button>
          <h1 className="text-[24px] font-medium leading-[32px] tracking-[-0.02em] text-foreground">
            Select a standing order
          </h1>
        </div>

        <div className="flex flex-col gap-2.5">
          {STANDING_ORDER_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setRail(opt.id);
                  setDetailsCollapsed(false);
                  setScreen("form");
                  if (opt.id === "data") {
                    set("network", "MTN Ghana");
                    set("dataPackageId", "mtn-2");
                    set("amount", "100");
                    set("nickname", "Monthly MTN Data");
                    set("category", "bills");
                  } else if (opt.id === "airtime") {
                    set("network", "MTN Ghana");
                    set("nickname", "Monthly Airtime");
                    set("category", "bills");
                  } else {
                    set("nickname", opt.title + " Recurring");
                  }
                }}
                className="group flex h-[68px] w-full items-center justify-between rounded-[16px] border border-[#ebebe9] bg-[#f6f6f5] px-4 transition-all duration-150 ease-out hover:bg-[#eeeeed] active:scale-[0.98] dark:border-[#292928] dark:bg-[#1e1e1e] dark:hover:bg-[#262626] cursor-pointer text-left"
              >
                <div className="flex items-center gap-3.5">
                  <span className="flex size-[38px] shrink-0 items-center justify-center rounded-[12px] border border-black/[0.04] bg-white text-amber-500 shadow-sm dark:border-white/[0.06] dark:bg-[#252525] dark:text-[#fdc307]">
                    <Icon size={19} strokeWidth={1.8} />
                  </span>
                  <span className="text-[15.5px] font-medium text-foreground">{opt.title}</span>
                </div>
                <ChevronRight
                  size={19}
                  className="text-muted-foreground transition-transform duration-150 ease-out group-hover:translate-x-0.5 group-hover:text-foreground"
                />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  /* =========================================================================
   * SCREEN 2: Success Confirmation Receipt
   * ========================================================================= */
  if (screen === "success") {
    return (
      <div className="mx-auto flex max-w-[480px] flex-col items-center gap-6 py-6 text-center animate-in fade-in zoom-in-95 duration-200 ease-out">
        <span className="flex size-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 size={30} strokeWidth={2.1} />
        </span>

        <div className="flex flex-col gap-1">
          <h1 className="text-[22px] font-semibold text-foreground tracking-tight">
            Standing Order Scheduled
          </h1>
          <p className="text-[13.5px] text-muted-foreground">
            &ldquo;{f.nickname}&rdquo; will execute {f.frequency.toLowerCase()} for{" "}
            <strong className="text-foreground">{formatMoney(numAmount, "GHS", true)}</strong>.
          </p>
        </div>

        <div className="flex w-full flex-col divide-y divide-border/80 rounded-2xl border border-border/80 bg-card p-4.5 text-[13.5px] text-left shadow-xs">
          <div className="flex items-center justify-between pb-2.5">
            <span className="text-muted-foreground">Reference ID</span>
            <span className="tabular font-mono text-foreground font-medium">{createdId}</span>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <span className="text-muted-foreground">Beneficiary</span>
            <span className="font-medium text-foreground">
              {resolvedName || f.destination || f.proxyId || f.groupName}
            </span>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <span className="text-muted-foreground">Schedule Frequency</span>
            <span className="text-foreground font-medium">
              {f.frequency} · First run <span className="tabular">{formatDate(f.firstRun)}</span>
            </span>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <span className="text-muted-foreground">Debit Account</span>
            <span className="text-foreground font-medium">
              {fromAccount?.name} (•••{fromAccount?.number.slice(-4)})
            </span>
          </div>
          <div className="flex items-center justify-between pt-2.5">
            <span className="text-muted-foreground">Total per Execution</span>
            <span className="text-foreground font-semibold tabular">
              {formatMoney(totalPerCycle, "GHS", true)}
            </span>
          </div>
        </div>

        <div className="flex w-full gap-3">
          <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={resetAll}>
            Create Another
          </Button>
          <Button
            className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground font-medium"
            onClick={() => {
              if (onDone) onDone();
              else router.push("/payments/standing");
            }}
          >
            Done
          </Button>
        </div>
      </div>
    );
  }

  /* =========================================================================
   * SCREEN 3: Review Stage
   * ========================================================================= */
  if (screen === "review") {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 py-4 animate-in fade-in duration-200 ease-out">
        {/* Header with back button */}
        <div className="relative flex items-center">
          <button
            type="button"
            onClick={() => setScreen("form")}
            className="absolute -left-11 md:-left-12 top-1/2 -translate-y-1/2 flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
            aria-label="Back to form"
          >
            <ChevronLeft size={22} strokeWidth={1.8} />
          </button>
          <h1 className="text-[26px] font-medium leading-[32px] tracking-[-0.02em] text-foreground">
            Review Standing Order
          </h1>
        </div>

        <div className="flex flex-col gap-5">
          {/* Main Review Card */}
          <div className="flex flex-col divide-y divide-border/80 rounded-2xl border border-border/80 bg-card p-5 text-[14px]">
            <div className="flex items-center justify-between pb-3.5">
              <span className="text-muted-foreground">Order Type</span>
              <span className="font-medium text-foreground">{railConfig.title} Standing Order</span>
            </div>
            <div className="flex items-center justify-between py-3.5">
              <span className="text-muted-foreground">Beneficiary</span>
              <div className="flex flex-col text-right">
                <span className="font-semibold text-foreground">
                  {resolvedName || f.destination || f.proxyId || f.groupName}
                </span>
                <span className="text-[12.5px] text-muted-foreground">
                  {rail === "bank" || rail === "wallet-to-bank"
                    ? `${f.bank} · ${f.destination}`
                    : rail === "wallet"
                    ? `${f.walletNetwork} · ${f.destination}`
                    : rail === "proxy"
                    ? `Proxy: ${f.proxyId}`
                    : rail === "group"
                    ? f.groupName
                    : `${f.network} · ${f.destination}`}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between py-3.5">
              <span className="text-muted-foreground">Sending From</span>
              <div className="flex flex-col text-right">
                <span className="font-medium text-foreground">{fromAccount?.name}</span>
                <span className="text-[12.5px] text-muted-foreground tabular">{fromAccount?.number}</span>
              </div>
            </div>
            <div className="flex items-center justify-between py-3.5">
              <span className="text-muted-foreground">Frequency &amp; Start</span>
              <div className="flex flex-col text-right">
                <span className="font-medium text-foreground">{f.frequency}</span>
                <span className="text-[12.5px] text-muted-foreground tabular">
                  First run {formatDate(f.firstRun)}{" "}
                  {f.endCondition === "date" && f.endDate ? `· Ends ${formatDate(f.endDate)}` : "· Until cancelled"}
                </span>
              </div>
            </div>
            {rail === "bank" && !f.bank.includes("GCB") && (
              <div className="flex items-center justify-between py-3.5">
                <span className="text-muted-foreground">Payment Method</span>
                <span className="font-medium text-foreground">{getPaymentMethodName(f.paymentMethod)}</span>
              </div>
            )}
            <div className="flex items-center justify-between py-3.5">
              <span className="text-muted-foreground">Category</span>
              <span className="font-medium text-foreground">{selectedCat.label}</span>
            </div>
            <div className="flex items-center justify-between py-3.5">
              <span className="text-muted-foreground">Transfer Amount</span>
              <span className="font-semibold text-foreground tabular">
                {formatMoney(numAmount, "GHS", true)}
              </span>
            </div>
            <div className="flex items-center justify-between py-3.5">
              <span className="text-muted-foreground">Clearing Fee</span>
              <span className="text-muted-foreground tabular">
                {feeAmount === 0 ? "GH₵0.00 (Free)" : formatMoney(feeAmount, "GHS", true)}
              </span>
            </div>
            <div className="flex items-center justify-between pt-3.5">
              <span className="text-foreground font-semibold">Total Debit per Cycle</span>
              <span className="text-[18px] font-bold text-foreground tabular">
                {formatMoney(totalPerCycle, "GHS", true)}
              </span>
            </div>
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
              className="flex-1 h-13 rounded-2xl text-[16px] font-medium bg-primary text-primary-foreground drop-shadow-sm active:scale-[0.98] cursor-pointer"
              onClick={() => setPinModalOpen(true)}
            >
              Authorize &amp; Schedule
            </Button>
          </div>
        </div>

        {/* Transaction PIN Modal */}
        <TransactionPinModal
          open={pinModalOpen}
          onOpenChange={setPinModalOpen}
          onSuccess={() => {
            setPinModalOpen(false);
            handleAuthorize();
          }}
        />
      </div>
    );
  }

  /* =========================================================================
   * SCREEN 4: Form Screen (The New Unified Layout)
   * ========================================================================= */
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 py-4 animate-in fade-in duration-200 ease-out">
      {/* Header with back button */}
      <div className="relative flex items-center">
        <button
          type="button"
          onClick={() => setRail(null)}
          className="absolute -left-11 md:-left-12 top-1/2 -translate-y-1/2 flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
          aria-label="Back to Select a standing order"
        >
          <ChevronLeft size={22} strokeWidth={1.8} />
        </button>
        <h1 className="text-[26px] font-medium leading-[32px] tracking-[-0.02em] text-foreground">
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
        <div className="flex flex-col gap-2">
          <label className="text-[14px] font-medium text-foreground">Beneficiary Details</label>

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
            <div className="flex flex-col gap-3.5">
              {/* TO BANK / WALLET TO BANK */}
              {(rail === "bank" || rail === "wallet-to-bank") && (
                <>
                  <Select
                    value={f.bank}
                    onValueChange={(val) => {
                      if (val) {
                        set("bank", val);
                        if (val.includes("GCB")) set("paymentMethod", "");
                        else if (!f.paymentMethod) set("paymentMethod", "gip");
                      }
                    }}
                  >
                    <SelectTrigger className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground shadow-none">
                      <SelectValue placeholder="Select Bank" />
                    </SelectTrigger>
                    <SelectContent>
                      {BANKS.map((b) => (
                        <SelectItem key={b} value={b}>
                          {b}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Payment Method for Other Local Banks */}
                  {!f.bank.includes("GCB") && (
                    <div className="flex flex-col gap-2">
                      <label className="text-[14px] font-medium text-foreground">Payment Method</label>
                      <Select
                        value={f.paymentMethod || "gip"}
                        onValueChange={(val) => val && set("paymentMethod", val)}
                      >
                        <SelectTrigger className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground shadow-none">
                          <SelectValue placeholder="Select Payment Method" />
                        </SelectTrigger>
                        <SelectContent>
                          {PAYMENT_METHODS.map((method) => (
                            <SelectItem key={method.id} value={method.id}>
                              <div className="flex items-center justify-between w-full gap-4">
                                <span className="font-medium">{method.name}</span>
                                <span className="text-[12px] text-muted-foreground">{method.speed}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <input
                    type="text"
                    inputMode="numeric"
                    value={f.destination}
                    onChange={(e) => set("destination", e.target.value)}
                    placeholder="Enter account number"
                    className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all tabular"
                  />
                </>
              )}

              {/* TO MOBILE WALLET */}
              {rail === "wallet" && (
                <>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={f.destination}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="Enter mobile / wallet number"
                    className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all tabular"
                  />

                  <Select
                    value={f.walletNetwork}
                    onValueChange={(val) => val && set("walletNetwork", val)}
                  >
                    <SelectTrigger className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground shadow-none">
                      <SelectValue placeholder="Select Wallet Provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {WALLET_NETWORKS.map((n) => (
                        <SelectItem key={n} value={n}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}

              {/* TO PROXY */}
              {rail === "proxy" && (
                <input
                  type="text"
                  value={f.proxyId}
                  onChange={(e) => set("proxyId", e.target.value)}
                  placeholder="Enter proxy ID (e.g. @kwame.b or GHA-12345678-9)"
                  className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all tabular"
                />
              )}

              {/* TO GROUP */}
              {rail === "group" && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-muted-foreground">Select Contribution Circle</span>
                    <button
                      type="button"
                      onClick={() => setCreateGroupOpen(true)}
                      className="text-[13px] text-primary hover:underline font-medium cursor-pointer flex items-center gap-1"
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
                    <SelectTrigger className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground shadow-none">
                      <SelectValue placeholder="Select group" />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map((g) => (
                        <SelectItem key={g.id} value={g.name}>
                          {g.name} ({g.members.length} Members)
                        </SelectItem>
                      ))}
                      <SelectItem value="__create_new__" className="text-primary font-medium">
                        + Create new group...
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* DATA BUNDLE */}
              {rail === "data" && (
                <>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={f.destination}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="Enter recipient mobile number"
                    className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all tabular"
                  />

                  <Select
                    value={f.network}
                    onValueChange={(newNet) => {
                      if (!newNet) return;
                      set("network", newNet);
                      const pkgs = NETWORK_DATA_PACKAGES[newNet] || [];
                      if (pkgs.length > 0) {
                        set("dataPackageId", pkgs[0].id);
                        set("amount", pkgs[0].price);
                      }
                    }}
                  >
                    <SelectTrigger className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground shadow-none">
                      <SelectValue placeholder="Select network operator" />
                    </SelectTrigger>
                    <SelectContent>
                      {AIRTIME_NETWORKS.map((n) => (
                        <SelectItem key={n} value={n}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-[13px] font-medium text-muted-foreground">Select Data Package</span>
                    <Select
                      value={f.dataPackageId}
                      onValueChange={(val) => {
                        if (!val) return;
                        set("dataPackageId", val);
                        const dp = currentPackages.find((d) => d.id === val);
                        if (dp) set("amount", dp.price);
                      }}
                    >
                      <SelectTrigger className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground shadow-none">
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
                  </div>
                </>
              )}

              {/* AIRTIME */}
              {rail === "airtime" && (
                <>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={f.destination}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="Enter phone number to recharge"
                    className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all tabular"
                  />

                  <Select
                    value={f.network}
                    onValueChange={(val) => val && set("network", val)}
                  >
                    <SelectTrigger className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground shadow-none">
                      <SelectValue placeholder="Select network" />
                    </SelectTrigger>
                    <SelectContent>
                      {AIRTIME_NETWORKS.map((n) => (
                        <SelectItem key={n} value={n}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}

              {/* Live Resolving State / Verification Badge */}
              {rail !== "group" && resolving && (
                <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 p-2.5 text-[12.5px] text-muted-foreground animate-pulse">
                  <Loader2 size={13} className="animate-spin text-primary shrink-0" />
                  <span>Resolving account holder details...</span>
                </div>
              )}

              {rail !== "group" && !resolving && resolvedName && (
                <VerifiedAccountBadge name={resolvedName} />
              )}
            </div>
          )}
        </div>

        {/* 4. Amount Input */}
        <AmountInput
          value={f.amount}
          onChange={(val) => set("amount", val)}
          onFocus={() => {
            if (isDestinationValid) setDetailsCollapsed(true);
          }}
        />

        {overBalance && (
          <InsufficientFundsAlert available={fromAccount?.available ?? 0} currency="GHS" />
        )}

        {/* 5. Schedule & Frequency Section */}
        <div className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-card p-4.5">
          <label className="text-[14px] font-medium text-foreground">Schedule &amp; Frequency</label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-muted-foreground">Frequency</span>
              <Select
                value={f.frequency}
                onValueChange={(val) => val && set("frequency", val as InstructionFrequency)}
              >
                <SelectTrigger className="h-12 w-full rounded-xl border border-border/80 bg-background text-[14px]">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((freq) => (
                    <SelectItem key={freq} value={freq}>
                      {freq}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-muted-foreground">First Run Date</span>
              <input
                type="date"
                value={f.firstRun}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => set("firstRun", e.target.value)}
                className="h-12 w-full rounded-xl border border-border/80 bg-background px-3 text-[14px] text-foreground outline-none focus:border-ring tabular"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-muted-foreground">End Condition</span>
              <Select
                value={f.endCondition}
                onValueChange={(val) => val && set("endCondition", val as "indefinite" | "date")}
              >
                <SelectTrigger className="h-12 w-full rounded-xl border border-border/80 bg-background text-[14px]">
                  <SelectValue placeholder="Select end condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="indefinite">Until I cancel</SelectItem>
                  <SelectItem value="date">Specific end date</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {f.endCondition === "date" ? (
              <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                <span className="text-[13px] font-medium text-muted-foreground">Final Date</span>
                <input
                  type="date"
                  value={f.endDate}
                  min={f.firstRun}
                  onChange={(e) => set("endDate", e.target.value)}
                  className="h-12 w-full rounded-xl border border-border/80 bg-background px-3 text-[14px] text-foreground outline-none focus:border-ring tabular"
                />
              </div>
            ) : (
              <div className="flex items-center text-[12.5px] text-muted-foreground pt-5">
                <span>Runs continuously until you pause or cancel it.</span>
              </div>
            )}
          </div>
        </div>

        {/* 6. Purpose / Nickname & Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="flex flex-col gap-2">
            <label className="text-[14px] font-medium text-foreground">Standing Order Nickname</label>
            <input
              type="text"
              value={f.nickname}
              onChange={(e) => set("nickname", e.target.value)}
              placeholder="e.g. Monthly Rent, Susu"
              className="h-13 w-full rounded-2xl border border-border/80 bg-card px-4 text-[15px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all"
            />
          </div>

          <CategorySelect
            value={f.category}
            onChange={(val) => {
              set("category", val);
              const cat = CATEGORIES.find((c) => c.id === val);
              if (cat && !f.nickname) set("nickname", cat.defaultName);
            }}
          />
        </div>

        {/* 7. Save Beneficiary Checkbox */}
        <SaveBeneficiaryCheckbox
          checked={f.saveBeneficiary}
          onChange={(checked) => set("saveBeneficiary", checked)}
          nickname={f.beneficiaryNickname}
          onNicknameChange={(val) => set("beneficiaryNickname", val)}
        />

        {/* 8. Action Button */}
        <ProceedButton
          disabled={!isFormValid}
          onClick={() => {
            setDetailsCollapsed(true);
            setScreen("review");
          }}
          label="Continue to Review"
        />
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
