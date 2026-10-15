"use client";

/**
 * The lists behind the Beneficiaries pages: one for saved people and billers (`BeneficiaryListView`), one for
 * payment groups (`GroupListView`). Both are a search box and a plain list; the pages around them (the hub and
 * the choosers) decide which kinds a list holds. Rows are a name, what it is, when it was last paid, a pin,
 * Pay, and a menu for Edit and Remove.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Globe, MoreHorizontal, Pencil, Plus, Search, Star, Trash2, X } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { BeneficiaryForm, KIND } from "@/components/beneficiaries/BeneficiaryForm";
import { agoLabel } from "@/components/payments/flows/beneficiaries";
import EditGroupModal from "@/components/payments/EditGroupModal";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";
import { FilteredEmptyState, ListSkeleton, TrueEmptyState } from "@/components/states/ListStates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useBeneficiariesStore, type BeneficiaryRecord, type TransactionType } from "@/lib/beneficiaries-store";
import { useGroupsStore, type PaymentGroup } from "@/lib/groups-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const PEOPLE_KINDS: TransactionType[] = ["bank", "wallet", "proxy", "swift", "papss"];
export const BILLER_KINDS: TransactionType[] = ["bill"];
export const ALL_KINDS: TransactionType[] = [...PEOPLE_KINDS, ...BILLER_KINDS];

/**
 * The groups a customer narrows by. They are the kinds, except that SWIFT and PAPSS are one "International Bank"
 * group: the customer picks a country, and the country decides which of the two it is.
 */
export interface KindGroup {
  id: string;
  label: string;
  plural: string;
  description: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  types: TransactionType[];
}
export const KIND_GROUPS: Record<string, KindGroup> = {
  bank: { id: "bank", ...pick("bank"), types: ["bank"] },
  wallet: { id: "wallet", ...pick("wallet"), types: ["wallet"] },
  proxy: { id: "proxy", ...pick("proxy"), types: ["proxy"] },
  international: { id: "international", ...pick("swift"), icon: Globe, types: ["swift", "papss"] },
  bill: { id: "bill", ...pick("bill"), types: ["bill"] },
};
export const PEOPLE_GROUPS = ["bank", "wallet", "proxy", "international"];
export const BILLER_GROUPS = ["bill"];

function pick(t: TransactionType) {
  const { label, plural, description, icon } = KIND[t];
  return { label, plural, description, icon };
}

/** More than this many at one level and the page offers a chooser instead of one long list. */
export const CHOOSER_THRESHOLD = 8;
/** A list this long also gets a row of chips for its next detail (bank, network, category, country). */
const FACET_THRESHOLD = 10;

export function initials(name: string) {
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

/** The Send & Pay link that opens the right rail with this person filled in. */
export function payHref(b: BeneficiaryRecord, rail?: string): string {
  let href = `/payments/send?rail=${rail ?? KIND[b.transactionType].rail}&recipient=${encodeURIComponent(b.name)}`;
  if (b.accountNumber) href += `&account=${encodeURIComponent(b.accountNumber)}`;
  else if (b.phoneNumber) href += `&account=${encodeURIComponent(b.phoneNumber)}`;
  else if (b.proxyId) href += `&proxy=${encodeURIComponent(b.proxyId)}`;
  else if (b.billerReference) href += `&ref=${encodeURIComponent(b.billerReference)}`;
  return href;
}

/** The next thing to narrow a long list of one kind by. */
function facetOf(b: BeneficiaryRecord): string | undefined {
  switch (b.transactionType) {
    case "bank":
      return b.bankName;
    case "wallet":
    case "airtime":
      return b.network;
    case "bill":
      return b.billerCategory;
    case "swift":
    case "papss":
      return b.country;
    default:
      return undefined;
  }
}

function RowMenu({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={label}
        className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring"
      >
        <MoreHorizontal size={17} strokeWidth={1.8} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Views already opened this visit. The first time one opens it shows a skeleton while it loads; after that it is instant. */
const seenViews = new Set<string>();

function useFirstViewLoading(key: string): boolean {
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (seenViews.size === 0) {
      // The first view of the visit arrives behind the route's own skeleton
      seenViews.add(key);
      return;
    }
    if (seenViews.has(key)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = window.setTimeout(() => {
      seenViews.add(key);
      setLoading(false);
    }, 450);
    return () => window.clearTimeout(t);
  }, [key]);
  return loading;
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-11 pr-10"
        aria-label="Search"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}

function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="-mt-2 flex flex-wrap items-center gap-2">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          aria-pressed={value === o.id}
          className={cn(
            "cursor-pointer rounded-full border px-3.5 py-1.5 text-[13px] transition-colors",
            value === o.id
              ? "border-[var(--active-border)] bg-[var(--active-bg)] text-foreground"
              : "border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function BeneficiaryRow({
  b,
  onEdit,
  onRemove,
}: {
  b: BeneficiaryRecord;
  onEdit: (b: BeneficiaryRecord) => void;
  onRemove: (b: BeneficiaryRecord) => void;
}) {
  const { formatMoney } = useAmountVisibility();
  const togglePinned = useBeneficiariesStore((s) => s.togglePinned);
  const Icon = KIND[b.transactionType].icon;
  return (
    <li className="flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-muted/50 sm:px-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-[13px] text-foreground">
        {b.transactionType === "bank" || b.transactionType === "wallet" ? (
          initials(b.name)
        ) : (
          <Icon size={17} strokeWidth={1.8} className="text-muted-foreground" />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[14px] text-foreground">{b.name}</span>
          {b.verified ? (
            <CheckCircle2 size={13} strokeWidth={2} className="shrink-0 text-success-text" aria-label="Verified" />
          ) : (
            <Badge variant="warning" className="px-1.5 py-0 text-[11px]">
              Pending approval
            </Badge>
          )}
        </div>
        <p className="truncate text-[12px] text-muted-foreground tabular">{b.detail}</p>
        {b.lastPaidAt && (
          <p className="truncate text-[12px] text-muted-foreground">
            Last paid{b.lastAmount ? ` ${formatMoney(b.lastAmount)}` : ""} · {agoLabel(b.lastPaidAt)}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => togglePinned(b.id)}
        aria-pressed={!!b.pinned}
        aria-label={b.pinned ? `Unpin ${b.name}` : `Pin ${b.name}`}
        title={b.pinned ? "Unpin" : "Pin to the top"}
        className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
      >
        <Star size={16} strokeWidth={1.7} className={b.pinned ? "fill-current text-foreground" : ""} />
      </button>
      <Button nativeButton={false} variant="outline" size="sm" render={<Link href={payHref(b)} />} className="hidden sm:inline-flex">
        Pay
      </Button>
      <RowMenu label={`More for ${b.name}`}>
        <DropdownMenuItem className="gap-2.5 text-[13px] sm:hidden" render={<Link href={payHref(b)} />}>
          Pay
        </DropdownMenuItem>
        {b.transactionType === "wallet" && (
          <>
            <DropdownMenuItem className="gap-2.5 text-[13px]" render={<Link href={payHref(b, "airtime")} />}>
              Buy Airtime
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2.5 text-[13px]" render={<Link href={payHref(b, "data")} />}>
              Buy Data
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuItem className="gap-2.5 text-[13px]" onClick={() => onEdit(b)}>
          <Pencil size={16} strokeWidth={1.8} className="shrink-0 text-muted-foreground" aria-hidden="true" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2.5 text-[13px]" onClick={() => onRemove(b)}>
          <Trash2 size={16} strokeWidth={1.8} className="shrink-0 text-muted-foreground" aria-hidden="true" />
          Remove
        </DropdownMenuItem>
      </RowMenu>
    </li>
  );
}

function GroupRow({
  g,
  onEdit,
  onDelete,
}: {
  g: PaymentGroup;
  onEdit: (g: PaymentGroup) => void;
  onDelete: (g: PaymentGroup) => void;
}) {
  const { formatMoney } = useAmountVisibility();
  const total =
    g.splitType === "equal"
      ? g.members.length * g.defaultPerMemberAmount
      : g.members.reduce((sum, m) => sum + (m.defaultAmount || 0), 0);
  const href = `/payments/send?rail=group&group=${encodeURIComponent(g.name)}`;
  return (
    <li
      className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-muted/50 sm:px-4"
      onClick={() => onEdit(g)}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[13px] text-foreground">
        {initials(g.name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] text-foreground">{g.name}</p>
        <p className="truncate text-[12px] text-muted-foreground tabular">
          {g.members.length} {g.members.length === 1 ? "member" : "members"} ·{" "}
          {g.splitType === "equal" ? `${formatMoney(g.defaultPerMemberAmount)} each` : "Custom split"} · {formatMoney(total)} in all
        </p>
      </div>
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <Button nativeButton={false} variant="outline" size="sm" render={<Link href={href} />} className="hidden sm:inline-flex">
          Pay
        </Button>
        <RowMenu label={`More for ${g.name}`}>
          <DropdownMenuItem className="gap-2.5 text-[13px] sm:hidden" render={<Link href={href} />}>
            Pay
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2.5 text-[13px]" onClick={() => onEdit(g)}>
            <Pencil size={16} strokeWidth={1.8} className="shrink-0 text-muted-foreground" aria-hidden="true" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2.5 text-[13px]" onClick={() => onDelete(g)}>
            <Trash2 size={16} strokeWidth={1.8} className="shrink-0 text-muted-foreground" aria-hidden="true" />
            Delete
          </DropdownMenuItem>
        </RowMenu>
      </div>
    </li>
  );
}

/** A list of saved people or billers: search, optional chips, rows, and the add / edit / remove dialogs. */
export function BeneficiaryListView({
  title,
  backTo,
  kinds,
  addLabel,
  viewKey,
  emptyTitle,
  emptyDescription,
  embedded = false,
  externalQuery,
  pinnedOnly = false,
}: {
  /** Only the pinned ones (the hub's "See all" under Pinned). */
  pinnedOnly?: boolean;
  /** Inside the hub's search results: no header or search box of its own; the hub supplies the query. */
  embedded?: boolean;
  externalQuery?: string;
  title: string;
  backTo?: { href: string; label: string };
  /** Which kinds this list holds. One kind adds a chip row for its next detail once the list is long. */
  kinds: TransactionType[];
  addLabel: string;
  viewKey: string;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const beneficiaries = useBeneficiariesStore((s) => s.beneficiaries);
  const removeBeneficiary = useBeneficiariesStore((s) => s.removeBeneficiary);
  const viewLoading = useFirstViewLoading(viewKey);
  // Search results inside the hub appear as you type, with no skeleton
  const loading = embedded ? false : viewLoading;

  const [innerQuery, setQuery] = useState("");
  const query = externalQuery ?? innerQuery;
  const [facet, setFacet] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BeneficiaryRecord | null>(null);
  const [removing, setRemoving] = useState<BeneficiaryRecord | null>(null);

  // "Add someone" links from elsewhere (?add=1)
  const addedFromLink = useRef(false);
  useEffect(() => {
    if (addedFromLink.current || embedded) return;
    if (new URLSearchParams(window.location.search).get("add") !== "1") return;
    addedFromLink.current = true;
    setFormOpen(true);
  }, [embedded]);

  const mine = useMemo(
    () => beneficiaries.filter((b) => kinds.includes(b.transactionType) && (!pinnedOnly || b.pinned)),
    [beneficiaries, kinds, pinnedOnly],
  );
  const single = kinds.length === 1 ? kinds[0] : null;

  const facets = useMemo(() => {
    if (!single || mine.length < FACET_THRESHOLD) return [];
    const values = Array.from(new Set(mine.map(facetOf).filter((v): v is string => Boolean(v)))).sort();
    return values.length > 1 ? values : [];
  }, [single, mine]);

  const q = query.trim().toLowerCase();
  const rows = useMemo(
    () =>
      mine
        .filter((b) => facet === "all" || facetOf(b) === facet)
        .filter(
          (b) =>
            !q ||
            [b.name, b.detail, b.label, b.bankName, b.accountNumber, b.network, b.phoneNumber, b.proxyId, b.billerName, b.billerReference, b.country].some(
              (v) => v && v.toLowerCase().includes(q),
            ),
        )
        .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || a.name.localeCompare(b.name)),
    [mine, facet, q],
  );

  const pinnedCount = rows.filter((b) => b.pinned).length;
  const showHeadings = !pinnedOnly && !q && pinnedCount > 0 && pinnedCount < rows.length;

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      {!embedded && (
        <PageHeader
          title={title}
          backTo={backTo}
          actions={
            <Button onClick={openAdd} className="shrink-0">
              <Plus size={15} strokeWidth={2} />
              {addLabel}
            </Button>
          }
        />
      )}

      {!embedded && mine.length > 0 && (
        <SearchBox value={query} onChange={setQuery} placeholder="Search by name, bank, number or nickname" />
      )}

      {!embedded && facets.length > 0 && (
        <Chips
          value={facet}
          onChange={setFacet}
          options={[{ id: "all", label: "All" }, ...facets.map((f) => ({ id: f, label: f }))]}
        />
      )}

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-2">
          <ListSkeleton rows={Math.min(Math.max(rows.length, 3), 6)} />
        </div>
      ) : rows.length === 0 ? (
        q || facet !== "all" ? (
          <FilteredEmptyState
            onReset={() => {
              setQuery("");
              setFacet("all");
            }}
            description="No one matches that. Try a different name or number."
          />
        ) : (
          <TrueEmptyState
            illustration="empty-people"
            title={emptyTitle}
            description={emptyDescription}
            action={
              pinnedOnly ? undefined : (
                <Button onClick={openAdd}>
                  <Plus size={14} />
                  {addLabel}
                </Button>
              )
            }
          />
        )
      ) : (
        <ul className="flex flex-col gap-0.5 rounded-2xl border border-border bg-card p-2">
          {showHeadings && <li className="px-3 pb-1 pt-2 text-[12px] text-muted-foreground sm:px-4">Pinned</li>}
          {rows.map((b, i) => (
            <div key={b.id} className="contents">
              {showHeadings && i === pinnedCount && (
                <li className="px-3 pb-1 pt-3 text-[12px] text-muted-foreground sm:px-4">Everyone else</li>
              )}
              <BeneficiaryRow
                b={b}
                onEdit={(x) => {
                  setEditing(x);
                  setFormOpen(true);
                }}
                onRemove={setRemoving}
              />
            </div>
          ))}
        </ul>
      )}

      <BeneficiaryForm open={formOpen} onOpenChange={setFormOpen} kinds={kinds} editing={editing} />

      <Modal
        open={Boolean(removing)}
        onOpenChange={(o) => !o && setRemoving(null)}
        size="sm"
        title="Remove this beneficiary?"
        footer={
          <>
            <Button variant="outline" onClick={() => setRemoving(null)}>
              Keep
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!removing) return;
                removeBeneficiary(removing.id);
                toast.success(`${removing.name} removed.`);
                setRemoving(null);
              }}
            >
              Remove
            </Button>
          </>
        }
      >
        <p className="py-2 text-[14px] leading-relaxed text-foreground">
          {removing?.name} will no longer appear when you send money. Past payments are not affected, and you can add them again any time.
        </p>
      </Modal>
    </div>
  );
}

/** The payment groups: search, rows, and the edit / delete dialogs. */
export function GroupListView({ backTo }: { backTo?: { href: string; label: string } }) {
  const { groups, deleteGroup } = useGroupsStore();
  const loading = useFirstViewLoading("groups");
  const [query, setQuery] = useState("");
  const [editingGroup, setEditingGroup] = useState<PaymentGroup | null>(null);
  const [removingGroup, setRemovingGroup] = useState<PaymentGroup | null>(null);

  // ?edit=<group id> opens that group
  const openedFromLink = useRef(false);
  useEffect(() => {
    if (openedFromLink.current) return;
    const id = new URLSearchParams(window.location.search).get("edit");
    const g = id ? groups.find((x) => x.id === id) : undefined;
    if (g) {
      openedFromLink.current = true;
      setEditingGroup(g);
    }
  }, [groups]);

  const q = query.trim().toLowerCase();
  const rows = useMemo(
    () =>
      groups
        .filter(
          (g) =>
            !q ||
            g.name.toLowerCase().includes(q) ||
            (g.description ?? "").toLowerCase().includes(q) ||
            g.members.some((m) => m.name.toLowerCase().includes(q)),
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    [groups, q],
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <PageHeader
        title="Groups"
        backTo={backTo}
        actions={
          <Button nativeButton={false} render={<Link href="/beneficiaries/groups/new" />} className="shrink-0">
            <Plus size={15} strokeWidth={2} />
            Add Group
          </Button>
        }
      />

      {groups.length > 0 && <SearchBox value={query} onChange={setQuery} placeholder="Search groups or members" />}

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-2">
          <ListSkeleton rows={Math.min(Math.max(rows.length, 3), 6)} />
        </div>
      ) : rows.length === 0 ? (
        q ? (
          <FilteredEmptyState onReset={() => setQuery("")} description="No groups match your search." />
        ) : (
          <TrueEmptyState
            illustration="empty-groups"
            title="No groups yet"
            description="Pay several people at once, or run a Susu."
            action={
              <Button nativeButton={false} render={<Link href="/beneficiaries/groups/new" />}>
                <Plus size={14} />
                Create Group
              </Button>
            }
          />
        )
      ) : (
        <ul className="flex flex-col gap-0.5 rounded-2xl border border-border bg-card p-2">
          {rows.map((g) => (
            <GroupRow key={g.id} g={g} onEdit={setEditingGroup} onDelete={setRemovingGroup} />
          ))}
        </ul>
      )}

      <Modal
        open={Boolean(removingGroup)}
        onOpenChange={(o) => !o && setRemovingGroup(null)}
        size="sm"
        title="Delete this group?"
        footer={
          <>
            <Button variant="outline" onClick={() => setRemovingGroup(null)}>
              Keep
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!removingGroup) return;
                deleteGroup(removingGroup.id);
                toast.success(`${removingGroup.name} deleted.`);
                setRemovingGroup(null);
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="py-2 text-[14px] leading-relaxed text-foreground">
          The group {removingGroup?.name} will be deleted. Its members stay saved as individual beneficiaries.
        </p>
      </Modal>

      <EditGroupModal
        open={Boolean(editingGroup)}
        onOpenChange={(o) => !o && setEditingGroup(null)}
        group={editingGroup}
        onSuccess={() => {}}
        onDeleted={() => setEditingGroup(null)}
      />
    </div>
  );
}
