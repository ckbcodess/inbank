"use client";

/**
 * Dev Mode side panel. `DevModeFrame` docks it to the right of the page, so the page
 * shrinks to make room, the way a modern app's side panel works. It is one grouped
 * list: the Demo hub on the entry and onboarding screens, who you are testing as
 * (personal demo customers, or a signed-in business's users and role flows), then the
 * states the current screen registers. Rows are plain text with a hairline rail, so
 * the list scans without boxes or icons.
 *
 * Dev-only: the header and the pre-authentication pill draw the button only when
 * Dev Mode is on.
 */

import { useCallback, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { motion } from "framer-motion";
import { DURATION, EASE } from "@/lib/motion";
import { usePathname, useRouter } from "next/navigation";
import { Check, X } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDevState, type DevStateData, type DevStateOption } from "@/components/providers/DevStateProvider";
import { DEMO_USER_CONFIGS, useDevUserStore, type DemoUserType } from "@/lib/dev-user-simulation";
import { isBusinessProfile } from "@/lib/profile";
import { useSession } from "@/lib/session-store";
import { ACTORS } from "@/lib/mock-data";
import { homePathForActor } from "@/lib/navigation";
import { SHOW_DEMO_HUB } from "@/lib/demo-tools";
import { isDemoHubPath, useDemoHub } from "@/lib/demo-hub";
import { NOTIFICATION_PRESETS, useNotificationsStore } from "@/lib/notifications-store";
import { useDevModePanel } from "@/lib/dev-mode-panel";
import {
  BUSINESS_DEV_FLOWS,
  BUSINESS_DEV_USERS,
  businessDevBadge,
  businessDevUserLine,
} from "@/components/corporate/dev/business-dev";

const DEMO_USERS: { id: DemoUserType; title: string }[] = [
  { id: "clean", title: "Clean (Zero Setup)" },
  { id: "single", title: "Single Account User" },
  { id: "everyday", title: "Everyday User (Multiple Accounts)" },
];

/** One selectable line. The selected one gets the active tint and a tick. */
function PanelRow({
  selected,
  onClick,
  title,
  hint,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left text-[14px] transition-colors",
        selected
          ? "bg-[var(--active-bg)] text-foreground"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      <span className="flex min-w-0 flex-col">
        <span className="truncate">{title}</span>
        {hint && <span className="text-[12px] text-muted-foreground">{hint}</span>}
      </span>
      {selected && <Check size={14} className="shrink-0 text-foreground" />}
    </button>
  );
}

/** A heading with its rows hung off a hairline rail. */
function PanelSection({ title, meta, children }: { title: string; meta?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2 px-2">
        <h3 className="text-[14px] font-medium text-foreground">{title}</h3>
        {meta && <span className="text-[12px] text-muted-foreground">{meta}</span>}
      </div>
      <div className="ml-3 flex flex-col gap-0.5 border-l border-border pl-2">{children}</div>
    </section>
  );
}

function StateRows({
  states,
  value,
  onChange,
}: {
  states: DevStateOption[];
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <>
      {states.map((st) => (
        <PanelRow key={st.id} selected={value === st.id} onClick={() => onChange(st.id)} title={st.label} />
      ))}
    </>
  );
}

function ScreenStates({ devState }: { devState: DevStateData }) {
  return (
    <>
      <PanelSection title={devState.label ?? "Screen states"} meta={devState.section}>
        <StateRows states={devState.states} value={devState.value} onChange={devState.onChange} />
      </PanelSection>
      {devState.groups?.map((group) => (
        <PanelSection key={group.label} title={group.label}>
          <StateRows states={group.states} value={group.value} onChange={group.onChange} />
        </PanelSection>
      ))}
    </>
  );
}

const DOCKED_QUERY = "(min-width: 640px)";

/** Docked beside the page from `sm` up; a full-screen overlay below it. */
function useDocked() {
  return useSyncExternalStore(
    (notify) => {
      const mq = window.matchMedia(DOCKED_QUERY);
      mq.addEventListener("change", notify);
      return () => mq.removeEventListener("change", notify);
    },
    () => window.matchMedia(DOCKED_QUERY).matches,
    () => false,
  );
}

const PANEL_WIDTH = 300;

export function DevModePanel() {
  const docked = useDocked();
  const router = useRouter();
  const pathname = usePathname();
  const { devState } = useDevState();
  const business = isBusinessProfile(useSession((s) => s.activeProfile));
  const currentActorId = useSession((s) => s.actor?.id);
  const simUserType = useDevUserStore((s) => s.userType);
  const switchUserType = useDevUserStore((s) => s.switchUserType);
  const setPanelOpen = useDevModePanel((s) => s.setOpen);
  const close = useCallback(() => setPanelOpen(false), [setPanelOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  const notificationPreset = useNotificationsStore((s) => s.preset);
  const applyNotificationPreset = useNotificationsStore((s) => s.applyPreset);

  const badge = business ? businessDevBadge(currentActorId) : DEMO_USER_CONFIGS[simUserType]?.badgeLabel || "Dev";

  /** Sign straight in as a business user, then open the flow's screen (or that role's home). */
  function signInAs(actorId: string, href?: string) {
    const actor = ACTORS.find((a) => a.id === actorId);
    if (!actor) return;
    const session = useSession.getState();
    session.signIn(actor);
    if (actor.profiles.length > 0) session.selectProfile(actor.profiles[0]);
    session.verifyMfa();
    router.push(href ?? homePathForActor(actor));
  }

  /** The hub is a dialog over the page, so the panel steps aside for it. */
  function openDemoHub() {
    useDemoHub.getState().setOpen(true);
    close();
  }

  return (
    <motion.aside
      id="dev-mode-panel"
      aria-label="Dev Mode"
      // Docked: the width grows so the page shifts over. Overlay: it slides in from the right.
      initial={docked ? { width: 0, opacity: 0 } : { x: "100%" }}
      animate={docked ? { width: PANEL_WIDTH, opacity: 1 } : { x: 0 }}
      exit={docked ? { width: 0, opacity: 0 } : { x: "100%" }}
      transition={{ duration: DURATION.move, ease: EASE.settle }}
      className={cn(
        "flex flex-col overflow-hidden bg-background",
        docked ? "sticky top-0 h-dvh shrink-0 self-start border-l border-border/60" : "fixed inset-0 z-50",
      )}
    >
      {/* Fixed-width inside the animated box, so the text doesn't reflow while the panel opens. */}
      <div className={cn("flex h-full flex-col", docked ? "w-[300px]" : "w-full")}>
      <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border/60 pl-4 pr-2">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="text-[16px] font-medium text-foreground">Dev Mode</h2>
          <span className="rounded-sm bg-warning/20 px-1.5 py-0.5 text-[12px] text-warning-text">{badge}</span>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={close} aria-label="Close Dev Mode" className="shrink-0">
          <X size={16} />
        </Button>
      </div>

      <div className="custom-scrollbar flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto px-3 pb-6 pt-4">
        {SHOW_DEMO_HUB && isDemoHubPath(pathname) && (
          <PanelSection title="Demo">
            <PanelRow
              selected={false}
              onClick={openDemoHub}
              title="Jump to a step"
              hint="Onboarding, sign-in and migration flows"
            />
          </PanelSection>
        )}

        {business ? (
          <>
            <PanelSection title="Business user">
              {BUSINESS_DEV_USERS.map((id) => {
                const { title, subtitle } = businessDevUserLine(id);
                return (
                  <PanelRow
                    key={id}
                    selected={currentActorId === id}
                    onClick={() => signInAs(id)}
                    title={title}
                    hint={subtitle}
                  />
                );
              })}
            </PanelSection>
            <PanelSection title="Role flows">
              {BUSINESS_DEV_FLOWS.map((f) => (
                <PanelRow
                  key={f.label}
                  selected={false}
                  onClick={() => signInAs(f.actorId, f.href)}
                  title={f.label}
                  hint={f.hint}
                />
              ))}
            </PanelSection>
          </>
        ) : (
          <PanelSection title="Demo user">
            {DEMO_USERS.map((u) => (
              <PanelRow
                key={u.id}
                selected={simUserType === u.id}
                onClick={() => switchUserType(u.id)}
                title={u.title}
              />
            ))}
          </PanelSection>
        )}

        {!business && (
          <PanelSection title="Notifications">
            {NOTIFICATION_PRESETS.map((p) => (
              <PanelRow
                key={p.id}
                selected={notificationPreset === p.id}
                onClick={() => applyNotificationPreset(p.id)}
                title={p.label}
              />
            ))}
          </PanelSection>
        )}

        {devState ? (
          <ScreenStates devState={devState} />
        ) : (
          <PanelSection title="Screen states">
            <p className="px-2 text-[13px] text-muted-foreground">This screen has no states.</p>
          </PanelSection>
        )}
      </div>
      </div>
    </motion.aside>
  );
}
