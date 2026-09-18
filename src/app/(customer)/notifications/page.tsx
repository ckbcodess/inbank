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
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/layout/PageHeader";
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

  function markRead(id: string) {
    setReadIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Notifications" />
      <StateSwitcher
        section="13.1"
        states={LIST_STATES}
        value={state}
        onChange={setState}
        labels={LIST_STATE_LABEL}
      />

      {/* Filter and Action Bar */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar flex-nowrap">
        <div className="flex items-center gap-1.5 shrink-0">
          {FILTERS.map((f) => (
            <Button
              key={f.key}
              variant={filter === f.key ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setFilter(f.key)}
              className="shrink-0 whitespace-nowrap h-8 px-3 rounded-lg text-[13px]"
            >
              {f.label}
            </Button>
          ))}
        </div>

        {unread > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setReadIds(NOTIFICATIONS.map((n) => n.id))}
            className="shrink-0 whitespace-nowrap text-xs gap-1.5 text-muted-foreground hover:text-foreground ml-auto h-8 px-3"
          >
            <CheckCheck size={14} strokeWidth={1.9} aria-hidden="true" />
            Mark all read
          </Button>
        )}
      </div>

      {effective === "loading" && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <ListSkeleton rows={5} columns={3} />
        </div>
      )}

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
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
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
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[13.5px] text-foreground">{n.title}</span>
                      {!n.read && (
                        <span
                          className="size-1.5 rounded-full bg-primary"
                          aria-label="Unread"
                        />
                      )}
                    </span>
                    <span className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
                      {n.body}
                    </span>
                    <span className="mt-1 text-[11px] text-muted-foreground">{formatRelative(n.date)}</span>
                  </span>

                  <ChevronRight size={16} strokeWidth={1.8} aria-hidden="true" className="shrink-0 text-muted-foreground" />
                </>
              );

              return (
                <li key={n.id}>
                  {n.href ? (
                    <Link
                      href={n.href}
                      onClick={() => markRead(n.id)}
                      className="flex items-start gap-4 px-4 py-3.5 transition-colors hover:bg-muted/50"
                    >
                      {row}
                    </Link>
                  ) : (
                    <div
                      onClick={() => markRead(n.id)}
                      className="flex items-start gap-4 px-4 py-3.5"
                    >
                      {row}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {effective === "partial-load" && <PartialLoadFooter />}
        </div>
      )}

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
