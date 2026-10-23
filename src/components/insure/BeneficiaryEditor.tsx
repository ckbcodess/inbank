"use client";

/**
 * Who a policy pays, and how much each gets. Shared by buying a plan and by Update Beneficiaries, so the rules read
 * the same in both:
 *
 *  - Shares are whole percentages and must add up to exactly 100. The line above the list says how much is left (or
 *    how far over), so the customer never has to do the sum.
 *  - People already named on another policy are offered first ("Saved"); someone new is added inline and kept for next
 *    time. Whoever is added takes whatever share is left, so a first beneficiary is simply 100%.
 *  - A beneficiary under 18 can't receive money, so a trustee is asked for only then: an adult who receives it for them.
 *  - Removing someone is undoable from the toast, because nothing is saved until the screen is submitted.
 */

import { useState } from "react";
import { Plus, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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

/** The list is ready to save: shares add up to 100, nobody has 0, and a minor has a trustee. */
export function beneficiariesReady(list: BeneficiaryShare[], people: InsuredPerson[], trusteeId?: string): boolean {
  if (list.length === 0 || total(list) !== 100 || list.some((b) => b.share <= 0)) return false;
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

function Avatar({ name }: { name: string }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-[12px] text-foreground" translate="no">
      {initials(name)}
    </span>
  );
}

/* ── Adding someone ────────────────────────────────────────────────────────── */

function PersonForm({
  ownerId,
  trustee,
  onSaved,
  onCancel,
}: {
  ownerId: string;
  /** A trustee also needs an email and an address, and must be an adult. */
  trustee?: boolean;
  onSaved: (person: InsuredPerson) => void;
  onCancel: () => void;
}) {
  const savePerson = useInsurance((s) => s.savePerson);
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<"Female" | "Male" | "">("");
  const [relationship, setRelationship] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");

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
    <div className={cn("flex flex-col gap-5 rounded-2xl border border-border p-3 sm:p-4", reveal)}>
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
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="h-10 flex-1 rounded-xl" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" className="h-10 flex-1 rounded-xl" disabled={!ready} onClick={save}>
          {trustee ? "Add Trustee" : "Add Beneficiary"}
        </Button>
      </div>
    </div>
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
  const [adding, setAdding] = useState(value.length === 0);
  const [addingTrustee, setAddingTrustee] = useState(false);

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

  function splitEqually() {
    const n = value.length;
    const base = Math.floor(100 / n);
    onChange(value.map((b, i) => ({ ...b, share: base + (i < 100 - base * n ? 1 : 0) })));
  }

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-3">
        <SectionHeading
          title="Beneficiaries"
          hint="The people this policy pays, and the share each one gets."
          action={
            value.length > 1 ? (
              <Button type="button" variant="ghost" size="sm" onClick={splitEqually}>
                Split Equally
              </Button>
            ) : undefined
          }
        />

        {value.length > 0 && (
          <>
            <div className="flex flex-col gap-2 px-1">
              <div className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className="tabular text-foreground">{`${allocated}% of 100% shared`}</span>
                <span className="tabular text-muted-foreground">
                  {left > 0 ? `${left}% left to share` : left < 0 ? `${-left}% over` : "All shared"}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                <div
                  className={cn("h-full rounded-full transition-[width] duration-reveal ease-settle", left < 0 ? "bg-warning" : "bg-primary")}
                  style={{ width: `${Math.min(allocated, 100)}%` }}
                />
              </div>
              {left < 0 && <InlineError message="The shares add up to more than 100%. Lower one of them." className="text-left" />}
            </div>

            <ListCard>
              {value.map((b) => {
                const p = personOf(b.personId);
                if (!p) return null;
                return (
                  <li key={b.personId} className="flex items-center gap-3 rounded-xl px-2 py-2 sm:px-3">
                    <Avatar name={p.fullName} />
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
                        className="tabular h-10 w-16 text-right"
                      />
                      <span className="text-[14px] text-muted-foreground">%</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => remove(b.personId)}
                      aria-label={`Remove ${p.fullName}`}
                      className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <X size={16} strokeWidth={1.8} aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ListCard>
          </>
        )}

        {adding ? (
          <div className="flex flex-col gap-3">
            {saved.length > 0 && (
              <div className={cn("flex flex-col gap-2", reveal)}>
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
                        <Plus size={16} strokeWidth={1.8} aria-hidden="true" className="shrink-0 text-muted-foreground" />
                      </button>
                    </li>
                  ))}
                </ListCard>
                <p className="px-1 pt-2 text-[13px] text-muted-foreground">Or add someone new</p>
              </div>
            )}
            <PersonForm ownerId={ownerId} onSaved={add} onCancel={() => setAdding(false)} />
          </div>
        ) : (
          <Button type="button" variant="outline" className="h-10 w-full rounded-xl" onClick={() => setAdding(true)}>
            <Plus size={16} strokeWidth={1.8} aria-hidden="true" />
            {value.length === 0 ? "Add Beneficiary" : "Add Another Beneficiary"}
          </Button>
        )}
      </section>

      {minors.length > 0 && (
        <section className={cn("flex flex-col gap-3", reveal)}>
          <SectionHeading title="Trustee" />
          <p className="px-1 text-[13px] leading-relaxed text-muted-foreground">
            {minors.length === 1
              ? `${minors[0].fullName} is under 18, so name an adult to receive the payout on their behalf.`
              : "Some of your beneficiaries are under 18, so name an adult to receive the payout on their behalf."}
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
          {addingTrustee ? (
            <PersonForm
              ownerId={ownerId}
              trustee
              onSaved={(p) => {
                onTrusteeChange(p.id);
                setAddingTrustee(false);
              }}
              onCancel={() => setAddingTrustee(false)}
            />
          ) : (
            <Button type="button" variant="outline" className="h-10 w-full rounded-xl" onClick={() => setAddingTrustee(true)}>
              <UserRound size={16} strokeWidth={1.8} aria-hidden="true" />
              {trusteeChoices.length > 0 ? "Someone Else" : "Add Trustee"}
            </Button>
          )}
        </section>
      )}
    </div>
  );
}
