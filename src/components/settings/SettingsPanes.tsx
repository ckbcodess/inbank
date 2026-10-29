"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Monitor, Moon, Sun } from "@/components/ui/icons";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import OtpInput, { OTP_LENGTH } from "@/components/auth/OtpInput";
import { PASSWORD_RULES, maskEmail, maskMobile, passwordMeetsRules } from "@/lib/auth-shared";
import { forgetThisDevice, useTrustedDevice } from "@/lib/device-trust";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { switchTheme } from "@/lib/theme-transition";
import { cn } from "@/lib/utils";

export interface SettingsData {
  /** Local form, "0241234567". It is the sign-in ID. */
  mobile: string;
  email: string;
  address: string;
  smsAlerts: boolean;
  emailReceipts: boolean;
  eStatements: boolean;
  /** Minutes of inactivity before auto-logout. */
  timeout: string;
}

export interface PaneProps {
  data: SettingsData;
  update: (patch: Partial<SettingsData>) => void;
  /** Phone only: back to the section list. */
  onBackToMenu: () => void;
}

/* ── Shared pieces ─────────────────────────────────────────────────────────── */

function PaneShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="custom-scrollbar scroll-fade flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 pb-6 sm:px-10 sm:pb-8 sm:pt-8">{children}</div>
  );
}

/** The pane's title. On a phone it carries the back arrow to the section list. */
function PaneHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex h-12 shrink-0 items-center gap-1 sm:mb-2 sm:h-10">
      <button
        type="button"
        onClick={onBack}
        aria-label="Back to settings"
        className="-ml-3 flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors duration-hover hover:text-foreground sm:hidden"
      >
        <ChevronLeft size={18} />
      </button>
      <h2 className="text-[18px] font-medium tracking-[var(--ls-heading)] text-foreground sm:text-[16px]">{title}</h2>
    </div>
  );
}

/** A step inside a section (change a number, change the password): a back link, then the step's title. */
function StepHeader({ back, title, onBack }: { back: string; title: string; onBack: () => void }) {
  return (
    <div className="flex shrink-0 flex-col gap-1 pt-2 sm:pt-0">
      <button
        type="button"
        onClick={onBack}
        className="-ml-1 inline-flex h-10 w-fit cursor-pointer items-center gap-1 rounded-lg pr-2 text-[13px] text-muted-foreground transition-colors duration-hover hover:text-foreground"
      >
        <ChevronLeft size={16} />
        <span>{back}</span>
      </button>
      <h2 className="text-[18px] font-medium tracking-[var(--ls-heading)] text-foreground sm:text-[16px]">{title}</h2>
    </div>
  );
}

function Rows({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col divide-y divide-border/60">{children}</div>;
}

function Row({
  title,
  titleId,
  action,
  children,
}: {
  title: string;
  titleId?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span id={titleId} className="text-[14px] text-foreground">
          {title}
        </span>
        {children ? <div className="text-[12px] leading-relaxed text-muted-foreground">{children}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

const ROW_BUTTON = "h-10 px-4 text-[13px] font-medium";

function formatMobile(local: string) {
  const d = local.replace(/\D/g, "");
  return d.length === 10 ? `+233 ${d.slice(1, 3)} ${d.slice(3, 6)} ${d.slice(6)}` : local;
}

/* ── Profile ───────────────────────────────────────────────────────────────── */

type EditKind = "mobile" | "email" | "address";

export function ProfilePane({ name, data, update, onBackToMenu }: PaneProps & { name: string }) {
  const [edit, setEdit] = useState<EditKind | null>(null);
  const proxyId = `GH-${name.split(" ")[0].toUpperCase()}-01`;

  if (edit) return <ChangeDetail kind={edit} data={data} update={update} onDone={() => setEdit(null)} />;

  return (
    <PaneShell>
      <PaneHeader title="Profile" onBack={onBackToMenu} />
      <Rows>
        <Row title={name}>From your Ghana Card.</Row>
        <Row
          title="Mobile number"
          action={
            <Button variant="outline" className={ROW_BUTTON} onClick={() => setEdit("mobile")}>
              Change
            </Button>
          }
        >
          <span className="tabular">{formatMobile(data.mobile)}</span>
        </Row>
        <Row
          title="Email"
          action={
            <Button variant="outline" className={ROW_BUTTON} onClick={() => setEdit("email")}>
              Change
            </Button>
          }
        >
          <span>{data.email}</span>
        </Row>
        <Row
          title="Address"
          action={
            <Button variant="outline" className={ROW_BUTTON} onClick={() => setEdit("address")}>
              Change
            </Button>
          }
        >
          <span>{data.address}</span>
        </Row>
        <Row
          title="Proxy Pay ID"
          action={
            <Button
              variant="outline"
              className={ROW_BUTTON}
              onClick={() => {
                void navigator.clipboard?.writeText(proxyId);
                toast.success("Proxy ID copied");
              }}
            >
              Copy
            </Button>
          }
        >
          <span className="tabular">{proxyId}</span>
        </Row>
      </Rows>
    </PaneShell>
  );
}

const CHANGE_TITLE = {
  mobile: "Change mobile number",
  email: "Change email",
  address: "Change address",
} as const;

/**
 * Changing a way we reach you asks for a code sent to the current one; the address is not a credential, so it saves
 * straight away. The step stays inside the pane (no second modal on top of the first).
 */
function ChangeDetail({
  kind,
  data,
  update,
  onDone,
}: {
  kind: EditKind;
  data: SettingsData;
  update: (patch: Partial<SettingsData>) => void;
  onDone: () => void;
}) {
  const [value, setValue] = useState(kind === "address" ? data.address : "");
  const [step, setStep] = useState<"enter" | "code">("enter");
  const [code, setCode] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [wrongCode, setWrongCode] = useState(false);

  const valid =
    kind === "mobile" ? /^0\d{9}$/.test(value) : kind === "email" ? /^\S+@\S+\.\S+$/.test(value) : value.trim().length > 4;
  const currentMasked = kind === "mobile" ? maskMobile(data.mobile) : maskEmail(data.email);
  const nextMasked = kind === "mobile" ? maskMobile(value) : maskEmail(value);

  function apply() {
    if (kind === "mobile") {
      update({ mobile: value });
      toast.success("Mobile number changed");
    } else if (kind === "email") {
      update({ email: value });
      toast.success("Email changed");
    }
    onDone();
  }

  function submitEnter() {
    if (!valid) return;
    if (kind === "address") {
      update({ address: value.trim() });
      toast.success("Address updated");
      onDone();
      return;
    }
    setStep("code");
  }

  function checkCode(entered: string) {
    // Prototype: the demo code, as on the other verification screens.
    if (entered === "000000") apply();
    else {
      setWrongCode(true);
      setCode(Array(OTP_LENGTH).fill(""));
    }
  }

  if (step === "code") {
    return (
      <PaneShell>
        <StepHeader back="Back" title="Enter your code" onBack={() => { setStep("enter"); setWrongCode(false); setCode(Array(OTP_LENGTH).fill("")); }} />
        <div className="flex max-w-[440px] flex-col gap-5 pt-2">
          <div className="flex flex-wrap items-center gap-x-1 text-[13px]">
            <span className="text-muted-foreground">Code goes to</span>
            <span className="tabular text-foreground">{currentMasked}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-1 text-[13px]">
            <span className="text-muted-foreground">Changing to</span>
            <span className="tabular text-foreground">{nextMasked}</span>
          </div>
          <OtpInput
            value={code}
            onChange={(next) => {
              setWrongCode(false);
              setCode(next);
            }}
            onComplete={checkCode}
            invalid={wrongCode}
          />
          {wrongCode ? (
            <p role="alert" className="-mt-2 text-[12px] text-destructive">
              That code isn’t right. Try again.
            </p>
          ) : null}
        </div>
      </PaneShell>
    );
  }

  return (
    <PaneShell>
      <StepHeader back="Profile" title={CHANGE_TITLE[kind]} onBack={onDone} />
      <form
        className="flex max-w-[440px] flex-col gap-5 pt-2"
        onSubmit={(e) => {
          e.preventDefault();
          submitEnter();
        }}
      >
        {kind !== "address" ? (
          <div className="flex flex-wrap items-center gap-x-1 text-[13px]">
            <span className="text-muted-foreground">Code goes to</span>
            <span className="tabular text-foreground">{currentMasked}</span>
          </div>
        ) : null}
        {kind === "mobile" ? (
          <Field label="New Mobile Number" htmlFor="new-mobile">
            <PhoneInput id="new-mobile" value={value} onValueChange={setValue} />
          </Field>
        ) : kind === "email" ? (
          <Field label="New Email" htmlFor="new-email">
            <Input id="new-email" type="email" autoComplete="email" value={value} onChange={(e) => setValue(e.target.value)} />
          </Field>
        ) : (
          <Field label="Address" htmlFor="new-address">
            <Input id="new-address" autoComplete="street-address" value={value} onChange={(e) => setValue(e.target.value)} />
          </Field>
        )}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={!valid} className="h-11 px-6 text-[14px]">
            {kind === "address" ? "Save address" : "Send code"}
          </Button>
          <Button type="button" variant="ghost" className="h-11 px-3 text-[14px] text-muted-foreground" onClick={onDone}>
            Cancel
          </Button>
        </div>
      </form>
    </PaneShell>
  );
}

/* ── Security ──────────────────────────────────────────────────────────────── */

const TIMEOUT_OPTIONS = [
  { value: "5", label: "5 minutes" },
  { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" },
];

export function SecurityPane({ data, update, onBackToMenu }: PaneProps) {
  const trustedDevice = useTrustedDevice();
  const [changingPassword, setChangingPassword] = useState(false);

  if (changingPassword) return <PasswordStep onDone={() => setChangingPassword(false)} />;

  const until = trustedDevice
    ? new Date(trustedDevice.until).toLocaleDateString("en-GB", { day: "numeric", month: "long" })
    : null;

  return (
    <PaneShell>
      <PaneHeader title="Security" onBack={onBackToMenu} />
      <Rows>
        <Row
          title="Password"
          action={
            <Button variant="outline" className={ROW_BUTTON} onClick={() => setChangingPassword(true)}>
              Change
            </Button>
          }
        >
        </Row>
        <Row
          title="Sign-in PIN"
          action={
            <Button variant="outline" className={ROW_BUTTON} nativeButton={false} render={<Link href="/forgot-pin" />}>
              Reset
            </Button>
          }
        />
        <Row title="Payment approval">A one-time code for every payment.</Row>
        <Row title="Two-step sign-in">On for every customer.</Row>
        <Row
          title="This device"
          action={
            trustedDevice ? (
              <Button
                variant="outline"
                className={ROW_BUTTON}
                onClick={() => {
                  forgetThisDevice();
                  toast.success("This device will ask for a code next time");
                }}
              >
                Forget this device
              </Button>
            ) : null
          }
        >
          {until ? (
            <>
              <span>Remembered until</span> <span className="tabular">{until}</span>
            </>
          ) : (
            <span>Not remembered</span>
          )}
        </Row>
        <Row
          title="Auto-logout"
          action={
            <Select
              value={data.timeout}
              onValueChange={(next) => {
                if (!next) return;
                update({ timeout: next });
                toast.success("Auto-logout updated");
              }}
            >
              <SelectTrigger aria-label="Auto-logout" className="h-10 w-36 text-[14px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEOUT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />
      </Rows>
    </PaneShell>
  );
}

function PasswordStep({ onDone }: { onDone: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  const strong = passwordMeetsRules(next);
  const mismatch = confirm.length > 0 && confirm !== next;
  const ready = current.length > 0 && strong && next === confirm;

  return (
    <PaneShell>
      <StepHeader back="Security" title="Change password" onBack={onDone} />
      <form
        className="flex max-w-[440px] flex-col gap-5 pt-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!ready) return;
          toast.success("Password updated");
          onDone();
        }}
      >
        <Field label="Current Password" htmlFor="current-password">
          <Input id="current-password" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </Field>
        <Field
          label="New Password"
          htmlFor="new-password"
        >
          <Input id="new-password" type="password" autoComplete="new-password" placeholder={PASSWORD_RULES.map((r) => r.label).join(", ")} value={next} onChange={(e) => setNext(e.target.value)} />
        </Field>
        <Field label="Confirm New Password" htmlFor="confirm-password" error={mismatch ? "The passwords don’t match." : null}>
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            aria-invalid={mismatch || undefined}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </Field>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={!ready} className="h-11 px-6 text-[14px]">
            Update password
          </Button>
          <Button type="button" variant="ghost" className="h-11 px-3 text-[14px] text-muted-foreground" onClick={onDone}>
            Cancel
          </Button>
        </div>
      </form>
    </PaneShell>
  );
}

/* ── Preferences ───────────────────────────────────────────────────────────── */

const THEME_CHOICES = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
] as const;

export function PreferencesPane({ onBackToMenu }: PaneProps) {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, languages } = useTranslation();
  const current = theme ?? "system";
  const themeId = useId();

  function choose(value: (typeof THEME_CHOICES)[number]["value"]) {
    const target = value === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : value;
    switchTheme(target, () => setTheme(value));
  }

  return (
    <PaneShell>
      <PaneHeader title="Preferences" onBack={onBackToMenu} />
      <Rows>
        <Row
          title="Theme"
          titleId={themeId}
          action={
            <div role="radiogroup" aria-labelledby={themeId} className="flex gap-1 rounded-xl bg-muted/60 p-1">
              {THEME_CHOICES.map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={current === value}
                  onClick={() => choose(value)}
                  className={cn(
                    "flex h-8 cursor-pointer items-center gap-2 rounded-lg px-3 text-[13px] font-medium transition-colors duration-hover",
                    current === value ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon size={14} aria-hidden="true" />
                  <span className="max-sm:sr-only">{label}</span>
                </button>
              ))}
            </div>
          }
        />
        <Row
          title="Language"
          action={
            <Select
              value={language}
              onValueChange={(next) => {
                if (next) setLanguage(next as typeof language);
              }}
            >
              <SelectTrigger aria-label="Language" className="h-10 w-40 text-[14px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languages.map((l) => (
                  <SelectItem key={l.code} value={l.code}>
                    {l.nativeName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />
      </Rows>
    </PaneShell>
  );
}

/* ── Alerts ────────────────────────────────────────────────────────────────── */

function SwitchRow({
  title,
  checked,
  onChange,
  children,
}: {
  title: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  children: React.ReactNode;
}) {
  const id = useId();
  return (
    <Row
      title={title}
      titleId={id}
      action={
        <Switch
          checked={checked}
          aria-labelledby={id}
          onCheckedChange={(next) => {
            onChange(next);
            toast.success("Saved");
          }}
        />
      }
    >
      {children}
    </Row>
  );
}

export function AlertsPane({ data, update, onBackToMenu }: PaneProps) {
  return (
    <PaneShell>
      <PaneHeader title="Alerts" onBack={onBackToMenu} />
      <Rows>
        <SwitchRow title="SMS alerts" checked={data.smsAlerts} onChange={(next) => update({ smsAlerts: next })}>
          Every debit and credit.
        </SwitchRow>
        <SwitchRow title="Email receipts" checked={data.emailReceipts} onChange={(next) => update({ emailReceipts: next })}>
          After each payment.
        </SwitchRow>
        <SwitchRow title="E-statements" checked={data.eStatements} onChange={(next) => update({ eStatements: next })}>
          On the 1st of each month.
        </SwitchRow>
      </Rows>
      <p className={cn("pt-3 text-[12px] leading-relaxed text-muted-foreground")}>
        Sign-in and new-device alerts are always on.
      </p>
    </PaneShell>
  );
}
