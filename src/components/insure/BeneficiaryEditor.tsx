"use client";

/**
 * Who a policy pays, and how much each gets. Shared by buying a plan and by Update Beneficiaries, so the rules read
 * the same in both:
 *
 *  - Shares go up in steps of 5 and must add up to exactly 100. One bar shows the split, a segment per person in
 *    the categorical colours, and a line beside the heading says how much is left (or how far over), but only when the
 *    total is off: a finished split is silent, so the customer never has to do the sum.
 *  - People already named on another policy are offered first ("Saved"); someone new is added inline and kept for next
 *    time. Whoever is added takes whatever share is left, so a first beneficiary is simply 100%.
 *  - A beneficiary under 18 can't receive money, so a trustee is asked for only then: an adult who receives it for them.
 *  - Removing someone is undoable from the toast, because nothing is saved until the screen is submitted.
 */

import { useEffect, useRef, useState } from "react";
import { Plus, UserRound, X } from "@/components/ui/icons";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { InlineError } from "@/components/ui/inline-error";
import { Input } from "@/components/ui/input";
import { ListCard } from "@/components/ui/list-card";
import { OptionTile } from "@/components/ui/option-tile";
import { PhoneInput } from "@/components/ui/phone-input";
import { SectionHeading } from "@/components/ui/section-heading";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RELATIONSHIPS } from "@/lib/insurance-plans";
import { ageOn, useInsurance, type BeneficiaryShare, type InsuredPerson } from "@/lib/insurance";
import { isCompleteGhanaMobile } from "@/lib/phone";
import { MOCK_TODAY } from "@/lib/treasury";
import { cn } from "@/lib/utils";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const GENDERS = [
  { value: "Female", label: "Female" },
  { value: "Male", label: "Male" },
] as const;
const reveal = "animate-in fade-in slide-in-from-top-2 duration-200";

export const isMinor = (p: Pick<InsuredPerson, "dateOfBirth"> | undefined) => Boolean(p && ageOn(p.dateOfBirth) < 18);
const isAdult = (p: InsuredPerson) => ageOn(p.dateOfBirth) >= 18;
const total = (list: BeneficiaryShare[]) => list.reduce((n, b) => n + b.share, 0);

/** Shares move in multiples of this, whether dragged, typed or split equally. */
const STEP = 5;
const snap = (n: number) => Math.round(n / STEP) * STEP;

/** The list is ready to save: shares are multiples of 5 that add up to 100, nobody has 0, and a minor has a trustee. */
export function beneficiariesReady(list: BeneficiaryShare[], people: InsuredPerson[], trusteeId?: string): boolean {
  if (list.length === 0 || total(list) !== 100 || list.some((b) => b.share <= 0 || b.share % STEP !== 0)) return false;
  const minors = list.some((b) => isMinor(people.find((p) => p.id === b.personId)));
  return !minors || Boolean(trusteeId && people.some((p) => p.id === trusteeId));
}

/** "Prince Nii Mills" → "PN". */
function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

/** The nth person's colour on the bar. Positions follow the list, so a colour stays with a person until someone before them is removed. The sixth and later share one. */
const segmentColor = (i: number) => (i < 5 ? `var(--cat-${i + 1})` : "var(--cat-other)");

function Avatar({ name, color }: { name: string; color?: string }) {
  return (
    <span className="relative flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-[12px] text-foreground" translate="no">
      {initials(name)}
      {color && <span aria-hidden="true" className="absolute -right-px -bottom-px size-2.5 rounded-full border-2 border-background" style={{ background: color }} />}
    </span>
  );
}

/* ── Adding someone ────────────────────────────────────────────────────────── */

/** The new-person form in a modal. Its buttons sit in the modal's footer, so they stay put while the fields scroll. */
function PersonModal({
  open,
  onOpenChange,
  title,
  ownerId,
  trustee,
  onSaved,
  top,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  ownerId: string;
  /** A trustee also needs an email and an address, and must be an adult. */
  trustee?: boolean;
  onSaved: (person: InsuredPerson) => void;
  /** Shown above the fields, such as the people already saved. */
  top?: React.ReactNode;
}) {
  const savePerson = useInsurance((s) => s.savePerson);
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<"Female" | "Male" | "">("");
  const [relationship, setRelationship] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");

  // A fresh form each time it opens
  useEffect(() => {
    if (!open) return;
    setFullName("");
    setDob("");
    setGender("");
    setRelationship("");
    setPhone("");
    setEmail("");
    setAddress("");
  }, [open]);

  const dobInFuture = dob !== "" && dob > MOCK_TODAY;
  const tooYoung = trustee && dob !== "" && !dobInFuture && ageOn(dob) < 18;
  const emailInvalid = email.trim() !== "" && !EMAIL.test(email.trim());
  const nameOk = fullName.trim().split(/\s+/).filter(Boolean).length >= 2;
  const ready =
    nameOk &&
    dob !== "" &&
    !dobInFuture &&
    !tooYoung &&
    gender !== "" &&
    relationship !== "" &&
    isCompleteGhanaMobile(phone) &&
    (!trustee || (EMAIL.test(email.trim()) && address.trim().length >= 3));

  function save() {
    if (!ready || !gender) return;
    const person = savePerson({
      ownerId,
      fullName: fullName.trim(),
      dateOfBirth: dob,
      gender,
      relationship,
      phone,
      ...(trustee ? { email: email.trim(), address: address.trim() } : {}),
    });
    onSaved(person);
  }

  const id = trustee ? "trustee" : "beneficiary";
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      size="md"
      footer={
        <>
          <Button type="button" variant="outline" className="h-10 flex-1" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" className="h-10 flex-1" disabled={!ready} onClick={save}>
            {trustee ? "Add Trustee" : "Add Beneficiary"}
          </Button>
        </>
      }
    >
    <div className="flex flex-col gap-5">
      {top}
      <Field label="Full Name" htmlFor={`${id}-name`}>
        <Input id={`${id}-name`} value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="off" placeholder="As on their ID" />
      </Field>
      <Field
        label="Date of Birth"
        htmlFor={`${id}-dob`}
        error={dobInFuture ? "That date is in the future." : tooYoung ? "A trustee must be 18 or older." : null}
      >
        <Input id={`${id}-dob`} type="date" value={dob} max={MOCK_TODAY} onChange={(e) => setDob(e.target.value)} />
      </Field>
      <Field label="Gender">
        <SegmentedControl<"Female" | "Male" | ""> aria-label="Gender" options={GENDERS} value={gender} onChange={setGender} fullWidth />
      </Field>
      <Field label="Relationship">
        <Select value={relationship} onValueChange={(v) => v && setRelationship(v)}>
          <SelectTrigger aria-label="Relationship">
            <SelectValue placeholder="Select relationship" />
          </SelectTrigger>
          <SelectContent>
            {RELATIONSHIPS.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Mobile Number" htmlFor={`${id}-phone`}>
        <PhoneInput id={`${id}-phone`} value={phone} onValueChange={setPhone} />
      </Field>
      {trustee && (
        <>
          <Field label="Email Address" htmlFor={`${id}-email`} error={emailInvalid && "Enter a valid email address."}>
            <Input id={`${id}-email`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Address" htmlFor={`${id}-address`}>
            <Input id={`${id}-address`} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="House 1, Lomotey Street, Accra" />
          </Field>
        </>
      )}
    </div>
    </Modal>
  );
}

/* ── The editor ────────────────────────────────────────────────────────────── */

export function BeneficiaryEditor({
  ownerId,
  people,
  value,
  onChange,
  trusteeId,
  onTrusteeChange,
}: {
  ownerId: string;
  /** Everyone the customer has named before, from the one store. */
  people: InsuredPerson[];
  value: BeneficiaryShare[];
  onChange: (next: BeneficiaryShare[]) => void;
  trusteeId?: string;
  onTrusteeChange: (id: string | undefined) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [addingTrustee, setAddingTrustee] = useState(false);
  const [dragging, setDragging] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ index: number; startX: number; before: BeneficiaryShare[] } | null>(null);

  const personOf = (id: string) => people.find((p) => p.id === id);
  const allocated = total(value);
  const left = 100 - allocated;
  const saved = people.filter((p) => !value.some((b) => b.personId === p.id));
  const minors = value.map((b) => personOf(b.personId)).filter((p): p is InsuredPerson => isMinor(p));
  const trusteeChoices = people.filter((p) => isAdult(p) && p.email && p.address);

  function add(person: InsuredPerson) {
    onChange([...value, { personId: person.id, share: Math.max(left, 0) }]);
    setAdding(false);
  }

  function setShare(personId: string, raw: string) {
    const share = Math.min(Number(raw.replace(/\D/g, "").slice(0, 3)) || 0, 100);
    onChange(value.map((b) => (b.personId === personId ? { ...b, share } : b)));
  }

  /** Typing is free while the number is being keyed ("3" on the way to "35"); leaving the box lands it on a multiple of 5. */
  function settleShare(personId: string) {
    onChange(value.map((b) => (b.personId === personId && b.share > 0 ? { ...b, share: Math.min(Math.max(snap(b.share), STEP), 100) } : b)));
  }

  function remove(personId: string) {
    const before = value;
    const name = personOf(personId)?.fullName ?? "Beneficiary";
    onChange(value.filter((b) => b.personId !== personId));
    toast(`${name} removed.`, {
      id: "insure-beneficiary-removed",
      description: "Their share is free to give to someone else.",
      action: { label: "Undo", onClick: () => onChange(before) },
    });
  }

  /** Move the line between two neighbours: what one gains the other loses, so the total never changes. Nobody is dragged down to 0 (removing someone is its own action). */
  function moveSplitter(index: number, before: BeneficiaryShare[], delta: number) {
    const pair = before[index].share + before[index + 1].share;
    if (pair < STEP * 2) return;
    const a = Math.min(Math.max(snap(before[index].share + delta), STEP), pair - STEP);
    onChange(before.map((b, i) => (i === index ? { ...b, share: a } : i === index + 1 ? { ...b, share: pair - a } : b)));
  }

  function splitEqually() {
    // 20 steps of 5 to hand out: everyone gets the same number, and the first few get one more until none are left
    const n = value.length;
    const units = 100 / STEP;
    const each = Math.floor(units / n);
    const extra = units - each * n;
    onChange(value.map((b, i) => ({ ...b, share: (each + (i < extra ? 1 : 0)) * STEP })));
  }

  return (
    <div className="flex flex-col gap-12">
      <section className="flex flex-col gap-6">
        <SectionHeading
          title="Beneficiaries"
          action={
            <div className="flex items-center gap-4">
              {left > 0 && <span className="tabular text-[13px] text-muted-foreground">{`${left}% left to share`}</span>}
              {value.length > 1 && (
                <Button type="button" variant="outline" onClick={splitEqually}>
                  Split Equally
                </Button>
              )}
            </div>
          }
        />

        {value.length > 0 && (
          <>
            <div className="flex flex-col gap-2 px-1">
              <div ref={barRef} className="relative flex h-7 items-center">
                <div className="flex h-7 w-full gap-0.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                  {value.map((b, i) => (
                    <span
                      key={b.personId}
                      className={cn("h-full", !dragging && "transition-[width] duration-reveal ease-settle")}
                      style={{ width: `${(b.share / Math.max(allocated, 100)) * 100}%`, background: segmentColor(i) }}
                    />
                  ))}
                </div>
                {value.slice(0, -1).map((b, i) => {
                  const next = value[i + 1];
                  const edge = value.slice(0, i + 1).reduce((n, x) => n + x.share, 0);
                  const nameOf = (id: string) => personOf(id)?.fullName ?? "";
                  return (
                    <div
                      key={b.personId}
                      role="slider"
                      tabIndex={0}
                      aria-label={`Share between ${nameOf(b.personId)} and ${nameOf(next.personId)}`}
                      aria-valuemin={1}
                      aria-valuemax={b.share + next.share - 1}
                      aria-valuenow={b.share}
                      aria-valuetext={`${nameOf(b.personId)} ${b.share}%, ${nameOf(next.personId)} ${next.share}%`}
                      className={cn("group absolute top-0 flex h-7 w-6 -translate-x-1/2 cursor-ew-resize touch-none items-center justify-center outline-none", !dragging && "transition-[left] duration-reveal ease-settle")}
                      style={{ left: `${(edge / Math.max(allocated, 100)) * 100}%` }}
                      onPointerDown={(e) => {
                        e.currentTarget.setPointerCapture(e.pointerId);
                        drag.current = { index: i, startX: e.clientX, before: value };
                        setDragging(true);
                      }}
                      onPointerMove={(e) => {
                        const d = drag.current;
                        const width = barRef.current?.getBoundingClientRect().width;
                        if (!d || !width) return;
                        moveSplitter(d.index, d.before, Math.round(((e.clientX - d.startX) / width) * Math.max(total(d.before), 100)));
                      }}
                      onPointerUp={() => {
                        drag.current = null;
                        setDragging(false);
                      }}
                      onPointerCancel={() => {
                        drag.current = null;
                        setDragging(false);
                      }}
                      onKeyDown={(e) => {
                        const step = e.shiftKey ? STEP * 2 : STEP;
                        if (e.key === "ArrowLeft" || e.key === "ArrowDown") moveSplitter(i, value, -step);
                        else if (e.key === "ArrowRight" || e.key === "ArrowUp") moveSplitter(i, value, step);
                        else return;
                        e.preventDefault();
                      }}
                    >
                      <span className="h-5 w-1.5 rounded-full border border-background bg-foreground transition-opacity duration-hover group-hover:opacity-80 group-focus-visible:ring-2 group-focus-visible:ring-ring" />
                    </div>
                  );
                })}
              </div>
              {left < 0 && <InlineError message="The shares add up to more than 100%. Lower one of them." className="text-left" />}
            </div>

            <ListCard>
              {value.map((b, i) => {
                const p = personOf(b.personId);
                if (!p) return null;
                return (
                  <li key={b.personId} className="flex items-center gap-3 rounded-xl px-2 py-3 sm:px-3">
                    <Avatar name={p.fullName} color={segmentColor(i)} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[14px] text-foreground" translate="no">
                        {p.fullName}
                      </span>
                      <span className="truncate text-[12px] text-muted-foreground">
                        {isMinor(p) ? `${p.relationship} · Under 18` : p.relationship}
                      </span>
                    </span>
                    <label className="flex shrink-0 items-center gap-1">
                      <span className="sr-only">{`Share for ${p.fullName}`}</span>
                      <Input
                        inputMode="numeric"
                        value={b.share ? String(b.share) : ""}
                        placeholder="0"
                        onChange={(e) => setShare(b.personId, e.target.value)}
                        onBlur={() => settleShare(b.personId)}
                        className="tabular h-11 w-[72px] text-right"
                      />
                      <span className="text-[14px] text-muted-foreground">%</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => remove(b.personId)}
                      aria-label={`Remove ${p.fullName}`}
                      className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <X size={16} aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ListCard>
          </>
        )}

        <Button type="button" variant="outline" className="-mt-2 h-11 w-full" onClick={() => setAdding(true)}>
          <Plus size={16} aria-hidden="true" />
          {value.length === 0 ? "Add Beneficiary" : "Add Another Beneficiary"}
        </Button>
        <PersonModal
          open={adding}
          onOpenChange={setAdding}
          title="Add a Beneficiary"
          ownerId={ownerId}
          onSaved={add}
          top={
            saved.length > 0 ? (
              <>
              <div className="flex flex-col gap-2">
                <p className="px-1 text-[13px] text-muted-foreground">Saved</p>
                <ListCard>
                  {saved.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => add(p)}
                        className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-muted/50 sm:px-3"
                      >
                        <Avatar name={p.fullName} />
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-[14px] text-foreground" translate="no">
                            {p.fullName}
                          </span>
                          <span className="truncate text-[12px] text-muted-foreground">{p.relationship}</span>
                        </span>
                        <Plus size={16} aria-hidden="true" className="shrink-0 text-muted-foreground" />
                      </button>
                    </li>
                  ))}
                </ListCard>
              </div>
              <div className="flex items-center gap-3" role="separator" aria-label="Or add someone new">
                <span aria-hidden="true" className="h-px flex-1 bg-border" />
                <span className="text-[13px] text-muted-foreground">Or add someone new</span>
                <span aria-hidden="true" className="h-px flex-1 bg-border" />
              </div>
              </>
            ) : null
          }
        />
      </section>

      {minors.length > 0 && (
        <section className={cn("flex flex-col gap-3", reveal)}>
          <SectionHeading title="Trustee" />
          <p className="px-1 text-[13px] leading-relaxed text-muted-foreground">
            {minors.length === 1
              ? `An adult receives the payout for ${minors[0].fullName.split(/\s+/)[0]} until ${minors[0].fullName.split(/\s+/)[0]} turns 18.`
              : "An adult receives the payout for your beneficiaries under 18, until each turns 18."}
          </p>
          {trusteeChoices.length > 0 && (
            <div role="radiogroup" aria-label="Trustee" className="flex flex-col gap-2">
              {trusteeChoices.map((p) => (
                <OptionTile
                  key={p.id}
                  title={p.fullName}
                  detail={`${p.relationship} · ${p.phone}`}
                  selected={trusteeId === p.id}
                  onSelect={() => onTrusteeChange(p.id)}
                />
              ))}
            </div>
          )}
          <Button type="button" variant="outline" className="h-11 w-full" onClick={() => setAddingTrustee(true)}>
            <UserRound size={16} aria-hidden="true" />
            {trusteeChoices.length > 0 ? "Someone Else" : "Add Trustee"}
          </Button>
          <PersonModal
            open={addingTrustee}
            onOpenChange={setAddingTrustee}
            title="Add a Trustee"
            ownerId={ownerId}
            trustee
            onSaved={(p) => {
              onTrusteeChange(p.id);
              setAddingTrustee(false);
            }}
          />
        </section>
      )}
    </div>
  );
}
