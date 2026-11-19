"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { DURATION, EASE } from "@/lib/motion";
import { ChevronLeft, ChevronRight, Copy, Globe, Landmark, Laptop, Monitor, Moon, Smartphone, Sun, Zap } from "@/components/ui/icons";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { SimpleTooltip } from "@/components/ui/tooltip";
import OtpInput, { OTP_LENGTH } from "@/components/auth/OtpInput";
import RuleChecklist from "@/components/auth/RuleChecklist";
import PinRequirements from "@/components/auth/PinRequirements";
import { DASHBOARD_COLORS, useDashboardColor } from "@/lib/dashboard-color";
import { PASSWORD_RULES, hasConsecutiveDigits, hasRepeatingDigits, maskEmail, passwordMeetsRules } from "@/lib/auth-shared";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { useSession, useSessionHydrated } from "@/lib/session-store";
import { forgetThisDevice, thisDeviceName, useTrustedDevice } from "@/lib/device-trust";
import { otherTrustedDevicesFor, useTrustedDevices, type DeviceKind } from "@/lib/trusted-devices";
import { shrinkPhoto, useProfilePhoto, useProfilePhotos } from "@/lib/profile-photo";
import { switchTheme } from "@/lib/theme-transition";
import { cn } from "@/lib/utils";
import { LIMITS, limitFor, useLimits, usedToday, type LimitDef, type LimitKind } from "@/lib/limits";
import { accountsForProfile, formatMoney } from "@/lib/mock-data";
import { roundMoney } from "@/lib/money";
import { useAmountVisibility } from "@/components/providers/AmountVisibilityProvider";
import { GcbEagleEmblem } from "@/components/brand/GcbEagleEmblem";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { SHOW_DEMO_TOOLS } from "@/lib/demo-tools";
import { DEMO_REFERRED_FRIENDS, referralCodeFor, referralLinkFor, referredFriendsFor, type ReferralStatus } from "@/lib/referrals";

export interface SettingsData {
  /** Local form, "0241234567". It is the login ID. */
  mobile: string;
  email: string;
  smsAlerts: boolean;
  emailReceipts: boolean;
  eStatements: boolean;
  /** Tell me when someone joins with my referral link or code. */
  referralAlerts: boolean;
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

/**
 * Set by a step's back arrow (in the click handler), so the pane it returns to slides in from the left. Everything
 * else that opens a step slides it in from the right, like pushing a page. Read once when a page mounts.
 */
const stepNav = { back: false };

/** A pane's scroll area. `step` names an inner page (Change email, a limit); a new name slides in like a pushed page. */
function PaneShell({ children, step }: { children: React.ReactNode; step?: string }) {
  return (
    <SlidePage key={step ?? "root"} step={step}>
      {children}
    </SlidePage>
  );
}

function SlidePage({ children, step }: { children: React.ReactNode; step?: string }) {
  const [offset] = useState(() => (stepNav.back ? -24 : step ? 24 : 0));
  useEffect(() => {
    stepNav.back = false;
  }, []);
  return (
    <motion.div
      initial={offset ? { x: offset, opacity: 0 } : false}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: DURATION.move, ease: EASE.settle }}
      className="custom-scrollbar scroll-fade flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 pb-6 sm:px-6 sm:pb-4 sm:pt-2"
    >
      {children}
    </motion.div>
  );
}

/**
 * The pane's title, and an optional one-line subtitle under it. On a phone it carries the back arrow to the section
 * list. Use the subtitle only when the page needs one; most panes are a title alone.
 */
function PaneHeader({
  title,
  description,
  onBack,
  action,
}: {
  title: string;
  description?: string;
  onBack: () => void;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex shrink-0 items-start gap-1">
      <button
        type="button"
        onClick={onBack}
        aria-label="Back to settings"
        className="-ml-3 mt-1 flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors duration-hover hover:text-foreground sm:hidden"
      >
        <ChevronLeft size={18} />
      </button>
      {/* The title row keeps one height on every pane, so titles start at the same place with or without a subtitle. */}
      <div className="flex min-w-0 flex-col">
        <h2 className="flex h-12 items-center text-h3 font-medium tracking-[var(--ls-heading)] text-foreground sm:h-10 sm:text-h4">{title}</h2>
        {description ? <p className="-mt-1 text-body leading-relaxed text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="ml-auto shrink-0">{action}</div> : null}
    </div>
  );
}

/** An inner page's header: the back arrow and the page's title on one line, the same height as a pane title. */
function StepHeader({ back, title, onBack }: { back: string; title: string; onBack: () => void }) {
  return (
    <div className="mb-4 flex h-12 shrink-0 items-center gap-1 sm:h-10">
      <button
        type="button"
        onClick={() => {
          stepNav.back = true;
          onBack();
        }}
        aria-label={`Back to ${back}`}
        className="-ml-3 flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors duration-hover hover:text-foreground"
      >
        <ChevronLeft size={18} />
      </button>
      <h2 className="min-w-0 truncate text-h3 font-medium tracking-[var(--ls-heading)] text-foreground sm:text-h4">{title}</h2>
    </div>
  );
}

/** A pane's list. The first row has no top padding, so every pane's content starts the same distance below its title. */
function Rows({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex flex-col gap-2 [&>*:first-child]:pt-0", className)}>{children}</div>;
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
    <div className="flex items-center justify-between gap-4 py-4 sm:py-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span id={titleId} className="text-body text-foreground">
          {title}
        </span>
        {children ? <div className="text-caption leading-relaxed text-muted-foreground">{children}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}


function formatMobile(local: string) {
  const d = local.replace(/\D/g, "");
  return d.length === 10 ? `+233 ${d.slice(1, 3)} ${d.slice(3, 6)} ${d.slice(6)}` : local;
}

/* ── Profile ───────────────────────────────────────────────────────────────── */

/** A fact about the customer: the label small and muted, the value under it at body size, an action on the right. */
function FactRow({ label, action, children }: { label: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 sm:py-3">
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-caption text-muted-foreground">{label}</span>
        <span className="min-w-0 truncate text-body text-foreground">{children}</span>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/**
 * The picture shown in the header and the account menu: the photo when there is one, otherwise the initials. Picking a
 * file swaps it straight away (it's easy to change back), and Remove returns to the initials.
 */
function ProfilePhotoRow({ name }: { name: string }) {
  const actorId = useSession((s) => s.actor?.id);
  const photo = useProfilePhoto(actorId);
  const setPhoto = useProfilePhotos((s) => s.setPhoto);
  const removePhoto = useProfilePhotos((s) => s.removePhoto);
  const inputId = useId();
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");

  async function pick(file: File | undefined) {
    if (!file || !actorId) return;
    try {
      setPhoto(actorId, await shrinkPhoto(file));
      toast.success("Profile photo updated");
    } catch {
      toast.error("That file isn’t a photo we can use. Try a JPG or PNG.");
    }
  }

  return (
    <div className="flex items-center gap-4 pb-4 pt-2 sm:pb-2 sm:pt-0">
      {/* eslint-disable-next-line no-restricted-syntax -- avatar initials */}
      <span className="flex size-24 shrink-0 sm:size-20 items-center justify-center overflow-hidden rounded-full bg-primary text-[28px] font-medium text-primary-foreground">
        {/* eslint-disable-next-line @next/next/no-img-element -- a small data URL from the profile photo store */}
        {photo ? <img src={photo} alt="" className="size-full object-cover" /> : initials}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <input
          id={inputId}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            void pick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <Button variant="outline" size="sm" nativeButton={false} render={<label htmlFor={inputId} />}>
          {photo ? "Change Photo" : "Upload Photo"}
        </Button>
        {photo && actorId && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              removePhoto(actorId);
              toast.success("Profile photo removed");
            }}
          >
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}

/** "10 November 2026 at 9:42 am". */
function formatSignIn(ms: number) {
  const d = new Date(ms);
  const date = d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const time = d.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${date} at ${time}`;
}

/**
 * Who the bank knows you as. The name comes from the Ghana Card and the mobile number is the login ID, so neither is
 * changed here. Email is the one contact detail the customer changes themselves, behind a code. The last login is a
 * quiet security check: if it isn't you, you'll see it here.
 */
export function ProfilePane({ name, data, update, onBackToMenu }: PaneProps & { name: string }) {
  const [editing, setEditing] = useState(false);
  const previousSignIn = useSession((s) => s.previousSignIn);
  const proxyId = `GH-${name.split(" ")[0].toUpperCase()}-01`;

  if (editing) return <ChangeEmail data={data} update={update} onDone={() => setEditing(false)} />;

  return (
    <PaneShell>
      <PaneHeader title="Profile" onBack={onBackToMenu} />
      <ProfilePhotoRow name={name} />
      <Rows>
        <FactRow label="Full Name">{name}</FactRow>
        <FactRow label="Mobile Number">
          <span className="tabular">{formatMobile(data.mobile)}</span>
        </FactRow>
        <FactRow
          label="Email"
          action={
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              Change
            </Button>
          }
        >
          {data.email}
        </FactRow>
        <FactRow
          label="Proxy Pay ID"
          action={
            <Button
              variant="outline"
              size="sm"
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
        </FactRow>
        <FactRow label="Last Login">
          <span className="tabular" suppressHydrationWarning>
            {previousSignIn ? formatSignIn(previousSignIn) : "This is your first login"}
          </span>
        </FactRow>
      </Rows>
    </PaneShell>
  );
}

/** Changing the email asks for a code sent to the current one. The step stays inside the pane (no second modal on top of the first). */
function ChangeEmail({ data, update, onDone }: { data: SettingsData; update: (patch: Partial<SettingsData>) => void; onDone: () => void }) {
  const [value, setValue] = useState("");
  const [step, setStep] = useState<"enter" | "code">("enter");
  const [code, setCode] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [wrongCode, setWrongCode] = useState(false);

  const sameAsNow = value.trim().toLowerCase() === data.email.toLowerCase();
  const valid = /^\S+@\S+\.\S+$/.test(value) && !sameAsNow;
  const currentMasked = maskEmail(data.email);

  function checkCode(entered: string) {
    // Prototype: the demo code, as on the other verification screens.
    if (entered === "000000") {
      update({ email: value });
      toast.success("Email changed");
      onDone();
    } else {
      setWrongCode(true);
      setCode(Array(OTP_LENGTH).fill(""));
    }
  }

  if (step === "code") {
    return (
      <PaneShell step="Enter your code">
        <StepHeader back="Back" title="Enter your code" onBack={() => { setStep("enter"); setWrongCode(false); setCode(Array(OTP_LENGTH).fill("")); }} />
        <div className="mx-auto flex w-full max-w-[440px] flex-col gap-5 pt-2">
          <div className="flex flex-wrap items-center gap-x-1 text-body">
            <span className="text-muted-foreground">Code goes to</span>
            <span className="tabular text-foreground">{currentMasked}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-1 text-body">
            <span className="text-muted-foreground">Changing to</span>
            <span className="tabular text-foreground">{maskEmail(value)}</span>
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
            <p role="alert" className="-mt-2 text-caption text-destructive">
              That code isn’t right. Try again.
            </p>
          ) : null}
        </div>
      </PaneShell>
    );
  }

  return (
    <PaneShell step="Change email">
      <StepHeader back="Profile" title="Change email" onBack={onDone} />
      <form
        className="mx-auto flex w-full max-w-[440px] flex-col gap-5 pt-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) setStep("code");
        }}
      >
        <p className="text-body leading-relaxed text-muted-foreground">
          We’ll send a code to <span className="text-foreground">{currentMasked}</span> to confirm it’s you.
        </p>
        <Field label="New Email" htmlFor="new-email" error={sameAsNow ? "That’s already your email." : undefined}>
          <Input
            id="new-email"
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            value={value}
            aria-invalid={sameAsNow || undefined}
            onChange={(e) => setValue(e.target.value)}
          />
        </Field>
        <Button type="submit" size="xl" disabled={!valid} className="w-full">
          Send Code
        </Button>
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

const DEVICE_ICONS = { laptop: Laptop, phone: Smartphone, desktop: Monitor } as const;
const DEVICE_KIND_LABEL = { laptop: "Computer", phone: "Phone", desktop: "Computer" } as const;

function formatWhen(ms: number) {
  const d = new Date(ms);
  const date = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const time = d.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();
  return `${date}, ${time}`;
}

function formatDay(ms: number) {
  return new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "long" });
}

interface TrustedRow {
  id: string;
  kind: DeviceKind;
  name: string;
  detail: string;
}

/**
 * Its own section in the Safety group. The devices that skip the one-time code. There is one session at a time, so
 * nothing here is "logged in now": removing a device only ends its trust. State lives in `lib/trusted-devices.ts`;
 * this browser is built from the live trust state, never from the seed.
 */
export function DevicesPane({ onBackToMenu }: PaneProps) {
  const actor = useSession((s) => s.actor);
  const trustedHere = useTrustedDevice();
  const removed = useTrustedDevices((s) => (actor ? s.removed[actor.id] : undefined));
  const removeDevice = useTrustedDevices((s) => s.removeDevice);
  const hydrated = useSessionHydrated();

  const rows = useMemo<TrustedRow[]>(() => {
    if (!actor) return [];
    const list: TrustedRow[] = [];
    if (trustedHere && trustedHere.actorId === actor.id) {
      list.push({ id: "this", kind: "laptop", name: thisDeviceName(), detail: `Trusted until ${formatDay(trustedHere.until)}` });
    }
    for (const d of otherTrustedDevicesFor(actor.id, removed ?? [])) {
      list.push({ id: d.id, kind: d.kind, name: d.name, detail: `Last used ${formatWhen(d.lastUsed)}` });
    }
    return list;
  }, [actor, trustedHere, removed]);

  if (!hydrated || !actor) return null;

  return (
    <PaneShell>
      <PaneHeader title="Trusted devices" onBack={onBackToMenu} />
      {rows.length === 0 ? (
        <p className="text-body leading-relaxed text-muted-foreground">
          No trusted devices. Tick “Remember this device” when you log in on a device you use, and you won’t need a code there next time.
        </p>
      ) : (
        <Rows>
          {rows.map((d) => {
            const Icon = DEVICE_ICONS[d.kind];
            return (
              <div key={d.id} className="flex items-center gap-4 py-4 sm:py-3">
                <Icon size={18} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-body font-medium text-foreground">{d.name}</span>
                  <span className="tabular text-caption text-muted-foreground">{[DEVICE_KIND_LABEL[d.kind], d.detail].join(" · ")}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (d.id === "this") forgetThisDevice();
                    else removeDevice(actor.id, d.id);
                    toast(`Removed ${d.name}. It will need a code next time.`);
                  }}
                >
                  Remove
                </Button>
              </div>
            );
          })}
        </Rows>
      )}
    </PaneShell>
  );
}

export function SecurityPane({ data, update, onBackToMenu }: PaneProps) {
  const [changingPassword, setChangingPassword] = useState(false);
  const [changingPin, setChangingPin] = useState(false);

  if (changingPassword) return <PasswordStep onDone={() => setChangingPassword(false)} />;
  if (changingPin) return <PinStep onDone={() => setChangingPin(false)} />;

  return (
    <PaneShell>
      <PaneHeader title="Security" onBack={onBackToMenu} />
      <Rows>
        <Row
          title="Password"
          action={
            <Button variant="outline" size="sm" onClick={() => setChangingPassword(true)}>
              Change
            </Button>
          }
        >
        </Row>
        <Row
          title="Login PIN"
          action={
            <Button variant="outline" size="sm" onClick={() => setChangingPin(true)}>
              Change
            </Button>
          }
        />
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
              <SelectTrigger size="sm" aria-label="Auto-logout" className="w-36">
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
    <PaneShell step="Change password">
      <StepHeader back="Security" title="Change password" onBack={onDone} />
      <form
        className="mx-auto flex w-full max-w-[440px] flex-col gap-5 pt-2"
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
        <div className="flex flex-col gap-3">
          <Field label="New Password" htmlFor="new-password">
            <Input id="new-password" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
          </Field>
          {/* The live checklist: the one kind of line allowed under a field (CONSTITUTION §9). */}
          <RuleChecklist
            label="Password requirements"
            rules={PASSWORD_RULES.map((rule) => ({ id: rule.id, label: rule.label, state: rule.test(next) ? "met" : "pending" }))}
          />
        </div>
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
        <Button type="submit" size="xl" disabled={!ready} className="w-full">
          Update Password
        </Button>
      </form>
    </PaneShell>
  );
}

type PinStage = "current" | "new" | "confirm";

const BLANK_PIN = ["", "", "", ""];
const PIN_STAGE_COPY: Record<PinStage, { title: string; description: string; action: string }> = {
  current: {
    title: "Enter Your Current PIN",
    description: "Confirm it’s you before we change your PIN.",
    action: "Continue",
  },
  new: {
    title: "Choose a New PIN",
    description: "Pick a 4-digit PIN you’ll remember. You’ll use it to log in.",
    action: "Continue",
  },
  confirm: {
    title: "Confirm Your New PIN",
    description: "Re-enter your new 4-digit PIN.",
    action: "Change PIN",
  },
};

/**
 * Change the login PIN in three steps: current PIN, new PIN, confirm. Settings only; the Forgot PIN flow (selfie
 * check) stays on the login screen. Prototype: any PIN except 0000 counts as the current one, as in useAuthorisation.
 */
function PinStep({ onDone }: { onDone: () => void }) {
  const [stage, setStage] = useState<PinStage>("current");
  const [current, setCurrent] = useState<string[]>(BLANK_PIN);
  const [next, setNext] = useState<string[]>(BLANK_PIN);
  const [confirm, setConfirm] = useState<string[]>(BLANK_PIN);
  const [error, setError] = useState("");

  const digits = stage === "current" ? current : stage === "new" ? next : confirm;
  const setDigits = (value: string[]) => {
    setError("");
    if (stage === "current") setCurrent(value);
    else if (stage === "new") setNext(value);
    else setConfirm(value);
  };
  const code = digits.join("");
  const copy = PIN_STAGE_COPY[stage];

  function goBack() {
    setError("");
    if (stage === "current") {
      onDone();
    } else if (stage === "new") {
      setCurrent(BLANK_PIN);
      setStage("current");
    } else {
      setConfirm(BLANK_PIN);
      setStage("new");
    }
  }

  function submit() {
    if (code.length < 4) return;
    if (stage === "current") {
      if (code === "0000") {
        setError("That PIN isn’t right. Try again.");
        setCurrent(BLANK_PIN);
        return;
      }
      setStage("new");
      return;
    }
    if (stage === "new") {
      if (hasConsecutiveDigits(code)) {
        setError("PIN cannot contain consecutive numbers.");
        return;
      }
      if (hasRepeatingDigits(code)) {
        setError("PIN cannot contain repeating numbers.");
        return;
      }
      setStage("confirm");
      return;
    }
    if (code !== next.join("")) {
      setError("PINs don’t match. Try again.");
      setConfirm(BLANK_PIN);
      return;
    }
    toast.success("Login PIN changed");
    onDone();
  }

  return (
    <PaneShell step="Change Login PIN">
      <StepHeader back={stage === "current" ? "Security" : "Back"} title="Change Login PIN" onBack={goBack} />
      <form
        key={stage}
        className="mx-auto flex w-full max-w-[440px] flex-col items-center gap-5 pt-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="flex flex-col gap-1 text-center">
          <span className="text-h4 font-medium text-foreground">{copy.title}</span>
          <span className="text-body text-muted-foreground">{copy.description}</span>
        </div>
        <div className="w-full">
          <OtpInput value={digits} onChange={setDigits} length={4} mask invalid={!!error} autoFocus />
        </div>
        {stage === "new" && <PinRequirements pin={code} />}
        {error && (
          <p role="alert" className="-mt-2 text-center text-body text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" size="xl" disabled={code.length < 4} className="w-full">
          {copy.action}
        </Button>
      </form>
    </PaneShell>
  );
}

/**
 * A small sketch of the dashboard: the hero panel in the chosen backdrop (it reads the live `--hero-*` tokens, so it
 * changes the moment a swatch is picked) over the sheet of panels. Decorative; hidden from assistive tech.
 */
function DashboardPreview() {
  return (
    <div
      aria-hidden="true"
      className="relative h-40 overflow-hidden rounded-2xl border border-border/80 bg-muted/40"
      // The whole box fades out at the bottom and both sides, so it reads as a glimpse rather than a framed card.
      style={{
        maskImage: "linear-gradient(to bottom, black 55%, transparent 100%), linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)",
        maskComposite: "intersect",
        WebkitMaskImage: "linear-gradient(to bottom, black 55%, transparent 100%), linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)",
        WebkitMaskComposite: "source-in",
      }}
    >
      <div
        className="absolute inset-x-[12%] top-6 h-24 rounded-t-xl border border-[var(--hero-border)] transition-colors duration-reveal"
        style={{ background: "linear-gradient(180deg, var(--hero-surface) 0%, color-mix(in srgb, var(--hero-surface) 70%, var(--hero-wave-b)) 100%)" }}
      >
        <span className="absolute left-[6%] top-4 h-3 w-[14%] rounded-full bg-[var(--hero-foreground)] opacity-20" />
        <span className="absolute bottom-6 left-[6%] h-3 w-[26%] rounded-full bg-[var(--hero-foreground)] opacity-20" />
        <span className="absolute bottom-6 right-[24%] h-3 w-[18%] rounded-full bg-[var(--hero-primary)] opacity-80" />
        <span className="absolute bottom-6 right-[4%] h-3 w-[18%] rounded-full bg-[var(--hero-foreground)] opacity-20" />
      </div>
      <div className="absolute inset-x-[11%] top-[7.5rem] flex h-12 gap-2 rounded-t-xl border border-border/80 bg-card p-2">
        <span className="flex-1 rounded-lg bg-muted" />
        <span className="flex-1 rounded-lg bg-muted" />
        <span className="flex-1 rounded-lg bg-muted" />
      </div>
    </div>
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
  const colorId = useId();
  const dashColor = useDashboardColor((s) => s.color);
  const setDashColor = useDashboardColor((s) => s.setColor);

  function choose(value: (typeof THEME_CHOICES)[number]["value"]) {
    const target = value === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : value;
    switchTheme(target, () => setTheme(value));
  }

  return (
    <PaneShell>
      <PaneHeader title="Appearance" onBack={onBackToMenu} />
      <div className="flex flex-col gap-8">
        {/* Theme as three tiles, icon over label, full width under its title. */}
        <div className="flex flex-col gap-3">
          <span id={themeId} className="text-body text-foreground">
            Theme
          </span>
          <div role="radiogroup" aria-labelledby={themeId} className="grid grid-cols-3 gap-2">
            {THEME_CHOICES.map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={current === value}
                onClick={() => choose(value)}
                className={cn(
                  "flex h-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border text-caption transition-colors duration-hover",
                  current === value
                    ? "border-[var(--active-border)] bg-[var(--active-bg)] text-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
              >
                <Icon size={16} aria-hidden="true" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
        <DashboardPreview />

        {/* The dashboard hero's colour. Personal only; saved on this device (lib/dashboard-color.ts). */}
        <div className="flex flex-col gap-3">
          <span id={colorId} className="text-body text-foreground">
            Choose a backdrop
          </span>
          <div role="radiogroup" aria-labelledby={colorId} className="flex flex-wrap gap-3">
            {DASHBOARD_COLORS.map(({ id, label }) => (
              <SimpleTooltip key={id} content={label} side="bottom" delay={0}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={dashColor === id}
                  aria-label={label}
                  onClick={() => setDashColor(id)}
                  className={cn(
                    "flex size-10 cursor-pointer items-center justify-center rounded-full border-2 transition-colors duration-hover",
                    dashColor === id ? "border-foreground" : "border-transparent hover:border-border",
                  )}
                >
                  <span className="size-8 rounded-full" style={{ background: `var(--swatch-${id})` }} />
                </button>
              </SimpleTooltip>
            ))}
          </div>
        </div>
        <Row
          title="Language"
          action={
            <Select
              value={language}
              onValueChange={(next) => {
                if (next) setLanguage(next as typeof language);
              }}
            >
              <SelectTrigger size="sm" aria-label="Language" className="w-40">
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
      </div>
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
      <PaneHeader title="Notifications" onBack={onBackToMenu} />
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
        <SwitchRow title="Referrals" checked={data.referralAlerts} onChange={(next) => update({ referralAlerts: next })}>
          When someone joins with your link or code.
        </SwitchRow>
      </Rows>
      <p className={cn("pt-3 text-caption leading-relaxed text-muted-foreground")}>
        Every notification also shows in the app, under Notifications. Login and new-device alerts are always on.
      </p>
    </PaneShell>
  );
}

/* ── Refer a Friend ────────────────────────────────────────────────────────── */

const REFERRAL_DEV_STATES = ["as-is", "empty", "populated"] as const;
type ReferralDevState = (typeof REFERRAL_DEV_STATES)[number];
const REFERRAL_DEV_LABELS: Record<ReferralDevState, string> = { "as-is": "As is", empty: "Empty", populated: "Populated" };

const REFERRAL_STATUS: Record<ReferralStatus, string> = {
  signed_up: "Signed up",
  opened: "Opened an account",
};

function formatReferralDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/**
 * The customer's own code, two ways to share it, and who has joined with it. There's no reward until the bank confirms
 * one, so nothing here promises money (lib/referrals.ts).
 */
export function ReferralPane({ onBackToMenu }: PaneProps) {
  const actor = useSession((s) => s.actor);
  const [showFriends, setShowFriends] = useState(false);
  // Dev Mode: show the empty or the populated state whatever the persona has. "As is" is the persona's real list.
  const [devState, setDevState] = useState<ReferralDevState>("as-is");
  if (!actor) return null;
  const code = referralCodeFor(actor);
  const link = referralLinkFor(code);
  const own = referredFriendsFor(actor.id);
  const shown = devState === "empty" ? [] : devState === "populated" && own.length === 0 ? DEMO_REFERRED_FRIENDS : own;
  const friends = [...shown].sort((a, b) => b.date.localeCompare(a.date));
  // On the screen itself, not in the Dev Mode menu, which sits behind the Settings modal.
  const switcher = SHOW_DEMO_TOOLS ? (
    <div className="mt-auto flex items-center gap-3 pt-10 opacity-60 transition-opacity duration-hover hover:opacity-100">
      <span className="text-caption text-muted-foreground">Demo</span>
      <SegmentedControl
        aria-label="Referrals demo state"
        options={REFERRAL_DEV_STATES.map((id) => ({ value: id, label: REFERRAL_DEV_LABELS[id] }))}
        value={devState}
        onChange={setDevState}
      />
    </div>
  ) : null;
  const message = `I bank with GCB. Join with my code ${code}: ${link}`;

  const copy = async (text: string, done: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(done);
    } catch {
      toast("Couldn’t copy. Select it and copy it instead.");
    }
  };

  // The phone's share sheet where there is one; otherwise WhatsApp, which is how most people here share.
  const share = () => {
    if (typeof navigator.share === "function") {
      navigator.share({ text: message }).catch(() => {});
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    }
  };

  if (showFriends && friends.length > 0) {
    return (
      <PaneShell step="Your Referrals">
        <StepHeader back="Refer a Friend" title="Your Referrals" onBack={() => setShowFriends(false)} />
        <Rows>
          {friends.map((f) => (
            <div key={f.id} className="flex items-center gap-4 py-4 sm:py-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-caption font-medium text-muted-foreground">
                {f.name.split(" ").map((p) => p[0]).join("")}
              </span>
              <span className="min-w-0 flex-1 truncate text-body text-foreground">{f.name}</span>
              <span className="flex flex-col items-end gap-0.5 text-caption">
                <span className={cn(f.status === "opened" ? "text-foreground" : "text-muted-foreground")}>{REFERRAL_STATUS[f.status]}</span>
                <span className="tabular text-muted-foreground">{formatReferralDate(f.date)}</span>
              </span>
            </div>
          ))}
        </Rows>
        {switcher}
      </PaneShell>
    );
  }

  return (
    <PaneShell>
      <PaneHeader title="Refer a Friend" onBack={onBackToMenu} />
      <div className="mx-auto flex w-full max-w-[520px] flex-col gap-4">
        <section className="flex flex-col items-center gap-6 rounded-2xl border border-border/80 px-5 py-8 text-center sm:px-10 sm:py-10">
          <GcbEagleEmblem className="h-12 w-auto" />
          <div className="flex flex-col gap-2">
            <h3 className="text-h1 font-medium tracking-[var(--ls-heading)] text-foreground">Invite others to GCB</h3>
            <p className="text-body leading-relaxed text-muted-foreground">Send your link. Friends who open it join with you already filled in.</p>
          </div>
          <div className="flex w-full max-w-[380px] flex-col gap-3">
            <div className="flex h-[var(--control-xl)] items-center justify-between gap-2 rounded-lg border border-field-border bg-field pl-4 pr-1">
              <span className="tabular min-w-0 select-all truncate text-body text-foreground">{link.replace(/^https?:\/\//, "")}</span>
              <Button variant="ghost" size="md" aria-label="Copy link" onClick={() => copy(link, "Link copied")}>
                <Copy size={18} aria-hidden="true" />
              </Button>
            </div>
            <Button size="xl" className="w-full" onClick={share}>
              Share Your Link
            </Button>
            <p className="text-body text-muted-foreground">
              Or give them your code{" "}
              <button
                type="button"
                onClick={() => copy(code, "Code copied")}
                className="tabular cursor-pointer font-medium text-foreground underline decoration-border underline-offset-4 transition-colors duration-hover hover:decoration-foreground"
              >
                {code}
              </button>
            </p>
          </div>
        </section>

        {friends.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowFriends(true)}
            className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-border/80 px-5 py-4 text-left transition duration-hover hover:bg-muted/50"
          >
            <span className="flex flex-col gap-1">
              <span className="text-caption text-muted-foreground">Your referrals</span>
              <span className="tabular text-h4 text-foreground">{`${friends.length} signed up`}</span>
            </span>
            <ChevronRight size={20} className="shrink-0 text-muted-foreground" aria-hidden="true" />
          </button>
        ) : (
          <p className="px-1 text-center text-body leading-relaxed text-muted-foreground">
            No one has joined with your code yet. When they do, they’ll show here.
          </p>
        )}
      </div>
      {switcher}
    </PaneShell>
  );
}

/* ── Limits ────────────────────────────────────────────────────────────────── */

/** Each kind of payment's daily limit. The whole row opens the change step, inside the pane (never a second modal). */
export function LimitsPane({ onBackToMenu }: PaneProps) {
  const actor = useSession((s) => s.actor);
  const custom = useLimits((s) => (actor ? s.custom[actor.id] : undefined));
  const { showAmounts } = useAmountVisibility();
  const [editing, setEditing] = useState<LimitDef | null>(null);
  // Demo only: the ledger has nothing dated today, so this fills the bars without posting payments.
  const [devUse, setDevUse] = useState<LimitDevUse>("live");
  if (!actor) return null;
  const accountIds = accountsForProfile().map((a) => a.id);
  const spent = (def: LimitDef, limit: number) =>
    devUse === "live" ? usedToday(def.kind, accountIds) : roundMoney(limit * DEMO_LIMIT_USE[devUse][def.kind]);

  if (editing) {
    const current = limitFor(custom, editing);
    return <ChangeLimit key={editing.kind} def={editing} actorId={actor.id} current={current} used={spent(editing, current)} onDone={() => setEditing(null)} />;
  }

  return (
    <PaneShell>
      <PaneHeader title="Limits" description="Control your spending by setting limits on payments." onBack={onBackToMenu} />
      <div className="flex flex-col">
        {LIMITS.map((def) => {
          const value = limitFor(custom, def);
          const used = spent(def, value);
          return <LimitBar key={def.kind} def={def} limit={value} used={used} own={value !== def.standard} showAmounts={showAmounts} onOpen={() => setEditing(def)} />;
        })}
      </div>
      {SHOW_DEMO_TOOLS ? (
        <div className="mt-auto flex pt-10 items-center gap-3 opacity-60 transition-opacity duration-hover hover:opacity-100">
          <span className="text-caption text-muted-foreground">Demo</span>
          <SegmentedControl
            aria-label="Limits demo usage"
            options={LIMIT_DEV_USE.map((id) => ({ value: id, label: LIMIT_DEV_LABELS[id] }))}
            value={devUse}
            onChange={setDevUse}
          />
        </div>
      ) : null}
    </PaneShell>
  );
}

const LIMIT_DEV_USE = ["live", "some", "near"] as const;
type LimitDevUse = (typeof LIMIT_DEV_USE)[number];
const LIMIT_DEV_LABELS: Record<LimitDevUse, string> = { live: "Live", some: "Some used", near: "Near a limit" };
/** Share of each limit gone today, per demo state. */
const DEMO_LIMIT_USE: Record<Exclude<LimitDevUse, "live">, Record<LimitKind, number>> = {
  some: { transfers: 0.32, wallets: 0.4, bills: 0.05, international: 0 },
  near: { transfers: 0.32, wallets: 0.86, bills: 0.05, international: 0 },
};

const LIMIT_ICONS: Record<LimitKind, typeof Landmark> = { transfers: Landmark, wallets: Smartphone, bills: Zap, international: Globe };

/** One kind of payment: what's left today and a thin bar of what's gone (from the ledger). The whole row opens the change step. */
function LimitBar({
  def,
  limit,
  used,
  own,
  showAmounts,
  onOpen,
}: {
  def: LimitDef;
  limit: number;
  used: number;
  own: boolean;
  showAmounts: boolean;
  onOpen: () => void;
}) {
  const share = limit > 0 ? Math.min(used / limit, 1) : 0;
  const near = share >= 0.75;
  const Icon = LIMIT_ICONS[def.kind];
  const num = (n: number) => (showAmounts ? n.toLocaleString("en-GB", { maximumFractionDigits: 0 }) : "∗∗∗");
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${def.label}: ${formatMoney(used, "GHS", showAmounts)} sent of ${formatMoney(limit, "GHS", showAmounts)} today${own ? ", set by you" : ""}`}
      className="-mx-3 flex cursor-pointer items-center gap-5 rounded-xl px-3 py-5 text-left transition duration-hover hover:bg-muted/50"
    >
      <span className="flex size-6 shrink-0 items-center justify-center text-muted-foreground">
        <Icon size={18} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1 truncate text-body text-foreground">{def.label}</span>
      <span className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-muted sm:w-36" aria-hidden="true">
        <span
          className={cn("block h-full rounded-full transition-[width] duration-move ease-settle", near ? "bg-warning" : "bg-foreground")}
          style={{ width: `${share * 100}%` }}
        />
      </span>
      <span className="tabular w-28 shrink-0 text-right text-body sm:w-32" aria-hidden="true">
        <span className={near ? "text-warning-text" : "text-foreground"}>{num(used)}</span>
        <span className="text-muted-foreground">{` / ${num(limit)}`}</span>
      </span>
      <ChevronRight size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />
    </button>
  );
}

function ChangeLimit({
  def,
  actorId,
  current,
  used,
  onDone,
}: {
  def: LimitDef;
  actorId: string;
  current: number;
  /** Sent today on this kind of payment. */
  used: number;
  onDone: () => void;
}) {
  const setLimit = useLimits((s) => s.setLimit);
  const actor = useSession((s) => s.actor);
  const [value, setValue] = useState("");
  const [step, setStep] = useState<"enter" | "code">("enter");
  const [code, setCode] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [wrongCode, setWrongCode] = useState(false);

  const amount = Number(value.replace(/[^\d.]/g, ""));
  const tooHigh = amount > def.max;
  const valid = value !== "" && amount > 0 && !tooHigh && amount !== current;
  const raising = amount > current;
  const money = (n: number) => formatMoney(n, "GHS");

  function save() {
    setLimit(actorId, def.kind, amount);
    toast.success(`${def.label} limit is now ${money(amount)} a day`);
    onDone();
  }

  function checkCode(entered: string) {
    // Prototype: the demo code, as on the other verification screens.
    if (entered === "000000") save();
    else {
      setWrongCode(true);
      setCode(Array(OTP_LENGTH).fill(""));
    }
  }

  if (step === "code") {
    return (
      <PaneShell step="Enter your code">
        <StepHeader back="Back" title="Enter your code" onBack={() => { setStep("enter"); setWrongCode(false); setCode(Array(OTP_LENGTH).fill("")); }} />
        <div className="mx-auto flex w-full max-w-[440px] flex-col gap-5 pt-2">
          <div className="flex flex-col gap-1 text-body">
            <span className="text-muted-foreground">{`${def.label}, a day`}</span>
            <span className="tabular text-foreground">
              {money(current)} → {money(amount)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-1 text-body">
            <span className="text-muted-foreground">Code goes to</span>
            <span className="tabular text-foreground">{actor ? formatMobile(actor.phone) : ""}</span>
          </div>
          <OtpInput
            value={code}
            onChange={(next) => {
              setWrongCode(false);
              setCode(next);
            }}
            invalid={wrongCode}
          />
          {wrongCode ? (
            <p role="alert" className="-mt-2 text-caption text-destructive">
              That code isn’t right. Try again.
            </p>
          ) : null}
          <Button size="xl" className="w-full sm:w-fit sm:px-6" disabled={code.some((c) => !c)} onClick={() => checkCode(code.join(""))}>
            Raise Limit
          </Button>
        </div>
      </PaneShell>
    );
  }

  return (
    <PaneShell step={`${def.label} limit`}>
      <StepHeader back="Limits" title={`${def.label} limit`} onBack={onDone} />
      <form
        className="mx-auto flex w-full max-w-[440px] flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          if (raising) setStep("code");
          else save();
        }}
      >
        {/* What's true today, before the change. */}
        <dl className="flex flex-col gap-3 rounded-2xl border border-border/80 p-4 text-body">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Daily limit</dt>
            <dd className="tabular text-foreground">{money(current)}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Sent today</dt>
            <dd className="tabular text-foreground">{money(used)}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">The most you can set</dt>
            <dd className="tabular text-foreground">{money(def.max)}</dd>
          </div>
          {current !== def.standard ? (
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Standard</dt>
              <dd>
                <button
                  type="button"
                  onClick={() => setValue(def.standard.toLocaleString("en-GB"))}
                  className="tabular cursor-pointer text-foreground underline decoration-border underline-offset-4 transition-colors duration-hover hover:decoration-foreground"
                >
                  {`Use ${money(def.standard)}`}
                </button>
              </dd>
            </div>
          ) : null}
        </dl>
        <Field label="New Daily Limit" htmlFor="new-limit" error={tooHigh ? `The most you can set is ${money(def.max)}.` : undefined}>
          <Input
            id="new-limit"
            inputMode="decimal"
            className="tabular"
            placeholder={`Up to ${money(def.max)}`}
            value={value}
            aria-invalid={tooHigh || undefined}
            onChange={(e) => setValue(e.target.value)}
          />
        </Field>
        <Button type="submit" size="xl" className="w-full" disabled={!valid}>
          {valid && raising ? "Continue" : "Save"}
        </Button>
      </form>
    </PaneShell>
  );
}
