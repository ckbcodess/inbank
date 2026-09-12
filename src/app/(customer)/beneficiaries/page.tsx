"use client";

/**
 * Beneficiaries Standalone Directory.
 *
 * Fully Aligned to Figma Design (Node 1374:35826):
 * 1. 3 Major Segmented Groups: People, Billers, and Groups.
 * 2. Darkened scrim backdrop, increased blur, and zero border stroke on all modals.
 * 3. Transactions-style search bar and SelectTrigger filters with active indicators and inline clear (X).
 * 4. Collapsible Accordion rows for grouped sections and payment group members.
 * 5. Clean, uncluttered Add Beneficiary modal with progressive disclosure.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  Globe,
  Landmark,
  Pencil,
  Plus,
  Receipt,
  Search,
  Send,
  Smartphone,
  Trash2,
  User,
  Users,
  Wallet,
  X,
} from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SimpleTooltip } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FilteredEmptyState,
  TrueEmptyState,
} from "@/components/states/ListStates";
import {
  useBeneficiariesStore,
  type BeneficiaryRecord,
  type TransactionType,
} from "@/lib/beneficiaries-store";
import { useGroupsStore, type PaymentGroup } from "@/lib/groups-store";
import { useSession } from "@/lib/session-store";
import CreateGroupModal from "@/components/payments/CreateGroupModal";
import EditGroupModal from "@/components/payments/EditGroupModal";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ActiveTab = "people" | "billers" | "groups";
type TypeFilter = "all" | TransactionType;
type GroupByOption = "type" | "none";

interface TypeMeta {
  label: string;
  plural: string;
  rail: string;
  icon: React.ElementType;
}

const TYPE_CONFIG: Record<TransactionType, TypeMeta> = {
  bank: { label: "Bank Transfer", plural: "Bank Transfers", rail: "bank", icon: Landmark },
  wallet: { label: "Mobile Wallet", plural: "Mobile Wallets", rail: "wallet", icon: Wallet },
  proxy: { label: "Proxy Pay", plural: "Proxy Pay", rail: "proxy", icon: User },
  bill: { label: "Bills & Utilities", plural: "Bills & Utilities", rail: "bill", icon: Receipt },
  airtime: { label: "Airtime & Data", plural: "Airtime & Data", rail: "airtime", icon: Smartphone },
  swift: { label: "SWIFT International Wire", plural: "SWIFT Wire Transfers", rail: "swift", icon: Globe },
  papss: { label: "PAPSS Cross-Border", plural: "PAPSS Cross-Border", rail: "papss", icon: Globe },
};

const PEOPLE_TYPES: TransactionType[] = ["bank", "wallet", "proxy", "swift", "papss"];
const BILLER_TYPES: TransactionType[] = ["bill", "airtime"];

const GHANA_BANKS = [
  "GCB Bank",
  "Standard Bank Ghana",
  "Ecobank Ghana",
  "Absa Ghana",
  "Fidelity Bank",
  "Stanbic Bank Ghana",
  "CalBank",
  "CBG (Consolidated Bank Ghana)",
  "Access Bank",
  "Zenith Bank Ghana",
];

const WALLET_NETWORKS = ["MTN Mobile Money", "Telecel Cash", "AT Money", "GCB Wallet"];
const AIRTIME_NETWORKS = ["MTN Ghana", "Telecel Ghana", "AT Ghana"];

const SWIFT_COUNTRIES = [
  { name: "United States", currency: "USD" },
  { name: "United Kingdom", currency: "GBP" },
  { name: "Germany (Eurozone)", currency: "EUR" },
  { name: "France (Eurozone)", currency: "EUR" },
  { name: "Canada", currency: "CAD" },
  { name: "China", currency: "CNY" },
  { name: "United Arab Emirates", currency: "AED" },
  { name: "Australia", currency: "AUD" },
  { name: "Japan", currency: "JPY" },
  { name: "South Africa", currency: "ZAR" },
];

const INTERNATIONAL_BANKS_BY_COUNTRY: Record<string, string[]> = {
  "United States": [
    "JPMorgan Chase Bank",
    "Bank of America",
    "Citibank",
    "Wells Fargo",
    "Goldman Sachs",
    "Morgan Stanley",
    "PNC Bank",
    "U.S. Bank",
  ],
  "United Kingdom": [
    "Barclays",
    "HSBC UK",
    "Lloyds Bank",
    "NatWest",
    "Royal Bank of Scotland",
    "Standard Chartered",
    "Santander UK",
  ],
  "Germany (Eurozone)": [
    "Deutsche Bank",
    "Commerzbank",
    "KfW",
    "DZ Bank",
    "Landesbank Baden-Württemberg",
    "HypoVereinsbank",
  ],
  "France (Eurozone)": [
    "BNP Paribas",
    "Crédit Agricole",
    "Société Générale",
    "BPCE",
    "Crédit Mutuel",
  ],
  "Canada": [
    "RBC Royal Bank",
    "TD Bank",
    "Scotiabank",
    "BMO Bank of Montreal",
    "CIBC",
  ],
  "China": [
    "Industrial & Commercial Bank of China (ICBC)",
    "China Construction Bank",
    "Bank of China",
    "Agricultural Bank of China",
  ],
  "United Arab Emirates": [
    "Emirates NBD",
    "First Abu Dhabi Bank (FAB)",
    "Abu Dhabi Commercial Bank (ADCB)",
    "Mashreq Bank",
  ],
  "Australia": [
    "Commonwealth Bank of Australia",
    "ANZ Bank",
    "National Australia Bank (NAB)",
    "Westpac",
  ],
  "Japan": [
    "MUFG Bank",
    "Sumitomo Mitsui Banking Corporation (SMBC)",
    "Mizuho Bank",
    "Japan Post Bank",
  ],
  "South Africa": [
    "Standard Bank South Africa",
    "FirstNational Bank (FNB)",
    "Absa Bank South Africa",
    "Nedbank",
    "Capitec Bank",
  ],
};

const PAPSS_COUNTRIES = [
  { name: "Nigeria", currency: "NGN" },
  { name: "Kenya", currency: "KES" },
  { name: "Côte d'Ivoire", currency: "XOF" },
  { name: "South Africa", currency: "ZAR" },
  { name: "Egypt", currency: "EGP" },
  { name: "Rwanda", currency: "RWF" },
  { name: "Zambia", currency: "ZMW" },
];

const PAPSS_BANKS_BY_COUNTRY: Record<string, string[]> = {
  "Nigeria": [
    "Access Bank Nigeria",
    "Zenith Bank",
    "Guaranty Trust Bank (GTBank)",
    "First Bank of Nigeria",
    "United Bank for Africa (UBA)",
    "Fidelity Bank Nigeria",
  ],
  "Kenya": [
    "KCB Bank Kenya",
    "Equity Bank Kenya",
    "NCBA Bank",
    "Co-operative Bank of Kenya",
    "Absa Bank Kenya",
    "Standard Chartered Kenya",
  ],
  "South Africa": [
    "Standard Bank South Africa",
    "FirstNational Bank (FNB)",
    "Absa Bank South Africa",
    "Nedbank",
    "Capitec Bank",
  ],
  "Côte d'Ivoire": [
    "Société Générale Côte d'Ivoire (SGCI)",
    "Ecobank Côte d'Ivoire",
    "NSIA Banque",
    "Banque Atlantique",
    "SIB (Société Ivoirienne de Banque)",
  ],
  "Egypt": [
    "National Bank of Egypt",
    "Banque Misr",
    "Commercial International Bank (CIB)",
    "QNB Alahli",
    "Banque du Caire",
  ],
  "Rwanda": [
    "Bank of Kigali",
    "I&M Bank Rwanda",
    "Equity Bank Rwanda",
    "Cogebanque",
    "Access Bank Rwanda",
  ],
  "Zambia": [
    "Zanaco (Zambia National Commercial Bank)",
    "Stanbic Bank Zambia",
    "Absa Bank Zambia",
    "Standard Chartered Zambia",
    "Atlas Mara Zambia",
  ],
};

interface FormState {
  id?: string;
  name: string;
  transactionType: TransactionType;
  bankName: string;
  accountNumber: string;
  currency: string;
  network: string;
  phoneNumber: string;
  proxyId: string;
  billerName: string;
  billerReference: string;
  country: string;
  swiftCode: string;
}

const INITIAL_FORM: FormState = {
  name: "",
  transactionType: "bank",
  bankName: "GCB Bank",
  accountNumber: "",
  currency: "GHS",
  network: "MTN Mobile Money",
  phoneNumber: "",
  proxyId: "",
  billerName: "ECG Prepaid",
  billerReference: "",
  country: "United States",
  swiftCode: "",
};

function initials(name: string) {
  return (
    name
      .replace(/[^a-zA-Z ]/g, "")
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "#"
  );
}

function detectNetworkFromPhone(phone: string): string {
  const clean = phone.replace(/[^0-9]/g, "");
  if (clean.startsWith("024") || clean.startsWith("054") || clean.startsWith("055") || clean.startsWith("059")) {
    return "MTN Mobile Money";
  }
  if (clean.startsWith("020") || clean.startsWith("050")) {
    return "Telecel Cash";
  }
  if (clean.startsWith("027") || clean.startsWith("057") || clean.startsWith("026")) {
    return "AT Money";
  }
  return "MTN Mobile Money";
}

export default function BeneficiariesPage() {
  const activeProfile = useSession((s) => s.activeProfile);
  const isCorporate = activeProfile?.kind === "CORPORATE";

  const {
    beneficiaries,
    addBeneficiary,
    updateBeneficiary,
    removeBeneficiary,
  } = useBeneficiariesStore();

  const { groups, deleteGroup } = useGroupsStore();

  // 3 Major Segmented Control Tabs (People, Billers, Groups)
  const [activeTab, setActiveTab] = useState<ActiveTab>("people");

  // Open a specific tab when deep-linked (e.g. "Manage groups" → ?tab=groups).
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t === "people" || t === "billers" || t === "groups") setActiveTab(t);
  }, []);

  // Search and Filters
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [groupBy, setGroupBy] = useState<GroupByOption>("type");

  // Collapsible Dropdown States
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  // Modal States
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [removeId, setRemoveId] = useState<string | null>(null);

  const [createGroupModalOpen, setCreateGroupModalOpen] = useState(false);
  const [editGroupModalOpen, setEditGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<PaymentGroup | null>(null);
  const [removeGroupId, setRemoveGroupId] = useState<string | null>(null);

  function flash(msg: string) {
    toast.success(msg);
  }

  // Split beneficiaries into People and Billers
  const peopleBeneficiaries = useMemo(() => {
    return beneficiaries.filter((b) => PEOPLE_TYPES.includes(b.transactionType));
  }, [beneficiaries]);

  const billerBeneficiaries = useMemo(() => {
    return beneficiaries.filter((b) => BILLER_TYPES.includes(b.transactionType));
  }, [beneficiaries]);

  const counts = useMemo(() => {
    return {
      people: peopleBeneficiaries.length,
      billers: billerBeneficiaries.length,
      groups: groups.length,
      bank: beneficiaries.filter((b) => b.transactionType === "bank").length,
      wallet: beneficiaries.filter((b) => b.transactionType === "wallet").length,
      proxy: beneficiaries.filter((b) => b.transactionType === "proxy").length,
      bill: beneficiaries.filter((b) => b.transactionType === "bill").length,
      airtime: beneficiaries.filter((b) => b.transactionType === "airtime").length,
      swift: beneficiaries.filter((b) => b.transactionType === "swift").length,
      papss: beneficiaries.filter((b) => b.transactionType === "papss").length,
    };
  }, [beneficiaries, peopleBeneficiaries, billerBeneficiaries, groups]);

  const q = query.trim().toLowerCase();

  // Filtered dataset according to active tab
  const filteredList = useMemo(() => {
    if (activeTab === "groups") return [];
    const source = activeTab === "people" ? peopleBeneficiaries : billerBeneficiaries;

    return source
      .filter((b) => {
        if (typeFilter !== "all" && b.transactionType !== typeFilter) return false;
        if (!q) return true;
        return (
          b.name.toLowerCase().includes(q) ||
          b.detail.toLowerCase().includes(q) ||
          (b.bankName && b.bankName.toLowerCase().includes(q)) ||
          (b.accountNumber && b.accountNumber.toLowerCase().includes(q)) ||
          (b.network && b.network.toLowerCase().includes(q)) ||
          (b.phoneNumber && b.phoneNumber.toLowerCase().includes(q)) ||
          (b.proxyId && b.proxyId.toLowerCase().includes(q)) ||
          (b.billerName && b.billerName.toLowerCase().includes(q)) ||
          (b.country && b.country.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [activeTab, peopleBeneficiaries, billerBeneficiaries, typeFilter, q]);

  // Filtered groups for Groups tab
  const filteredGroups = useMemo(() => {
    if (activeTab !== "groups") return [];
    return groups
      .filter((g) => {
        if (!q) return true;
        return (
          g.name.toLowerCase().includes(q) ||
          (g.description && g.description.toLowerCase().includes(q)) ||
          g.members.some((m) => m.name.toLowerCase().includes(q) || m.destination.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [activeTab, groups, q]);

  const toggleSectionCollapse = (key: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const expandAllSections = () => setCollapsedSections(new Set());
  const collapseAllSections = () => {
    const allKeys = activeTab === "people" ? PEOPLE_TYPES : BILLER_TYPES;
    setCollapsedSections(new Set(allKeys));
  };

  function openAddForType(type: TransactionType) {
    setForm({
      ...INITIAL_FORM,
      transactionType: type,
    });
    setFormOpen(true);
  }

  function openEdit(b: BeneficiaryRecord) {
    setForm({
      id: b.id,
      name: b.name,
      transactionType: b.transactionType,
      bankName: b.bankName || "GCB Bank",
      accountNumber: b.accountNumber || "",
      currency: b.currency || "GHS",
      network: b.network || "MTN Mobile Money",
      phoneNumber: b.phoneNumber || "",
      proxyId: b.proxyId || "",
      billerName: b.billerName || "ECG Prepaid",
      billerReference: b.billerReference || "",
      country: b.country || (b.transactionType === "swift" ? "United States" : "Nigeria"),
      swiftCode: "",
    });
    setFormOpen(true);
  }

  function handleSaveBeneficiary() {
    if (!form.name.trim()) return;

    let detail = "";
    switch (form.transactionType) {
      case "bank":
        detail = `${form.bankName} · ${form.accountNumber || "Account"} · ${form.currency}`;
        break;
      case "wallet":
        detail = `${form.network} · ${form.phoneNumber || "Wallet"}`;
        break;
      case "proxy":
        detail = `Proxy · ${form.proxyId || "@handle"}`;
        break;
      case "bill":
        detail = `${form.billerName} · ${form.billerReference || "Account"}`;
        break;
      case "airtime":
        detail = `${form.network} · ${form.phoneNumber || "Number"}`;
        break;
      case "swift":
        const swiftCurr = SWIFT_COUNTRIES.find((c) => c.name === form.country)?.currency || "USD";
        detail = `SWIFT (${form.swiftCode || "BIC"}) · ${form.bankName || "Bank"} · ${swiftCurr} · ${form.accountNumber || "IBAN"}`;
        break;
      case "papss":
        const papssCurr = PAPSS_COUNTRIES.find((c) => c.name === form.country)?.currency || "NGN";
        detail = `PAPSS · ${form.bankName || "Bank"} · ${papssCurr} · ${form.accountNumber || "Account"}`;
        break;
    }

    if (form.id) {
      updateBeneficiary(form.id, {
        name: form.name.trim(),
        transactionType: form.transactionType,
        detail,
        bankName: form.bankName,
        accountNumber: form.accountNumber,
        currency: form.currency,
        network: form.network,
        phoneNumber: form.phoneNumber,
        proxyId: form.proxyId,
        billerName: form.billerName,
        billerReference: form.billerReference,
        country: form.country,
      });
      toast.success(`Beneficiary "${form.name.trim()}" updated successfully.`);
    } else {
      const verified = !isCorporate;
      addBeneficiary({
        name: form.name.trim(),
        transactionType: form.transactionType,
        category: form.transactionType === "bill" ? "biller" : form.transactionType === "airtime" ? "number" : "person",
        detail,
        verified,
        bankName: form.bankName,
        accountNumber: form.accountNumber,
        currency: form.currency,
        network: form.network,
        phoneNumber: form.phoneNumber,
        proxyId: form.proxyId,
        billerName: form.billerName,
        billerReference: form.billerReference,
        country: form.country,
      });
      if (verified) {
        toast.success(`${form.name.trim()} has been saved to your beneficiaries.`);
      } else {
        toast.info("Beneficiary submitted for dual-authorization approval.");
      }
    }

    setFormOpen(false);
  }

  function handleRemoveBeneficiary() {
    if (!removeId) return;
    const item = beneficiaries.find((b) => b.id === removeId);
    removeBeneficiary(removeId);
    setRemoveId(null);
    toast.info(`Removed ${item ? item.name : "beneficiary"} from your beneficiaries.`);
  }

  function handleRemoveGroup() {
    if (!removeGroupId) return;
    const g = groups.find((x) => x.id === removeGroupId);
    deleteGroup(removeGroupId);
    setRemoveGroupId(null);
    toast.info(`Payment group ${g ? `"${g.name}"` : ""} has been deleted.`);
  }

  const toRemove = removeId ? beneficiaries.find((p) => p.id === removeId) : undefined;
  const toRemoveGroup = removeGroupId ? groups.find((g) => g.id === removeGroupId) : undefined;

  const hasActiveFilters = query.trim() !== "" || typeFilter !== "all";

  const clearAllFilters = () => {
    setQuery("");
    setTypeFilter("all");
  };

  // Render a beneficiary list item
  function renderBeneficiaryRow(b: BeneficiaryRecord) {
    const config = TYPE_CONFIG[b.transactionType] || TYPE_CONFIG.bank;
    const Icon = config.icon;

    let sendHref = `/payments/send?rail=${config.rail}&recipient=${encodeURIComponent(b.name)}`;
    if (b.accountNumber) sendHref += `&account=${encodeURIComponent(b.accountNumber)}`;
    else if (b.phoneNumber) sendHref += `&account=${encodeURIComponent(b.phoneNumber)}`;
    else if (b.proxyId) sendHref += `&proxy=${encodeURIComponent(b.proxyId)}`;
    else if (b.billerReference) sendHref += `&ref=${encodeURIComponent(b.billerReference)}`;

    return (
      <li
        key={b.id}
        className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            {b.transactionType === "bank" ? (
              <span className="text-[12px] font-normal tabular">{initials(b.name)}</span>
            ) : (
              <Icon size={16} strokeWidth={1.8} />
            )}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="truncate text-[14px] font-medium text-foreground">{b.name}</span>
              {b.verified ? (
                <CheckCircle2
                  size={13}
                  strokeWidth={2}
                  className="shrink-0 text-emerald-600 dark:text-emerald-400"
                  aria-label="Verified"
                />
              ) : (
                <Badge variant="warning" className="text-[10px] py-0 px-1.5">Pending</Badge>
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-[12px] text-muted-foreground tabular flex-wrap">
              <span>{b.detail}</span>
              {groupBy === "none" && (
                <span className="rounded bg-muted px-1.5 py-0.2 text-[11px] text-muted-foreground">
                  {config.label}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            variant="outline"
            size="xs"
            nativeButton={false}
            render={<Link href={sendHref} />}
            aria-label={`Send to ${b.name}`}
            className="h-7.5 gap-1 px-2.5 text-[12px] font-medium text-foreground bg-background hover:bg-foreground hover:text-background border-border/80 shadow-xs transition-colors rounded-lg"
          >
            <span>Send</span>
            <ArrowUpRight size={13} strokeWidth={2} className="shrink-0 opacity-70" />
          </Button>

          <SimpleTooltip content={`Edit ${b.name}`}>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => openEdit(b)}
              aria-label={`Edit ${b.name}`}
              className="size-7.5 rounded-lg text-muted-foreground hover:text-foreground"
            >
              <Pencil size={13} strokeWidth={1.8} />
            </Button>
          </SimpleTooltip>

          <SimpleTooltip content={`Remove ${b.name}`}>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setRemoveId(b.id)}
              aria-label={`Remove ${b.name}`}
              className="size-7.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 size={13} strokeWidth={1.8} />
            </Button>
          </SimpleTooltip>
        </div>
      </li>
    );
  }

  // Render a clean group list row matching user design (cyan avatar, amounts, and actions)
  function renderGroupRow(g: PaymentGroup) {
    const totalAmt =
      g.splitType === "equal"
        ? g.members.length * g.defaultPerMemberAmount
        : g.members.reduce((sum, m) => sum + (m.defaultAmount || 0), 0);

    return (
      <li
        key={g.id}
        className="flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-muted/20 cursor-pointer"
        onClick={() => {
          setEditingGroup(g);
          setEditGroupModalOpen(true);
        }}
      >
        {/* Left: Pastel Cyan Circle Avatar + Group Name & Member Count */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#A8E6F5] dark:bg-[#0E5164] text-[#166074] dark:text-[#A8E6F5] text-[13px] font-normal select-none">
            {initials(g.name)}
          </div>

          <div className="flex flex-col min-w-0">
            <span className="truncate text-[14px] font-normal text-foreground leading-tight">
              {g.name}
            </span>
            <span className="text-[12.5px] text-muted-foreground leading-tight mt-1">
              {g.members.length} members
            </span>
          </div>
        </div>

        {/* Right: Total Amount + Per-member Split + Minimal Action Icons */}
        <div className="flex items-center gap-5 sm:gap-6 shrink-0">
          <div className="flex flex-col text-right">
            <span className="text-[14px] font-normal text-foreground tabular leading-tight">
              GHS {totalAmt.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[12.5px] text-muted-foreground tabular leading-tight mt-1">
              {g.splitType === "equal"
                ? `GHS ${g.defaultPerMemberAmount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} each`
                : "Custom split"}
            </span>
          </div>

          <div className="flex items-center gap-2.5 text-muted-foreground shrink-0" onClick={(e) => e.stopPropagation()}>
            <Link
              href={`/payments/send?rail=group&group=${encodeURIComponent(g.name)}`}
              className="flex size-7 items-center justify-center rounded-md hover:text-foreground hover:bg-muted/60 transition-colors"
              aria-label={`Send to ${g.name}`}
              title={`Send to ${g.name}`}
            >
              <Send size={15} strokeWidth={1.6} />
            </Link>

            <button
              type="button"
              onClick={() => {
                setEditingGroup(g);
                setEditGroupModalOpen(true);
              }}
              className="flex size-7 items-center justify-center rounded-md hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
              aria-label={`Edit members of ${g.name}`}
              title={`Edit members of ${g.name}`}
            >
              <Pencil size={15} strokeWidth={1.6} />
            </button>

            <button
              type="button"
              onClick={() => setRemoveGroupId(g.id)}
              className="flex size-7 items-center justify-center rounded-md hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
              aria-label={`Delete ${g.name}`}
              title={`Delete ${g.name}`}
            >
              <Trash2 size={15} strokeWidth={1.6} />
            </button>
          </div>
        </div>
      </li>
    );
  }

  const activeRailList = activeTab === "people" ? PEOPLE_TYPES : BILLER_TYPES;

  return (
    <div className="flex flex-col gap-6">
      {/* Header matching Figma */}
      <PageHeader
        title="Beneficiaries"
        description="Manage your saved counterparties, bank accounts, mobile wallets, and payment groups."
        actions={
          activeTab === "groups" ? (
            <Button
              onClick={() => {
                setCreateGroupModalOpen(true);
              }}
              className="h-9 gap-1.5 px-3.5 text-[13px] font-medium rounded-lg shadow-xs"
            >
              <Plus size={15} strokeWidth={2} />
              Add new group
            </Button>
          ) : (
            <Button
              onClick={() => {
                setForm({
                  ...INITIAL_FORM,
                  transactionType: activeTab === "billers" ? "bill" : "bank",
                });
                setFormOpen(true);
              }}
              className="h-9 gap-1.5 px-3.5 text-[13px] font-medium rounded-lg shadow-xs"
            >
              <Plus size={15} strokeWidth={2} />
              {activeTab === "billers" ? "Add biller" : "Add beneficiary"}
            </Button>
          )
        }
      />

      {/* 3 Major Segmented Tabs: People, Billers, Groups (Figma Node 1374:35963) */}
      <div className="flex items-center justify-between">
        <div className="inline-flex w-fit flex-wrap rounded-xl bg-muted p-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab("people");
              setTypeFilter("all");
            }}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] transition-all cursor-pointer ${
              activeTab === "people"
                ? "bg-background text-foreground shadow-sm font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>People</span>
            <span className="text-[11px] text-muted-foreground font-normal tabular">
              {counts.people}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("billers");
              setTypeFilter("all");
            }}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] transition-all cursor-pointer ${
              activeTab === "billers"
                ? "bg-background text-foreground shadow-sm font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>Billers</span>
            <span className="text-[11px] text-muted-foreground font-normal tabular">
              {counts.billers}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("groups");
              setTypeFilter("all");
            }}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] transition-all cursor-pointer ${
              activeTab === "groups"
                ? "bg-background text-foreground shadow-sm font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>Groups</span>
            <span className="text-[11px] text-muted-foreground font-normal tabular">
              {counts.groups}
            </span>
          </button>
        </div>
      </div>

      {/* Full-width Search Bar (Figma style) */}
      <div className="relative w-full">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            activeTab === "people"
              ? "Search by name, account number, phone, or proxy..."
              : activeTab === "billers"
              ? "Search by utility provider, meter number, or network..."
              : "Search by group title, description, or member name..."
          }
          className="w-full h-12 pl-11 pr-10 rounded-xl border border-border/70 bg-card/40 text-[14px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring transition-colors"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 cursor-pointer"
            aria-label="Clear search query"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Filter Toolbar (for People & Billers) */}
      {activeTab !== "groups" && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* 1. Method / Rail Filter */}
            {(() => {
              const isTypeActive = typeFilter !== "all";
              return (
                <Select
                  value={typeFilter}
                  onValueChange={(val) => setTypeFilter((val as TypeFilter) ?? "all")}
                >
                  <SelectTrigger
                    size="sm"
                    isActive={isTypeActive}
                    onClear={isTypeActive ? () => setTypeFilter("all") : undefined}
                    clearLabel="Clear method filter"
                    className="h-9 w-auto min-w-[145px] text-[13px] rounded-lg border-border/80 bg-background/60"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      {isTypeActive && (
                        <span className="size-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 shrink-0" />
                      )}
                      <SelectValue placeholder="All Methods">
                        {(val: string) => {
                          if (!val || val === "all") return "All Methods";
                          return TYPE_CONFIG[val as TransactionType]?.label || val;
                        }}
                      </SelectValue>
                    </div>
                  </SelectTrigger>
                  <SelectContent align="start" className="min-w-[220px]">
                    <SelectItem value="all">All Methods</SelectItem>
                    {activeRailList.map((t) => (
                      <SelectItem key={t} value={t}>
                        {TYPE_CONFIG[t].plural} ({counts[t]})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              );
            })()}

            {/* 2. Group By Selection */}
            <Select value={groupBy} onValueChange={(val) => setGroupBy(val as GroupByOption)}>
              <SelectTrigger
                size="sm"
                className="h-9 w-auto min-w-[145px] text-[13px] rounded-lg border-border/80 bg-background/60"
              >
                <SelectValue placeholder="Group by">
                  {(val: string) => {
                    if (val === "type") return "Group: Rail Type";
                    return "Group: Flat List";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="start" className="min-w-[180px]">
                <SelectItem value="type">Group: Rail Type</SelectItem>
                <SelectItem value="none">Group: Flat List</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear All Active Filters */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-[12.5px] text-muted-foreground hover:text-foreground font-medium underline underline-offset-4 cursor-pointer pl-1"
              >
                Reset filters
              </button>
            )}
          </div>

          {/* Expand / Collapse All Toggle (Visible when grouped) */}
          {groupBy !== "none" && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={collapsedSections.size === 0 ? collapseAllSections : expandAllSections}
                className="text-[12px] text-muted-foreground hover:text-foreground cursor-pointer font-medium"
              >
                {collapsedSections.size === 0 ? "Collapse all" : "Expand all"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main List Container */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        {/* PEOPLE & BILLERS LIST */}
        {activeTab !== "groups" && (
          filteredList.length === 0 ? (
            hasActiveFilters ? (
              <FilteredEmptyState
                onReset={clearAllFilters}
                description={
                  activeTab === "people"
                    ? "No people match your active search or filters."
                    : "No billers match your active search or filters."
                }
              />
            ) : (
              <TrueEmptyState
                title={activeTab === "people" ? "No people saved yet" : "No billers saved yet"}
                description={
                  activeTab === "people"
                    ? "Save frequent payees and bank accounts to speed up your transfers."
                    : "Save your frequent utilities and billers for 1-click bill payments."
                }
                action={
                  <Button
                    size="sm"
                    onClick={() => {
                      setForm({
                        ...INITIAL_FORM,
                        transactionType: activeTab === "billers" ? "bill" : "bank",
                      });
                      setFormOpen(true);
                    }}
                    className="font-medium"
                  >
                    <Plus size={14} className="mr-1.5" />
                    {activeTab === "billers" ? "Add biller" : "Add beneficiary"}
                  </Button>
                }
              />
            )
          ) : groupBy === "type" ? (
            /* ── Collapsible Grouping by Rail Type ─────────────────────────────── */
            <div className="divide-y divide-border">
              {activeRailList.map((typeKey) => {
                const items = filteredList.filter((b) => b.transactionType === typeKey);
                if (items.length === 0) return null;

                const isCollapsed = collapsedSections.has(typeKey);
                const config = TYPE_CONFIG[typeKey];
                const Icon = config.icon;

                return (
                  <div key={typeKey} className="flex flex-col">
                    {/* Collapsible Accordion Header */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleSectionCollapse(typeKey)}
                      className="flex items-center justify-between bg-muted/40 px-4 py-2.5 text-[13px] hover:bg-muted/60 transition-colors cursor-pointer select-none"
                    >
                      <span className="flex items-center gap-2.5 font-medium text-foreground">
                        <ChevronDown
                          size={16}
                          className={cn("transition-transform duration-200 text-muted-foreground", isCollapsed && "-rotate-90 text-muted-foreground/60")}
                        />
                        <Icon size={15} strokeWidth={1.8} className="text-muted-foreground shrink-0" />
                        <span>{config.plural}</span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-normal tabular text-muted-foreground">
                          {items.length}
                        </span>
                      </span>

                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => openAddForType(typeKey)}
                          className="h-7 gap-1 px-2.5 text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md transition-colors"
                        >
                          <Plus size={12} strokeWidth={2} />
                          <span>Add</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="xs"
                          nativeButton={false}
                          render={<Link href={`/payments/send?rail=${config.rail}`} />}
                          className="h-7 gap-1 px-2.5 text-[12px] font-medium bg-background text-foreground hover:bg-muted/80 rounded-md border-border/80 shadow-xs transition-colors"
                        >
                          <span>Send</span>
                          <ArrowUpRight size={12} strokeWidth={2} className="text-muted-foreground shrink-0" />
                        </Button>
                      </div>
                    </div>

                    {/* Collapsible Rows */}
                    {!isCollapsed && (
                      <ul className="divide-y divide-border">
                        {items.map(renderBeneficiaryRow)}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* ── Flat List ─────────────────────────────────────────────────────── */
            <ul className="divide-y divide-border">
              {filteredList.map(renderBeneficiaryRow)}
            </ul>
          )
        )}

        {/* PAYMENT GROUPS LIST */}
        {activeTab === "groups" && (
          filteredGroups.length === 0 ? (
            query ? (
              <FilteredEmptyState
                onReset={() => setQuery("")}
                description="No payment groups match your search query."
              />
            ) : (
              <TrueEmptyState
                title="No payment groups created"
                description="Create a group to distribute transfers or Susu contributions in one step."
                action={
                  <Button
                    size="sm"
                    onClick={() => {
                      setCreateGroupModalOpen(true);
                    }}
                    className="font-medium"
                  >
                    <Plus size={14} className="mr-1.5" /> Create first group
                  </Button>
                }
              />
            )
          ) : (
            <ul className="divide-y divide-border">
              {filteredGroups.map(renderGroupRow)}
            </ul>
          )
        )}
      </div>

      {/* ── Progressive Add / Edit Beneficiary Modal (Clean & Borderless) ── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent
          className="sm:max-w-[480px] p-0 overflow-hidden rounded-2xl border-none bg-card shadow-2xl"
          showCloseButton={false}
        >
          {/* Header matching TransactionPinModal */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
            <DialogTitle className="text-[17px] font-medium text-foreground tracking-[-0.01em]">
              {form.id
                ? "Edit Beneficiary"
                : activeTab === "billers"
                ? "Add Biller"
                : "Add Beneficiary"}
            </DialogTitle>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X size={15} strokeWidth={1.8} />
            </button>
          </div>

          {/* Modal Content with Progressive Disclosure */}
          <div className="max-h-[75vh] overflow-y-auto px-6 py-5 flex flex-col gap-4">
            {/* Step 1: Destination Rail (Dropdown) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-medium text-muted-foreground">
                Payment Rail
              </label>
              <Select
                value={form.transactionType}
                onValueChange={(val) => {
                  if (!val) return;
                  setForm((p) => ({ ...p, transactionType: val as TransactionType }));
                }}
              >
                <SelectTrigger className="h-10.5 w-full rounded-xl border border-border/80 dark:border-white/[0.12] bg-muted/40 dark:bg-white/[0.07] px-3.5 text-[13.5px] font-medium shadow-xs">
                  <div className="flex items-center gap-2.5 truncate">
                    {(() => {
                      const meta = TYPE_CONFIG[form.transactionType] || TYPE_CONFIG.bank;
                      const Icon = meta.icon;
                      return (
                        <>
                          <Icon size={16} strokeWidth={1.8} className="text-muted-foreground shrink-0" />
                          <span className="text-foreground">{meta.label}</span>
                        </>
                      );
                    })()}
                  </div>
                </SelectTrigger>
                <SelectContent className="min-w-[260px]">
                  {(activeTab === "billers" ? BILLER_TYPES : PEOPLE_TYPES).map((t) => {
                    const meta = TYPE_CONFIG[t];
                    const Icon = meta.icon;
                    return (
                      <SelectItem key={t} value={t} className="text-[13px] py-2">
                        <div className="flex items-center gap-2.5">
                          <Icon size={15} strokeWidth={1.8} className="text-muted-foreground shrink-0" />
                          <span>{meta.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Step 2: Beneficiary Legal Name */}
            <div className="flex flex-col gap-1.5">
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder={
                  form.transactionType === "bill"
                    ? "Biller account nickname (e.g. Home ECG, Office Water)"
                    : "Beneficiary legal name (e.g. Kwame Boateng)"
                }
                autoFocus
                className="h-11 w-full rounded-xl border border-border/80 dark:border-white/[0.12] bg-muted/40 dark:bg-white/[0.07] px-3.5 text-[14px] text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all"
              />
            </div>

            {/* Step 3: Progressive Details according to rail */}
            {/* Bank Rail */}
            {form.transactionType === "bank" && (
              <div className="flex flex-col gap-3">
                <Select
                  value={form.bankName}
                  onValueChange={(val) => val && setForm((p) => ({ ...p, bankName: val }))}
                >
                  <SelectTrigger className="h-11 w-full rounded-xl border border-border/80 dark:border-white/[0.12] bg-muted/40 dark:bg-white/[0.07] px-3.5 text-[13.5px]">
                    <SelectValue placeholder="Select receiving bank" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {GHANA_BANKS.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <input
                  type="text"
                  value={form.accountNumber}
                  onChange={(e) => setForm((p) => ({ ...p, accountNumber: e.target.value }))}
                  placeholder="Enter bank account number"
                  className="h-11 w-full rounded-xl border border-border/80 dark:border-white/[0.12] bg-muted/40 dark:bg-white/[0.07] px-3.5 text-[14px] text-foreground tabular placeholder:text-muted-foreground/60 outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all"
                />
              </div>
            )}

            {/* Mobile Wallet Rail */}
            {/* Mobile Wallet Rail */}
            {form.transactionType === "wallet" && (
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  value={form.phoneNumber}
                  onChange={(e) => {
                    const ph = e.target.value;
                    const detected = detectNetworkFromPhone(ph);
                    setForm((p) => ({ ...p, phoneNumber: ph, network: detected }));
                  }}
                  placeholder="Mobile money number (e.g. 0244 123 456)"
                  className="h-11 w-full rounded-xl border border-border/80 dark:border-white/[0.12] bg-muted/40 dark:bg-white/[0.07] px-3.5 text-[14px] text-foreground tabular placeholder:text-muted-foreground/60 outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all"
                />

                <Select
                  value={form.network}
                  onValueChange={(val) => val && setForm((p) => ({ ...p, network: val }))}
                >
                  <SelectTrigger className="h-11 w-full rounded-xl border border-border/80 dark:border-white/[0.12] bg-muted/40 dark:bg-white/[0.07] px-3.5 text-[13.5px]">
                    <SelectValue placeholder="Select network provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {WALLET_NETWORKS.map((n) => (
                      <SelectItem key={n} value={n}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Proxy Pay Rail */}
            {form.transactionType === "proxy" && (
              <div className="flex flex-col gap-3">
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-[15px] font-semibold text-muted-foreground select-none pointer-events-none">
                    @
                  </span>
                  <input
                    type="text"
                    value={form.proxyId.replace(/^@/, "")}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/^@/, "").trim();
                      setForm((p) => ({ ...p, proxyId: cleaned ? `@${cleaned}` : "" }));
                    }}
                    placeholder="kwame.b"
                    className="h-11 w-full rounded-xl border border-border/80 dark:border-white/[0.12] bg-muted/40 dark:bg-white/[0.07] pl-8 pr-3.5 text-[14px] text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all"
                  />
                </div>
              </div>
            )}

            {/* Bills & Utilities Rail */}
            {form.transactionType === "bill" && (
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  value={form.billerName}
                  onChange={(e) => setForm((p) => ({ ...p, billerName: e.target.value }))}
                  placeholder="Biller or utility company (e.g. ECG Prepaid, Ghana Water)"
                  className="h-11 w-full rounded-xl border border-border/80 dark:border-white/[0.12] bg-muted/40 dark:bg-white/[0.07] px-3.5 text-[14px] text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all"
                />
                <input
                  type="text"
                  value={form.billerReference}
                  onChange={(e) => setForm((p) => ({ ...p, billerReference: e.target.value }))}
                  placeholder="Meter number or account reference (e.g. P-8839210)"
                  className="h-11 w-full rounded-xl border border-border/80 dark:border-white/[0.12] bg-muted/40 dark:bg-white/[0.07] px-3.5 text-[14px] text-foreground tabular placeholder:text-muted-foreground/60 outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all"
                />
              </div>
            )}

            {/* Airtime Rail */}
            {form.transactionType === "airtime" && (
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  value={form.phoneNumber}
                  onChange={(e) => setForm((p) => ({ ...p, phoneNumber: e.target.value }))}
                  placeholder="Phone number to top up (e.g. 0244 123 821)"
                  className="h-11 w-full rounded-xl border border-border/80 dark:border-white/[0.12] bg-muted/40 dark:bg-white/[0.07] px-3.5 text-[14px] text-foreground tabular placeholder:text-muted-foreground/60 outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all"
                />
                <Select
                  value={form.network}
                  onValueChange={(val) => val && setForm((p) => ({ ...p, network: val }))}
                >
                  <SelectTrigger className="h-11 w-full rounded-xl border border-border/80 dark:border-white/[0.12] bg-muted/40 dark:bg-white/[0.07] px-3.5 text-[13.5px]">
                    <SelectValue placeholder="Select network provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {AIRTIME_NETWORKS.map((n) => (
                      <SelectItem key={n} value={n}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* SWIFT International Wire */}
            {form.transactionType === "swift" && (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <Select
                    value={form.country}
                    onValueChange={(val) => {
                      if (!val) return;
                      const defaultBank = (INTERNATIONAL_BANKS_BY_COUNTRY[val] || [])[0] || "";
                      setForm((p) => ({ ...p, country: val, bankName: defaultBank }));
                    }}
                  >
                    <SelectTrigger className="h-11 rounded-xl border border-border/80 dark:border-white/[0.12] bg-muted/40 dark:bg-white/[0.07] px-3 text-[13px]">
                      <SelectValue placeholder="Country" />
                    </SelectTrigger>
                    <SelectContent className="max-h-56">
                      {SWIFT_COUNTRIES.map((c) => (
                        <SelectItem key={c.name} value={c.name}>
                          {c.name} ({c.currency})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={form.bankName}
                    onValueChange={(val) => val && setForm((p) => ({ ...p, bankName: val }))}
                  >
                    <SelectTrigger className="h-11 rounded-xl border border-border/80 dark:border-white/[0.12] bg-muted/40 dark:bg-white/[0.07] px-3 text-[13px]">
                      <SelectValue placeholder="Select bank" />
                    </SelectTrigger>
                    <SelectContent className="max-h-56">
                      {(INTERNATIONAL_BANKS_BY_COUNTRY[form.country] || INTERNATIONAL_BANKS_BY_COUNTRY["United States"]).map((bank) => (
                        <SelectItem key={bank} value={bank}>
                          {bank}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    value={form.swiftCode}
                    onChange={(e) => setForm((p) => ({ ...p, swiftCode: e.target.value.toUpperCase() }))}
                    placeholder="SWIFT / BIC Code"
                    className="h-11 rounded-xl border border-border/80 dark:border-white/[0.12] bg-muted/40 dark:bg-white/[0.07] px-3 text-[13px] text-foreground uppercase tracking-wider placeholder:text-muted-foreground/60 outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all"
                  />
                  <input
                    type="text"
                    value={form.accountNumber}
                    onChange={(e) => setForm((p) => ({ ...p, accountNumber: e.target.value }))}
                    placeholder="IBAN / Account"
                    className="h-11 rounded-xl border border-border/80 dark:border-white/[0.12] bg-muted/40 dark:bg-white/[0.07] px-3 text-[13px] text-foreground tabular placeholder:text-muted-foreground/60 outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all"
                  />
                </div>
              </div>
            )}

            {/* PAPSS Cross-Border Rail */}
            {form.transactionType === "papss" && (
              <div className="flex flex-col gap-3">
                <Select
                  value={form.country}
                  onValueChange={(val) => {
                    if (!val) return;
                    const defaultBank = (PAPSS_BANKS_BY_COUNTRY[val] || [])[0] || "";
                    setForm((p) => ({ ...p, country: val, bankName: defaultBank }));
                  }}
                >
                  <SelectTrigger className="h-11 rounded-xl border border-border/80 dark:border-white/[0.12] bg-muted/40 dark:bg-white/[0.07] px-3.5 text-[13px]">
                    <SelectValue placeholder="Select African destination" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {PAPSS_COUNTRIES.map((c) => (
                      <SelectItem key={c.name} value={c.name}>
                        {c.name} ({c.currency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="grid grid-cols-2 gap-2.5">
                  <Select
                    value={form.bankName}
                    onValueChange={(val) => val && setForm((p) => ({ ...p, bankName: val }))}
                  >
                    <SelectTrigger className="h-11 rounded-xl border border-border/80 dark:border-white/[0.12] bg-muted/40 dark:bg-white/[0.07] px-3 text-[13px]">
                      <SelectValue placeholder="Select bank" />
                    </SelectTrigger>
                    <SelectContent className="max-h-56">
                      {(PAPSS_BANKS_BY_COUNTRY[form.country] || PAPSS_BANKS_BY_COUNTRY["Nigeria"]).map((bank) => (
                        <SelectItem key={bank} value={bank}>
                          {bank}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <input
                    type="text"
                    value={form.accountNumber}
                    onChange={(e) => setForm((p) => ({ ...p, accountNumber: e.target.value }))}
                    placeholder="Account / IBAN"
                    className="h-11 rounded-xl border border-border/80 dark:border-white/[0.12] bg-muted/40 dark:bg-white/[0.07] px-3 text-[13px] text-foreground tabular placeholder:text-muted-foreground/60 outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 transition-all"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Clean Footer with Amber Primary Button */}
          <div className="flex items-center justify-end gap-2 px-6 py-3.5 border-t border-border/60 bg-muted/20">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFormOpen(false)}
              className="h-9 px-3.5 text-[13px]"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveBeneficiary}
              disabled={!form.name.trim()}
              className="h-9 px-4 text-[13px] font-medium"
            >
              {form.id ? "Save Changes" : "Save Beneficiary"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialogs (Clean & Borderless) ───────────── */}
      <Dialog open={Boolean(removeId)} onOpenChange={(o) => !o && setRemoveId(null)}>
        <DialogContent
          className="sm:max-w-[420px] p-0 overflow-hidden rounded-2xl border-none bg-card shadow-2xl"
          showCloseButton={false}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
            <DialogTitle className="text-[17px] font-medium text-foreground tracking-[-0.01em]">
              Remove Beneficiary
            </DialogTitle>
            <button
              type="button"
              onClick={() => setRemoveId(null)}
              className="flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>
          <div className="px-6 py-5 text-[13.5px] text-muted-foreground">
            Are you sure you want to remove <span className="font-medium text-foreground">{toRemove?.name}</span>? This will not affect past transactions.
          </div>
          <div className="flex items-center justify-end gap-2 px-6 py-3.5 border-t border-border/60 bg-muted/20">
            <Button variant="ghost" size="sm" onClick={() => setRemoveId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleRemoveBeneficiary}>
              Remove
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(removeGroupId)} onOpenChange={(o) => !o && setRemoveGroupId(null)}>
        <DialogContent
          className="sm:max-w-[420px] p-0 overflow-hidden rounded-2xl border-none bg-card shadow-2xl"
          showCloseButton={false}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
            <DialogTitle className="text-[17px] font-medium text-foreground tracking-[-0.01em]">
              Delete Payment Group
            </DialogTitle>
            <button
              type="button"
              onClick={() => setRemoveGroupId(null)}
              className="flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>
          <div className="px-6 py-5 text-[13.5px] text-muted-foreground">
            Are you sure you want to delete <span className="font-medium text-foreground">{toRemoveGroup?.name}</span>? Group members will remain in your individual beneficiaries directory.
          </div>
          <div className="flex items-center justify-end gap-2 px-6 py-3.5 border-t border-border/60 bg-muted/20">
            <Button variant="ghost" size="sm" onClick={() => setRemoveGroupId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleRemoveGroup}>
              Delete Group
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Create Group Modal (1:1 Figma Node 1532-7653) ───────────────── */}
      <CreateGroupModal
        open={createGroupModalOpen}
        onOpenChange={setCreateGroupModalOpen}
        onSuccess={() => {
          // Toast handled in modal
        }}
      />

      {/* ── Edit Group Modal (Figma Styling, Group-only Members & Deletions) ─ */}
      <EditGroupModal
        open={editGroupModalOpen}
        onOpenChange={(open) => {
          setEditGroupModalOpen(open);
          if (!open) setEditingGroup(null);
        }}
        group={editingGroup}
        onSuccess={() => {
          // Toast handled in modal
        }}
        onDeleted={() => {
          setEditingGroup(null);
        }}
      />
    </div>
  );
}
