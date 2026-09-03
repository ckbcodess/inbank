"use client";

/**
 * Audit Log — BRD FR-21 ("searchable activity logs"), NFR-05 ("immutable audit
 * logs for all user actions, configuration changes, and transactions").
 *
 * Admin Portal shell only. Section 8's compliance pattern ends at "immutable
 * audit log" — this is the surface that promise resolves to, which is why
 * suspension, card block/unblock and limit changes all appear here.
 *
 * There is deliberately no edit or delete affordance anywhere on this screen:
 * immutability is a property the UI has to visibly honour, not just claim.
 *
 * State model: 13.1 list pattern.
 */

import { useMemo, useState } from "react";
import { Lock, ShieldCheck } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { ExpandableSearch } from "@/components/ui/expandable-search";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import {
  FilteredEmptyState,
  ListErrorState,
  ListSkeleton,
  PartialLoadFooter,
  TrueEmptyState,
} from "@/components/states/ListStates";
import { LIST_STATE_LABEL, type ListState } from "@/lib/states";
import { AUDIT_EVENTS, formatDateTime } from "@/lib/mock-data";

const LIST_STATES: readonly ListState[] = [
  "loading",
  "empty",
  "filtered-empty",
  "populated",
  "partial-load",
  "error",
] as const;

type ChannelFilter = "all" | "Internet Banking" | "Admin Portal";

const CHANNELS: { key: ChannelFilter; label: string }[] = [
  { key: "all", label: "All channels" },
  { key: "Internet Banking", label: "Internet Banking" },
  { key: "Admin Portal", label: "Admin Portal" },
];

export default function AuditLogPage() {
  const [state, setState] = useState<ListState>("populated");
  const [query, setQuery] = useState("");
  const [channel, setChannel] = useState<ChannelFilter>("all");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return AUDIT_EVENTS.filter((e) => {
      if (channel !== "all" && e.channel !== channel) return false;
      if (!q) return true;
      return (
        e.actor.toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q) ||
        e.target.toLowerCase().includes(q) ||
        e.role.toLowerCase().includes(q)
      );
    });
  }, [query, channel]);

  const filtersApplied = query.trim() !== "" || channel !== "all";
  const effective: ListState =
    state === "populated" && filtersApplied && results.length === 0 ? "filtered-empty" : state;

  const rows = effective === "partial-load" ? AUDIT_EVENTS : results;

  function resetFilters() {
    setQuery("");
    setChannel("all");
    setState("populated");
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Audit log"
        description="Every user action, configuration change and transaction decision, with the actor, the time and the reason given. Entries are append-only and cannot be edited or removed."
      />

      <StateSwitcher
        section="13.1"
        states={LIST_STATES}
        value={state}
        onChange={setState}
        labels={LIST_STATE_LABEL}
      />

      <div className="rounded-2xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex items-center gap-1">
            {CHANNELS.map((c) => (
              <Button
                key={c.key}
                variant={channel === c.key ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setChannel(c.key)}
              >
                {c.label}
              </Button>
            ))}
          </div>

          <ExpandableSearch
            value={query}
            onChange={setQuery}
            placeholder="Search by actor, role, action or target..."
            tooltip="Search audit log"
            inputWidthClassName="w-64 sm:w-80"
          />
        </div>

        {effective === "loading" && <ListSkeleton rows={6} columns={4} />}

        {effective === "error" && (
          <ListErrorState
            onRetry={() => setState("populated")}
            description="We couldn't load the audit log. No entries have been lost — the log is append-only. Try again."
          />
        )}

        {effective === "empty" && (
          <TrueEmptyState
            icon={<ShieldCheck size={20} strokeWidth={1.7} aria-hidden="true" />}
            title="No activity recorded yet"
            description="Once users sign in and act on transactions, every action will be recorded here with its actor and timestamp."
          />
        )}

        {effective === "filtered-empty" && (
          <FilteredEmptyState
            onReset={resetFilters}
            description="No audit entries match these filters. Clear them to see the full log."
          />
        )}

        {(effective === "populated" || effective === "partial-load") && (
          <>
            <ul className="divide-y divide-border">
              {rows.map((event) => (
                <li key={event.id} className="flex items-start gap-4 px-4 py-4">
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Lock size={15} strokeWidth={1.8} aria-hidden="true" />
                  </span>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[14px] text-foreground">{event.action}</span>
                      <Badge variant={event.channel === "Admin Portal" ? "secondary" : "outline"}>
                        {event.channel}
                      </Badge>
                    </div>
                    <span className="mt-0.5 break-words text-[13px] text-muted-foreground">
                      {event.target}
                    </span>
                    <span className="mt-1.5 text-[12px] text-muted-foreground">
                      {event.actor} · {event.role} · IP {event.ip}
                    </span>
                  </div>

                  <span className="shrink-0 text-right text-[12px] text-muted-foreground tabular">
                    {formatDateTime(event.timestamp)}
                  </span>
                </li>
              ))}
            </ul>

            {effective === "partial-load" && <PartialLoadFooter />}
          </>
        )}
      </div>

      <p className="text-[12px] leading-relaxed text-muted-foreground">
        Retention follows FR-21 — entries remain searchable for at least the configured retention
        period. Export for regulatory review is handled through Reports.
      </p>
    </div>
  );
}
