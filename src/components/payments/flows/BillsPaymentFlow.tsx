"use client";

import { SavedRecipientLink } from "./SavedRecipients";
import { BillerPicker } from "./BillerPicker";
import { useState, useMemo, useEffect, useRef } from "react";
import { AppLoader } from "@/components/ui/loader";
import { Account, BILLERS, formatMoney } from "@/lib/mock-data";
import { billerRule } from "@/lib/biller-rules";
import { BillerMark } from "@/components/ui/biller-mark";
import { SearchPicker, type PickerItem } from "@/components/ui/search-picker";
import {
  FromAccountSelector,
  AmountInput,
  NarrationInput,
  CategorySelect,
  InsufficientFundsAlert,
  ProceedButton,
  CollapsedDetailsBadge,
  VerifiedAccountBadge,
  SchedulePaymentSection,
  ScheduleFrequency,
  resolveAccountName,
} from "./shared";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field } from "@/components/ui/field";
import { useSession } from "@/lib/session-store";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { toast } from "sonner";
import { DEFAULT_INVOICE_FIELDS, GHANAGOV_AGENCIES, findGovAgency, govAgencyForBiller, type GovMode } from "@/lib/government-services";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGovInvoices, type GovInvoice } from "@/lib/gov-invoices-store";
import { categoryFor, saveBeneficiaryOnce } from "@/lib/beneficiaries-store";

/** The Ghana.gov entry in the biller list; choosing it asks which ministry, department or agency the payment is for. */
const GOV_BILLER_ID = "bil-004b";

// The agencies for the Ghana.gov biller; each one has its services in the government catalog.
const GOV_ITEMS: PickerItem[] = GHANAGOV_AGENCIES.map((a) => ({
  id: a.name,
  label: a.name,
  mark: (size: number) => <BillerMark name={a.name} category="Government Services" size={size} />,
}));

export interface BillsPaymentFormState {
  fromId: string;
  subType: "bill" | "ecg" | "ghanagov";
  billCategory?: string;
  billerId: string;
  billRef: string;
  ecgMeter: string;
  govService: string;
  /** The service chosen under a Ghana.gov agency (an id from the government catalog). */
  govProduct: string;
  /** Answers to fill in on the Generate form, handed in once by a saved Ghana.gov service (JSON). */
  govDetails?: string;
  /** How a service that can do both is being paid; empty until the customer chooses. */
  govMode: GovMode | "";
  govRef: string;
  benName: string;
  amount: string;
  narration: string;
  category: string;
  saveBeneficiary?: boolean;
  beneficiaryNickname?: string;
  isScheduled?: boolean;
  scheduleDate?: string;
  scheduleFrequency?: ScheduleFrequency;
  scheduleEndDate?: string;
}

interface BillsPaymentFlowProps {
  accounts: Account[];
  state: BillsPaymentFormState;
  onChange: (key: keyof BillsPaymentFormState, value: string | boolean | ScheduleFrequency | undefined) => void;
  onProceed: () => void;
  detailsCollapsed?: boolean;
  onToggleCollapsed?: (collapsed: boolean) => void;
}

export function BillsPaymentFlow({
  accounts,
  state,
  onChange,
  onProceed,
  detailsCollapsed,
  onToggleCollapsed,
}: BillsPaymentFlowProps) {
  const actor = useSession((s) => s.actor);
  const defaultUserName = actor?.name || "Ransford Gyasi";

  const [internalCollapsed, setInternalCollapsed] = useState(detailsCollapsed ?? false);
  const isCollapsed = detailsCollapsed !== undefined ? detailsCollapsed : internalCollapsed;

  const setCollapsed = (val: boolean) => {
    setInternalCollapsed(val);
    onToggleCollapsed?.(val);
  };

  // The parent hands a new onChange every render; effects reach the latest one through this
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const fromAccount = useMemo(
    () => accounts.find((a) => a.id === state.fromId) ?? accounts[0],
    [accounts, state.fromId]
  );

  const filteredBillers = useMemo(() => {
    if (!state.billCategory) return BILLERS;
    const list = BILLERS.filter(
      (b) =>
        b.category === state.billCategory ||
        b.category.toLowerCase().includes(state.billCategory!.toLowerCase())
    );
    return list.length > 0 ? list : BILLERS;
  }, [state.billCategory]);

  const selectedBiller = useMemo(() => {
    // No biller is assumed: paying the wrong company can't be undone, so it is chosen on purpose
    return filteredBillers.find((b) => b.id === state.billerId);
  }, [filteredBillers, state.billerId]);

  // A government agency is either its own biller (the agency is then fixed) or reached through Ghana.gov (the customer picks it)
  const ownAgency = state.subType === "bill" ? govAgencyForBiller(selectedBiller?.id) : undefined;
  const isGhanaGov = state.subType === "bill" && selectedBiller?.id === GOV_BILLER_ID;
  const isGovBiller = isGhanaGov || Boolean(ownAgency);

  const govAgency = isGhanaGov ? findGovAgency(state.govService) : ownAgency;
  const govSvc = govAgency?.services.find((x) => x.id === state.govProduct);
  const govMode: GovMode | undefined = isGhanaGov ? state.govMode || "pay" : isGovBiller ? "pay" : undefined;
  // What a service asks for when an invoice is generated for it under Ghana.gov
  const genFields = govSvc ? govSvc.invoiceFields ?? [...DEFAULT_INVOICE_FIELDS, { id: "ref", label: govSvc.reference ?? "Reference Number" }] : [];

  const govInvoices = useGovInvoices((x) => x.invoices);
  const addGovInvoice = useGovInvoices((x) => x.add);
  const [invoiceVals, setInvoiceVals] = useState<Record<string, string>>({});
  const [madeInvoice, setMadeInvoice] = useState<GovInvoice | null>(null);
  // The other answers on a service form that asks for more than a reference
  const [payVals, setPayVals] = useState<Record<string, string>>({});
  const resetInvoiceForm = () => {
    if (generateTimer.current) clearTimeout(generateTimer.current);
    setGenerating(false);
    setPayVals({});
    setRememberedService(false);
    setInvoiceVals({});
    setMadeInvoice(null);
  };

  const currentRef = useMemo(() => {
    if (state.subType === "ecg") return state.ecgMeter;
    if (state.subType === "ghanagov") return state.govRef;
    return state.billRef;
  }, [state.subType, state.ecgMeter, state.govRef, state.billRef]);
  const ref = currentRef.trim();

  const isGivingCategory =
    state.billCategory === "Giving & Donations" ||
    selectedBiller?.category === "Giving & Donations";

  // Not every biller can say who owns a reference. Only those we expect a direct link with are name-checked.
  const rule = state.subType === "bill" ? billerRule(state.billerId || selectedBiller?.id) : undefined;
  const needsCheck = state.subType === "ecg" || state.subType === "ghanagov" || Boolean(ownAgency) || Boolean(rule?.verify);
  const minRef = isGivingCategory ? 2 : 4;

  const canVerify = useMemo(() => {
    if (state.subType === "ghanagov" && !state.govService) return false;
    if (ownAgency && (!state.govService || !state.govProduct)) return false;
    if (state.subType === "bill" && !state.billerId && !selectedBiller?.id) return false;
    return ref.length >= minRef;
  }, [state.subType, ownAgency, state.govProduct, state.govService, state.billerId, selectedBiller?.id, ref, minRef]);

  const [verifiedRef, setVerifiedRef] = useState<string | null>(() => {
    if (state.benName && ref.length >= 4) return ref;
    return null;
  });

  const [verifiedName, setVerifiedName] = useState<string>(() => {
    if (state.subType === "ecg" && state.ecgMeter.trim().length >= 4) return "Samuel Quartey";
    if (state.benName && ref.length >= 4) return state.benName;
    return "";
  });

  const [isVerifying, setIsVerifying] = useState(false);

  // Synchronize if beneficiary was pre-selected from external avatar/preset
  useEffect(() => {
    if (needsCheck && state.benName && ref.length >= 4 && verifiedRef !== ref) {
      setVerifiedRef(ref);
      setVerifiedName(state.benName);
    }
  }, [needsCheck, state.benName, ref, verifiedRef]);

  // The name is checked on its own once the reference is complete: nothing to press, and it starts again if the reference changes
  useEffect(() => {
    if (!needsCheck || !canVerify || verifiedRef === ref) return;
    setIsVerifying(true);
    const timer = setTimeout(() => {
      let finalName: string;
      if (state.subType === "ecg") finalName = "Samuel Quartey";
      else finalName = resolveAccountName(ref, state.benName || "") || defaultUserName;
      setVerifiedRef(ref);
      setVerifiedName(finalName);
      onChangeRef.current("benName", finalName);
      setIsVerifying(false);
    }, 600);
    return () => {
      clearTimeout(timer);
      setIsVerifying(false);
    };
  }, [needsCheck, canVerify, ref, verifiedRef, state.subType, state.benName, defaultUserName]);

  // An invoice number is looked up on request, not as it is typed, and says nothing about who owns it
  const [rememberedService, setRememberedService] = useState(false);
  const [generating, setGenerating] = useState(false);
  const generateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (generateTimer.current) clearTimeout(generateTimer.current);
  }, []);
  // A saved Ghana.gov service arrives with the answers to fill in; take them once
  useEffect(() => {
    if (!state.govDetails) return;
    try {
      setInvoiceVals(JSON.parse(state.govDetails));
    } catch {
      // ignore a malformed saved entry
    }
    onChangeRef.current("govDetails", "");
  }, [state.govDetails]);
  const [searchedRef, setSearchedRef] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopSearch = () => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    setSearching(false);
  };
  const startSearch = () => {
    stopSearch();
    setSearching(true);
    searchTimer.current = setTimeout(() => {
      setSearchedRef(ref);
      setSearching(false);
    }, 600);
  };
  useEffect(() => () => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
  }, []);
  const isVerified = isGhanaGov && govMode === "pay"
    ? searchedRef !== null && searchedRef === ref && ref.length >= minRef
    : needsCheck
    ? Boolean(verifiedRef && verifiedRef === ref && verifiedName)
    : ref.length >= minRef;

  // What the biller says is running or owed on this account, once we know whose it is
  // A government payment is for what the agency says is owed, so the amount comes from the lookup and is not typed.
  // An invoice raised here returns its own amount; any other reference gets a stand-in the same way every time.
  const govCharge = useMemo(() => {
    if (!isGovBiller || govMode !== "pay" || !isVerified) return null;
    const raised = govInvoices.find((i) => i.number === ref);
    if (raised) return { title: raised.serviceName, detail: `${raised.agency} · ${raised.number}`, amount: raised.amount };
    const h = [...ref].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);
    if (isGhanaGov) return { title: "Ghana.gov invoice", detail: ref, amount: 50 + (h % 950) };
    if (!govSvc) return null;
    return { title: govSvc.name, detail: `${govSvc.reference ?? "Invoice Number"} ${ref}`, amount: 50 + (h % 950) };
  }, [isGovBiller, isGhanaGov, govMode, isVerified, govSvc, govInvoices, ref]);
  const charge = useMemo(() => {
    if (govCharge) return govCharge;
    if (!rule?.current || !isVerified || !selectedBiller) return null;
    return rule.current.lookup(ref);
  }, [govCharge, rule, isVerified, ref, selectedBiller]);
  const [editingAmount, setEditingAmount] = useState(false);
  const chargeKey = charge ? `${selectedBiller?.id}:${ref}:${charge.amount}` : "";
  useEffect(() => {
    if (!charge) return;
    onChangeRef.current("amount", String(charge.amount));
    setEditingAmount(false);
    // Fill it once per account, not on every keystroke in the amount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chargeKey]);

  const statusChip = needsCheck ? (
    <span className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2 text-[12px]">
      {isVerifying ? (
        <>
          <AppLoader size={12} className="text-muted-foreground" />
          <span className="text-muted-foreground">Checking...</span>
        </>
      ) : isVerified ? (
        <span className="text-success-text">Verified</span>
      ) : null}
    </span>
  ) : null;

  const numAmount = Number(state.amount.replace(/[^0-9.]/g, "")) || 0;
  const overBalance = numAmount > (fromAccount?.available ?? 0);

  const isDestinationValid = useMemo(() => {
    if (state.subType === "ecg") return state.ecgMeter.trim().length >= 4;
    if (state.subType === "ghanagov") return Boolean(state.govService) && state.govRef.trim().length >= 4;
    if (isGhanaGov && govMode !== "pay") return false;
    if (ownAgency && (!state.govService || !state.govProduct)) return false;
    if (ownAgency && govSvc?.fields && !govSvc.fields.every((f) => f.reference || (payVals[f.id] ?? "").trim())) return false;
    return Boolean(state.billerId || selectedBiller?.id) && state.billRef.trim().length >= minRef;
  }, [state.subType, isGhanaGov, ownAgency, govSvc, payVals, state.govProduct, govMode, state.ecgMeter, state.govService, state.govRef, state.billerId, selectedBiller?.id, state.billRef, minRef]);

  const isValid =
    Boolean(state.fromId) &&
    isDestinationValid &&
    isVerified &&
    (!needsCheck || Boolean(verifiedName)) &&
    numAmount > 0 &&
    !overBalance;

  const resetVerification = () => {
    stopSearch();
    setSearchedRef(null);
    setVerifiedRef(null);
    setVerifiedName("");
  };

  const refInput = (value: string, key: "ecgMeter" | "govRef" | "billRef", placeholder: string) => (
    <div className="relative">
      <Input
        type="text"
        value={value}
        onChange={(e) => {
          const val = e.target.value;
          onChange(key, val);
          if (verifiedRef && verifiedRef !== val.trim()) resetVerification();
        }}
        placeholder={placeholder}
        className={needsCheck ? "tabular pr-24" : "tabular"}
      />
      {statusChip}
    </div>
  );

  // The service chosen under an agency, for both an agency that is its own biller and generating under Ghana.gov
  const servicePicker = govAgency ? (
    <SearchPicker
      items={govAgency.services.map((svc) => ({
        id: svc.id,
        label: svc.name,
        sublabel: svc.description,
        mark: (size: number) => <BillerMark name={govAgency.name} category="Government Services" size={size} />,
      }))}
      value={state.govProduct || undefined}
      onChange={(item) => {
        onChange("govProduct", item.id);
        onChange("billRef", "");
        resetInvoiceForm();
        resetVerification();
      }}
      placeholder="Select service"
      title={govAgency.name}
      searchPlaceholder="Search services"
      emptyText="No service matches that."
    />
  ) : null;

  // An invoice number typed in that we issued: carry its agency and service to the receipt
  useEffect(() => {
    if (!isGhanaGov || govMode !== "pay") return;
    const raised = govInvoices.find((i) => i.number === ref);
    if (raised && (state.govService !== raised.agency || state.govProduct !== raised.serviceId)) {
      onChangeRef.current("govService", raised.agency);
      onChangeRef.current("govProduct", raised.serviceId);
    }
  }, [isGhanaGov, govMode, govInvoices, ref, state.govService, state.govProduct]);

  const billerLabel =
    state.subType === "ecg"
      ? "Electricity Company of Ghana (ECG)"
      : state.subType === "ghanagov"
      ? state.govService || "Ghana.gov"
      : selectedBiller?.name || "Biller";

  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-200 ease-out">
      {/* 1. From Account */}
      <FromAccountSelector
        accounts={accounts}
        value={state.fromId}
        onChange={(id) => onChange("fromId", id)}
      />

      {/* 2. Biller & Reference / Account */}
      <Field label="Beneficiary Details" action={!(isDestinationValid && isVerified && isCollapsed) && <SavedRecipientLink value={currentRef} />}>
        {isDestinationValid && isVerified && isCollapsed ? (
          <CollapsedDetailsBadge
            title={needsCheck ? verifiedName || state.benName || "Biller Account" : billerLabel}
            subtitle={
              state.subType === "ecg"
                ? `Electricity Company of Ghana (ECG) · ${state.ecgMeter}`
                : state.subType === "ghanagov"
                ? `${state.govService || "Ghana.gov"} · Ref ${state.govRef}`
                : needsCheck
                ? `${isGovBiller ? [state.govService, govSvc?.name].filter(Boolean).join(" · ") : selectedBiller?.name || "Biller"} · ${state.billRef}`
                : `${selectedBiller?.reference || "Reference"} · ${state.billRef}`
            }
            icon={
              state.subType === "bill" ? (
                <BillerMark name={selectedBiller?.name} category={selectedBiller?.category} size={32} />
              ) : undefined
            }
            provider={state.subType === "ecg" ? "ECG" : state.subType === "ghanagov" ? state.govService || "Ghana.gov" : selectedBiller?.name}
            nameCheck={needsCheck ? { confirmed: Boolean(verifiedName), by: billerLabel } : undefined}
            onChange={() => setCollapsed(false)}
          />
        ) : (
          <div className="flex flex-col gap-2">
            {state.subType === "ecg" ? (
              <>
                <div className="flex h-11 items-center gap-3 rounded-2xl border border-border/80 bg-muted/30 px-3 text-[15px] font-medium text-foreground">
                  <BillerMark name="ECG" category="Bills & Utilities" size={28} />
                  Electricity Company of Ghana (ECG)
                </div>
                {refInput(state.ecgMeter, "ecgMeter", "Enter meter number")}
              </>
            ) : state.subType === "ghanagov" ? (
              <>
                <SearchPicker
                  items={GOV_ITEMS}
                  value={state.govService || undefined}
                  onChange={(item) => {
                    onChange("govService", item.id);
                    resetVerification();
                  }}
                  placeholder="Select government agency"
                  title="Select an Agency"
                  searchPlaceholder="Search agencies"
                  emptyText="No agency matches that."
                />
                {refInput(state.govRef, "govRef", "Enter PRN or invoice number")}
              </>
            ) : (
              <>
                <BillerPicker
                  billers={filteredBillers}
                  value={selectedBiller}
                  onChange={(b) => {
                    onChange("billerId", b.id);
                    onChange("amount", "");
                    onChange("govService", govAgencyForBiller(b.id)?.name ?? "");
                    onChange("govProduct", "");
                    onChange("govMode", "");
                    onChange("billRef", "");
                    resetInvoiceForm();
                    setEditingAmount(false);
                    resetVerification();
                  }}
                />
                {isGhanaGov && (
                  <>
                    <SegmentedControl
                      aria-label="Pay or generate an invoice"
                      fullWidth
                      options={[
                        { value: "pay", label: "Pay an Invoice" },
                        { value: "invoice", label: "Generate an Invoice" },
                      ]}
                      value={govMode === "invoice" ? "invoice" : "pay"}
                      onChange={(m) => {
                        onChange("govMode", m);
                        onChange("billRef", "");
                        onChange("govService", "");
                        onChange("govProduct", "");
                        onChange("amount", "");
                        resetInvoiceForm();
                        resetVerification();
                      }}
                    />
                    {govMode === "invoice" ? (
                      <div className="flex flex-col gap-4">
                        {madeInvoice ? (
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-[13px] text-muted-foreground">Invoice number</span>
                              <span className="tabular text-[14px] text-foreground">{madeInvoice.number}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-[18px] text-muted-foreground">Amount due</span>
                              <span className="tabular text-[20px] text-foreground sm:text-[22px]">{formatMoney(madeInvoice.amount, "GHS", true)}</span>
                            </div>
                            {rememberedService ? (
                              <span className="text-[13px] text-muted-foreground">Details saved to Beneficiaries</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  const detail = genFields.map((fld) => invoiceVals[fld.id]).filter(Boolean);
                                  saveBeneficiaryOnce({
                                    name: madeInvoice.serviceName,
                                    transactionType: "bill",
                                    category: categoryFor("bill"),
                                    detail: `${madeInvoice.agency} · ${detail[detail.length - 1] ?? ""}`,
                                    verified: true,
                                    billerName: "Ghana.gov",
                                    billerReference: `${madeInvoice.serviceId}:${detail[detail.length - 1] ?? ""}`,
                                    gov: { agency: madeInvoice.agency, serviceId: madeInvoice.serviceId, details: { ...invoiceVals } },
                                  });
                                  setRememberedService(true);
                                }}
                                className="cursor-pointer self-start text-[13px] text-foreground underline underline-offset-4"
                              >
                                Remember these details
                              </button>
                            )}
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                className="flex-1"
                                onClick={() => {
                                  addGovInvoice(madeInvoice);
                                  toast.success("Invoice saved. Pay it any time under Pay an Invoice.");
                                  onChange("govMode", "pay");
                                  onChange("govService", "");
                                  onChange("govProduct", "");
                                  resetInvoiceForm();
                                }}
                              >
                                Pay Later
                              </Button>
                              <Button
                                type="button"
                                className="flex-1"
                                onClick={() => {
                                  // Kept until it is paid, so the amount is looked up from it
                                  addGovInvoice(madeInvoice);
                                  onChange("billRef", madeInvoice.number);
                                  setSearchedRef(madeInvoice.number);
                                  onChange("amount", String(madeInvoice.amount));
                                  onChange("benName", madeInvoice.payer);
                                  onChange("govMode", "pay");
                                  resetInvoiceForm();
                                }}
                              >
                                Pay Now
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <SearchPicker
                              items={GOV_ITEMS}
                              value={state.govService || undefined}
                              onChange={(item) => {
                                onChange("govService", item.id);
                                onChange("govProduct", "");
                                resetInvoiceForm();
                              }}
                              placeholder="Select ministry, department or agency"
                              title="Select Ministry, Department or Agency (MDA)"
                              searchPlaceholder="Search"
                              emptyText="No agency matches that."
                            />
                            {servicePicker}
                            {govSvc && (
                              <>
                                {genFields.map((fld) => (
                                  <Field key={fld.id} label={fld.label}>
                                    <Input
                                      value={invoiceVals[fld.id] ?? ""}
                                      onChange={(e) => setInvoiceVals((v) => ({ ...v, [fld.id]: e.target.value }))}
                                      placeholder={fld.placeholder ?? `Enter ${fld.label.toLowerCase()}`}
                                    />
                                  </Field>
                                ))}
                                <Button
                                  type="button"
                                  loading={generating}
                                  disabled={!genFields.every((fld) => (invoiceVals[fld.id] ?? "").trim())}
                                  onClick={() => {
                                    const seed = [...Object.values(invoiceVals).join("|"), govSvc.id].join("");
                                    const h = [...seed].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);
                                    setGenerating(true);
                                    generateTimer.current = setTimeout(() => {
                                      setMadeInvoice({
                                        // Stand-ins for the number and amount the agency system would issue
                                        number: `GOV${Date.now().toString().slice(-9)}`,
                                        agency: state.govService,
                                        serviceId: govSvc.id,
                                        serviceName: govSvc.name,
                                        payer: (invoiceVals.payer ?? "").trim(),
                                        amount: 50 + (h % 950),
                                        createdAt: new Date().toISOString(),
                                      });
                                      setGenerating(false);
                                    }, 1200);
                                  }}
                                >
                                  Generate Invoice
                                </Button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="relative">
                          <Input
                            type="text"
                            value={state.billRef}
                            onChange={(e) => {
                              onChange("billRef", e.target.value);
                              stopSearch();
                              if (searchedRef !== null && searchedRef !== e.target.value.trim()) setSearchedRef(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && ref.length >= minRef && searchedRef !== ref && !searching) startSearch();
                            }}
                            placeholder="Enter invoice number"
                            className="tabular pr-20"
                          />
                          <button
                            type="button"
                            disabled={ref.length < minRef || searchedRef === ref || searching}
                            onClick={startSearch}
                            aria-label={searching ? "Searching" : "Search"}
                            className="absolute right-3 top-1/2 flex min-h-6 -translate-y-1/2 cursor-pointer items-center text-[13px] text-foreground underline underline-offset-4 disabled:cursor-default disabled:no-underline disabled:opacity-40"
                          >
                            {searching ? <AppLoader size={14} className="text-muted-foreground" /> : "Search"}
                          </button>
                        </div>
                        {govInvoices.length > 0 && (
                          <div className="flex flex-col gap-1 pt-1">
                            <Label>Your Invoices</Label>
                            {govInvoices.map((inv) => (
                              <button
                                key={inv.number}
                                type="button"
                                onClick={() => {
                                  onChange("billRef", inv.number);
                                  setSearchedRef(inv.number);
                                  onChange("amount", String(inv.amount));
                                  onChange("benName", inv.payer);
                                  onChange("govService", inv.agency);
                                  onChange("govProduct", inv.serviceId);
                                }}
                                className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl p-2 text-left transition-colors duration-hover hover:bg-muted/50"
                              >
                                <span className="flex min-w-0 flex-col">
                                  <span className="tabular truncate text-[14px] text-foreground">{inv.number}</span>
                                  <span className="truncate text-[12px] text-muted-foreground">{inv.serviceName}</span>
                                </span>
                                <span className="tabular text-[14px] text-foreground">{formatMoney(inv.amount, "GHS", true)}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
                {ownAgency && (
                  <>
                    {servicePicker}
                    {govSvc?.fields &&
                      govSvc.fields.map((fld) => (
                        <Field key={fld.id} label={fld.label}>
                          {fld.reference ? (
                            refInput(state.billRef, "billRef", `Enter ${fld.label.toLowerCase()}`)
                          ) : fld.type === "select" ? (
                            <Select value={payVals[fld.id] ?? ""} onValueChange={(val) => val && setPayVals((v) => ({ ...v, [fld.id]: val }))}>
                              <SelectTrigger className="shadow-xs">
                                <SelectValue placeholder={`Select ${fld.label.toLowerCase()}`} />
                              </SelectTrigger>
                              <SelectContent>
                                {(fld.options ?? []).map((o) => (
                                  <SelectItem key={o} value={o}>
                                    {o}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              value={payVals[fld.id] ?? ""}
                              onChange={(e) => setPayVals((v) => ({ ...v, [fld.id]: e.target.value }))}
                              placeholder={fld.placeholder ?? `Enter ${fld.label.toLowerCase()}`}
                            />
                          )}
                        </Field>
                      ))}
                    {govSvc && !govSvc.fields &&
                      refInput(state.billRef, "billRef", `Enter ${(govSvc.reference ?? "reference").toLowerCase()}`)}
                  </>
                )}
                {selectedBiller && !isGovBiller &&
                  refInput(state.billRef, "billRef", `Enter ${selectedBiller.reference.toLowerCase()}`)}
              </>
            )}

            {needsCheck && isVerified && (
              <VerifiedAccountBadge name={verifiedName || (state.subType === "ecg" ? "Samuel Quartey" : state.benName || defaultUserName)} />
            )}
          </div>
        )}
      </Field>

      {/* Progressive Disclosure: Only reveal Amount & onwards once the destination is complete (and, where the biller can say, checked) */}
      {isDestinationValid && isVerified && (
        <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-top-2 duration-200 ease-out">
          {charge && (rule?.current || govCharge) ? (
            // What the account is on or owes now, like a broadband package. The amount is the customer's to change.
            <div className="flex flex-col gap-2">
              <Label id="bill-current-label">{rule?.current?.heading ?? "Amount Due"}</Label>
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                <BillerMark name={selectedBiller?.name} category={selectedBiller?.category} size={36} />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-[14px] text-foreground">{charge.title}</span>
                  <span className="text-[12px] text-muted-foreground tabular">{charge.detail}</span>
                </div>
                <span className="text-[16px] text-foreground tabular">{formatMoney(charge.amount, "GHS", true)}</span>
              </div>
              {govCharge ? (
                overBalance && <InsufficientFundsAlert />
              ) : editingAmount ? (
                <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-1 duration-150">
                  <AmountInput
                    value={state.amount}
                    onChange={(val) => onChange("amount", val)}
                    label="Amount"
                    error={overBalance ? <InsufficientFundsAlert /> : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      onChange("amount", String(charge.amount));
                      setEditingAmount(false);
                    }}
                    className="cursor-pointer self-start text-[13px] text-foreground underline underline-offset-4"
                  >
                    {rule?.current?.resetLabel}
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingAmount(true);
                      setCollapsed(true);
                    }}
                    className="cursor-pointer self-start text-[13px] text-foreground underline underline-offset-4"
                  >
                    Edit amount
                  </button>
                  {overBalance && <InsufficientFundsAlert />}
                </>
              )}
            </div>
          ) : (
            /* 3. Amount */
            <AmountInput
              value={state.amount}
              onChange={(val) => onChange("amount", val)}
              onFocus={() => {
                if (isDestinationValid && isVerified) setCollapsed(true);
              }}
              error={
                overBalance ? (
                  <InsufficientFundsAlert />
                ) : undefined
              }
            />
          )}

          {/* 4. Narration */}
          <NarrationInput
            value={state.narration}
            onChange={(val) => onChange("narration", val)}
            placeholder="Bill payment"
          />

          {/* 5. Transaction Category */}
          <CategorySelect
            value={state.category}
            onChange={(val) => onChange("category", val)}
          />

          {/* 7. Schedule Payment */}
          <SchedulePaymentSection
            state={{
              enabled: state.isScheduled ?? false,
              startDate: state.scheduleDate || new Date(Date.now() + 86400000).toISOString().split("T")[0],
              frequency: state.scheduleFrequency || "once",
              endDate: state.scheduleEndDate || "",
            }}
            onChange={(updates) => {
              if (updates.enabled !== undefined) onChange("isScheduled", updates.enabled);
              if (updates.startDate !== undefined) onChange("scheduleDate", updates.startDate);
              if (updates.frequency !== undefined) onChange("scheduleFrequency", updates.frequency);
              if (updates.endDate !== undefined) onChange("scheduleEndDate", updates.endDate);
            }}
          />

          {/* 8. Proceed CTA */}
          <ProceedButton
            disabled={!isValid}
            onClick={onProceed}
            label="Proceed"
          />
        </div>
      )}
    </div>
  );
}
