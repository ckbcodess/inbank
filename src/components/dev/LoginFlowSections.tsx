"use client";

/**
 * The Log in view of the Demo hub: every sign-in and recovery screen, for both apps. Personal and business
 * share the recovery flows (forgot password, forgot PIN), which open on any stage with `?stage=`.
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type StepRow = (href: string, label: string, n: number, active: boolean) => ReactNode;
export type LoginApp = "personal" | "business";

export interface LoginActions {
  /** The log-in form, with this browser's trusted device forgotten. `error` opens it on the wrong-password state. */
  login: (app: LoginApp, state?: "error") => void;
  /** A trusted device: greeted by name, password only. */
  welcomeBack: (app: LoginApp) => void;
  /** The step after the password, for a signed-in-but-unverified demo user. */
  enterPin: (app: LoginApp, newDevice: boolean) => void;
}

const PASSWORD_STAGES = [
  { id: "mobile", label: "Your Mobile Number" },
  { id: "selfie", label: "Selfie Match" },
  { id: "no_match", label: "Selfie Didn't Match" },
  { id: "branch", label: "Visit a Branch" },
  { id: "otp", label: "Confirm Your Code" },
  { id: "password", label: "Create a New Password" },
  { id: "done", label: "Password Changed" },
] as const;

const PIN_STAGES = [
  { id: "mobile", label: "Your Mobile Number" },
  { id: "selfie", label: "Selfie Match" },
  { id: "no_match", label: "Selfie Didn't Match" },
  { id: "branch", label: "Visit a Branch" },
  { id: "pin", label: "Set a New PIN" },
  { id: "confirm_pin", label: "Confirm Your PIN" },
  { id: "done", label: "PIN Changed" },
] as const;

export function LoginFlowSections({
  stepRow,
  actions,
  pathname,
  stage,
  type,
}: {
  stepRow: StepRow;
  actions: LoginActions;
  pathname: string | null;
  stage: string | null;
  /** `?type=` on the current URL, for marking which log-in form is open. */
  type: string | null;
}) {
  const row = (title: string, subtitle: string, onClick: () => void, active = false) => (
    <li key={title}>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex w-full flex-col items-start gap-0.5 rounded-lg px-2 py-2 text-left transition-colors cursor-pointer",
          active ? "bg-muted" : "hover:bg-muted/60",
        )}
      >
        <span className="text-[13.5px] text-foreground">{title}</span>
        <span className="text-[12px] text-muted-foreground">{subtitle}</span>
      </button>
    </li>
  );

  const signIn = (app: LoginApp) => (
    <ol className="flex flex-col">
      {row("Log in", app === "business" ? "The business door" : "The front door", () => actions.login(app), pathname === "/login" && (type === "business") === (app === "business"))}
      {row("Wrong password", "The form with its error", () => actions.login(app, "error"))}
      {row("Welcome back", "Trusted device, greeted by name, password only", () => actions.welcomeBack(app))}
      {row("Enter your PIN", "The step after the password", () => actions.enterPin(app, false))}
      {row("New device", "Confirm it's you with a one-time code", () => actions.enterPin(app, true))}
    </ol>
  );

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <section className="flex flex-col gap-2">
        <h3 className="px-2 text-[14px] font-medium text-foreground">Personal banking</h3>
        <div className="flex h-7 items-center px-2 text-[13px] text-muted-foreground">Signs in as a personal customer</div>
        {signIn("personal")}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="px-2 text-[14px] font-medium text-foreground">Business banking</h3>
        <div className="flex h-7 items-center px-2 text-[13px] text-muted-foreground">Signs in as a business maker</div>
        {signIn("business")}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="px-2 text-[14px] font-medium text-foreground">Forgot password</h3>
        <div className="flex h-7 items-center px-2 text-[13px] text-muted-foreground">Both apps</div>
        <ol className="flex flex-col">
          {PASSWORD_STAGES.map((s, i) =>
            stepRow(`/forgot-password?stage=${s.id}`, s.label, i + 1, pathname === "/forgot-password" && stage === s.id),
          )}
        </ol>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="px-2 text-[14px] font-medium text-foreground">Forgot PIN</h3>
        <div className="flex h-7 items-center px-2 text-[13px] text-muted-foreground">Both apps</div>
        <ol className="flex flex-col">
          {PIN_STAGES.map((s, i) =>
            stepRow(`/forgot-pin?stage=${s.id}`, s.label, i + 1, pathname === "/forgot-pin" && stage === s.id),
          )}
        </ol>
      </section>
    </div>
  );
}
