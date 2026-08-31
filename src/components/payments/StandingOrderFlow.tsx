"use client";

/**
 * Send & Pay — Secure Progressive Disclosure Standing Order Flow
 *
 * Implements strict state-integrity rules:
 *   1. Lead Screen (Figma Node 896:21624): "Select a standing order"
 *   2. Only ONE active stage is editable at any given time.
 *   3. Completed stages collapse into read-only confirmed summary badges (with ✓).
 *   4. To edit an earlier stage, the user must explicitly click "Change", which safely
 *      rolls back and resets downstream dependent state to prevent invalid/broken flows.
 *   5. Data Bundle & Airtime automatically detect the network provider from the phone number prefix.
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Landmark,
  Loader2,
  PhoneCall,
  User,
  Users,
  Wallet,
  Wifi,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  accountsForProfile,
  findAccount,
  formatDate,
  formatMoney,
  saveStandingInstruction,
  type InstructionFrequency,
} from "@/lib/mock-data";
import { useSession } from "@/lib/session-store";
import { AuthorisePanel } from "./AuthorisePanel";
import { useAuthorisation } from "./useAuthorisation";

type TransactionType =
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

const BANKS = [
  "GCB Bank (Internal)",
  "Standard Bank Ghana",
  "Ecobank Ghana",
  "Absa Bank Ghana",
  "Fidelity Bank Ghana",
  "CalBank",
  "Zenith Bank Ghana",
  "Stanbic Bank Ghana",
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

interface BeneficiaryItem {
  name: string;
  dest: string;
  type: TransactionType;
  provider?: string;
}

const RECENT_RECIPIENTS: BeneficiaryItem[] = [
  // Bank Payees
  { name: "Kwame Boateng", dest: "0231 4455 8890", type: "bank", provider: "GCB Bank (Internal)" },
  { name: "Lester ECG", dest: "P-8839210", type: "bank", provider: "GCB Bank (Internal)" },
  { name: "Abena Osei", dest: "1089 3322 1100", type: "bank", provider: "Stanbic Bank Ghana" },

  // Mobile Wallet Payees
  { name: "Ama Serwaa Mensah", dest: "0244 123 456", type: "wallet", provider: "MTN Mobile Money" },
  { name: "Yaw Mensah", dest: "0201 987 654", type: "wallet", provider: "Telecel Cash" },
  { name: "Kofi Boateng", dest: "0277 456 789", type: "wallet", provider: "AT Money" },

  // Proxy Payees
  { name: "Kwame Boateng", dest: "@kwame.b", type: "proxy" },
  { name: "Ama Serwaa", dest: "@ama.serwaa", type: "proxy" },
  { name: "Kofi Appiah", dest: "GHA-71829304-1", type: "proxy" },

  // Airtime Payees
  { name: "Ama Serwaa", dest: "0244 123 456", type: "airtime", provider: "MTN Ghana" },
  { name: "Kofi Appiah", dest: "0201 987 654", type: "airtime", provider: "Telecel Ghana" },
  { name: "Yaw Mensah", dest: "0277 456 789", type: "airtime", provider: "AT Ghana" },

  // Data Bundle Numbers
  { name: "Personal iPhone", dest: "0244 123 456", type: "data", provider: "MTN Ghana" },
  { name: "Home Router", dest: "0201 987 654", type: "data", provider: "Telecel Ghana" },
  { name: "iPad Pro", dest: "0277 456 789", type: "data", provider: "AT Ghana" },
];

const FREQUENCIES: InstructionFrequency[] = ["Daily", "Weekly", "Monthly", "Quarterly", "Yearly"];

const inputCls =
  "h-11 w-full rounded-xl border border-border bg-background px-3.5 text-[14px] text-foreground outline-none transition-all duration-150 ease-out focus:border-ring focus:ring-3 focus:ring-ring/30";
const selectCls =
  "h-11 w-full rounded-xl border border-border bg-background pl-3.5 pr-10 text-[14px] text-foreground outline-none transition-all duration-150 ease-out focus:border-ring focus:ring-3 focus:ring-ring/30 cursor-pointer";
const labelCls = "text-[12.5px] font-medium text-foreground";
const hintCls = "text-[11.5px] text-muted-foreground";

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

function resolveName(dest: string, type: TransactionType): string {
  const clean = dest.replace(/\s+/g, "").toLowerCase();
  if (!clean || clean.length < 5) return "";
  if (clean.includes("0231")) return "Kwame Boateng";
  if (clean.includes("0244")) return "Ama Serwaa Mensah";
  if (clean.includes("8839")) return "Lester Electricity Ghana";
  if (clean.startsWith("@")) return `${clean.replace("@", "").toUpperCase()} Direct Alias`;
  if (type === "proxy") return "Kwame Boateng (Ghana Card Verified)";
  if (type === "group") return "Family Contribution Circle (5 Members)";
  if (type === "bank") return "Kwame Boateng";
  if (type === "wallet") return "Ama Serwaa Mensah";
  if (type === "data" || type === "airtime") return "Verified Mobile Subscriber";
  return "Verified Beneficiary";
}

export function StandingOrderFlow({ onDone }: { onDone?: () => void }) {
  const router = useRouter();
  const activeProfile = useSession((s) => s.activeProfile);
  const accounts = useMemo(() => accountsForProfile(activeProfile?.kind), [activeProfile?.kind]);

  const auth = useAuthorisation();

  const [rail, setRail] = useState<TransactionType | null>(null);
  const [screen, setScreen] = useState<"form" | "success">("form");
  const [createdId, setCreatedId] = useState("");

  // Stage Control: Exactly one active stage at a time
  const [activeStage, setActiveStage] = useState<number>(1);
  const [maxRevealedStage, setMaxRevealedStage] = useState<number>(1);

  // Form State
  const [f, setF] = useState({
    destination: "",
    bank: "GCB Bank (Internal)",
    network: "MTN Ghana",
    walletNetwork: "MTN Mobile Money",
    proxyId: "",
    groupName: "Family Contribution Circle",
    dataPackageId: "mtn-2",
    accountId: accounts[0]?.id ?? "",
    amount: "",
    category: "bills",
    nickname: "Monthly Susu",
    frequency: "Monthly" as InstructionFrequency,
    firstRun: new Date().toISOString().slice(0, 10),
    endCondition: "indefinite" as "indefinite" | "date",
    endDate: "",
  });

  const set = (k: keyof typeof f, v: typeof f[keyof typeof f]) => setF((p) => ({ ...p, [k]: v }));

  // Live automatic name resolution
  const [resolving, setResolving] = useState(false);
  const [resolvedName, setResolvedName] = useState<string>("");

  const currentDest = rail === "proxy" ? f.proxyId : f.destination;

  useEffect(() => {
    if (!rail) return;
    if (rail === "group") {
      setResolvedName(f.groupName);
      setResolving(false);
      return;
    }
    if (!currentDest.trim() || currentDest.trim().length < 5) {
      setResolvedName("");
      setResolving(false);
      return;
    }
    setResolving(true);
    const t = setTimeout(() => {
      setResolvedName(resolveName(currentDest, rail));
      setResolving(false);
    }, 250);
    return () => clearTimeout(t);
  }, [currentDest, rail, f.groupName]);

  const account = findAccount(f.accountId) ?? accounts[0];
  const railConfig = STANDING_ORDER_OPTIONS.find((t) => t.id === rail) ?? STANDING_ORDER_OPTIONS[0];
  const selectedCat = CATEGORIES.find((c) => c.id === f.category) ?? CATEGORIES[0];

  // Dynamic packages for current network in Data Bundle mode
  const currentPackages = useMemo(() => {
    return NETWORK_DATA_PACKAGES[f.network] || NETWORK_DATA_PACKAGES["MTN Ghana"];
  }, [f.network]);

  // Filter beneficiaries strictly by the active transaction rail
  const relevantRecipients = useMemo(() => {
    if (!rail) return [];
    if (rail === "wallet-to-bank") {
      return RECENT_RECIPIENTS.filter((r) => r.type === "bank" || r.type === "wallet-to-bank");
    }
    return RECENT_RECIPIENTS.filter((r) => r.type === rail);
  }, [rail]);

  const selectRecentPayee = (r: BeneficiaryItem) => {
    if (rail === "proxy") {
      set("proxyId", r.dest);
    } else {
      set("destination", r.dest);
    }
    if (r.provider) {
      if (rail === "bank" || rail === "wallet-to-bank") {
        set("bank", r.provider);
      } else if (rail === "wallet") {
        set("walletNetwork", r.provider);
      } else if (rail === "data" || rail === "airtime") {
        set("network", r.provider);
        if (rail === "data") {
          const pkgs = NETWORK_DATA_PACKAGES[r.provider] || [];
          if (pkgs.length > 0) {
            set("dataPackageId", pkgs[0].id);
            set("amount", pkgs[0].price);
            set("nickname", `Monthly ${r.provider.split(" ")[0]} Data`);
          }
        }
      }
    }
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

  // Stage validation
  const stage1Valid = Boolean(resolvedName.trim());
  const stage2Valid = Number(f.amount.replace(/,/g, "")) > 0 && Boolean(f.accountId);
  const stage3Valid = Boolean(f.frequency) && Boolean(f.firstRun);
  const stage4Valid = Boolean(f.nickname.trim());
  const canActivate = stage4Valid && auth.complete;

  const proceedToStage = (nextStage: number) => {
    setActiveStage(nextStage);
    setMaxRevealedStage(nextStage);
  };

  // Controlled Rollback: safely resets downstream state when changing an earlier step
  const editStage = (targetStage: number) => {
    setActiveStage(targetStage);
    setMaxRevealedStage(targetStage);
    auth.reset();
  };

  const handleActivate = () => {
    if (!auth.verify()) return;
    const newId = `so-${Date.now()}`;
    saveStandingInstruction({
      id: newId,
      beneficiary: f.nickname || resolvedName || "Standing Order",
      accountId: f.accountId,
      amount: Number(f.amount.replace(/,/g, "")) || 0,
      currency: "GHS",
      frequency: f.frequency,
      nextRun: f.firstRun,
      status: "Active",
    });
    setCreatedId(newId);
    setScreen("success");
  };

  const resetAll = () => {
    auth.reset();
    setRail(null);
    setScreen("form");
    setActiveStage(1);
    setMaxRevealedStage(1);
    setF({
      destination: "",
      bank: "GCB Bank (Internal)",
      network: "MTN Ghana",
      walletNetwork: "MTN Mobile Money",
      proxyId: "",
      groupName: "Family Contribution Circle",
      dataPackageId: "mtn-2",
      accountId: accounts[0]?.id ?? "",
      amount: "",
      category: "bills",
      nickname: "Monthly Susu",
      frequency: "Monthly",
      firstRun: new Date().toISOString().slice(0, 10),
      endCondition: "indefinite",
      endDate: "",
    });
    setResolvedName("");
  };

  /* =========================================================================
   * SCREEN 1: Lead Screen — "Select a standing order" (Figma Node 896:21624)
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
                  setActiveStage(1);
                  setMaxRevealedStage(1);
                  setScreen("form");
                  if (opt.id === "data") {
                    set("network", "MTN Ghana");
                    set("dataPackageId", "mtn-2");
                    set("amount", "100");
                    set("nickname", "Monthly MTN Data Bundle");
                    set("category", "bills");
                  } else if (opt.id === "airtime") {
                    set("network", "MTN Ghana");
                    set("nickname", "Monthly Airtime Recharge");
                    set("category", "bills");
                  }
                }}
                className="group flex h-[68px] w-full items-center justify-between rounded-[16px] border border-[#ebebe9] bg-[#f6f6f5] px-4 transition-all duration-150 ease-out hover:bg-[#eeeeed] active:scale-[0.98] dark:border-[#292928] dark:bg-[#1e1e1e] dark:hover:bg-[#262626] cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <span className="flex size-[38px] shrink-0 items-center justify-center rounded-[12px] border border-black/[0.04] bg-white text-amber-500 shadow-sm dark:border-white/[0.06] dark:bg-[#252525] dark:text-[#fdc307]">
                    <Icon size={19} strokeWidth={1.8} />
                  </span>
                  <span className="text-[15.5px] font-medium text-foreground">{opt.title}</span>
                </div>
                <ChevronRight size={19} className="text-muted-foreground transition-transform duration-150 ease-out group-hover:translate-x-0.5" />
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
        <span className="flex size-13 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 size={28} strokeWidth={2} />
        </span>

        <div className="flex flex-col gap-1">
          <h1 className="text-[20px] font-medium text-foreground tracking-[-0.02em]">
            Standing Order Scheduled
          </h1>
          <p className="text-[13px] text-muted-foreground">
            &ldquo;{f.nickname}&rdquo; will run {f.frequency.toLowerCase()} for {formatMoney(Number(f.amount) || 0, "GHS", true)}.
          </p>
        </div>

        <div className="flex w-full flex-col divide-y divide-border rounded-2xl border border-border bg-card p-4.5 text-[13px] text-left">
          <div className="flex items-center justify-between pb-2.5">
            <span className="text-muted-foreground">Reference</span>
            <span className="tabular font-mono text-foreground">{createdId}</span>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <span className="text-muted-foreground">Beneficiary</span>
            <span className="font-medium text-foreground">{resolvedName}</span>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <span className="text-muted-foreground">Schedule</span>
            <span className="text-foreground">{f.frequency} · First run <span className="tabular">{formatDate(f.firstRun)}</span></span>
          </div>
          <div className="flex items-center justify-between pt-2.5">
            <span className="text-muted-foreground">Source Account</span>
            <span className="text-foreground">{account?.name}</span>
          </div>
        </div>

        <div className="flex w-full gap-3">
          <Button variant="outline" className="flex-1 active:scale-[0.97]" onClick={resetAll}>
            Create another
          </Button>
          <Button
            className="flex-1 active:scale-[0.97]"
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
   * SCREEN 2: Pure Controlled Progressive Disclosure Flow (Figma Node 944:10217)
   * ========================================================================= */
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 py-4 animate-in fade-in duration-200 ease-out">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => setRail(null)}
          className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
          aria-label="Back to Select a standing order"
        >
          <ChevronLeft size={22} strokeWidth={1.8} />
        </button>
        <h1 className="text-[26px] font-medium leading-[32px] tracking-[-0.02em] text-foreground">
          {railConfig.title} Standing Order
        </h1>
      </div>

      <div className="flex flex-col gap-8">
        {/* ===================================================================
         * STAGE 1: Recipient
         * =================================================================== */}
        <div className="flex flex-col gap-2">
          <div className="text-[16px] text-foreground tracking-[-0.01em]">1. Recipient</div>

          {activeStage > 1 ? (
            /* Confirmed Read-Only Summary */
            <div className="flex h-[68px] items-center justify-between rounded-xl border border-border bg-muted/40 dark:bg-muted/20 px-4 py-2 transition-all">
              <div className="flex items-center gap-4 min-w-0">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <Check size={14} strokeWidth={2.5} />
                </span>
                <div className="flex flex-col min-w-0 text-left">
                  <span className="text-[16px] text-foreground font-normal tracking-[-0.08px] truncate">{resolvedName}</span>
                  <span className="text-[12px] text-muted-foreground truncate">
                    {rail === "bank" || rail === "wallet-to-bank" ? f.bank : f.network} • {f.destination || f.proxyId}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => editStage(1)}
                className="text-[14px] text-foreground hover:underline cursor-pointer ml-3 shrink-0"
              >
                Change
              </button>
            </div>
          ) : (
            /* Active Editable Form */
            <div className="flex flex-col gap-3.5 pt-1 animate-in fade-in duration-150 ease-out">
              {/* BANK / WALLET-TO-BANK */}
              {(rail === "bank" || rail === "wallet-to-bank") && (
                <>
                  <label className="flex flex-col gap-1.5">
                    <span className={labelCls}>Destination Bank</span>
                    <select className={selectCls} value={f.bank} onChange={(e) => set("bank", e.target.value)}>
                      {BANKS.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className={labelCls}>Account Number</span>
                    <Input
                      className="tabular"
                      value={f.destination}
                      onChange={(e) => set("destination", e.target.value)}
                      placeholder="Enter account number..."
                      autoFocus
                    />
                  </label>
                </>
              )}

              {/* MOBILE WALLET */}
              {rail === "wallet" && (
                <>
                  <label className="flex flex-col gap-1.5">
                    <span className={labelCls}>Mobile / Wallet Number</span>
                    <Input
                      className="tabular"
                      value={f.destination}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder="e.g. 0244 123 456"
                      autoFocus
                    />
                  </label>

                  {f.destination.replace(/[^0-9]/g, "").length >= 3 && (
                    <label className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-1 duration-150 ease-out">
                      <span className={labelCls}>Wallet Provider</span>
                      <select
                        className={selectCls}
                        value={f.walletNetwork}
                        onChange={(e) => set("walletNetwork", e.target.value)}
                      >
                        {WALLET_NETWORKS.map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </label>
                  )}
                </>
              )}

              {/* PROXY */}
              {rail === "proxy" && (
                <label className="flex flex-col gap-1.5">
                  <span className={labelCls}>Proxy ID (Alias / Ghana Card)</span>
                  <Input
                    className="tabular"
                    value={f.proxyId}
                    onChange={(e) => set("proxyId", e.target.value)}
                    placeholder="e.g. @kwame.b or GHA-12345678-9"
                    autoFocus
                  />
                </label>
              )}

              {/* GROUP */}
              {rail === "group" && (
                <label className="flex flex-col gap-1.5">
                  <span className={labelCls}>Target Group</span>
                  <select className={selectCls} value={f.groupName} onChange={(e) => set("groupName", e.target.value)}>
                    <option value="Family Contribution Circle">Family Contribution Circle (5 Members)</option>
                    <option value="Colleagues Susu Circle">Colleagues Susu Circle (10 Members)</option>
                    <option value="Welfare Fund">Welfare Fund (12 Members)</option>
                  </select>
                </label>
              )}

              {/* AIRTIME */}
              {rail === "airtime" && (
                <>
                  <label className="flex flex-col gap-1.5">
                    <span className={labelCls}>Mobile Phone Number</span>
                    <Input
                      className="tabular"
                      value={f.destination}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder="e.g. 0244 123 456"
                      autoFocus
                    />
                  </label>

                  {f.destination.replace(/[^0-9]/g, "").length >= 3 && (
                    <label className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-1 duration-150 ease-out">
                      <span className={labelCls}>Network Operator</span>
                      <select className={selectCls} value={f.network} onChange={(e) => set("network", e.target.value)}>
                        {AIRTIME_NETWORKS.map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </label>
                  )}
                </>
              )}

              {/* DATA BUNDLE */}
              {rail === "data" && (
                <>
                  <label className="flex flex-col gap-1.5">
                    <span className={labelCls}>Mobile Phone Number</span>
                    <Input
                      className="tabular"
                      value={f.destination}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder="e.g. 0244 123 456"
                      autoFocus
                    />
                  </label>

                  {f.destination.replace(/[^0-9]/g, "").length >= 3 && (
                    <label className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-1 duration-150 ease-out">
                      <span className={labelCls}>Network Operator</span>
                      <select
                        className={selectCls}
                        value={f.network}
                        onChange={(e) => {
                          const newNet = e.target.value;
                          set("network", newNet);
                          const pkgs = NETWORK_DATA_PACKAGES[newNet] || [];
                          if (pkgs.length > 0) {
                            set("dataPackageId", pkgs[0].id);
                            set("amount", pkgs[0].price);
                            set("nickname", `Monthly ${newNet.split(" ")[0]} Data`);
                          }
                        }}
                      >
                        {AIRTIME_NETWORKS.map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </label>
                  )}
                </>
              )}

              {/* Auto-resolved account holder name badge */}
              {resolving && (
                <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 p-2.5 text-[12.5px] text-muted-foreground animate-pulse">
                  <Loader2 size={13} className="animate-spin text-primary shrink-0" />
                  <span>Verifying account holder...</span>
                </div>
              )}

              {!resolving && resolvedName && (
                <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2.5 text-[12.5px] text-foreground dark:bg-emerald-500/10 animate-in fade-in duration-150 ease-out">
                  <span className="font-medium text-foreground">{resolvedName}</span>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">✓ Verified Account Holder</span>
                </div>
              )}

              {/* DATA PACKAGE SELECTOR: Progressively disclosed ONLY after name is verified */}
              {rail === "data" && !resolving && resolvedName && (
                <label className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-1 duration-150 ease-out">
                  <span className={labelCls}>Select {f.network.split(" ")[0]} Data Package</span>
                  <select
                    className={selectCls}
                    value={f.dataPackageId}
                    onChange={(e) => {
                      const dp = currentPackages.find((d) => d.id === e.target.value);
                      set("dataPackageId", e.target.value);
                      if (dp) {
                        set("amount", dp.price);
                        set("nickname", `Monthly ${f.network.split(" ")[0]} ${dp.name.split(" ")[0]} Data`);
                      }
                    }}
                  >
                    {currentPackages.map((dp) => (
                      <option key={dp.id} value={dp.id}>{dp.name}</option>
                    ))}
                  </select>
                </label>
              )}

              {/* Quick Payees filtered strictly for the active rail */}
              {!resolvedName && relevantRecipients.length > 0 && (
                <div className="flex flex-col gap-1.5 pt-1">
                  <span className={hintCls}>Or pick recent beneficiary:</span>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {relevantRecipients.map((r) => (
                      <button
                        key={r.dest}
                        type="button"
                        onClick={() => selectRecentPayee(r)}
                        className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-2.5 py-1 text-[11.5px] hover:bg-muted text-foreground cursor-pointer shrink-0"
                      >
                        <span className="font-medium">{r.name}</span>
                        <span className="text-[10px] text-muted-foreground">({r.dest})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <Button
                className="mt-2 w-full h-11 rounded-xl text-[14px] font-medium bg-primary text-primary-foreground drop-shadow-sm active:scale-[0.98]"
                disabled={!stage1Valid}
                onClick={() => proceedToStage(2)}
              >
                Continue to Amount
              </Button>
            </div>
          )}
        </div>

        {/* ===================================================================
         * STAGE 2: Amount & Debit Account (Figma Node 944:10308 / 952:26806)
         * =================================================================== */}
        {maxRevealedStage >= 2 && (
          <div className={`flex flex-col gap-2 ${activeStage === 2 ? "border-t border-border/70 pt-6" : ""} animate-in fade-in slide-in-from-top-2 duration-200 ease-out`}>
            <div className="text-[16px] text-foreground tracking-[-0.01em]">2. Amount</div>

            {activeStage > 2 ? (
              /* Confirmed Read-Only Summary */
              <div className="flex h-[68px] items-center justify-between rounded-xl border border-border bg-muted/40 dark:bg-muted/20 px-4 py-2 transition-all">
                <div className="flex items-center gap-4 min-w-0">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <Check size={14} strokeWidth={2.5} />
                  </span>
                  <div className="flex flex-col min-w-0 text-left">
                    <span className="text-[16px] text-foreground font-normal tracking-[-0.08px] truncate tabular">
                      {formatMoney(Number(f.amount) || 0, "GHS", true)}
                    </span>
                    <span className="text-[12px] text-muted-foreground truncate">
                      From {account?.name} •••{account?.number.slice(-4)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => editStage(2)}
                  className="text-[14px] text-foreground hover:underline cursor-pointer ml-3 shrink-0"
                >
                  Change
                </button>
              </div>
            ) : activeStage === 2 ? (
              /* Active Editable Form - 1:1 Figma 944:10308 */
              <div className="flex flex-col gap-4 pt-1">
                {/* Enter Amount */}
                <label className="flex flex-col gap-1.5">
                  <span className={labelCls}>Enter Amount</span>
                  <Input
                    className="h-11 rounded-xl border-border bg-background text-[15px] tabular"
                    value={f.amount}
                    onChange={(e) => set("amount", e.target.value)}
                    placeholder="GHS 0.00"
                    readOnly={rail === "data"}
                    autoFocus
                    required
                  />
                  {rail === "data" && (
                    <span className="text-[11.5px] text-muted-foreground">Fixed by selected data package</span>
                  )}
                </label>

                {/* Sending From Account Selector Card */}
                <div className="flex flex-col gap-1.5">
                  <span className={labelCls}>Sending from</span>
                  <div className="group relative flex h-[68px] items-center justify-between rounded-xl border border-border bg-card px-4 transition-colors hover:border-primary/50">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
                        <Landmark size={16} strokeWidth={1.8} />
                      </span>
                      <div className="flex flex-col min-w-0 text-left">
                        <span className="text-[15px] text-foreground font-normal truncate">
                          {account?.name} ••{account?.number?.slice(-4) || "7658"}
                        </span>
                        <span className="text-[12px] text-muted-foreground truncate tabular">
                          {formatMoney(account?.available ?? 1320201, "GHS", true)}
                        </span>
                      </div>
                    </div>

                    <ChevronDown size={16} className="text-muted-foreground shrink-0 transition-transform group-hover:translate-y-0.5" />

                    {/* Native invisible select for seamless switching */}
                    <select
                      className="absolute inset-0 size-full opacity-0 cursor-pointer"
                      value={f.accountId}
                      onChange={(e) => set("accountId", e.target.value)}
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.number}) — {formatMoney(a.available, a.currency, true)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <Button
                  className="mt-2 w-full h-11 rounded-xl text-[14px] font-medium bg-primary text-primary-foreground drop-shadow-sm active:scale-[0.98]"
                  disabled={!stage2Valid}
                  onClick={() => proceedToStage(3)}
                >
                  Continue to Frequency &amp; Schedule
                </Button>
              </div>
            ) : null}
          </div>
        )}

        {/* ===================================================================
         * STAGE 3: Frequency & Schedule (Figma Node 944:10372)
         * =================================================================== */}
        {maxRevealedStage >= 3 && (
          <div className={`flex flex-col gap-2 ${activeStage === 3 ? "border-t border-border/70 pt-6" : ""} animate-in fade-in slide-in-from-top-2 duration-200 ease-out`}>
            <div className="text-[16px] text-foreground tracking-[-0.01em]">3. Frequency &amp; Schedule</div>

            {activeStage > 3 ? (
              /* Confirmed Read-Only Summary */
              <div className="flex h-[68px] items-center justify-between rounded-xl border border-border bg-muted/40 dark:bg-muted/20 px-4 py-2 transition-all">
                <div className="flex items-center gap-4 min-w-0">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <Check size={14} strokeWidth={2.5} />
                  </span>
                  <div className="flex flex-col min-w-0 text-left">
                    <span className="text-[16px] text-foreground font-normal tracking-[-0.08px] truncate">{f.frequency}</span>
                    <span className="text-[12px] text-muted-foreground truncate tabular">
                      First run {formatDate(f.firstRun)} {f.endCondition === "date" && f.endDate ? `• Ends ${formatDate(f.endDate)}` : "• Until I cancel"}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => editStage(3)}
                  className="text-[14px] text-foreground hover:underline cursor-pointer ml-3 shrink-0"
                >
                  Change
                </button>
              </div>
            ) : activeStage === 3 ? (
              /* Active Editable Form - Clean Arranged Layout */
              <div className="flex flex-col gap-4 pt-1">
                {/* Frequency Select */}
                <label className="flex flex-col gap-1.5">
                  <span className={labelCls}>Frequency</span>
                  <select
                    className={selectCls}
                    value={f.frequency}
                    onChange={(e) => set("frequency", e.target.value as InstructionFrequency)}
                  >
                    {FREQUENCIES.map((freq) => (
                      <option key={freq} value={freq}>{freq}</option>
                    ))}
                  </select>
                </label>

                {/* Start Date and End Date Side-by-Side */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5">
                    <span className={labelCls}>Start Date</span>
                    <input
                      type="date"
                      className={inputCls + " tabular"}
                      value={f.firstRun}
                      onChange={(e) => set("firstRun", e.target.value)}
                    />
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className={labelCls}>End Date</span>
                    <select
                      className={selectCls}
                      value={f.endCondition}
                      onChange={(e) => set("endCondition", e.target.value as "indefinite" | "date")}
                    >
                      <option value="indefinite">Until I cancel</option>
                      <option value="date">Specific date</option>
                    </select>
                  </label>
                </div>

                {/* Specific Final Date (Conditional) */}
                {f.endCondition === "date" && (
                  <label className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                    <span className={labelCls}>Final Date</span>
                    <input
                      type="date"
                      className={inputCls + " tabular"}
                      value={f.endDate}
                      onChange={(e) => set("endDate", e.target.value)}
                    />
                  </label>
                )}

                <Button
                  className="mt-2 w-full h-11 rounded-xl text-[14px] font-medium bg-primary text-primary-foreground drop-shadow-sm active:scale-[0.98]"
                  disabled={!stage3Valid}
                  onClick={() => proceedToStage(4)}
                >
                  Continue to Purpose &amp; Nickname
                </Button>
              </div>
            ) : null}
          </div>
        )}

        {/* ===================================================================
         * STAGE 4: Category & Nickname
         * =================================================================== */}
        {maxRevealedStage >= 4 && (
          <div className={`flex flex-col gap-2 ${activeStage === 4 ? "border-t border-border/70 pt-6" : ""} animate-in fade-in slide-in-from-top-2 duration-200 ease-out`}>
            <div className="text-[16px] text-foreground tracking-[-0.01em]">4. Purpose &amp; Nickname</div>

            {activeStage > 4 ? (
              /* Confirmed Read-Only Summary */
              <div className="flex h-[68px] items-center justify-between rounded-xl border border-border bg-muted/40 dark:bg-muted/20 px-4 py-2 transition-all">
                <div className="flex items-center gap-4 min-w-0">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <Check size={14} strokeWidth={2.5} />
                  </span>
                  <div className="flex flex-col min-w-0 text-left">
                    <span className="text-[16px] text-foreground font-normal tracking-[-0.08px] truncate">{f.nickname}</span>
                    <span className="text-[12px] text-muted-foreground truncate">{selectedCat.label}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => editStage(4)}
                  className="text-[14px] text-foreground hover:underline cursor-pointer ml-3 shrink-0"
                >
                  Change
                </button>
              </div>
            ) : activeStage === 4 ? (
              /* Active Editable Form */
              <div className="flex flex-col gap-3.5 pt-1">
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5">
                    <span className={labelCls}>Category</span>
                    <select
                      className={selectCls}
                      value={f.category}
                      onChange={(e) => {
                        const cat = CATEGORIES.find((c) => c.id === e.target.value);
                        set("category", e.target.value);
                        if (cat) set("nickname", cat.defaultName);
                      }}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className={labelCls}>Standing Order Nickname</span>
                    <Input
                      value={f.nickname}
                      onChange={(e) => set("nickname", e.target.value)}
                      placeholder="e.g. Monthly Rent"
                      autoFocus
                      required
                    />
                  </label>
                </div>

                <Button
                  className="mt-2 w-full h-11 rounded-xl text-[14px] font-medium bg-primary text-primary-foreground drop-shadow-sm active:scale-[0.98]"
                  disabled={!stage4Valid}
                  onClick={() => {
                    auth.reset();
                    proceedToStage(5);
                  }}
                >
                  Continue to Authorisation
                </Button>
              </div>
            ) : null}
          </div>
        )}

        {/* ===================================================================
         * STAGE 5: Authorisation Panel
         * =================================================================== */}
        {maxRevealedStage >= 5 && activeStage === 5 && (
          <div className="flex flex-col gap-4 border-t border-border/70 pt-6 animate-in fade-in slide-in-from-top-2 duration-200 ease-out">
            <div className="text-[16px] text-foreground tracking-[-0.01em]">5. Authorise &amp; Schedule</div>

            {/* Compact Order Summary Pill */}
            <div className="rounded-xl border border-border bg-muted/40 p-4 text-[13.5px] flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Order Summary</span>
                <span className="font-medium text-foreground tabular">{formatMoney(Number(f.amount) || 0, "GHS", true)} ({f.frequency})</span>
              </div>
              <div className="flex items-center justify-between text-[12.5px] text-muted-foreground">
                <span>To {resolvedName}</span>
                <span>From {account?.name}</span>
              </div>
            </div>

            {/* Authorisation Panel */}
            <AuthorisePanel
              summary={null}
              otp={auth.otp}
              onOtpChange={auth.setOtp}
              state={auth.state}
              resend={auth.resend}
              onResend={auth.requestResend}
            />

            <Button
              className="mt-2 w-full h-11 rounded-xl text-[14px] font-medium bg-primary text-primary-foreground drop-shadow-sm transition-transform duration-100 active:scale-[0.98]"
              disabled={!canActivate}
              onClick={handleActivate}
            >
              Authorize &amp; Schedule
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
