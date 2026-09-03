"use client";

/**
 * Beneficiaries standalone directory — primary Level-1 / Level-2 navigation destination.
 *
 * Scales past the flat favorites list by pairing persistent SEARCH with
 * SEGMENTED tabs (People / Billers / Numbers / Groups).
 * Full parity for both individual payees and multi-recipient payment groups.
 */

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Pencil,
  Plus,
  Receipt,
  Send,
  Smartphone,
  Trash2,
  User,
  Users,
} from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { ExpandableSearch } from "@/components/ui/expandable-search";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BENEFICIARIES, BILLERS } from "@/lib/mock-data";
import { useSession } from "@/lib/session-store";
import { useGroupsStore, type PaymentGroup } from "@/lib/groups-store";
import CreateGroupModal from "@/components/payments/CreateGroupModal";

type PayeeType = "person" | "biller" | "number";
type SegmentType = PayeeType | "group";
type Payee = { id: string; name: string; type: PayeeType; detail: string; verified: boolean };

const TYPE_META: Record<PayeeType, { label: string; icon: React.ElementType; detailLabel: string; detailHint: string }> = {
  person: { label: "Person", icon: User, detailLabel: "Bank & account, or wallet", detailHint: "e.g. Standard Bank · 0231 4455 8890" },
  biller: { label: "Biller", icon: Receipt, detailLabel: "Biller reference", detailHint: "e.g. Prepaid meter · P-8839210" },
  number: { label: "Number", icon: Smartphone, detailLabel: "Network & number", detailHint: "e.g. MTN · 0244 123 456" },
};

const initials = (name: string) =>
  name.replace(/[^a-zA-Z ]/g, "").split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "#";

/** Seed the directory from real beneficiaries/billers plus representative wallets & numbers. */
function seedPayees(): Payee[] {
  const people: Payee[] = BENEFICIARIES.map((b) => ({
    id: `p-${b.id}`,
    name: b.name,
    type: "person",
    detail: `${b.bank} · ${b.accountNumber}`,
    verified: true,
  }));
  const wallets: Payee[] = [
    { id: "p-ama", name: "Ama Serwaa Mensah", type: "person", detail: "MTN Mobile Money · 0244 123 456", verified: true },
    { id: "p-kwame", name: "Kwame Boateng", type: "person", detail: "Telecel Cash · 0201 987 654", verified: true },
    { id: "p-yaa", name: "Yaa Asantewaa", type: "person", detail: "MTN Mobile Money · 0559 220 118", verified: true },
    { id: "p-efua", name: "Efua Mensah", type: "person", detail: "AT Money · 0271 445 900", verified: true },
    { id: "p-kofi", name: "Kofi Osei", type: "person", detail: "GCB Bank · 1023 4455 66", verified: true },
  ];
  const billers: Payee[] = BILLERS.map((b) => ({
    id: `b-${b.id}`,
    name: b.name,
    type: "biller",
    detail: `${b.category} · needs ${b.reference}`,
    verified: true,
  }));
  const numbers: Payee[] = [
    { id: "n-1", name: "0244 123 456", type: "number", detail: "MTN · airtime & data", verified: true },
    { id: "n-2", name: "0271 556 220", type: "number", detail: "AT · field team line", verified: true },
    { id: "n-3", name: "0201 448 900", type: "number", detail: "Telecel · site office", verified: true },
  ];
  return [...people, ...wallets, ...billers, ...numbers];
}

const SEGMENTS: { key: SegmentType; label: string }[] = [
  { key: "person", label: "People" },
  { key: "biller", label: "Billers" },
  { key: "number", label: "Numbers" },
  { key: "group", label: "Groups" },
];

type FormState = { id?: string; name: string; type: PayeeType; detail: string };

export default function BeneficiariesPage() {
  const activeProfile = useSession((s) => s.activeProfile);
  const isCorporate = activeProfile?.kind === "CORPORATE";

  const { groups, deleteGroup } = useGroupsStore();

  const [payees, setPayees] = useState<Payee[]>(seedPayees);
  const [segment, setSegment] = useState<SegmentType>("person");
  const [query, setQuery] = useState("");

  // Payee Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>({ name: "", type: "person", detail: "" });
  const [removeId, setRemoveId] = useState<string | null>(null);

  // Group Modal state
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<PaymentGroup | null>(null);
  const [removeGroupId, setRemoveGroupId] = useState<string | null>(null);

  const [notice, setNotice] = useState<string | null>(null);
  const [, force] = useReducer((x: number) => x + 1, 0);

  function flash(msg: string) {
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 4000);
  }

  const counts = useMemo(
    () => ({
      person: payees.filter((p) => p.type === "person").length,
      biller: payees.filter((p) => p.type === "biller").length,
      number: payees.filter((p) => p.type === "number").length,
      group: groups.length,
    }),
    [payees, groups],
  );

  const q = query.trim().toLowerCase();

  const filteredPayees = useMemo(() => {
    return payees
      .filter((p) => p.type === segment)
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.detail.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [payees, segment, q]);

  const filteredGroups = useMemo(() => {
    return groups
      .filter(
        (g) =>
          !q ||
          g.name.toLowerCase().includes(q) ||
          (g.description && g.description.toLowerCase().includes(q)) ||
          g.members.some((m) => m.name.toLowerCase().includes(q))
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [groups, q]);

  const editing = Boolean(form.id);
  const canSave = form.name.trim() !== "" && form.detail.trim() !== "";

  function openNew() {
    setForm({ name: "", type: segment === "group" ? "person" : segment, detail: "" });
    setFormOpen(true);
  }
  function openEdit(p: Payee) {
    setForm({ id: p.id, name: p.name, type: p.type, detail: p.detail });
    setFormOpen(true);
  }
  function handleSave() {
    if (!canSave) return;
    if (form.id) {
      setPayees((list) => list.map((p) => (p.id === form.id ? { ...p, name: form.name.trim(), type: form.type, detail: form.detail.trim() } : p)));
      flash("Beneficiary updated.");
    } else {
      const verified = !isCorporate;
      const created: Payee = { id: `new-${Date.now()}`, name: form.name.trim(), type: form.type, detail: form.detail.trim(), verified };
      setPayees((list) => [created, ...list]);
      flash(verified ? "Beneficiary added." : "Beneficiary submitted for approval — it'll be usable once an approver clears it.");
    }
    setFormOpen(false);
  }
  function handleRemove() {
    if (!removeId) return;
    const p = payees.find((x) => x.id === removeId);
    setPayees((list) => list.filter((x) => x.id !== removeId));
    setRemoveId(null);
    flash(`Removed${p ? ` — ${p.name}` : ""}.`);
    force();
  }

  function handleRemoveGroup() {
    if (!removeGroupId) return;
    const g = groups.find((x) => x.id === removeGroupId);
    deleteGroup(removeGroupId);
    setRemoveGroupId(null);
    flash(`Removed group${g ? ` — ${g.name}` : ""}.`);
  }

  const toRemove = removeId ? payees.find((p) => p.id === removeId) : undefined;
  const toRemoveGroup = removeGroupId ? groups.find((g) => g.id === removeGroupId) : undefined;
  const formMeta = TYPE_META[form.type];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Beneficiaries"
        description="Manage your saved contacts, bank accounts, mobile wallets, billers, and payment groups in one place."
        actions={
          <div className="flex items-center gap-2">
            {segment === "group" ? (
              <Button
                onClick={() => {
                  setEditingGroup(null);
                  setGroupModalOpen(true);
                }}
              >
                <Plus size={15} strokeWidth={1.9} aria-hidden="true" />
                Create group
              </Button>
            ) : (
              <>
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
                <Button onClick={openNew}>
                  <Plus size={15} strokeWidth={1.9} aria-hidden="true" />
                  Add beneficiary
                </Button>
              </>
            )}
          </div>
        }
      />

      {notice && (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/60 px-4 py-3 text-[13px] text-foreground">
          <CheckCircle2 size={16} strokeWidth={1.8} className="shrink-0 text-emerald-500" aria-hidden="true" />
          <span className="flex-1">{notice}</span>
        </div>
      )}

      {/* segments bar with inline expandable search */}
      <div className="flex items-center justify-between gap-3">
        {/* segments */}
        <div className="inline-flex w-fit flex-wrap rounded-xl bg-muted p-1">
          {SEGMENTS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setSegment(key)}
              aria-pressed={segment === key}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] transition-all cursor-pointer ${
                segment === key ? "bg-background text-foreground shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
              <span className="tabular text-[11px] text-muted-foreground">{counts[key]}</span>
            </button>
          ))}
        </div>

        {/* inline expandable search */}
        <ExpandableSearch
          value={query}
          onChange={setQuery}
          placeholder={`Search ${segment === "person" ? "people" : segment === "biller" ? "billers" : segment === "number" ? "numbers" : "groups"}...`}
          tooltip="Search beneficiaries"
        />
      </div>

      {/* list */}
      <section className="rounded-2xl border border-border bg-card overflow-hidden">
        {segment === "group" ? (
          /* GROUPS ONLY TAB */
          filteredGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <Users size={28} className="text-muted-foreground/60 mb-1" />
              <p className="text-[14px] font-medium text-foreground">
                {query ? "No payment groups match that search" : "No payment groups created yet"}
              </p>
              <p className="text-[12.5px] text-muted-foreground">
                {query ? "Try a different name or member." : "Create a group to send money to family, Susu, or colleagues in one tap."}
              </p>
              {!query && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingGroup(null);
                    setGroupModalOpen(true);
                  }}
                  className="mt-2"
                >
                  <Plus size={14} /> Create first group
                </Button>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filteredGroups.map((g) => {
                const totalAmt =
                  g.splitType === "equal"
                    ? g.members.length * g.defaultPerMemberAmount
                    : g.members.reduce((sum, m) => sum + (m.defaultAmount || 0), 0);

                return (
                  <li key={g.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 transition-colors hover:bg-muted/40">
                    <span className="flex min-w-0 flex-1 items-start gap-3.5">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Users size={18} strokeWidth={1.8} />
                      </span>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="truncate text-[14.5px] font-medium text-foreground">{g.name}</span>
                          <span className="text-[11px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                            {g.members.length} members
                          </span>
                          <span className="text-[11px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md font-medium">
                            {g.splitType === "equal" ? `GHS ${g.defaultPerMemberAmount} each` : "Custom split"}
                          </span>
                        </div>
                        {g.description && (
                          <span className="text-[12px] text-muted-foreground mt-0.5 line-clamp-1">{g.description}</span>
                        )}
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {g.members.slice(0, 5).map((m) => (
                            <span key={m.destination} className="inline-flex items-center gap-1 text-[11px] bg-muted/70 px-2 py-0.5 rounded text-foreground">
                              {m.name.split(" ")[0]}
                            </span>
                          ))}
                          {g.members.length > 5 && (
                            <span className="text-[11px] text-muted-foreground font-medium">
                              +{g.members.length - 5} more
                            </span>
                          )}
                        </div>
                      </div>
                    </span>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                      <div className="flex flex-col text-right hidden sm:flex">
                        <span className="text-[10.5px] text-muted-foreground uppercase tracking-wider font-medium">Total Outflow</span>
                        <span className="text-[13.5px] font-semibold text-foreground tabular">
                          GHS {totalAmt.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <SimpleTooltip content={`Send to ${g.name}`}>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            nativeButton={false}
                            render={
                              <Link
                                href={`/payments/send?rail=group&group=${encodeURIComponent(g.name)}`}
                              />
                            }
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
                    </div>
                  </li>
                );
              })}
            </ul>
          )
        ) : (
          /* INDIVIDUAL PAYEES (PEOPLE / BILLERS / NUMBERS) */
          filteredPayees.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <p className="text-[14px] font-medium text-foreground">
                {query
                  ? "No beneficiaries match that search"
                  : `No ${segment === "person" ? "contacts" : segment === "biller" ? "billers" : "numbers"} saved yet`}
              </p>
              <p className="text-[12.5px] text-muted-foreground">
                {query ? "Try a different name or number." : "Add one to save time on your next transfer."}
              </p>
              {!query && (
                <Button variant="outline" size="sm" onClick={openNew} className="mt-2">
                  <Plus size={14} /> Add beneficiary
                </Button>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filteredPayees.map((p) => {
                  const Icon = TYPE_META[p.type].icon;
                  return (
                    <li key={p.id} className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-muted/40">
                      <span className="flex min-w-0 flex-1 items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
                          {p.type === "person" ? (
                            <span className="text-[12px] font-medium tracking-tight">{initials(p.name)}</span>
                          ) : (
                            <Icon size={18} strokeWidth={1.8} className="text-muted-foreground" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-[14px] font-medium text-foreground">{p.name}</span>
                            {p.verified ? (
                              <CheckCircle2
                                size={13}
                                strokeWidth={2}
                                className="shrink-0 text-emerald-600 dark:text-emerald-400"
                                aria-label="Verified"
                              />
                            ) : (
                              <Badge variant="warning">Pending approval</Badge>
                            )}
                          </span>
                          <span className="mt-0.5 truncate text-[12px] text-muted-foreground tabular">{p.detail}</span>
                        </span>
                      </span>

                      <span className="flex shrink-0 items-center gap-1">
                        <SimpleTooltip content={`Send money to ${p.name}`}>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            nativeButton={false}
                            render={
                              <Link
                                href={`/payments/send?rail=${p.type === "number" ? "wallet" : p.type === "biller" ? "bill" : "bank"}&recipient=${encodeURIComponent(p.name)}`}
                              />
                            }
                            aria-label={`Send to ${p.name}`}
                          >
                            <Send size={15} strokeWidth={1.8} />
                          </Button>
                        </SimpleTooltip>
                        <SimpleTooltip content={`Edit ${p.name}`}>
                          <Button variant="ghost" size="icon-sm" onClick={() => openEdit(p)} aria-label={`Edit ${p.name}`}>
                            <Pencil size={15} strokeWidth={1.8} />
                          </Button>
                        </SimpleTooltip>
                        <SimpleTooltip content={`Remove ${p.name}`}>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setRemoveId(p.id)}
                            aria-label={`Remove ${p.name}`}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 size={15} strokeWidth={1.8} />
                          </Button>
                        </SimpleTooltip>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )
          )}
      </section>

      {/* Add / Edit Individual Payee Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit beneficiary" : "Add a beneficiary"}</DialogTitle>
            <DialogDescription>
              {isCorporate && !editing
                ? "New corporate beneficiaries are reviewed by an approver before they can be paid."
                : "Save someone you pay so they're one tap away next time."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="py-name">Name</Label>
              <Input
                id="py-name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Kwame Boateng"
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Type</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["person", "biller", "number"] as const).map((t) => {
                  const active = form.type === t;
                  const Icon = TYPE_META[t].icon;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, type: t }))}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-[12px] transition-all cursor-pointer ${
                        active
                          ? "border-primary bg-primary/10 font-medium text-foreground"
                          : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground"
                      }`}
                    >
                      <Icon size={16} strokeWidth={1.8} />
                      {TYPE_META[t].label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="py-detail">{formMeta.detailLabel}</Label>
              <Input
                id="py-detail"
                value={form.detail}
                onChange={(e) => setForm((p) => ({ ...p, detail: e.target.value }))}
                placeholder={formMeta.detailHint}
              />
            </div>

            {isCorporate && !editing && (
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[12px] text-amber-700 dark:text-amber-400">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                <span>Dual control: an approver must clear this beneficiary before it can be used for corporate disbursements.</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!canSave}>
              {editing ? "Save changes" : isCorporate ? "Submit for approval" : "Save beneficiary"}
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
          flash(editingGroup ? `Group "${grp.name}" updated.` : `Group "${grp.name}" created with ${grp.members.length} members.`);
        }}
      />

      {/* Remove Payee Confirmation Dialog */}
      <Dialog open={Boolean(removeId)} onOpenChange={(open) => !open && setRemoveId(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Remove beneficiary?</DialogTitle>
            <DialogDescription>
              {toRemove ? `"${toRemove.name}"` : "This beneficiary"} will be removed from your saved list. You can still pay them by typing their details manually.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemove}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Group Confirmation Dialog */}
      <Dialog open={Boolean(removeGroupId)} onOpenChange={(open) => !open && setRemoveGroupId(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Delete payment group?</DialogTitle>
            <DialogDescription>
              {toRemoveGroup ? `"${toRemoveGroup.name}"` : "This group"} will be removed. Its members will still remain in your saved beneficiaries.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveGroupId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemoveGroup}>
              Delete Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
