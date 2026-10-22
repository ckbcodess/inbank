"use client";

/**
 * Add a user (option C). Two steps: who they are, then what they can do. A signatory on the mandate is picked from
 * the bank's records, so their name and contact details aren't typed and they can be offered Reviewer or
 * Authoriser. Anyone else gives their details and can be an Inputter, a Viewer or an administrator. The new access
 * waits for an Authoriser or another administrator; nobody approves their own change.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import PageHeader from "@/components/layout/PageHeader";
import UserAccessFields from "@/components/corporate/admin/UserAccessFields";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  COMPANY_USERS,
  draftProblem,
  mandateSignatories,
  proposeUserChange,
  type UserDraft,
} from "@/lib/corporate/controls";
import { isCompleteGhanaMobile } from "@/lib/phone";
import { useSession } from "@/lib/session-store";

type Who = { kind: "signatory"; index: number } | { kind: "other" };

export default function AddUserPage() {
  const router = useRouter();
  const actor = useSession((s) => s.actor);
  // Signatories who aren't users yet.
  const signatories = mandateSignatories().filter((s) => !COMPANY_USERS.some((u) => u.name === s.name));

  const [step, setStep] = useState<"who" | "access">("who");
  const [who, setWho] = useState<Who | null>(null);
  const [name, setName] = useState("");
  const [designation, setDesignation] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [draft, setDraft] = useState<UserDraft | null>(null);
  const [tried, setTried] = useState(false);

  const otherReady = name.trim() !== "" && designation.trim() !== "" && isCompleteGhanaMobile(mobile) && email.includes("@");
  const whoReady = who?.kind === "signatory" || (who?.kind === "other" && otherReady);

  function toAccess() {
    if (!who || !whoReady) return;
    if (who.kind === "signatory") {
      const s = signatories[who.index];
      const [title] = s.role.split(" (");
      setDraft({ name: s.name, email: s.email, mobile: s.mobile, designation: title, role: "Authoriser", onMandate: true, limit: 0, accountIds: [] });
    } else {
      setDraft({ name: name.trim(), email: email.trim(), mobile, designation: designation.trim(), role: "Inputter", onMandate: false, limit: 0, accountIds: [] });
    }
    setTried(false);
    setStep("access");
  }

  function submit() {
    if (!draft || !actor) return;
    setTried(true);
    if (draftProblem(draft)) return;
    proposeUserChange({ kind: "add", after: draft, proposedBy: actor.name });
    toast.success(`Sent for approval. ${draft.name} gets access once an Authoriser or another administrator approves it.`);
    router.push("/business/administration");
  }

  const problem = draft && tried ? draftProblem(draft) : "";
  const limitProblem = problem.includes("limit") ? problem : "";
  const accountsProblem = problem && !limitProblem ? problem : "";

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-8">
      <PageHeader
        title={step === "who" ? "Add a User" : `Access for ${draft?.name ?? ""}`}
        backTo={
          step === "who"
            ? { href: "/business/administration", label: "Administration" }
            : { href: "/business/administration/new", label: "Who They Are", onClick: () => setStep("who") }
        }
      />

      {step === "who" && (
        <div className="flex flex-col gap-6">
          <div role="radiogroup" aria-label="Who are you adding?" className="flex flex-col gap-2">
            {signatories.map((s, i) => (
              <WhoOption
                key={s.name}
                selected={who?.kind === "signatory" && who.index === i}
                onSelect={() => setWho({ kind: "signatory", index: i })}
                primary={s.name}
                secondary={`${s.role} · on your mandate`}
              />
            ))}
            <WhoOption
              selected={who?.kind === "other"}
              onSelect={() => setWho({ kind: "other" })}
              primary="Someone Else"
              secondary="Not on the mandate: an Inputter, a Viewer or an administrator"
            />
          </div>

          {who?.kind === "other" && (
            <div className="flex flex-col gap-4">
              <Field label="Full Name" htmlFor="new-name">
                <Input id="new-name" autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
              </Field>
              <Field label="Position" htmlFor="new-designation">
                <Input id="new-designation" autoComplete="off" placeholder="For example, Accounts Officer" value={designation} onChange={(e) => setDesignation(e.target.value)} />
              </Field>
              <Field
                label="Mobile Number"
                htmlFor="new-mobile"
                error={mobile && !isCompleteGhanaMobile(mobile) ? "Enter a full Ghana mobile number." : ""}
              >
                <PhoneInput id="new-mobile" value={mobile} onValueChange={setMobile} />
              </Field>
              <Field label="Email" htmlFor="new-email">
                <Input id="new-email" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
            </div>
          )}

          <Button disabled={!whoReady} onClick={toAccess} className="self-start">
            Continue
          </Button>
        </div>
      )}

      {step === "access" && draft && (
        <div className="flex flex-col gap-6">
          <UserAccessFields draft={draft} onChange={setDraft} limitError={limitProblem} accountsError={accountsProblem} />
          <div className="flex flex-col gap-2">
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              {`An Authoriser or another administrator approves this before ${draft.name} can sign in. We'll tell ${draft.name} by SMS and email when it's approved.`}
            </p>
            <Button onClick={submit} className="self-start">
              Send for Approval
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function WhoOption({
  selected,
  onSelect,
  primary,
  secondary,
}: {
  selected: boolean;
  onSelect: () => void;
  primary: string;
  secondary: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`flex cursor-pointer flex-col rounded-xl border px-4 py-3 text-left transition-colors duration-hover ${
        selected ? "border-[var(--active-border)] bg-[var(--active-bg)]" : "border-border bg-card hover:bg-muted/50"
      }`}
    >
      <span className="truncate text-[14px] text-foreground">{primary}</span>
      <span className="truncate text-[12px] text-muted-foreground">{secondary}</span>
    </button>
  );
}
