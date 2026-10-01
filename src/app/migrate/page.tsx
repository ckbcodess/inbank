"use client";

/**
 * Moving from the old GCB internet banking (see lib/migration).
 *
 * The person already banks online with GCB and is worried their things didn't
 * make it across. So the flow shows continuity before it asks for anything, and
 * asks only for what can't carry over: a code to prove it's them, a new
 * password, and agreement to the updated terms. Opens on `?step=` for the Demo
 * hub; `?user=` carries the old user ID from the login screen.
 */

import { InlineError } from "@/components/ui/inline-error";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeftRight, CalendarClock, Check, KeyRound, Landmark, Users } from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";
import OtpInput, { OTP_LENGTH } from "@/components/auth/OtpInput";
import NewPasswordFields, { newPasswordReady } from "@/components/auth/NewPasswordFields";
import { AppLoader } from "@/components/ui/loader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useSession } from "@/lib/session-store";
import { setFirstRun } from "@/lib/device-trust";
import {
  LEGACY_DEMO_USER_ID,
  MIGRATED_DATA,
  MIGRATION_STEPS,
  findLegacyUser,
  parseMigrationStep,
  type MigrationStep,
} from "@/lib/migration";

const TITLES: Record<MigrationStep, string> = {
  welcome: "Your online banking has moved",
  verify: "Confirm it's you",
  carried: "Your details came with you",
  password: "Create a new password",
  finish: "Almost done",
};

function MigrateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, verifyMfa } = useSession();

  const userId = searchParams.get("user") ?? LEGACY_DEMO_USER_ID;
  const actor = findLegacyUser(userId) ?? findLegacyUser(LEGACY_DEMO_USER_ID)!;
  const firstName = actor.name.split(" ")[0];

  const [step, setStep] = useState<MigrationStep>(() => parseMigrationStep(searchParams.get("step")) ?? "welcome");
  // Follow the Demo hub's jumps while mounted.
  const urlStep = parseMigrationStep(searchParams.get("step"));
  useEffect(() => {
    if (urlStep) setStep(urlStep);
  }, [urlStep]);

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [codeError, setCodeError] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [busy, setBusy] = useState(false);

  const index = MIGRATION_STEPS.findIndex((s) => s.id === step);
  const next = () => {
    setBusy(false);
    setStep(MIGRATION_STEPS[Math.min(index + 1, MIGRATION_STEPS.length - 1)].id);
  };
  const back = () => {
    if (index > 0) setStep(MIGRATION_STEPS[index - 1].id);
  };

  function verifyCode(code: string) {
    setBusy(true);
    window.setTimeout(() => {
      // Any 6 digits pass except 000000, which shows the error path.
      if (code === "000000") {
        setBusy(false);
        setCodeError(true);
        setDigits(Array(OTP_LENGTH).fill(""));
        return;
      }
      next();
    }, 600);
  }

  function finish() {
    setBusy(true);
    window.setTimeout(() => {
      signIn(actor);
      verifyMfa();
      setFirstRun("migrated");
      router.push("/overview");
    }, 700);
  }

  const lastVisit = new Date(MIGRATED_DATA.lastLegacySignIn).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
  });

  return (
    <AuthLayout
      title={step === "welcome" ? `${TITLES.welcome}, ${firstName}` : TITLES[step]}
      onBack={step !== "welcome" ? back : undefined}
      backHref={step === "welcome" ? "/login" : undefined}
      backLabel={step === "welcome" ? "Back to login" : "Back to previous step"}
      stepProgress={{ current: index + 1, total: MIGRATION_STEPS.length }}
      footer={
        step === "welcome" ? (
          <p className="text-center text-[13px] text-muted-foreground">
            Not {firstName}?{" "}
            <Link href="/login" className="text-foreground underline underline-offset-4">
              Back to login
            </Link>
          </p>
        ) : step === "verify" ? (
          <p className="text-center text-[12px] text-muted-foreground">
            Enter any 6 digits to continue · use 000000 to see the error state
          </p>
        ) : undefined
      }
    >
      {step === "welcome" && (
        <div className="flex flex-col gap-6">
          <p className="text-[14px] leading-relaxed text-muted-foreground">
            GCB Internet Banking has a new home. Everything you had comes with you — this takes about two
            minutes, and you only need to set a new password.
          </p>
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/20 p-4">
            <span className="text-[13px] text-muted-foreground">Staying the same</span>
            {[
              "Your accounts and balances",
              "Your saved payees and standing orders",
              "Your transaction PIN",
            ].map((item) => (
              <span key={item} className="flex items-center gap-2.5 text-[14px] text-foreground">
                <Check size={16} strokeWidth={1.9} className="shrink-0 text-success" aria-hidden="true" />
                {item}
              </span>
            ))}
          </div>
          <div className="flex flex-col gap-3 px-1">
            <span className="text-[13px] text-muted-foreground">What&apos;s new</span>
            <span className="text-[14px] text-foreground">A clearer dashboard, faster payments to saved payees, and passkey sign-in on your own devices.</span>
          </div>
          <Button size="lg" onClick={next} className="h-11 w-full text-[14.5px]">
            Get started
          </Button>
        </div>
      )}

      {step === "verify" && (
        <div className="flex flex-col gap-6">
          <p className="text-center text-[14px] text-muted-foreground">
            A 6-digit code has been sent to the phone on your account, ending <span className="tabular">118</span>.<br />Please enter the code below.
          </p>
          <OtpInput
            value={digits}
            onChange={(v) => {
              setDigits(v);
              if (codeError) setCodeError(false);
            }}
            onComplete={verifyCode}
            disabled={busy}
            invalid={codeError}
          />
          {busy && (
            <div className="flex items-center justify-center gap-2 text-[13.5px] text-muted-foreground">
              <AppLoader size={16} />
              <span>Checking…</span>
            </div>
          )}
          <InlineError message={codeError && "That code didn’t match. Check the latest message and try again."} />
        </div>
      )}

      {step === "carried" && (
        <div className="flex flex-col gap-5">
          <p className="text-[14px] text-muted-foreground">
            Here&apos;s what we brought across from your old internet banking (last used{" "}
            <span className="tabular">{lastVisit}</span>).
          </p>
          <div className="flex flex-col divide-y divide-border/60 rounded-2xl border border-border">
            <CarriedGroup icon={Landmark} title="Accounts" items={MIGRATED_DATA.accounts.map((a) => ({ name: a.name, detail: a.number }))} />
            <CarriedGroup icon={Users} title="Saved payees" items={MIGRATED_DATA.payees} />
            <CarriedGroup icon={CalendarClock} title="Standing orders" items={MIGRATED_DATA.standingOrders} />
            <div className="flex items-center gap-3 px-4 py-3.5">
              <KeyRound size={17} strokeWidth={1.8} className="shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="flex-1 text-[14px] text-foreground">Transaction PIN</span>
              <span className="text-[13px] text-muted-foreground">Unchanged</span>
            </div>
          </div>
          <p className="text-[12.5px] text-muted-foreground">
            Something missing? You can tell us from Help once you&apos;re in — nothing on your accounts has changed.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" size="lg" onClick={back} className="h-11 flex-1 text-[14.5px]">
              Back
            </Button>
            <Button size="lg" onClick={next} className="h-11 flex-[2] text-[14.5px]">
              Looks right
            </Button>
          </div>
        </div>
      )}

      {step === "password" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setBusy(true);
            window.setTimeout(next, 500);
          }}
          className="flex flex-col gap-5"
        >
          <p className="text-[14px] text-muted-foreground">
            Old passwords can&apos;t be moved across safely, so choose a new one for the new internet banking.
          </p>
          <NewPasswordFields
            password={password}
            confirm={confirm}
            onPasswordChange={setPassword}
            onConfirmChange={setConfirm}
            autoFocus
          />
          <Button type="submit" size="lg" disabled={!newPasswordReady(password, confirm)} loading={busy} className="mt-1 h-11 w-full text-[14.5px]">
            Proceed
          </Button>
        </form>
      )}

      {step === "finish" && (
        <div className="flex flex-col gap-5">
          <label className="flex items-start gap-3 rounded-2xl border border-border px-4 py-3.5 text-[14px] text-foreground cursor-pointer select-none">
            <Checkbox
              checked={acceptTerms}
              onCheckedChange={(c) => setAcceptTerms(!!c)}
              aria-label="I accept the updated Terms of Use"
              className="mt-0.5"
            />
            <span className="flex flex-col gap-1">
              <span>I accept the updated Terms of Use</span>
              <span className="text-[12.5px] text-muted-foreground">
                The main change: you can now sign in with a passkey on devices you choose to remember.
              </span>
            </span>
          </label>
          <Button size="lg" onClick={finish} disabled={!acceptTerms} loading={busy} className="h-11 w-full text-[14.5px]">
            Go to my dashboard
          </Button>
        </div>
      )}
    </AuthLayout>
  );
}

function CarriedGroup({
  icon: Icon,
  title,
  items,
}: {
  icon: typeof ArrowLeftRight;
  title: string;
  items: readonly { name: string; detail: string }[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-3 px-4 py-3.5 text-left cursor-pointer"
      >
        <Icon size={17} strokeWidth={1.8} className="shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="flex-1 text-[14px] text-foreground">{title}</span>
        <span className="tabular text-[13px] text-muted-foreground">{items.length}</span>
        <Check size={15} strokeWidth={2} className="text-success" aria-label="Carried across" />
      </button>
      {open && (
        <ul className="flex flex-col gap-2 px-4 pb-3.5 pl-11">
          {items.map((it) => (
            <li key={it.name} className="flex items-baseline justify-between gap-3 text-[13px]">
              <span className="truncate text-foreground">{it.name}</span>
              <span className="shrink-0 tabular text-muted-foreground">{it.detail}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function MigratePage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-background" />}>
      <MigrateContent />
    </Suspense>
  );
}
