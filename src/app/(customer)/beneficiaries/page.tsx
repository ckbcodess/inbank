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

import { SearchField } from "@/components/ui/search-field";
import { ListCard } from "@/components/ui/list-card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PayeeAvatar } from "@/components/ui/payee-avatar";
import {
  ChevronRight,
  Globe,
  Landmark,
  Pencil,
  Plus,
  Send,
  Smartphone,
  Trash2,
  User,
  Wallet,
} from "lucide-react";
import { CediReceiptIcon } from "@/components/ui/cedi-receipt-icon";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { SimpleTooltip } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BILLERS } from "@/lib/mock-data";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { GroupDetailSheet } from "@/components/beneficiaries/GroupDetailSheet";
import { BeneficiaryDetailSheet } from "@/components/beneficiaries/BeneficiaryDetailSheet";
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
import CreateGroupModal from "@/components/payments/CreateGroupModal";
import EditGroupModal from "@/components/payments/EditGroupModal";
import { toast } from "sonner";
import { PhoneInput } from "@/components/ui/phone-input";

import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
type ActiveTab = "people" | "groups";
type TypeFilter = "all" | TransactionType;

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
  bill: { label: "Bills & Utilities", plural: "Bills & Utilities", rail: "bill", icon: CediReceiptIcon },
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

const WALLET_NETWORKS = ["MTN Mobile Money", "Telecel Cash", "AT Money", "GhanaPay", "G-Money"];
const AIRTIME_NETWORKS = ["MTN Ghana", "Telecel Ghana", "AT Ghana", "GhanaPay", "G-Money"];
const BILLER_CATEGORIES = Array.from(new Set(BILLERS.map((b) => b.category)));

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
  swiftBic?: string;
  address?: string;
  nickname?: string;
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
  swiftBic: "",
  address: "",
  nickname: "",
};

export default function BeneficiariesPage() {
  const {
    beneficiaries,
    addBeneficiary,
    updateBeneficiary,
    removeBeneficiary,
  } = useBeneficiariesStore();

  const { groups, deleteGroup } = useGroupsStore();

  // Two tabs: Beneficiaries (people and billers together) and Groups
  const [activeTab, setActiveTab] = useState<ActiveTab>("people");

  // Open a specific tab when deep-linked (e.g. "Manage groups" → ?tab=groups).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("tab");
    if (t === "groups") setActiveTab("groups");
    // The old Billers tab is now the Bills filter on the one list
    else if (t === "billers") setTypeFilter("bill");

    const editId = params.get("edit");
    if (editId) {
      const g = groups.find((grp) => grp.id === editId);
      if (g) {
        setActiveTab("groups");
        setEditingGroup(g);
        setEditGroupModalOpen(true);
      }
    }
  }, [groups]);

  // Search and Filters
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  // Modal & Sheet States
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<BeneficiaryRecord | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [removeId, setRemoveId] = useState<string | null>(null);

  const matchedBiller = useMemo(() => {
    return (
      BILLERS.find((b) => b.name === form.billerName) ||
      BILLERS.find((b) => b.id === form.billerName) ||
      BILLERS.find(
        (b) =>
          form.billerName &&
          b.name.toLowerCase().includes(form.billerName.toLowerCase())
      ) ||
      BILLERS[0]
    );
  }, [form.billerName]);

  const billerRefLabel = matchedBiller?.reference || "Account Reference / Meter Number";
  const billerRefPlaceholder = matchedBiller?.reference
    ? `Enter ${matchedBiller.reference.toLowerCase()} (e.g. for ${matchedBiller.name})`
    : "Meter number or account reference (e.g. P-8839210)";

  const [createGroupModalOpen, setCreateGroupModalOpen] = useState(false);
  const [editGroupModalOpen, setEditGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<PaymentGroup | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<PaymentGroup | null>(null);
  const [removeGroupId, setRemoveGroupId] = useState<string | null>(null);

  // How many of each kind there are: the type dropdown only offers kinds that exist
  const typeCounts = useMemo(() => {
    const out: Partial<Record<TransactionType, number>> = {};
    for (const b of beneficiaries) out[b.transactionType] = (out[b.transactionType] ?? 0) + 1;
    return out;
  }, [beneficiaries]);
  const kindsPresent = (Object.keys(TYPE_CONFIG) as TransactionType[]).filter((t) => (typeCounts[t] ?? 0) > 0);

  const q = query.trim().toLowerCase();

  // One flat list, A to Z
  const filteredList = useMemo(() => {
    if (activeTab === "groups") return [];

    return beneficiaries
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
  }, [activeTab, beneficiaries, typeFilter, q]);

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

  // "Add someone" from elsewhere (e.g. the dashboard's Pay again) → ?add=1
  // opens the same form the hub uses.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("add") !== "1") return;
    setForm(INITIAL_FORM);
    setFormOpen(true);
  }, []);

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
      const verified = true;
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
        onClick={() => setSelectedBeneficiary(b)}
        className="group flex items-center justify-between gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-muted/50 cursor-pointer sm:px-3"
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <PayeeAvatar
            name={b.name}
            icon={b.transactionType === "bill" || b.transactionType === "airtime" ? Icon : undefined}
          />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="truncate text-[14px] font-medium text-foreground leading-snug">{b.name}</span>
              {/* A tick on every row says nothing; only the exception is marked */}
              {!b.verified && <Badge variant="warning" className="text-[10px] py-0 px-2">Pending approval</Badge>}
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-[12px] text-muted-foreground tabular flex-wrap">
              <span>{b.detail}</span>
            </div>
          </div>
        </div>

        {/* Pay, Edit and Remove appear on hover or keyboard focus (always shown where there is no hover, as on touch) */}
        <div
          className="hidden shrink-0 items-center gap-2 text-muted-foreground [&>*]:shrink-0 [@media(hover:hover)]:flex transition-[width,opacity,margin] duration-reveal ease-settle focus-within:opacity-100 [@media(hover:hover)]:w-0 [@media(hover:hover)]:overflow-hidden [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:ml-2 [@media(hover:hover)]:group-hover:w-[92px] [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-within:ml-2 [@media(hover:hover)]:focus-within:w-[92px]"
          onClick={(e) => e.stopPropagation()}
        >
          <SimpleTooltip content={`Send to ${b.name}`}>
            <Link
              href={sendHref}
              className="flex size-6 items-center justify-center rounded-lg hover:text-foreground hover:bg-muted/60 transition-colors"
              aria-label={`Send to ${b.name}`}
              title={`Send to ${b.name}`}
            >
              <Send size={15} strokeWidth={1.6} />
            </Link>
          </SimpleTooltip>

          <SimpleTooltip content={`Edit ${b.name}`}>
            <button
              type="button"
              onClick={() => openEdit(b)}
              className="flex size-6 items-center justify-center rounded-lg hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
              aria-label={`Edit ${b.name}`}
              title={`Edit ${b.name}`}
            >
              <Pencil size={15} strokeWidth={1.6} />
            </button>
          </SimpleTooltip>

          <SimpleTooltip content={`Remove ${b.name}`}>
            <button
              type="button"
              onClick={() => setRemoveId(b.id)}
              className="flex size-6 items-center justify-center rounded-lg hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
              aria-label={`Remove ${b.name}`}
              title={`Remove ${b.name}`}
            >
              <Trash2 size={15} strokeWidth={1.6} />
            </button>
          </SimpleTooltip>
        </div>
        <ChevronRight size={18} strokeWidth={1.7} className="shrink-0 text-muted-foreground [@media(hover:hover)]:hidden" aria-hidden />
      </li>
    );
  }

  // Render a clean group list row matching design system standards
  function renderGroupRow(g: PaymentGroup) {
    const totalAmt =
      g.splitType === "equal"
        ? g.members.length * g.defaultPerMemberAmount
        : g.members.reduce((sum, m) => sum + (m.defaultAmount || 0), 0);

    return (
      <li
        key={g.id}
        className="group flex items-center justify-between gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-muted/50 cursor-pointer sm:px-3"
        onClick={() => setSelectedGroup(g)}
      >
        {/* Left: Brand-tinted Group Avatar + Group Name & Member Count */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <PayeeAvatar name={g.name} />

          <div className="flex flex-col min-w-0">
            <span className="truncate text-[14px] text-foreground leading-snug">
              {g.name}
            </span>
            <span className="text-[12px] text-muted-foreground leading-normal mt-0.5 tabular-nums numorainput">
              {g.members.length} {g.members.length === 1 ? "member" : "members"}
            </span>
          </div>
        </div>

        {/* Right: Total Amount + Per-member Split + Minimal Action Icons */}
        <div className="flex items-center gap-4 sm:gap-5 shrink-0 [@media(hover:hover)]:gap-0">
          <div className="flex flex-col text-right ">
            <span className="text-[14px] text-foreground tabular-nums numorainput leading-snug">
              GHS {totalAmt.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[12px] text-muted-foreground tabular-nums numorainput leading-normal mt-0.5">
              {g.splitType === "equal"
                ? `GHS ${g.defaultPerMemberAmount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} each`
                : "Custom split"}
            </span>
          </div>

          {/* The same as a beneficiary row: the actions show on hover or focus, and always on touch */}
          <div
            className="hidden items-center gap-2 text-muted-foreground shrink-0 [&>*]:shrink-0 [@media(hover:hover)]:flex transition-[width,opacity,margin] duration-reveal ease-settle focus-within:opacity-100 [@media(hover:hover)]:w-0 [@media(hover:hover)]:overflow-hidden [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:ml-2 [@media(hover:hover)]:group-hover:w-[92px] [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-within:ml-2 [@media(hover:hover)]:focus-within:w-[92px]"
            onClick={(e) => e.stopPropagation()}
          >
            <SimpleTooltip content={`Send to ${g.name}`}>
              <Link
                href={`/payments/send?rail=group&group=${encodeURIComponent(g.name)}`}
                className="flex size-6 items-center justify-center rounded-lg hover:text-foreground hover:bg-muted/60 transition-colors"
                aria-label={`Send to ${g.name}`}
                title={`Send to ${g.name}`}
              >
                <Send size={15} strokeWidth={1.6} />
              </Link>
            </SimpleTooltip>

            <SimpleTooltip content={`Edit ${g.name}`}>
              <button
                type="button"
                onClick={() => {
                  setEditingGroup(g);
                  setEditGroupModalOpen(true);
                }}
                className="flex size-6 items-center justify-center rounded-lg hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
                aria-label={`Edit ${g.name}`}
                title={`Edit ${g.name}`}
              >
                <Pencil size={15} strokeWidth={1.6} />
              </button>
            </SimpleTooltip>

            <SimpleTooltip content={`Delete ${g.name}`}>
              <button
                type="button"
                onClick={() => setRemoveGroupId(g.id)}
                className="flex size-6 items-center justify-center rounded-lg hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                aria-label={`Delete ${g.name}`}
                title={`Delete ${g.name}`}
              >
                <Trash2 size={15} strokeWidth={1.6} />
              </button>
            </SimpleTooltip>
          </div>
        </div>
        <ChevronRight size={18} strokeWidth={1.7} className="shrink-0 text-muted-foreground [@media(hover:hover)]:hidden" aria-hidden />
      </li>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ── Page Header: Title & Action (no description underneath) ── */}
      <PageHeader
        title="Beneficiaries"
        actions={
          activeTab === "groups" ? (
            <Button
              nativeButton={false}
              render={<Link href="/beneficiaries/groups/new" />}
              className="shrink-0"
            >
              <Plus size={15} strokeWidth={2} />
              Add new group
            </Button>
          ) : (
            <Button
              onClick={() => {
                setForm({ ...INITIAL_FORM, transactionType: "bank" });
                setFormOpen(true);
              }}
              className="shrink-0"
            >
              <Plus size={15} strokeWidth={2} />
              Add beneficiary
            </Button>
          )
        }
      />

      {/* Two tabs: Beneficiaries and Groups */}
      <div className="flex items-center justify-between">
        <SegmentedControl
          aria-label="Beneficiaries or groups"
          options={[
            { value: "people", label: "Beneficiaries", count: beneficiaries.length },
            { value: "groups", label: "Groups", count: groups.length },
          ]}
          value={activeTab}
          onChange={(tab) => {
            setActiveTab(tab);
            setTypeFilter("all");
            setQuery("");
          }}
        />
      </div>

      {/* Search, with one type dropdown beside it */}
      <div className="flex w-full items-center gap-2">
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder={activeTab === "people" ? "Search by name or number" : "Search by group or member"}
          clearLabel="Clear search query"
        />

        {activeTab === "people" && kindsPresent.length > 1 && (
          <Select value={typeFilter} onValueChange={(v) => v && setTypeFilter(v as TypeFilter)}>
            <SelectTrigger aria-label="Type" className="h-10 w-auto min-w-[10.5rem] shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="all" label="All types">
                All types
              </SelectItem>
              {kindsPresent.map((t) => (
                <SelectItem key={t} value={t} label={TYPE_CONFIG[t].plural}>
                  {TYPE_CONFIG[t].plural}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* BENEFICIARIES LIST: one flat list, A to Z */}
      {activeTab === "people" &&
        (filteredList.length === 0 ? (
          hasActiveFilters ? (
            <FilteredEmptyState
              onReset={clearAllFilters}
              description="No beneficiaries match your search or type."
            />
          ) : (
            <TrueEmptyState
              illustration="empty-people"
              title="No beneficiaries saved yet"
              description="Save people, accounts and billers for faster payments."
              action={
                <Button
                  onClick={() => {
                    setForm({ ...INITIAL_FORM, transactionType: "bank" });
                    setFormOpen(true);
                  }}
                >
                  <Plus size={14} className="mr-2" />
                  Add beneficiary
                </Button>
              }
            />
          )
        ) : (
          <ListCard>{filteredList.map(renderBeneficiaryRow)}</ListCard>
        ))}

      {/* PAYMENT GROUPS LIST */}
      {activeTab === "groups" &&
        (filteredGroups.length === 0 ? (
          query ? (
            <FilteredEmptyState
              onReset={() => setQuery("")}
              description="No payment groups match your search query."
            />
          ) : (
            <TrueEmptyState
              illustration="empty-groups"
              title="No payment groups created"
              description="Send to several people or run Susu in one step."
              action={
                <Button nativeButton={false} render={<Link href="/beneficiaries/groups/new" />}>
                  <Plus size={14} className="mr-2" /> Create first group
                </Button>
              }
            />
          )
        ) : (
          <ListCard>{filteredGroups.map(renderGroupRow)}</ListCard>
        ))}

      {/* ── Progressive Add / Edit Beneficiary Sheet ── */}
      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent side="right" className="flex flex-col">
          {/* Header */}
          <SheetHeader>
            <SheetTitle>
              {form.id
                ? "Edit Beneficiary"
                : "Add Beneficiary"}
            </SheetTitle>
          </SheetHeader>

          {/* Sheet Body with Progressive Disclosure */}
          <SheetBody className="gap-4">
            {/* Step 1: Destination Rail (Dropdown) */}
            <Field label="Payment Rail">
              <Select
                value={form.transactionType}
                onValueChange={(val) => {
                  if (!val) return;
                  setForm((p) => ({ ...p, transactionType: val as TransactionType }));
                }}
              >
                <SelectTrigger className="shadow-xs">
                  <div className="flex items-center gap-2 truncate">
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
                  {[...PEOPLE_TYPES, ...BILLER_TYPES].map((t) => {
                    const meta = TYPE_CONFIG[t];
                    const Icon = meta.icon;
                    return (
                      <SelectItem key={t} value={t} className="text-[13px] py-2">
                        <div className="flex items-center gap-2">
                          <Icon size={15} strokeWidth={1.8} className="text-muted-foreground shrink-0" />
                          <span>{meta.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
</Field>

            {/* Step 2: Rail-Specific Provider / Destination / Network Dropdowns & Details */}
            {/* Mobile Wallet Rail */}
            {form.transactionType === "wallet" && (
              <div className="flex flex-col gap-2">
                <Field label="Network Provider">
                  <Select
                    value={form.network}
                    onValueChange={(val) => val && setForm((p) => ({ ...p, network: val }))}
                  >
                    <SelectTrigger className="shadow-xs">
                      <SelectValue placeholder="Select network" />
                    </SelectTrigger>
                    <SelectContent>
                      {WALLET_NETWORKS.map((w) => (
                        <SelectItem key={w} value={w}>
                          {w}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
</Field>

                <Field label="Wallet Phone Number">
                  <PhoneInput
                    value={form.phoneNumber}
                    onValueChange={(v) => setForm((p) => ({ ...p, phoneNumber: v }))}
                    aria-label="Wallet phone number"
                  />
</Field>
              </div>
            )}

            {/* Domestic Bank Rail (GCB / Other Banks) */}
            {form.transactionType === "bank" && (
              <div className="flex flex-col gap-2">
                <Field label="Destination Bank">
                  <Select
                    value={form.bankName}
                    onValueChange={(val) => val && setForm((p) => ({ ...p, bankName: val }))}
                  >
                    <SelectTrigger className="shadow-xs">
                      <SelectValue placeholder="Select destination bank" />
                    </SelectTrigger>
                    <SelectContent className="max-h-49">
                      {GHANA_BANKS.map((b) => (
                        <SelectItem key={b} value={b}>
                          {b}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
</Field>

                <Field label="Account Number">
                  <Input
                    type="text"
                    value={form.accountNumber}
                    onChange={(e) => setForm((p) => ({ ...p, accountNumber: e.target.value }))}
                    placeholder={form.bankName === "GCB Bank" ? "13-digit GCB Account" : "Recipient account number"}
                    className="tabular shadow-xs"
                  />
</Field>
              </div>
            )}

            {/* Bills & Utilities Rail */}
            {form.transactionType === "bill" && (
              <div className="flex flex-col gap-2">
                <Field label="Bill / Service Provider">
                  <Select
                    value={matchedBiller?.name || form.billerName}
                    onValueChange={(val) => {
                      if (!val) return;
                      setForm((p) => {
                        const prevBiller = BILLERS.find((b) => b.name === p.billerName);
                        const isDefaultName =
                          !p.name ||
                          (prevBiller &&
                            (p.name === prevBiller.name ||
                              p.name === `${prevBiller.name} Account`));
                        return {
                          ...p,
                          billerName: val,
                          name: isDefaultName ? `${val} Account` : p.name,
                        };
                      });
                    }}
                  >
                    <SelectTrigger >
                      <SelectValue placeholder="Select bill / utility provider" />
                    </SelectTrigger>
                    <SelectContent className="max-h-63">
                      {BILLER_CATEGORIES.map((cat, idx) => {
                        const catBillers = BILLERS.filter((b) => b.category === cat);
                        if (catBillers.length === 0) return null;
                        return (
                          <SelectGroup key={cat}>
                            <SelectLabel className="px-2 py-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                              {cat}
                            </SelectLabel>
                            {catBillers.map((b) => (
                              <SelectItem key={b.id} value={b.name} label={b.name} className="py-2 text-[13px]">
                                <div className="flex items-center justify-between w-full gap-2">
                                  <span className="font-medium text-foreground">{b.name}</span>
                                  <span className="text-[11.5px] text-muted-foreground/75 font-normal shrink-0">
                                    {b.reference}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                            {idx < BILLER_CATEGORIES.length - 1 && <SelectSeparator className="my-1" />}
                          </SelectGroup>
                        );
                      })}
                    </SelectContent>
                  </Select>
</Field>

                <Field label={billerRefLabel}>
                  <Input
                    type="text"
                    value={form.billerReference}
                    onChange={(e) => setForm((p) => ({ ...p, billerReference: e.target.value }))}
                    placeholder={billerRefPlaceholder}
                    className="tabular"
                  />
</Field>
              </div>
            )}

            {/* Airtime Rail */}
            {form.transactionType === "airtime" && (
              <div className="flex flex-col gap-2">
                <Field label="Network Provider">
                  <Select
                    value={form.network}
                    onValueChange={(val) => val && setForm((p) => ({ ...p, network: val }))}
                  >
                    <SelectTrigger >
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
</Field>

                <Field label="Phone Number">
                  <PhoneInput
                    value={form.phoneNumber}
                    onValueChange={(v) => setForm((p) => ({ ...p, phoneNumber: v }))}
                    aria-label="Phone number to top up"
                  />
</Field>
              </div>
            )}

            {/* Proxy Pay Rail */}
            {form.transactionType === "proxy" && (
              <Field label="Proxy Identifier">
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-[15px] font-semibold text-muted-foreground select-none pointer-events-none">
                    @
                  </span>
                  <Input
                    type="text"
                    value={form.proxyId.replace(/^@/, "")}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/^@/, "").trim();
                      setForm((p) => ({ ...p, proxyId: cleaned ? `@${cleaned}` : "" }));
                    }}
                    placeholder="kwame.b"
                    className="pl-6 pr-3"
                  />
                </div>
</Field>
            )}

            {/* SWIFT International Wire */}
            {form.transactionType === "swift" && (
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Country">
                    <Select
                      value={form.country}
                      onValueChange={(val) => {
                        if (!val) return;
                        const defaultBank = (INTERNATIONAL_BANKS_BY_COUNTRY[val] || [])[0] || "";
                        setForm((p) => ({ ...p, country: val, bankName: defaultBank }));
                      }}
                    >
                      <SelectTrigger >
                        <SelectValue placeholder="Country" />
                      </SelectTrigger>
                      <SelectContent className="max-h-49">
                        {SWIFT_COUNTRIES.map((c) => (
                          <SelectItem key={c.name} value={c.name}>
                            {c.name} ({c.currency})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
</Field>

                  <Field label="Bank">
                    <Select
                      value={form.bankName}
                      onValueChange={(val) => val && setForm((p) => ({ ...p, bankName: val }))}
                    >
                      <SelectTrigger >
                        <SelectValue placeholder="Select bank" />
                      </SelectTrigger>
                      <SelectContent className="max-h-49">
                        {(INTERNATIONAL_BANKS_BY_COUNTRY[form.country] || INTERNATIONAL_BANKS_BY_COUNTRY["United Kingdom"]).map((bank) => (
                          <SelectItem key={bank} value={bank}>
                            {bank}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
</Field>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Field label="SWIFT / BIC Code">
                    <Input
                      type="text"
                      value={form.swiftBic}
                      onChange={(e) => setForm((p) => ({ ...p, swiftBic: e.target.value.toUpperCase() }))}
                      placeholder="e.g. BARCGB22"
                      className="uppercase tracking-wider tabular"
                    />
</Field>

                  <Field label="IBAN / Account Number">
                    <Input
                      type="text"
                      value={form.accountNumber}
                      onChange={(e) => setForm((p) => ({ ...p, accountNumber: e.target.value }))}
                      placeholder="GB29 BARC 2020 1555"
                      className="tabular"
                    />
</Field>
                </div>

                <Field label="Recipient Physical Address">
                  <Input
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                    placeholder="Street, City, Postal Code"
                    
                  />
</Field>
              </div>
            )}

            {/* PAPSS Cross-Border Rail */}
            {form.transactionType === "papss" && (
              <div className="flex flex-col gap-2">
                <Field label="Destination Country">
                  <Select
                    value={form.country}
                    onValueChange={(val) => {
                      if (!val) return;
                      const defaultBank = (PAPSS_BANKS_BY_COUNTRY[val] || [])[0] || "";
                      setForm((p) => ({ ...p, country: val, bankName: defaultBank }));
                    }}
                  >
                    <SelectTrigger >
                      <SelectValue placeholder="Select African destination" />
                    </SelectTrigger>
                    <SelectContent className="max-h-49">
                      {PAPSS_COUNTRIES.map((c) => (
                        <SelectItem key={c.name} value={c.name}>
                          {c.name} ({c.currency})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
</Field>

                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={form.bankName}
                    onValueChange={(val) => val && setForm((p) => ({ ...p, bankName: val }))}
                  >
                    <SelectTrigger >
                      <SelectValue placeholder="Select bank" />
                    </SelectTrigger>
                    <SelectContent className="max-h-49">
                      {(PAPSS_BANKS_BY_COUNTRY[form.country] || PAPSS_BANKS_BY_COUNTRY["Nigeria"]).map((bank) => (
                        <SelectItem key={bank} value={bank}>
                          {bank}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="text"
                    value={form.accountNumber}
                    onChange={(e) => setForm((p) => ({ ...p, accountNumber: e.target.value }))}
                    placeholder="Account / IBAN"
                    className="tabular"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Beneficiary Legal Name / Biller Nickname */}
            <Field label={form.transactionType === "bill" || form.transactionType === "airtime" ? "Biller Name" : "Beneficiary Full Name"}>
              <Input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder={form.transactionType === "bill" || form.transactionType === "airtime" ? "e.g. ECG PowerApp" : "e.g. Kojo Mensah"}
                
              />
</Field>

            {/* Step 4: Optional Nickname / Reference */}
            <Field label="Nickname / Note" optional>
              <Input
                type="text"
                value={form.nickname}
                onChange={(e) => setForm((p) => ({ ...p, nickname: e.target.value }))}
                placeholder="e.g. Landlord"
              />
            </Field>
          </SheetBody>

          {/* Sheet Footer with Primary Lime Action */}
          <SheetFooter className="gap-2">
            <Button
              onClick={handleSaveBeneficiary}
              disabled={!form.name.trim()}
              className="h-10 w-full rounded-full bg-primary text-primary-foreground hover:bg-primary-hover font-medium transition-all cursor-pointer text-[14.5px] disabled:opacity-40 shadow-xs"
            >
              {form.id ? "Save Changes" : "Save Beneficiary"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setFormOpen(false)}
              className="h-9 w-full rounded-full text-foreground/80 hover:text-foreground text-[14px]"
            >
              Cancel
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Beneficiary Details Sheet matching user's design ── */}
      <BeneficiaryDetailSheet
        beneficiary={selectedBeneficiary}
        open={Boolean(selectedBeneficiary)}
        onOpenChange={(open) => {
          if (!open) setSelectedBeneficiary(null);
        }}
        onEdit={(b) => {
          openEdit(b);
        }}
        onRemove={(b) => setRemoveId(b.id)}
      />

      {/* ── Group summary: who is in it and what it pays; editing is one tap further ── */}
      <GroupDetailSheet
        group={selectedGroup}
        open={Boolean(selectedGroup)}
        onOpenChange={(open) => {
          if (!open) setSelectedGroup(null);
        }}
        onEdit={(g) => {
          setEditingGroup(g);
          setEditGroupModalOpen(true);
        }}
        onDelete={(g) => setRemoveGroupId(g.id)}
      />

      {/* ── Delete Confirmation Dialogs (Responsive Bottom Sheet on Mobile) ── */}
      <Dialog open={Boolean(removeId)} onOpenChange={(o) => !o && setRemoveId(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>
              Remove Beneficiary
            </DialogTitle>
          </DialogHeader>
          <div className="px-4 sm:px-5 py-4 text-[13.5px] text-muted-foreground">
            Are you sure you want to remove <span className="text-foreground">{toRemove?.name}</span>? This will not affect past transactions.
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRemoveId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemoveBeneficiary}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(removeGroupId)} onOpenChange={(o) => !o && setRemoveGroupId(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>
              Delete Payment Group
            </DialogTitle>
          </DialogHeader>
          <div className="px-4 sm:px-5 py-4 text-[13.5px] text-muted-foreground">
            Are you sure you want to delete <span className="text-foreground">{toRemoveGroup?.name}</span>? Group members will remain in your individual beneficiaries directory.
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRemoveGroupId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemoveGroup}>
              Delete Group
            </Button>
          </DialogFooter>
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
