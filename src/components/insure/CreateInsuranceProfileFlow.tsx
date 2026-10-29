"use client";

/**
 * Create the insurance profile: the one set of answers every plan reads, so the customer is never asked twice.
 *
 * Four steps, from the bancassurance Figma's Create Profile row: about you (title, marital status, occupation,
 * political exposure, addresses, signature), the lifestyle questionnaire (alcohol, smoking), the medical history,
 * then a confirmation and one code. What the bank already holds (name, date of birth, ID, mobile, email) is shown on
 * the confirmation and never asked. The figma authorises with a 4-digit PIN; here it is the one-time code every
 * authorised action uses (CONSTITUTION §2).
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "@/components/ui/icons";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ListCard } from "@/components/ui/list-card";
import { MultiChoice } from "@/components/ui/multi-choice";
import { OccupationCombobox } from "@/components/ui/occupation-combobox";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { StepBar } from "@/components/ui/step-bar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SignatureUpload } from "@/components/ui/signature-upload";
import { FormPageSkeleton } from "@/components/states/PageSkeletons";
import { TrueEmptyState } from "@/components/states/ListStates";
import TransactionOtpModal from "@/components/payments/TransactionOtpModal";
import { PaymentSuccessScreen } from "@/components/payments/PaymentSuccessScreen";
import { ProceedButton } from "@/components/payments/flows/shared";
import { useSession } from "@/lib/session-store";
import { INSURE_HOME } from "@/lib/insurance-plans";
import {
  ALCOHOL_TYPES,
  INSURANCE_TITLES,
  MARITAL_STATUSES,
  SMOKE_QUANTITIES,
  SMOKE_TYPES,
  WEEKLY_ALCOHOL,
  bankRecordOf,
  joinChoices,
  longDate,
  useInsurance,
  useInsuranceHydrated,
  useMyInsurance,
  type InsuranceProfile,
} from "@/lib/insurance";

type Step = "about" | "lifestyle" | "medical" | "confirm" | "success";
type YesNo = "yes" | "no" | "";

const STEP_TITLE: Record<Exclude<Step, "success">, string> = {
  about: "Create Profile",
  lifestyle: "Lifestyle Questionnaire",
  medical: "Medical History",
  confirm: "Confirmation",
};
const STEPS_SHOWN: Step[] = ["about", "lifestyle", "medical", "confirm"];

const reveal = "flex flex-col gap-5 animate-in fade-in slide-in-from-top-2 duration-200";
const YES_NO = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
] as const;

const isYes = (v: YesNo) => v === "yes";

/** A question the customer answers: sentence case, with its control beneath. */
function Question({ text, note, children }: { text: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <p className="text-[13px] font-medium text-foreground">{text}</p>
        {note && <p className="text-[12px] leading-relaxed text-muted-foreground">{note}</p>}
      </div>
      {children}
    </div>
  );
}

function YesNoQuestion({ text, note, value, onChange }: { text: string; note?: string; value: YesNo; onChange: (v: YesNo) => void }) {
  return (
    <Question text={text} note={note}>
      <SegmentedControl<YesNo> options={YES_NO} value={value} onChange={onChange} aria-label={text} fullWidth />
    </Question>
  );
}

function PickOne({ value, onChange, options, placeholder, label }: { value: string; onChange: (v: string) => void; options: readonly string[]; placeholder: string; label: string }) {
  return (
    <Select value={value} onValueChange={(v) => v && onChange(v)}>
      <SelectTrigger aria-label={label}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** One heading and the rows under it, on the confirmation. */
function Section({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="px-1 text-[16px] font-medium text-foreground">{title}</h2>
      <ListCard as="div">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-4 px-3 py-2">
            <span className="shrink-0 text-[13.5px] text-muted-foreground">{label}</span>
            <span className="min-w-0 text-right text-[13.5px] text-foreground">{value}</span>
          </div>
        ))}
      </ListCard>
    </section>
  );
}

export function CreateInsuranceProfileFlow({ intent }: { intent?: { href: string; label: string } } = {}) {
  const router = useRouter();
  const hydrated = useInsuranceHydrated();
  const actor = useSession((s) => s.actor);
  const { ownerId, profile: existing } = useMyInsurance();
  const saveProfile = useInsurance((s) => s.saveProfile);

  const [step, setStep] = useState<Step>("about");
  const [authOpen, setAuthOpen] = useState(false);

  // About you
  const [title, setTitle] = useState("");
  const [marital, setMarital] = useState("");
  const [occupation, setOccupation] = useState("");
  const [pep, setPep] = useState<YesNo>("");
  const [residential, setResidential] = useState("");
  const [postal, setPostal] = useState("");
  const [signature, setSignature] = useState<{ name: string; size: number } | null>(null);

  // Lifestyle
  const [drinks, setDrinks] = useState<YesNo>("");
  const [alcoholTypes, setAlcoholTypes] = useState<string[]>([]);
  const [alcoholOther, setAlcoholOther] = useState("");
  const [weeklyAlcohol, setWeeklyAlcohol] = useState("");
  const [smokes, setSmokes] = useState<YesNo>("");
  const [smokeTypes, setSmokeTypes] = useState<string[]>([]);
  const [smokeOther, setSmokeOther] = useState("");
  const [smokeQuantity, setSmokeQuantity] = useState("");

  // Medical
  const [goodHealth, setGoodHealth] = useState<YesNo>("");
  const [condition, setCondition] = useState<YesNo>("");
  const [conditionDetail, setConditionDetail] = useState("");
  const [medication, setMedication] = useState<YesNo>("");
  const [medicationDetail, setMedicationDetail] = useState("");
  const [surgery, setSurgery] = useState<YesNo>("");
  const [surgeryDetail, setSurgeryDetail] = useState("");

  const back = { href: INSURE_HOME, label: "Insure" };
  const record = bankRecordOf(actor?.id);

  if (!hydrated) return <FormPageSkeleton fields={4} />;

  if (existing && step !== "success") {
    return (
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6">
        <PageHeader title="Your Insurance Profile" backTo={back} />
        <TrueEmptyState
          icon={<ShieldCheck size={22} strokeWidth={1.8} />}
          title="Your insurance profile is ready"
          description="You can explore and buy insurance plans now."
          action={
            <Button nativeButton={false} render={<Link href={intent?.href ?? INSURE_HOME} />}>
              {intent ? `Continue to ${intent.label}` : "Back to Insure"}
            </Button>
          }
        />
      </div>
    );
  }

  if (step === "success") {
    return (
      <PaymentSuccessScreen
        title="Profile created"
        message={intent ? `You can now carry on with the ${intent.label}.` : "You can now explore and purchase insurance plans."}
        onPrimaryAction={() => router.push(intent?.href ?? INSURE_HOME)}
        primaryActionLabel={intent ? `Continue to ${intent.label}` : "View Plans"}
        showSaveBeneficiary={false}
        customActionCards={[]}
      />
    );
  }

  /* ── What each step needs before Next ─────────────────────────────────── */
  const aboutOne = Boolean(title) && Boolean(marital) && occupation.trim().length >= 2 && pep !== "";
  const aboutDone = aboutOne && residential.trim().length >= 3 && postal.trim().length >= 3 && Boolean(signature);

  const drinkDone =
    drinks === "no" || (isYes(drinks) && (alcoholTypes.length > 0 || alcoholOther.trim() !== "") && Boolean(weeklyAlcohol));
  const smokeDone =
    smokes === "no" || (isYes(smokes) && (smokeTypes.length > 0 || smokeOther.trim() !== "") && Boolean(smokeQuantity));
  const lifestyleDone = drinkDone && smokeDone;

  const conditionDone = condition === "no" || (isYes(condition) && conditionDetail.trim().length >= 2);
  const medicationDone = medication === "no" || (isYes(medication) && medicationDetail.trim().length >= 2);
  const surgeryDone = surgery === "no" || (isYes(surgery) && surgeryDetail.trim().length >= 2);
  const medicalDone = goodHealth !== "" && conditionDone && medicationDone && surgeryDone;

  const goBack = () => {
    const i = STEPS_SHOWN.indexOf(step);
    if (i <= 0) router.push(INSURE_HOME);
    else setStep(STEPS_SHOWN[i - 1]);
  };

  const build = (): InsuranceProfile | null => {
    if (!signature) return null;
    return {
      title,
      maritalStatus: marital,
      occupation: occupation.trim(),
      pep: isYes(pep),
      residentialAddress: residential.trim(),
      postalAddress: postal.trim(),
      signature,
      lifestyle: {
        drinks: isYes(drinks),
        alcoholTypes: isYes(drinks) ? alcoholTypes : [],
        alcoholOther: isYes(drinks) ? alcoholOther.trim() : "",
        weeklyAlcohol: isYes(drinks) ? weeklyAlcohol : "",
        smokes: isYes(smokes),
        smokeTypes: isYes(smokes) ? smokeTypes : [],
        smokeOther: isYes(smokes) ? smokeOther.trim() : "",
        smokeQuantity: isYes(smokes) ? smokeQuantity : "",
      },
      medical: {
        goodHealth: isYes(goodHealth),
        condition: isYes(condition),
        conditionDetail: isYes(condition) ? conditionDetail.trim() : "",
        medication: isYes(medication),
        medicationDetail: isYes(medication) ? medicationDetail.trim() : "",
        surgery: isYes(surgery),
        surgeryDetail: isYes(surgery) ? surgeryDetail.trim() : "",
      },
      createdOn: new Date().toISOString(),
    };
  };

  const yn = (v: YesNo) => (isYes(v) ? "Yes" : "No");
  const drinkLine = joinChoices(alcoholTypes, alcoholOther);
  const smokeLine = joinChoices(smokeTypes, smokeOther);

  const personalRows: Array<[string, string]> = [
    ["Title", title],
    ["Name", actor?.name ?? ""],
    ...(record ? ([["Date of Birth", longDate(record.dateOfBirth)], ["Gender", record.gender]] as Array<[string, string]>) : []),
    ["Mobile Number", actor?.phone ?? ""],
    ["Marital Status", marital],
    ["Email", actor?.email ?? ""],
    ["Occupation", occupation.trim()],
    ...(record ? ([["ID Type", record.idType], ["ID Number", record.idNumber]] as Array<[string, string]>) : []),
    ["Politically Exposed Person", yn(pep)],
    ["Residential Address", residential.trim()],
    ["Postal Address", postal.trim()],
    ["Signature", signature?.name ?? ""],
  ];
  const lifestyleRows: Array<[string, string]> = [
    ["Do you take alcoholic drink?", yn(drinks)],
    ...(isYes(drinks)
      ? ([["Type of alcohol", drinkLine], ["Weekly Consumption", weeklyAlcohol]] as Array<[string, string]>)
      : []),
    ["Do you smoke?", yn(smokes)],
    ...(isYes(smokes) ? ([["Type of smoke", smokeLine], ["Quantity", smokeQuantity]] as Array<[string, string]>) : []),
  ];
  const medicalRows: Array<[string, string]> = [
    ["Are you in good health?", yn(goodHealth)],
    ["Any medical condition?", isYes(condition) ? conditionDetail.trim() : "No"],
    ["Are you on any medication?", isYes(medication) ? medicationDetail.trim() : "No"],
    ["Undergone surgical operation?", isYes(surgery) ? surgeryDetail.trim() : "No"],
  ];

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6">
      <PageHeader title={STEP_TITLE[step]} backTo={{ ...back, onClick: goBack }} />
      <div className="flex flex-col gap-5">
        <StepBar current={STEPS_SHOWN.indexOf(step) + 1} total={STEPS_SHOWN.length} showCount />

        {step === "about" && (
          <>
            <Field label="Title">
              <PickOne value={title} onChange={setTitle} options={INSURANCE_TITLES} placeholder="Select title" label="Title" />
            </Field>
            <Field label="Marital Status">
              <PickOne value={marital} onChange={setMarital} options={MARITAL_STATUSES} placeholder="Select marital status" label="Marital status" />
            </Field>
            <Field label="Occupation" htmlFor="insure-occupation">
              <OccupationCombobox id="insure-occupation" value={occupation} onChange={setOccupation} />
            </Field>
            <YesNoQuestion
              text="Are you a politically exposed person?"
              note="Someone who holds, or has held, a senior public role, or is close to someone who does."
              value={pep}
              onChange={setPep}
            />

            {aboutOne && (
              <div className={reveal}>
                <Field label="Residential Address" htmlFor="insure-residential">
                  <Input id="insure-residential" value={residential} onChange={(e) => setResidential(e.target.value)} placeholder="House No. 14, 5th Avenue, East Legon" autoComplete="street-address" />
                </Field>
                <Field label="Postal Address" htmlFor="insure-postal">
                  <Input id="insure-postal" value={postal} onChange={(e) => setPostal(e.target.value)} placeholder="P.O. Box CT 1234" />
                </Field>
                <SignatureUpload file={signature} onChange={setSignature} />
              </div>
            )}

            <ProceedButton disabled={!aboutDone} onClick={() => setStep("lifestyle")} label="Next" />
          </>
        )}

        {step === "lifestyle" && (
          <>
            <YesNoQuestion text="Do you take in any alcoholic drink?" value={drinks} onChange={setDrinks} />
            {isYes(drinks) && (
              <div className={reveal}>
                <Question text="Indicate the type of alcohol" note="Select all that apply.">
                  <MultiChoice options={ALCOHOL_TYPES} value={alcoholTypes} onChange={setAlcoholTypes} aria-label="Type of alcohol" />
                  <Input value={alcoholOther} onChange={(e) => setAlcoholOther(e.target.value)} placeholder="Other, please specify" aria-label="Other alcohol, please specify" />
                </Question>
                <Question text="Indicate weekly consumption">
                  <PickOne value={weeklyAlcohol} onChange={setWeeklyAlcohol} options={WEEKLY_ALCOHOL} placeholder="Select weekly consumption" label="Weekly consumption" />
                </Question>
              </div>
            )}

            {drinkDone && (
              <div className={reveal}>
                <YesNoQuestion text="Do you smoke?" value={smokes} onChange={setSmokes} />
                {isYes(smokes) && (
                  <>
                    <Question text="Indicate the type" note="Select all that apply.">
                      <MultiChoice options={SMOKE_TYPES} value={smokeTypes} onChange={setSmokeTypes} aria-label="Type of smoking" />
                      <Input value={smokeOther} onChange={(e) => setSmokeOther(e.target.value)} placeholder="Other, please specify" aria-label="Other smoking, please specify" />
                    </Question>
                    <Question text="Indicate quantity">
                      <PickOne value={smokeQuantity} onChange={setSmokeQuantity} options={SMOKE_QUANTITIES} placeholder="Select quantity" label="Quantity" />
                    </Question>
                  </>
                )}
              </div>
            )}

            <ProceedButton disabled={!lifestyleDone} onClick={() => setStep("medical")} label="Next" />
          </>
        )}

        {step === "medical" && (
          <>
            <YesNoQuestion text="Are you presently in good health?" value={goodHealth} onChange={setGoodHealth} />

            {goodHealth !== "" && (
              <div className={reveal}>
                <YesNoQuestion text="Have you been diagnosed with any medical condition or illness?" value={condition} onChange={setCondition} />
                {isYes(condition) && (
                  <Question text="What’s the condition or illness?">
                    <Input value={conditionDetail} onChange={(e) => setConditionDetail(e.target.value)} placeholder="For example, hypertension" aria-label="The condition or illness" />
                  </Question>
                )}
              </div>
            )}

            {goodHealth !== "" && conditionDone && (
              <div className={reveal}>
                <YesNoQuestion text="Are you on any medication?" value={medication} onChange={setMedication} />
                {isYes(medication) && (
                  <Question text="State the type of medication and dosage">
                    <Input value={medicationDetail} onChange={(e) => setMedicationDetail(e.target.value)} placeholder="For example, 10 mg once a day" aria-label="Type of medication and dosage" />
                  </Question>
                )}
              </div>
            )}

            {goodHealth !== "" && conditionDone && medicationDone && (
              <div className={reveal}>
                <YesNoQuestion text="Have you undergone any surgical operation or procedure?" value={surgery} onChange={setSurgery} />
                {isYes(surgery) && (
                  <Question text="State the type of surgical operation or procedure">
                    <Input value={surgeryDetail} onChange={(e) => setSurgeryDetail(e.target.value)} placeholder="For example, appendectomy in 2019" aria-label="Type of surgical operation or procedure" />
                  </Question>
                )}
              </div>
            )}

            <ProceedButton disabled={!medicalDone} onClick={() => setStep("confirm")} label="Next" />
          </>
        )}

        {step === "confirm" && (
          <>
            <Section title="Personal Details" rows={personalRows} />
            <Section title="Lifestyle Details" rows={lifestyleRows} />
            <Section title="Medical Details" rows={medicalRows} />
            <ProceedButton disabled={false} onClick={() => setAuthOpen(true)} label="Confirm" />
          </>
        )}
      </div>

      <TransactionOtpModal
        open={authOpen}
        onOpenChange={setAuthOpen}
        onSuccess={() => {
          const next = build();
          if (!next) return;
          saveProfile(ownerId, next);
          setAuthOpen(false);
          setStep("success");
        }}
      />
    </div>
  );
}
