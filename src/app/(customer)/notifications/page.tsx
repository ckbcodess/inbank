"use client";

/**
 * Notifications — BRD FR-22.
 *
 * The requirement has two halves and both are built here:
 *   - "notify users of transaction submissions, approvals, rejections, and
 *     status changes"  → the feed, filterable by those four kinds
 *   - "As a user, I want to choose how I receive notifications" /
 *     "delivered via configured channels"  → the delivery preferences
 *
 * Rows resolve to the object the notification is about, so a notification is a
 * route into an existing surface rather than a dead end.
 *
 * State model: 13.1 list pattern.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  ChevronRight,
  Send,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import {
  FilteredEmptyState,
  ListErrorState,
  ListSkeleton,
  PartialLoadFooter,
  TrueEmptyState,
} from "@/components/states/ListStates";
import { LIST_STATE_LABEL, type ListState } from "@/lib/states";
import { NOTIFICATIONS, formatRelative, type NotificationKind } from "@/lib/mock-data";

const LIST_STATES: readonly ListState[] = [
  "loading",
  "empty",
  "filtered-empty",
  "populated",
  "partial-load",
  "error",
] as const;

const KIND_META: Record<
  NotificationKind,
  { label: string; icon: React.ElementType; className: string }
> = {
  submission: { label: "Submitted", icon: Send, className: "text-muted-foreground" },
  approval: { label: "Approved", icon: CheckCircle2, className: "text-[var(--pay-cash,#17c858)]" },
  rejection: { label: "Returned", icon: TriangleAlert, className: "text-amber-500" },
  status: { label: "Status", icon: XCircle, className: "text-muted-foreground" },
};

type KindFilter = NotificationKind | "all";

const FILTERS: { key: KindFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "submission", label: "Submissions" },
  { key: "approval", label: "Approvals" },
  { key: "rejection", label: "Rejections" },
  { key: "status", label: "Status changes" },
];

const CHANNELS = [
  { key: "inapp", label: "In-app", description: "Always on — shown here and in the header.", locked: true },
  { key: "email", label: "Email", description: "Sent to the address on your profile." },
  { key: "sms", label: "SMS", description: "Sent to your registered mobile number." },
];

export default function NotificationsPage() {
  const [state, setState] = useState<ListState>("populated");
  const [filter, setFilter] = useState<KindFilter>("all");
  const [readIds, setReadIds] = useState<string[]>([]);
  const [channels, setChannels] = useState<Record<string, boolean>>({
    inapp: true,
    email: true,
    sms: false,
  });

  const items = useMemo(
    () =>
      NOTIFICATIONS.map((n) => ({ ...n, read: n.read || readIds.includes(n.id) })).filter((n) =>
        filter === "all" ? true : n.kind === filter,
      ),
    [filter, readIds],
  );

  const effective: ListState =
    state === "populated" && filter !== "all" && items.length === 0 ? "filtered-empty" : state;

  const unread = NOTIFICATIONS.filter((n) => !n.read && !readIds.includes(n.id)).length;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Notifications"
        description="Submissions, approvals, rejections and status changes across your relationship."
        actions={
          unread > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReadIds(NOTIFICATIONS.map((n) => n.id))}
            >
              <CheckCheck size={14} strokeWidth={1.9} aria-hidden="true" />
              Mark all read
            </Button>
          ) : undefined
        }
      />

      <StateSwitcher
        section="13.1"
        states={LIST_STATES}
        value={state}
        onChange={setState}
        labels={LIST_STATE_LABEL}
      />

      <div className="rounded-2xl border border-border bg-card">
        <div className="flex flex-wrap items-center gap-1 border-b border-border px-4 py-3">
          {FILTERS.map((f) => (
            <Button
              key={f.key}
              variant={filter === f.key ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        {effective === "loading" && <ListSkeleton rows={5} columns={3} />}

        {effective === "error" && (
          <ListErrorState
            onRetry={() => setState("populated")}
            description="We couldn't load your notifications. Nothing has been dismissed — try again."
          />
        )}

        {effective === "empty" && (
          <TrueEmptyState
            icon={<Bell size={20} strokeWidth={1.7} aria-hidden="true" />}
            title="Nothing to catch up on"
            description="You'll be notified here when a payment is submitted, approved, returned, or changes status."
          />
        )}

        {effective === "filtered-empty" && (
          <FilteredEmptyState
            onReset={() => {
              setFilter("all");
              setState("populated");
            }}
            description="No notifications of this type. Clear the filter to see everything."
          />
        )}

        {(effective === "populated" || effective === "partial-load") && (
          <>
            <ul className="divide-y divide-border">
              {items.map((n) => {
                const meta = KIND_META[n.kind];
                const Icon = meta.icon;
                const row = (
                  <>
                    <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Icon size={16} strokeWidth={1.8} aria-hidden="true" className={meta.className} />
                    </span>

                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-[14px] text-foreground">{n.title}</span>
                        {!n.read && (
                          <span className="size-1.5 rounded-full bg-destructive" aria-label="Unread" />
                        )}
                      </span>
                      <span className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
                        {n.body}
                      </span>
                    </span>

                    <span className="shrink-0 text-right text-[12px] text-muted-foreground tabular">
                      {formatRelative(n.date)}
                    </span>
                  </>
                );

                return (
                  <li key={n.id}>
                    {n.href ? (
                      <Link
                        href={n.href}
                        onClick={() => setReadIds((prev) => [...prev, n.id])}
                        className="flex items-start gap-4 px-4 py-4 transition-colors hover:bg-muted/50 active:scale-[0.99] transition-transform"
                      >
                        {row}
                        <ChevronRight
                          size={16}
                          strokeWidth={1.8}
                          aria-hidden="true"
                          className="mt-0.5 shrink-0 text-muted-foreground"
                        />
                      </Link>
                    ) : (
                      <div className="flex items-start gap-4 px-4 py-4">{row}</div>
                    )}
                  </li>
                );
              })}
            </ul>

            {effective === "partial-load" && <PartialLoadFooter />}
          </>
        )}
      </div>

      {/* FR-22 — "delivered via configured channels" */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-[15px] text-foreground">Delivery preferences</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
          Choose how you receive notifications. In-app delivery can&apos;t be turned off, because
          some notifications carry actions you must be able to find later.
        </p>

        <div className="mt-4 flex flex-col gap-3">
          {CHANNELS.map((c) => (
            <div key={c.key} className="flex items-start gap-3">
              <Checkbox
                id={`channel-${c.key}`}
                checked={channels[c.key]}
                disabled={c.locked}
                onCheckedChange={(checked) =>
                  setChannels((prev) => ({ ...prev, [c.key]: checked === true }))
                }
              />
              <div className="flex flex-col">
                <Label htmlFor={`channel-${c.key}`} className="text-[13px]">
                  {c.label}
                </Label>
                <span className="mt-0.5 text-[12px] text-muted-foreground">{c.description}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
