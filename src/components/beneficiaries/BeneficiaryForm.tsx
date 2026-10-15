"use client";

/**
 * Add or edit one beneficiary, in one dialog.
 *
 * Adding is two short steps: "What are you adding?" (a handful of plain choices), then only the fields that
 * choice needs, then Save. Editing skips the first step. The same dialog is used from the hub and from the
 * "add someone" links elsewhere, so a saved person is created one way only.
 */

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Globe, Landmark, Smartphone, User } from "lucide-react";
import { CediReceiptIcon } from "@/components/ui/cedi-receipt-icon";
import { ActionTile } from "@/components/ui/action-tile";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { resolveAccountName } from "@/components/payments/flows/shared";
import { useBeneficiariesStore, type BeneficiaryRecord, type TransactionType } from "@/lib/beneficiaries-store";
import {
  AIRTIME_NETWORKS,
  BILLER_CATEGORIES,
  GHANA_BANKS,
  INTERNATIONAL_BANKS_BY_COUNTRY,
  PAPSS_BANKS_BY_COUNTRY,
  PAPSS_COUNTRIES,
  SWIFT_COUNTRIES,
  WALLET_NETWORKS,
} from "@/lib/beneficiary-options";
import { BILLERS } from "@/lib/mock-data";
import { isCompleteGhanaMobile } from "@/lib/phone";
import { useSession } from "@/lib/session-store";

/** What each kind of beneficiary is called, with the line that says what it is for. */
export const KIND: Record<
  TransactionType,
  { label: string; plural: string; description: string; rail: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }> }
> = {
  bank: { label: "Bank Account", plural: "Bank Accounts", description: "Any bank in Ghana", rail: "bank", icon: Landmark },
  wallet: { label: "Mobile Number", plural: "Mobile Numbers", description: "Send money, airtime or data to a number", rail: "wallet", icon: Smartphone },
  proxy: { label: "Proxy ID", plural: "Proxy IDs", description: "Pay a handle instead of an account number", rail: "proxy", icon: User },
  airtime: { label: "Mobile Number", plural: "Mobile Numbers", description: "Send money, airtime or data to a number", rail: "airtime", icon: Smartphone },
  bill: { label: "Biller", plural: "Billers", description: "Electricity, TV, water, internet and more", rail: "bill", icon: CediReceiptIcon },
  swift: { label: "International Bank", plural: "International Banks", description: "Any country, including the rest of Africa", rail: "swift", icon: Globe },
  papss: { label: "International Bank", plural: "International Banks", description: "Any country, including the rest of Africa", rail: "papss", icon: Globe },
};

interface FormState {
  name: string;
  nickname: string;
  bankName: string;
  accountNumber: string;
  currency: string;
  network: string;
  phoneNumber: string;
  proxyId: string;
  billerName: string;
  billerReference: string;
  country: string;
  swiftBic: string;
  address: string;
}

const EMPTY: FormState = {
  name: "",
  nickname: "",
  bankName: "",
  accountNumber: "",
  currency: "GHS",
  network: "",
  phoneNumber: "",
  proxyId: "",
  billerName: "",
  billerReference: "",
  country: "",
  swiftBic: "",
  address: "",
};

const PAPSS_NAMES = new Set(PAPSS_COUNTRIES.map((c) => c.name));
/** An African country in the PAPSS network goes by PAPSS; every other country goes by SWIFT. The customer only picks the country. */
function railFor(country: string): "papss" | "swift" {
  return PAPSS_NAMES.has(country) ? "papss" : "swift";
}
/** Every country either rail reaches, A to Z, with its currency. */
const INTERNATIONAL_COUNTRIES = (() => {
  const seen = new Map<string, string>();
  for (const c of [...PAPSS_COUNTRIES, ...SWIFT_COUNTRIES]) if (!seen.has(c.name)) seen.set(c.name, c.currency);
  return Array.from(seen, ([name, currency]) => ({ name, currency })).sort((a, b) => a.name.localeCompare(b.name));
})();
function banksIn(country: string): string[] {
  return (railFor(country) === "papss" ? PAPSS_BANKS_BY_COUNTRY : INTERNATIONAL_BANKS_BY_COUNTRY)[country] || [];
}

function fromRecord(b: BeneficiaryRecord): FormState {
  return {
    ...EMPTY,
    name: b.name,
    nickname: b.label ?? "",
    bankName: b.bankName ?? "",
    accountNumber: b.accountNumber ?? "",
    currency: b.currency ?? "GHS",
    network: b.network ?? "",
    phoneNumber: b.phoneNumber ?? "",
    proxyId: b.proxyId ?? "",
    billerName: b.billerName ?? "",
    billerReference: b.billerReference ?? "",
    country: b.country ?? "",
  };
}

/** What still has to be filled in before this one can be saved, or null when it is ready. */
function missing(type: TransactionType, f: FormState): string | null {
  if (type === "bank" && !f.bankName) return "Choose a bank";
  if (type === "bank" && !f.accountNumber.trim()) return "Add the account number";
  if ((type === "wallet" || type === "airtime") && !f.network) return "Choose a network";
  if ((type === "wallet" || type === "airtime") && !isCompleteGhanaMobile(f.phoneNumber)) return "Add the full phone number";
  if (type === "proxy" && !f.proxyId) return "Add the proxy ID";
  if (type === "bill" && !f.billerName) return "Choose a biller";
  if (type === "bill" && !f.billerReference.trim()) return "Add the reference";
  if (type === "swift" && !f.country) return "Choose a country";
  if (type === "swift" && !f.bankName) return "Choose a bank";
  if (type === "swift" && !f.accountNumber.trim()) return "Add the account number";
  if (!f.name.trim()) return "Add a name";
  return null;
}

function detailLine(type: TransactionType, f: FormState): string {
  switch (type) {
    case "bank":
      return `${f.bankName} · ${f.accountNumber} · ${f.currency}`;
    case "wallet":
    case "airtime":
      return `${f.network} · ${f.phoneNumber}`;
    case "proxy":
      return `Proxy · ${f.proxyId}`;
    case "bill":
      return `${f.billerName} · ${f.billerReference}`;
    case "swift": {
      const cur = SWIFT_COUNTRIES.find((c) => c.name === f.country)?.currency || "USD";
      return `SWIFT${f.swiftBic ? ` (${f.swiftBic})` : ""} · ${f.bankName} · ${cur} · ${f.accountNumber}`;
    }
    case "papss": {
      const cur = PAPSS_COUNTRIES.find((c) => c.name === f.country)?.currency || "NGN";
      return `PAPSS · ${f.bankName} · ${cur} · ${f.accountNumber}`;
    }
  }
}

export function BeneficiaryForm({
  open,
  onOpenChange,
  kinds,
  editing,
  startKind,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The kinds offered when adding (People or Billers). */
  kinds: TransactionType[];
  /** Set to edit this beneficiary instead of adding one. */
  editing?: BeneficiaryRecord | null;
  /** Skip the first step and start on this kind (for example from a "no one saved yet" empty state). */
  startKind?: TransactionType;
}) {
  const isCorporate = useSession((s) => s.activeProfile?.kind) === "CORPORATE";
  const addBeneficiary = useBeneficiariesStore((s) => s.addBeneficiary);
  const updateBeneficiary = useBeneficiariesStore((s) => s.updateBeneficiary);

  // What the customer can choose between: SWIFT and PAPSS count as one
  const choices = useMemo(
    () => Array.from(new Set(kinds.filter((k) => k !== "airtime").map((k) => (k === "papss" ? "swift" : k)))) as TransactionType[],
    [kinds],
  );
  const [type, setType] = useState<TransactionType | null>(null);
  const [f, setF] = useState<FormState>(EMPTY);

  // Start fresh every time the dialog opens
  useEffect(() => {
    if (!open) return;
    // SWIFT and PAPSS are one choice to the customer ("International Bank"); the country decides which one it is
    const as = (t: TransactionType): TransactionType => (t === "papss" ? "swift" : t);
    if (editing) {
      setType(as(editing.transactionType));
      setF(fromRecord(editing));
    } else {
      setType(startKind ? as(startKind) : choices.length === 1 ? choices[0] : null);
      setF(EMPTY);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing, startKind, kinds]);

  const set = (patch: Partial<FormState>) => setF((p) => ({ ...p, ...patch }));

  /** When the identifier is complete and no name has been typed, fill the name in from it. */
  const withName = (patch: Partial<FormState>, complete: boolean, number: string) =>
    setF((p) => {
      const next = { ...p, ...patch };
      if (complete && !p.name.trim()) {
        const resolved = resolveAccountName(number, "");
        if (resolved) next.name = resolved;
      }
      return next;
    });

  const matchedBiller = useMemo(() => BILLERS.find((b) => b.name === f.billerName), [f.billerName]);
  const problem = type ? missing(type, f) : null;

  function save() {
    if (!type || problem) return;
    const finalType: TransactionType = type === "swift" ? railFor(f.country) : type;
    const payload = {
      name: f.name.trim(),
      transactionType: finalType,
      detail: detailLine(finalType, f),
      bankName: f.bankName || undefined,
      accountNumber: f.accountNumber || undefined,
      currency: f.currency,
      network: f.network || undefined,
      phoneNumber: f.phoneNumber || undefined,
      proxyId: f.proxyId || undefined,
      billerName: f.billerName || undefined,
      billerReference: f.billerReference || undefined,
      billerCategory: matchedBiller?.category,
      country: f.country || undefined,
      label: f.nickname.trim() || undefined,
    };
    if (editing) {
      updateBeneficiary(editing.id, payload);
      toast.success(`${payload.name} updated.`);
    } else {
      const verified = !isCorporate;
      addBeneficiary({
        ...payload,
        category: finalType === "bill" ? "biller" : finalType === "airtime" ? "number" : "person",
        verified,
      });
      if (verified) toast.success(`${payload.name} saved.`);
      else toast.info("Sent for approval. It will appear once a second person approves it.");
    }
    onOpenChange(false);
  }

  const choosing = !editing && type === null;
  const title = editing ? `Edit ${f.name || "Beneficiary"}` : choosing ? "What are you adding?" : `Add ${KIND[type!].label}`;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      size="md"
      footer={
        choosing ? undefined : (
          <>
            {editing || choices.length === 1 || startKind ? (
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            ) : (
              <Button type="button" variant="ghost" onClick={() => setType(null)}>
                Back
              </Button>
            )}
            <Button type="button" onClick={save} disabled={Boolean(problem)}>
              {editing ? "Save Changes" : "Save"}
            </Button>
          </>
        )
      }
    >
      {choosing ? (
        <div className="flex flex-col gap-3">
          {choices.map((k) => (
            <ActionTile
              key={k}
              icon={KIND[k].icon}
              title={KIND[k].label}
              description={KIND[k].description}
              onClick={() => {
                setType(k);
                if (k === "bank") set({ bankName: "" });
              }}
            />
          ))}
        </div>
      ) : (
        type && (
          <div className="flex flex-col gap-4">
            {type === "bank" && (
              <>
                <Field label="Bank">
                  <Select value={f.bankName} onValueChange={(v) => v && set({ bankName: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a bank" />
                    </SelectTrigger>
                    <SelectContent className="max-h-56">
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
                    inputMode="numeric"
                    value={f.accountNumber}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "");
                      withName({ accountNumber: v }, v.length >= 10, v);
                    }}
                    placeholder={f.bankName === "GCB Bank" ? "13-digit GCB account number" : "Account number"}
                    className="tabular"
                  />
                </Field>
              </>
            )}

            {(type === "wallet" || type === "airtime") && (
              <>
                <Field label="Network">
                  <Select value={f.network} onValueChange={(v) => v && set({ network: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a network" />
                    </SelectTrigger>
                    <SelectContent>
                      {(type === "wallet" ? WALLET_NETWORKS : AIRTIME_NETWORKS).map((n) => (
                        <SelectItem key={n} value={n}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Phone Number">
                  <PhoneInput
                    value={f.phoneNumber}
                    onValueChange={(v) => withName({ phoneNumber: v }, isCompleteGhanaMobile(v), v)}
                    aria-label="Phone number"
                  />
                </Field>
              </>
            )}

            {type === "proxy" && (
              <Field label="Proxy ID">
                <div className="relative flex items-center">
                  <span className="pointer-events-none absolute left-3.5 select-none text-[14px] text-muted-foreground">@</span>
                  <Input
                    value={f.proxyId.replace(/^@/, "")}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/^@/, "").trim();
                      set({ proxyId: cleaned ? `@${cleaned}` : "" });
                    }}
                    placeholder="kwame.b"
                    className="pl-8"
                  />
                </div>
              </Field>
            )}

            {type === "bill" && (
              <>
                <Field label="Biller">
                  <Select
                    value={f.billerName}
                    onValueChange={(v) => {
                      if (!v) return;
                      const prev = BILLERS.find((b) => b.name === f.billerName);
                      const untouched = !f.name || (prev && (f.name === prev.name || f.name === `${prev.name} Account`));
                      set({ billerName: v, name: untouched ? `${v} Account` : f.name });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a biller" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {BILLER_CATEGORIES.map((cat) => (
                        <SelectGroup key={cat}>
                          <SelectLabel className="px-2.5 py-1.5 text-[12px] text-muted-foreground">{cat}</SelectLabel>
                          {BILLERS.filter((b) => b.category === cat).map((b) => (
                            <SelectItem key={b.id} value={b.name} label={b.name}>
                              {b.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label={matchedBiller?.reference || "Account Reference"}>
                  <Input
                    value={f.billerReference}
                    onChange={(e) => set({ billerReference: e.target.value })}
                    placeholder={matchedBiller?.reference ? `Your ${matchedBiller.reference.toLowerCase()}` : "Meter number or account reference"}
                    className="tabular"
                  />
                </Field>
              </>
            )}

            {type === "swift" && (
              <>
                <Field label="Country">
                  <Select
                    value={f.country}
                    onValueChange={(v) => {
                      if (!v) return;
                      const banks = banksIn(v);
                      set({ country: v, bankName: banks.length === 1 ? banks[0] : "" });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a country" />
                    </SelectTrigger>
                    <SelectContent className="max-h-56">
                      {INTERNATIONAL_COUNTRIES.map((c) => (
                        <SelectItem key={c.name} value={c.name}>
                          {c.name} ({c.currency})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                {f.country && (
                  <p className="-mt-2 text-[12px] text-muted-foreground">
                    {railFor(f.country) === "papss"
                      ? "Sent through PAPSS, the Pan-African system that lets banks in different African countries settle in local currency."
                      : "Sent by SWIFT wire, which moves money between banks in different countries."}
                  </p>
                )}
                {f.country && (
                  <Field label="Bank">
                    <Select value={f.bankName} onValueChange={(v) => v && set({ bankName: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a bank" />
                      </SelectTrigger>
                      <SelectContent className="max-h-56">
                        {banksIn(f.country).map((b) => (
                          <SelectItem key={b} value={b}>
                            {b}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
                {f.country && railFor(f.country) === "swift" && (
                  <Field label="SWIFT / BIC Code" optional>
                    <Input
                      value={f.swiftBic}
                      onChange={(e) => set({ swiftBic: e.target.value.toUpperCase() })}
                      placeholder="BARCGB22"
                      className="tabular"
                    />
                  </Field>
                )}
                <Field label={f.country && railFor(f.country) === "swift" ? "IBAN / Account Number" : "Account Number"}>
                  <Input
                    value={f.accountNumber}
                    onChange={(e) => set({ accountNumber: e.target.value })}
                    placeholder={f.country && railFor(f.country) === "swift" ? "GB29 BARC 2020 1555" : "Account number or IBAN"}
                    className="tabular"
                  />
                </Field>
              </>
            )}

            <Field label="Name">
              <Input
                value={f.name}
                onChange={(e) => set({ name: e.target.value })}
                placeholder={type === "bill" ? "ECG PowerApp" : "Kojo Mensah"}
              />
            </Field>

            <Field label="Nickname" optional>
              <Input
                value={f.nickname}
                onChange={(e) => set({ nickname: e.target.value })}
                placeholder="Landlord, Monthly groceries"
              />
            </Field>

            {problem && <p className="-mt-1 text-[12px] text-muted-foreground">{problem} to save.</p>}
          </div>
        )
      )}
    </Modal>
  );
}
