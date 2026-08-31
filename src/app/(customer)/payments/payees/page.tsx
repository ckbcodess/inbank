"use client";

/**
 * Payees directory — the "manage all" surface the control room links to.
 *
 * Scales past the flat favorites list by pairing persistent SEARCH with
 * SEGMENTED tabs (People / Billers / Numbers). Each row manages one payee:
 * send, edit, remove. Adding a payee is governed for corporate (dual control),
 * so a new corporate payee lands "Pending approval" rather than instantly live.
 *
 * NOTE: operates on a page-local list for now; wiring to a shared server-side
 * beneficiaries service (so it syncs with the send flow and mobile) is the
 * remaining follow-up.
 */

import { useMemo, useReducer, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Pencil,
  Plus,
  Receipt,
  Search,
  Send,
  Smartphone,
  Trash2,
  User,
} from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

type PayeeType = "person" | "biller" | "number";
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

const SEGMENTS: { key: "all" | PayeeType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "person", label: "People" },
  { key: "biller", label: "Billers" },
  { key: "number", label: "Numbers" },
];

type FormState = { id?: string; name: string; type: PayeeType; detail: string };

export default function PayeesDirectoryPage() {
  const activeProfile = useSession((s) => s.activeProfile);
  const isCorporate = activeProfile?.kind === "CORPORATE";

  const [payees, setPayees] = useState<Payee[]>(seedPayees);
  const [segment, setSegment] = useState<"all" | PayeeType>("all");
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>({ name: "", type: "person", detail: "" });
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [, force] = useReducer((x: number) => x + 1, 0);

  function flash(msg: string) {
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 4000);
  }

  const counts = useMemo(
    () => ({
      all: payees.length,
      person: payees.filter((p) => p.type === "person").length,
      biller: payees.filter((p) => p.type === "biller").length,
      number: payees.filter((p) => p.type === "number").length,
    }),
    [payees],
  );

  const q = query.trim().toLowerCase();
  const filtered = payees
    .filter((p) => segment === "all" || p.type === segment)
    .filter((p) => !q || p.name.toLowerCase().includes(q) || p.detail.toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name));

  const editing = Boolean(form.id);
  const canSave = form.name.trim() !== "" && form.detail.trim() !== "";

  function openNew() {
    setForm({ name: "", type: segment === "all" ? "person" : segment, detail: "" });
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
      flash("Payee updated.");
    } else {
      // Corporate additions are a fraud vector — they go through approval first.
      const verified = !isCorporate;
      const created: Payee = { id: `new-${Date.now()}`, name: form.name.trim(), type: form.type, detail: form.detail.trim(), verified };
      setPayees((list) => [created, ...list]);
      flash(verified ? "Payee added." : "Payee submitted for approval — it'll be usable once an approver clears it.");
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

  const toRemove = removeId ? payees.find((p) => p.id === removeId) : undefined;
  const formMeta = TYPE_META[form.type];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Payees"
        description="Everyone and everything you pay. Search, or filter by type."
        backTo={{ href: "/payments", label: "Payments" }}
        actions={
          <Button onClick={openNew}>
            <Plus size={15} strokeWidth={1.9} aria-hidden="true" />
            Add payee
          </Button>
        }
      />

      {notice && (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/60 px-4 py-3 text-[13px] text-foreground">
          <CheckCircle2 size={16} strokeWidth={1.8} className="shrink-0 text-emerald-500" aria-hidden="true" />
          <span className="flex-1">{notice}</span>
        </div>
      )}

      {/* search */}
      <div className="relative">
        <Search size={16} strokeWidth={1.8} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-3 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search payees, billers & numbers"
          className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3.5 text-[13.5px] text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/30"
        />
      </div>

      {/* segments */}
      <div className="inline-flex w-fit flex-wrap rounded-xl bg-muted p-1">
        {SEGMENTS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setSegment(key)}
            aria-pressed={segment === key}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] transition-all ${
              segment === key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
            <span className="tabular text-[11px] text-muted-foreground">{counts[key]}</span>
          </button>
        ))}
      </div>

      {/* list */}
      <section className="rounded-2xl border border-border bg-card">
        {filtered.length === 0 ? (
          <div className="px-6 py-14 text-center text-[13px] text-muted-foreground">
            {q ? <>No payees match &ldquo;{query}&rdquo;.</> : <>No payees here yet.</>}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((p) => {
              const Icon = TYPE_META[p.type].icon;
              return (
                <li key={p.id} className="flex flex-wrap items-center gap-4 px-5 py-3.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-[12px] text-muted-foreground">
                    {p.type === "person" ? initials(p.name) : <Icon size={16} strokeWidth={1.7} aria-hidden="true" />}
                  </span>

                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-[13.5px] text-foreground">{p.name}</span>
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

                  <span className="flex shrink-0 items-center gap-1">
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
                    <Button variant="ghost" size="icon-sm" onClick={() => openEdit(p)} aria-label={`Edit ${p.name}`}>
                      <Pencil size={15} strokeWidth={1.8} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setRemoveId(p.id)}
                      aria-label={`Remove ${p.name}`}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 size={15} strokeWidth={1.8} />
                    </Button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* add / edit dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit payee" : "Add a payee"}</DialogTitle>
            <DialogDescription>
              {isCorporate && !editing
                ? "New corporate payees are reviewed by an approver before they can be paid."
                : "Save someone you pay so they're one tap away next time."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="py-name">Name</Label>
              <Input
                id="py-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Accra Fabrics Ltd"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Type</Label>
              <div className="inline-flex w-full rounded-lg bg-muted p-1">
                {(Object.keys(TYPE_META) as PayeeType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, type: t }))}
                    className={`flex-1 rounded-md px-3 py-1.5 text-[13px] transition-all ${
                      form.type === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {TYPE_META[t].label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="py-detail">{formMeta.detailLabel}</Label>
              <Input
                id="py-detail"
                value={form.detail}
                onChange={(e) => setForm((f) => ({ ...f, detail: e.target.value }))}
                placeholder={formMeta.detailHint}
                className="tabular"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!canSave} onClick={handleSave}>
              {editing ? "Save changes" : "Add payee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* remove confirmation */}
      <Dialog open={removeId !== null} onOpenChange={(open) => !open && setRemoveId(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Remove this payee?</DialogTitle>
            <DialogDescription>
              {toRemove ? `"${toRemove.name}" ` : "This payee "}
              will be removed from your saved list. Past payments to them aren&apos;t affected.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-3.5 text-[12.5px] text-muted-foreground">
            <AlertTriangle size={15} strokeWidth={1.8} className="mt-px shrink-0 text-warning" aria-hidden="true" />
            <span>You can add them again anytime — removing only clears the saved shortcut.</span>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveId(null)}>
              Keep it
            </Button>
            <Button variant="destructive" onClick={handleRemove}>
              <Trash2 size={15} strokeWidth={1.8} aria-hidden="true" />
              Remove payee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
