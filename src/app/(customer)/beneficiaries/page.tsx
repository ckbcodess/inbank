"use client";

/**
 * Beneficiaries Standalone Directory.
 *
 * Minimal, clean design aligned with NIBS design tokens:
 * - Dropdown filters for Transaction Type and Grouping instead of bulky segmented controls.
 * - Single standard panel container (`rounded-2xl border border-border bg-card`).
 * - Transaction type level management (add, send, edit) directly in section headers and rows.
 * - Zero bold rule, semantic tokens only, tabular numbers.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Globe,
  Landmark,
  Pencil,
  Plus,
  Receipt,
  Send,
  Smartphone,
  Trash2,
  User,
  Users,
  Wallet,
} from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { ExpandableSearch } from "@/components/ui/expandable-search";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
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

type TypeFilter = "all" | TransactionType | "group";
type GroupByOption = "type" | "none" | "category";

interface TypeMeta {
  label: string;
  plural: string;
  rail: string;
  icon: React.ElementType;
}

const TYPE_CONFIG: Record<TransactionType | "group", TypeMeta> = {
  bank: { label: "Bank Transfer", plural: "Bank Transfers", rail: "bank", icon: Landmark },
  wallet: { label: "Mobile Wallet", plural: "Mobile Wallets", rail: "wallet", icon: Wallet },
  proxy: { label: "Proxy Pay", plural: "Proxy Pay", rail: "proxy", icon: User },
  bill: { label: "Bills & Utilities", plural: "Bills & Utilities", rail: "bill", icon: Receipt },
  airtime: { label: "Airtime & Data", plural: "Airtime & Data", rail: "airtime", icon: Smartphone },
  papss: { label: "PAPSS Cross-Border", plural: "PAPSS Cross-Border", rail: "papss", icon: Globe },
  swift: { label: "SWIFT International Wire", plural: "SWIFT Wire Transfers", rail: "swift", icon: Globe },
  group: { label: "Payment Group", plural: "Payment Groups", rail: "group", icon: Users },
};

const ORDERED_TYPES: (TransactionType | "group")[] = [
  "bank",
  "wallet",
  "proxy",
  "bill",
  "airtime",
  "papss",
  "swift",
  "group",
];

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

const PAPSS_COUNTRIES = [
  { name: "Nigeria", currency: "NGN" },
  { name: "Kenya", currency: "KES" },
  { name: "Côte d'Ivoire", currency: "XOF" },
  { name: "South Africa", currency: "ZAR" },
  { name: "Egypt", currency: "EGP" },
  { name: "Rwanda", currency: "RWF" },
];

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
  country: "Nigeria",
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

  // Dropdown filter states
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [groupBy, setGroupBy] = useState<GroupByOption>("type");
  const [query, setQuery] = useState("");

  // Modal states
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [removeId, setRemoveId] = useState<string | null>(null);

  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<PaymentGroup | null>(null);
  const [removeGroupId, setRemoveGroupId] = useState<string | null>(null);

  const [notice, setNotice] = useState<string | null>(null);

  function flash(msg: string) {
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 3500);
  }

  // Counts by Transaction Type
  const counts = useMemo(() => {
    return {
      all: beneficiaries.length + groups.length,
      bank: beneficiaries.filter((b) => b.transactionType === "bank").length,
      wallet: beneficiaries.filter((b) => b.transactionType === "wallet").length,
      proxy: beneficiaries.filter((b) => b.transactionType === "proxy").length,
      bill: beneficiaries.filter((b) => b.transactionType === "bill").length,
      airtime: beneficiaries.filter((b) => b.transactionType === "airtime").length,
      papss: beneficiaries.filter((b) => b.transactionType === "papss").length,
      group: groups.length,
    };
  }, [beneficiaries, groups]);

  const q = query.trim().toLowerCase();

  // Filtered beneficiaries
  const filteredBeneficiaries = useMemo(() => {
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
  }, [beneficiaries, typeFilter, q]);

  // Filtered groups
  const filteredGroups = useMemo(() => {
    if (typeFilter !== "all" && typeFilter !== "group") return [];
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
  }, [groups, typeFilter, q]);

  const totalFilteredCount = filteredBeneficiaries.length + filteredGroups.length;

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
      country: b.country || "Nigeria",
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
      case "papss":
        const curr = PAPSS_COUNTRIES.find((c) => c.name === form.country)?.currency || "USD";
        detail = `${form.bankName || "Foreign Bank"} · ${curr} · ${form.accountNumber || "Account"}`;
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
      flash(`Beneficiary updated.`);
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
      flash(verified ? "Beneficiary saved." : "Beneficiary submitted for approval.");
    }

    setFormOpen(false);
  }

  function handleRemoveBeneficiary() {
    if (!removeId) return;
    const item = beneficiaries.find((b) => b.id === removeId);
    removeBeneficiary(removeId);
    setRemoveId(null);
    flash(`Removed${item ? ` — ${item.name}` : ""}.`);
  }

  function handleRemoveGroup() {
    if (!removeGroupId) return;
    const g = groups.find((x) => x.id === removeGroupId);
    deleteGroup(removeGroupId);
    setRemoveGroupId(null);
    flash(`Removed group${g ? ` — ${g.name}` : ""}.`);
  }

  const toRemove = removeId ? beneficiaries.find((p) => p.id === removeId) : undefined;
  const toRemoveGroup = removeGroupId ? groups.find((g) => g.id === removeGroupId) : undefined;

  // Render a beneficiary list item
  function renderBeneficiaryRow(b: BeneficiaryRecord) {
    const config = TYPE_CONFIG[b.transactionType];
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
              <span className="truncate text-[14px] text-foreground">{b.name}</span>
              {b.verified ? (
                <CheckCircle2
                  size={13}
                  strokeWidth={2}
                  className="shrink-0 text-emerald-600 dark:text-emerald-400"
                  aria-label="Verified"
                />
              ) : (
                <Badge variant="warning">Pending</Badge>
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

        <div className="flex shrink-0 items-center gap-1">
          <SimpleTooltip content={`Send money to ${b.name}`}>
            <Button
              variant="ghost"
              size="icon-sm"
              nativeButton={false}
              render={<Link href={sendHref} />}
              aria-label={`Send to ${b.name}`}
            >
              <Send size={15} strokeWidth={1.8} />
            </Button>
          </SimpleTooltip>

          <SimpleTooltip content={`Edit ${b.name}`}>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => openEdit(b)}
              aria-label={`Edit ${b.name}`}
            >
              <Pencil size={15} strokeWidth={1.8} />
            </Button>
          </SimpleTooltip>

          <SimpleTooltip content={`Remove ${b.name}`}>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setRemoveId(b.id)}
              aria-label={`Remove ${b.name}`}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 size={15} strokeWidth={1.8} />
            </Button>
          </SimpleTooltip>
        </div>
      </li>
    );
  }

  // Render a group list item
  function renderGroupRow(g: PaymentGroup) {
    const totalAmt =
      g.splitType === "equal"
        ? g.members.length * g.defaultPerMemberAmount
        : g.members.reduce((sum, m) => sum + (m.defaultAmount || 0), 0);

    return (
      <li
        key={g.id}
        className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Users size={16} strokeWidth={1.8} />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="truncate text-[14px] text-foreground">{g.name}</span>
              <span className="rounded bg-muted px-1.5 py-0.2 text-[11px] text-muted-foreground tabular">
                {g.members.length} members
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-[12px] text-muted-foreground tabular flex-wrap">
              <span>
                {g.splitType === "equal" ? `GHS ${g.defaultPerMemberAmount} each` : "Custom split"} · Total GHS{" "}
                {totalAmt.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <SimpleTooltip content={`Send to ${g.name}`}>
            <Button
              variant="ghost"
              size="icon-sm"
              nativeButton={false}
              render={<Link href={`/payments/send?rail=group&group=${encodeURIComponent(g.name)}`} />}
              aria-label={`Send to ${g.name}`}
            >
              <Send size={15} strokeWidth={1.8} />
            </Button>
          </SimpleTooltip>

          <SimpleTooltip content={`Edit ${g.name}`}>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                setEditingGroup(g);
                setGroupModalOpen(true);
              }}
              aria-label={`Edit ${g.name}`}
            >
              <Pencil size={15} strokeWidth={1.8} />
            </Button>
          </SimpleTooltip>

          <SimpleTooltip content={`Delete ${g.name}`}>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setRemoveGroupId(g.id)}
              aria-label={`Delete ${g.name}`}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 size={15} strokeWidth={1.8} />
            </Button>
          </SimpleTooltip>
        </div>
      </li>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Beneficiaries"
        description="Manage your saved counterparties, bank accounts, mobile wallets, and payment groups."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setEditingGroup(null);
                setGroupModalOpen(true);
              }}
            >
              <Users size={14} className="mr-1.5" />
              New group
            </Button>
            <Button
              onClick={() => {
                setForm({
                  ...INITIAL_FORM,
                  transactionType: typeFilter !== "all" && typeFilter !== "group" ? typeFilter : "bank",
                });
                setFormOpen(true);
              }}
            >
              <Plus size={15} strokeWidth={1.9} aria-hidden="true" />
              Add beneficiary
            </Button>
          </div>
        }
      />

      {notice && (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/60 px-4 py-2.5 text-[13px] text-foreground">
          <CheckCircle2 size={15} strokeWidth={1.8} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{notice}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {/* Simple Toolbar with Dropdown Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Filter by Transaction Type */}
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
              <SelectTrigger className="w-[180px] h-9 text-[13px]" aria-label="Filter by transaction type">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectItem value="all">All Types ({counts.all})</SelectItem>
                <SelectItem value="bank">Bank Transfers ({counts.bank})</SelectItem>
                <SelectItem value="wallet">Mobile Wallets ({counts.wallet})</SelectItem>
                <SelectItem value="proxy">Proxy Pay ({counts.proxy})</SelectItem>
                <SelectItem value="bill">Bills & Utilities ({counts.bill})</SelectItem>
                <SelectItem value="airtime">Airtime & Data ({counts.airtime})</SelectItem>
                <SelectItem value="papss">PAPSS International ({counts.papss})</SelectItem>
                <SelectItem value="group">Payment Groups ({counts.group})</SelectItem>
              </SelectContent>
            </Select>

            {/* Group By Dropdown */}
            <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupByOption)}>
              <SelectTrigger className="w-[170px] h-9 text-[13px]" aria-label="Group list by">
                <SelectValue placeholder="Group by" />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectItem value="type">Group: Transaction Type</SelectItem>
                <SelectItem value="none">Group: Flat List</SelectItem>
                <SelectItem value="category">Group: Category</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ExpandableSearch
            value={query}
            onChange={setQuery}
            placeholder="Search by name, account, network..."
            tooltip="Search beneficiaries"
          />
        </div>

        {/* Content List */}
        {totalFilteredCount === 0 ? (
          query || typeFilter !== "all" ? (
            <FilteredEmptyState
              onReset={() => {
                setQuery("");
                setTypeFilter("all");
              }}
              description="No beneficiaries match your active search or type filter."
            />
          ) : (
            <TrueEmptyState
              title="No beneficiaries saved yet"
              description="Save frequent payees and billers to speed up your transfers."
              action={
                <Button
                  size="sm"
                  onClick={() => {
                    setForm(INITIAL_FORM);
                    setFormOpen(true);
                  }}
                >
                  <Plus size={14} className="mr-1.5" /> Add beneficiary
                </Button>
              }
            />
          )
        ) : groupBy === "type" && typeFilter === "all" ? (
          /* ── Grouped by Transaction Type ─────────────────────────────── */
          <div className="divide-y divide-border">
            {ORDERED_TYPES.map((typeKey) => {
              const isGroup = typeKey === "group";
              const items = isGroup
                ? []
                : filteredBeneficiaries.filter((b) => b.transactionType === typeKey);
              const grpItems = isGroup ? filteredGroups : [];
              const groupCount = isGroup ? grpItems.length : items.length;

              if (groupCount === 0) return null;

              const config = TYPE_CONFIG[typeKey];
              const Icon = config.icon;

              return (
                <div key={typeKey}>
                  {/* Quiet Group Level Header with Management Actions */}
                  <div className="flex items-center justify-between bg-muted/40 px-4 py-2 text-[12px] text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <Icon size={14} strokeWidth={1.8} className="text-muted-foreground" />
                      <span className="text-foreground">{config.plural}</span>
                      <span className="tabular text-[11px]">({groupCount})</span>
                    </span>

                    <div className="flex items-center gap-3">
                      {isGroup ? (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingGroup(null);
                            setGroupModalOpen(true);
                          }}
                          className="text-[12px] text-foreground hover:underline cursor-pointer"
                        >
                          + New group
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openAddForType(typeKey)}
                          className="text-[12px] text-foreground hover:underline cursor-pointer"
                        >
                          + Add {config.label.toLowerCase()}
                        </button>
                      )}
                      <Link
                        href={`/payments/send?rail=${config.rail}`}
                        className="text-[12px] text-muted-foreground hover:text-foreground"
                      >
                        Send →
                      </Link>
                    </div>
                  </div>

                  <ul className="divide-y divide-border">
                    {isGroup ? grpItems.map(renderGroupRow) : items.map(renderBeneficiaryRow)}
                  </ul>
                </div>
              );
            })}
          </div>
        ) : groupBy === "category" ? (
          /* ── Grouped by Category ────────────────────────────────────── */
          <div className="divide-y divide-border">
            {(["person", "biller", "number", "group"] as const).map((cat) => {
              const isGroup = cat === "group";
              const items = isGroup ? [] : filteredBeneficiaries.filter((b) => b.category === cat);
              const grpItems = isGroup ? filteredGroups : [];
              const groupCount = isGroup ? grpItems.length : items.length;

              if (groupCount === 0) return null;

              const catTitle =
                cat === "person" ? "People & Accounts" : cat === "biller" ? "Billers" : cat === "number" ? "Phone Numbers" : "Payment Groups";

              return (
                <div key={cat}>
                  <div className="flex items-center justify-between bg-muted/40 px-4 py-2 text-[12px] text-muted-foreground">
                    <span className="text-foreground">
                      {catTitle} <span className="tabular text-[11px] text-muted-foreground">({groupCount})</span>
                    </span>
                  </div>
                  <ul className="divide-y divide-border">
                    {isGroup ? grpItems.map(renderGroupRow) : items.map(renderBeneficiaryRow)}
                  </ul>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Flat List ──────────────────────────────────────────────── */
          <ul className="divide-y divide-border">
            {filteredBeneficiaries.map(renderBeneficiaryRow)}
            {filteredGroups.map(renderGroupRow)}
          </ul>
        )}
      </div>

      {/* ── Streamlined Add / Edit Beneficiary Dialog ─────────────────── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit Beneficiary" : "Add Beneficiary"}</DialogTitle>
            <DialogDescription>
              {isCorporate && !form.id
                ? "Corporate beneficiaries require checker approval before payment."
                : "Save recipient details for quick transfers."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3.5 py-1">
            {/* Transaction Type Dropdown */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ben-type">Transaction Type</Label>
              <Select
                value={form.transactionType}
                onValueChange={(val) => val && setForm((p) => ({ ...p, transactionType: val as TransactionType }))}
              >
                <SelectTrigger id="ben-type" className="h-9 w-full text-[13px]">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {ORDERED_TYPES.filter((t) => t !== "group").map((t) => (
                    <SelectItem key={t} value={t}>
                      {TYPE_CONFIG[t].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Recipient Name */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ben-name">Name</Label>
              <Input
                id="ben-name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Kwame Boateng"
                className="h-9 text-[13px]"
                autoFocus
              />
            </div>

            {/* Dynamic Inputs based on Transaction Type */}
            {form.transactionType === "bank" && (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ben-bank">Bank Name</Label>
                  <Select
                    value={form.bankName}
                    onValueChange={(val) => val && setForm((p) => ({ ...p, bankName: val }))}
                  >
                    <SelectTrigger id="ben-bank" className="h-9 w-full text-[13px]">
                      <SelectValue placeholder="Select bank" />
                    </SelectTrigger>
                    <SelectContent>
                      {GHANA_BANKS.map((b) => (
                        <SelectItem key={b} value={b}>
                          {b}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ben-acct">Account Number</Label>
                  <Input
                    id="ben-acct"
                    value={form.accountNumber}
                    onChange={(e) => setForm((p) => ({ ...p, accountNumber: e.target.value }))}
                    placeholder="e.g. 0231 4455 8890"
                    className="h-9 text-[13px]"
                  />
                </div>
              </>
            )}

            {form.transactionType === "wallet" && (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ben-network">Wallet Provider</Label>
                  <Select
                    value={form.network}
                    onValueChange={(val) => val && setForm((p) => ({ ...p, network: val }))}
                  >
                    <SelectTrigger id="ben-network" className="h-9 w-full text-[13px]">
                      <SelectValue placeholder="Select provider" />
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
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ben-phone">Mobile Number</Label>
                  <Input
                    id="ben-phone"
                    value={form.phoneNumber}
                    onChange={(e) => {
                      const ph = e.target.value;
                      const detected = detectNetworkFromPhone(ph);
                      setForm((p) => ({ ...p, phoneNumber: ph, network: detected }));
                    }}
                    placeholder="e.g. 0244 123 456"
                    className="h-9 text-[13px]"
                  />
                </div>
              </>
            )}

            {form.transactionType === "proxy" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ben-proxy">Proxy ID or Handle</Label>
                <Input
                  id="ben-proxy"
                  value={form.proxyId}
                  onChange={(e) => setForm((p) => ({ ...p, proxyId: e.target.value }))}
                  placeholder="e.g. @kwame.b or GHA-71829304-1"
                  className="h-9 text-[13px]"
                />
              </div>
            )}

            {form.transactionType === "bill" && (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ben-biller">Biller Provider</Label>
                  <Input
                    id="ben-biller"
                    value={form.billerName}
                    onChange={(e) => setForm((p) => ({ ...p, billerName: e.target.value }))}
                    placeholder="e.g. ECG Prepaid, Ghana Water"
                    className="h-9 text-[13px]"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ben-ref">Meter / Account Reference</Label>
                  <Input
                    id="ben-ref"
                    value={form.billerReference}
                    onChange={(e) => setForm((p) => ({ ...p, billerReference: e.target.value }))}
                    placeholder="e.g. P-8839210"
                    className="h-9 text-[13px]"
                  />
                </div>
              </>
            )}

            {form.transactionType === "airtime" && (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ben-airnet">Network</Label>
                  <Select
                    value={form.network}
                    onValueChange={(val) => val && setForm((p) => ({ ...p, network: val }))}
                  >
                    <SelectTrigger id="ben-airnet" className="h-9 w-full text-[13px]">
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
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ben-airphone">Phone Number</Label>
                  <Input
                    id="ben-airphone"
                    value={form.phoneNumber}
                    onChange={(e) => setForm((p) => ({ ...p, phoneNumber: e.target.value }))}
                    placeholder="e.g. 0244 123 821"
                    className="h-9 text-[13px]"
                  />
                </div>
              </>
            )}

            {form.transactionType === "papss" && (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ben-country">Country</Label>
                  <Select
                    value={form.country}
                    onValueChange={(val) => val && setForm((p) => ({ ...p, country: val }))}
                  >
                    <SelectTrigger id="ben-country" className="h-9 w-full text-[13px]">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAPSS_COUNTRIES.map((c) => (
                        <SelectItem key={c.name} value={c.name}>
                          {c.name} ({c.currency})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ben-papssacct">Account / IBAN</Label>
                  <Input
                    id="ben-papssacct"
                    value={form.accountNumber}
                    onChange={(e) => setForm((p) => ({ ...p, accountNumber: e.target.value }))}
                    placeholder="e.g. NG-8891-40023-77"
                    className="h-9 text-[13px]"
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveBeneficiary} disabled={!form.name.trim()}>
              {form.id ? "Save changes" : "Save beneficiary"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shared Create / Edit Group Modal */}
      <CreateGroupModal
        open={groupModalOpen}
        onOpenChange={setGroupModalOpen}
        groupToEdit={editingGroup}
        onSuccess={(grp) => {
          flash(editingGroup ? `Group "${grp.name}" updated.` : `Group "${grp.name}" created.`);
        }}
      />

      {/* Remove Payee Confirmation Dialog */}
      <Dialog open={Boolean(removeId)} onOpenChange={(open) => !open && setRemoveId(null)}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Remove beneficiary?</DialogTitle>
            <DialogDescription>
              {toRemove ? `"${toRemove.name}"` : "This beneficiary"} will be removed from your saved list.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemoveBeneficiary}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Group Confirmation Dialog */}
      <Dialog open={Boolean(removeGroupId)} onOpenChange={(open) => !open && setRemoveGroupId(null)}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Delete payment group?</DialogTitle>
            <DialogDescription>
              {toRemoveGroup ? `"${toRemoveGroup.name}"` : "This group"} will be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveGroupId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemoveGroup}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
