"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Laptop, Monitor, Moon, Smartphone, Sun } from "@/components/ui/icons";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import OtpInput, { OTP_LENGTH } from "@/components/auth/OtpInput";
import { PASSWORD_RULES, maskEmail, passwordMeetsRules } from "@/lib/auth-shared";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { useSession, useSessionHydrated } from "@/lib/session-store";
import { useTrustedDevice } from "@/lib/device-trust";
import { otherDevicesFor, useLinkedDevices, type LinkedDevice } from "@/lib/linked-devices";
import { shrinkPhoto, useProfilePhoto, useProfilePhotos } from "@/lib/profile-photo";
import { switchTheme } from "@/lib/theme-transition";
import { cn } from "@/lib/utils";

export interface SettingsData {
  /** Local form, "0241234567". It is the sign-in ID. */
  mobile: string;
  email: string;
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
  /** Opens the sign-out-all confirmation, which is rendered beside the Settings dialog (see `SignOutAllDialog`). */
  onSignOutAll?: () => void;
}

/* ── Shared pieces ─────────────────────────────────────────────────────────── */

function PaneShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="custom-scrollbar scroll-fade flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 pb-6 sm:px-6 sm:pb-4 sm:pt-2">{children}</div>
  );
}

/** The pane's title. On a phone it carries the back arrow to the section list. */
function PaneHeader({ title, onBack, action }: { title: string; onBack: () => void; action?: React.ReactNode }) {
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
      {action ? <div className="ml-auto shrink-0">{action}</div> : null}
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
    <div className="flex items-center justify-between gap-4 py-4 sm:py-3">
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
        <span className="text-[12px] text-muted-foreground">{label}</span>
        <span className="min-w-0 truncate text-[14px] text-foreground">{children}</span>
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
 * Who the bank knows you as. The name comes from the Ghana Card and the mobile number is the sign-in ID, so neither is
 * changed here. Email is the one contact detail the customer changes themselves, behind a code. The last sign-in is a
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
        <FactRow label="Last Sign-in">
          <span className="tabular" suppressHydrationWarning>
            {previousSignIn ? formatSignIn(previousSignIn) : "This is your first sign-in"}
          </span>
        </FactRow>
      </Rows>
    </PaneShell>
  );
}

/**
 * Confirms signing out every other device. Rendered beside the Settings dialog, not inside it: a dialog nested in
 * Settings' popup is clipped by that popup and its scrim doesn't cover the page.
 */
export function SignOutAllDialog({ open, onOpenChange, actorId }: { open: boolean; onOpenChange: (open: boolean) => void; actorId: string }) {
  const signedOut = useLinkedDevices((s) => s.signedOut[actorId]);
  const signOutOthers = useLinkedDevices((s) => s.signOutOthers);
  const count = otherDevicesFor(actorId, signedOut ?? []).length;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Sign out of all other devices?"
      size="sm"
      footer={
        <>
          <Button variant="ghost" size="md" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="md"
            onClick={() => {
              signOutOthers(actorId);
              onOpenChange(false);
              toast("Signed out of all other devices");
            }}
          >
            Sign out
          </Button>
        </>
      }
    >
      <p className="text-[14px] leading-relaxed text-foreground">
        {count === 1
          ? "1 device will be signed out. It’ll need a one-time code the next time it signs in. This device stays signed in."
          : `${count} devices will be signed out. They’ll need a one-time code the next time they sign in. This device stays signed in.`}
      </p>
    </Modal>
  );
}

/** Changing the email asks for a code sent to the current one. The step stays inside the pane (no second modal on top of the first). */
function ChangeEmail({ data, update, onDone }: { data: SettingsData; update: (patch: Partial<SettingsData>) => void; onDone: () => void }) {
  const [value, setValue] = useState("");
  const [step, setStep] = useState<"enter" | "code">("enter");
  const [code, setCode] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [wrongCode, setWrongCode] = useState(false);

  const valid = /^\S+@\S+\.\S+$/.test(value);
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
      <PaneShell>
        <StepHeader back="Back" title="Enter your code" onBack={() => { setStep("enter"); setWrongCode(false); setCode(Array(OTP_LENGTH).fill("")); }} />
        <div className="flex max-w-[440px] flex-col gap-5 pt-2">
          <div className="flex flex-wrap items-center gap-x-1 text-[13px]">
            <span className="text-muted-foreground">Code goes to</span>
            <span className="tabular text-foreground">{currentMasked}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-1 text-[13px]">
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
      <StepHeader back="Profile" title="Change email" onBack={onDone} />
      <form
        className="flex max-w-[440px] flex-col gap-5 pt-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) setStep("code");
        }}
      >
        <div className="flex flex-wrap items-center gap-x-1 text-[13px]">
          <span className="text-muted-foreground">Code goes to</span>
          <span className="tabular text-foreground">{currentMasked}</span>
        </div>
        <Field label="New Email" htmlFor="new-email">
          <Input id="new-email" type="email" autoComplete="email" value={value} onChange={(e) => setValue(e.target.value)} />
        </Field>
        <div className="flex items-center gap-3">
          <Button type="submit" size="xl" disabled={!valid} className="px-6">
            Send code
          </Button>
          <Button type="button" variant="ghost" size="xl" className="px-3 text-muted-foreground" onClick={onDone}>
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

const DEVICE_ICONS = { laptop: Laptop, phone: Smartphone, desktop: Monitor } as const;

function formatWhen(ms: number) {
  const d = new Date(ms);
  const date = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const time = d.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();
  return `${date}, ${time}`;
}

/** What this browser is, read from the browser itself. The place is a demo value; a real bank resolves it from the IP. */
function thisDeviceName() {
  if (typeof navigator === "undefined") return "This browser";
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "Mac" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iPhone" : /Linux/.test(ua) ? "Linux" : "this computer";
  return `${browser} on ${os}`;
}

/**
 * Its own section in the Safety group. One list of every device that can get into the account: signed in now,
 * signed in before, and the ones that skip the one-time code. Signing a device out also ends its trust. State lives in
 * `lib/linked-devices.ts`; this device is built from the live session, never from the seed.
 */
export function DevicesPane({ onBackToMenu, onSignOutAll }: PaneProps) {
  const actor = useSession((s) => s.actor);
  const signedInAt = useSession((s) => (actor ? s.signIns[actor.id] : undefined));
  const trustedHere = useTrustedDevice();
  const signedOut = useLinkedDevices((s) => (actor ? s.signedOut[actor.id] : undefined));
  const signOutDevice = useLinkedDevices((s) => s.signOutDevice);
  const hydrated = useSessionHydrated();

  const devices = useMemo<LinkedDevice[]>(() => {
    if (!actor) return [];
    const now = Date.now();
    const here: LinkedDevice = {
      id: "this",
      kind: "laptop",
      name: thisDeviceName(),
      place: "Accra, Greater Accra",
      signedIn: signedInAt ?? now,
      lastActive: now,
      trusted: !!trustedHere,
    };
    return [here, ...otherDevicesFor(actor.id, signedOut ?? [])];
  }, [actor, signedInAt, trustedHere, signedOut]);

  if (!hydrated || !actor) return null;
  const others = devices.filter((d) => d.id !== "this");

  return (
    <PaneShell>
      <PaneHeader title="Linked devices" onBack={onBackToMenu} />
      <div className="hidden grid-cols-[minmax(14rem,2fr)_minmax(0,1fr)_minmax(0,1fr)_96px] items-center gap-4 pb-2 text-[12px] text-muted-foreground sm:grid">
        <span>Device</span>
        <span>Signed in</span>
        <span>Last active</span>
        <span />
      </div>
      <Rows>
        {devices.map((d) => {
          const Icon = DEVICE_ICONS[d.kind];
          const current = d.id === "this";
          return (
            <div key={d.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 py-4 sm:grid-cols-[minmax(14rem,2fr)_minmax(0,1fr)_minmax(0,1fr)_96px]">
              <div className="flex min-w-0 items-center gap-4">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Icon size={15} aria-hidden="true" />
                </span>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[14px] text-foreground">
                    <span className="min-w-0">{d.name}</span>
                  </span>
                  <span className="break-words text-[12px] text-muted-foreground">
                    <span>{d.place}</span>
                  </span>
                </div>
              </div>
              <span className="tabular hidden text-[12px] text-muted-foreground sm:block">{formatWhen(d.signedIn)}</span>
              <span className="tabular hidden text-[12px] text-muted-foreground sm:block">{current ? "Active now" : formatWhen(d.lastActive)}</span>
              <div className="flex justify-end">
                {current ? (
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[12px] text-muted-foreground">This device</span>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      signOutDevice(actor.id, d.id);
                      toast(`Signed out of ${d.name}`);
                    }}
                  >
                    Sign out
                  </Button>
                )}
              </div>
              <span className="tabular col-span-2 pl-14 text-[12px] text-muted-foreground sm:hidden">
                {current ? "Active now" : `Last active ${formatWhen(d.lastActive)}`}
              </span>
            </div>
          );
        })}
      </Rows>
      {others.length > 0 ? (
        <div className="mt-16 flex justify-center">
          <Button variant="destructive" size="md" onClick={() => onSignOutAll?.()}>
            Sign out of all other devices
          </Button>
        </div>
      ) : null}
    </PaneShell>
  );
}

export function SecurityPane({ data, update, onBackToMenu }: PaneProps) {
  const [changingPassword, setChangingPassword] = useState(false);

  if (changingPassword) return <PasswordStep onDone={() => setChangingPassword(false)} />;

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
          title="Sign-in PIN"
          action={
            <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/forgot-pin" />}>
              Reset
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
          <Button type="submit" size="xl" disabled={!ready} className="px-6">
            Update password
          </Button>
          <Button type="button" variant="ghost" size="xl" className="px-3 text-muted-foreground" onClick={onDone}>
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
      </Rows>
      <p className={cn("pt-3 text-[12px] leading-relaxed text-muted-foreground")}>
        Every notification also shows in the app, under Notifications. Sign-in and new-device alerts are always on.
      </p>
    </PaneShell>
  );
}
