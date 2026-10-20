"use client";

/**
 * Admin Corporate Enrolments Work Queue — /admin/enrolments
 *
 * Operational review queue for staff: Relationship Managers, Corporate Banking Team (Operations),
 * and Bank Admin.
 *
 * Pattern: Admin List Pattern (same as /admin/transactions and /admin/trade).
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  ChevronRight,
  ClipboardCheck,
} from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { ExpandableSearch } from "@/components/ui/expandable-search";
import { Badge } from "@/components/ui/badge";
import { StateSwitcher } from "@/components/states/StateSwitcher";
import {
  FilteredEmptyState,
  ListSkeleton,
  PartialLoadFooter,
  TrueEmptyState,
} from "@/components/states/ListStates";
import { LIST_STATE_LABEL, type ListState } from "@/lib/states";
import { getAllEnrolments } from "@/lib/enrolment-store";

const LIST_STATES: readonly ListState[] = [
  "loading",
  "empty",
  "filtered-empty",
  "populated",
  "partial-load",
  "error",
] as const;

type AssignmentFilter = "all" | "assigned-to-me" | "team-unassigned";
type StageFilter = "all" | "waiting-signatures" | "waiting-call" | "returned" | "approved";

export default function AdminEnrolmentsPage() {
  const [state, setState] = useState<ListState>("populated");
  const [query, setQuery] = useState("");
  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>("all");
  const [stageFilter, setStageFilter] = useState<StageFilter>("all");

  const applications = useMemo(() => {
    return getAllEnrolments();
  }, []);

  const filtered = useMemo(() => {
    return applications.filter((app) => {
      // 1. Text search
      if (query.trim()) {
        const q = query.toLowerCase();
        const matchesQuery =
          app.companyName.toLowerCase().includes(q) ||
          app.reference.toLowerCase().includes(q) ||
          app.applicant.name.toLowerCase().includes(q) ||
          app.assignedTo.name.toLowerCase().includes(q) ||
          app.companyTin.toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }

      // 2. Assignment filter
      if (assignmentFilter === "assigned-to-me") {
        if (app.assignedTo.name !== "Kwame Asante") return false;
      } else if (assignmentFilter === "team-unassigned") {
        if (app.assignedTo.type !== "operations") return false;
      }

      // 3. Stage filter
      if (stageFilter === "waiting-signatures") {
        if (app.status !== "checking_signatures") return false;
      } else if (stageFilter === "waiting-call") {
        if (app.status !== "call_verification") return false;
      } else if (stageFilter === "returned") {
        if (app.status !== "returned") return false;
      } else if (stageFilter === "approved") {
        if (app.status !== "approved") return false;
      }

      return true;
    });
  }, [applications, query, assignmentFilter, stageFilter]);

  const filtersApplied = query.trim() !== "" || assignmentFilter !== "all" || stageFilter !== "all";
  const effective: ListState =
    state === "populated" && filtersApplied && filtered.length === 0 ? "filtered-empty" : state;

  const displayRows = effective === "partial-load" ? applications.slice(0, 2) : filtered;

  function resetFilters() {
    setQuery("");
    setAssignmentFilter("all");
    setStageFilter("all");
    setState("populated");
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Corporate Enrolments"
        description="Review wet-ink request packs, match signatures against cards on file, log security verification calls, and issue corporate access credentials."
      />

      <StateSwitcher
        section="13.1"
        states={LIST_STATES}
        value={state}
        onChange={setState}
        labels={LIST_STATE_LABEL}
      />

      {/* Filter and Search Bar */}
      <section className="rounded-2xl border border-border bg-card p-3.5 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Assignment segment */}
            <div className="inline-flex rounded-xl bg-muted p-1 text-[12.5px]">
              <button
                type="button"
                onClick={() => setAssignmentFilter("all")}
                className={`rounded-lg px-2.5 py-1 font-medium transition-colors cursor-pointer ${
                  assignmentFilter === "all" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All Applications
              </button>
              <button
                type="button"
                onClick={() => setAssignmentFilter("assigned-to-me")}
                className={`rounded-lg px-2.5 py-1 font-medium transition-colors cursor-pointer ${
                  assignmentFilter === "assigned-to-me" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Assigned to me (RM)
              </button>
              <button
                type="button"
                onClick={() => setAssignmentFilter("team-unassigned")}
                className={`rounded-lg px-2.5 py-1 font-medium transition-colors cursor-pointer ${
                  assignmentFilter === "team-unassigned" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Corporate Operations
              </button>
            </div>

            {/* Stage filter pills */}
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value as StageFilter)}
              className="h-8 rounded-lg border border-border bg-background px-2.5 text-[12.5px] text-foreground outline-hidden cursor-pointer"
            >
              <option value="all">All Stages</option>
              <option value="waiting-signatures">Waiting on signatures</option>
              <option value="waiting-call">Waiting on security call</option>
              <option value="returned">Returned for clarification</option>
              <option value="approved">Approved & credentials issued</option>
            </select>
          </div>

          <ExpandableSearch
            value={query}
            onChange={setQuery}
            placeholder="Search company, reference, TIN or applicant..."
            tooltip="Search applications"
          />
        </div>

        {/* Count summary */}
        <div className="flex items-center justify-between text-[12.5px] text-muted-foreground pt-1 border-t border-border/50">
          <span>
            Showing <span className="text-foreground font-medium tabular">{displayRows.length}</span> of{" "}
            <span className="text-foreground font-medium tabular">{applications.length}</span> enrolments
          </span>
          {filtersApplied && (
            <button
              type="button"
              onClick={resetFilters}
              className="font-medium text-foreground underline underline-offset-4 hover:text-foreground/80 cursor-pointer"
            >
              Reset filters
            </button>
          )}
        </div>
      </section>

      {/* Main List Rendering */}
      {effective === "loading" && <ListSkeleton rows={4} />}

      {effective === "empty" && (
        <TrueEmptyState
          icon={<ClipboardCheck size={22} strokeWidth={1.8} />}
          title="No enrolment applications"
          description="Submitted corporate enrolment requests will appear here for verification."
        />
      )}

      {effective === "filtered-empty" && (
        <FilteredEmptyState
          onReset={resetFilters}
          description="No enrolments match the selected assignment and stage filters."
        />
      )}

      {(effective === "populated" || effective === "partial-load") && (
        <div className="flex flex-col gap-2">
          {displayRows.map((app) => (
            <Link
              key={app.reference}
              href={`/admin/enrolments/${app.reference.toLowerCase()}`}
              className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 transition-all duration-hover ease-settle hover:border-foreground/30 hover:bg-muted/30 cursor-pointer"
            >
              <div className="flex items-start gap-3 min-w-0">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary mt-0.5">
                  <Building2 size={19} strokeWidth={1.8} />
                </span>

                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[14.5px] font-medium text-foreground truncate">
                      {app.companyName}
                    </span>
                    <span className="text-[12px] text-muted-foreground tabular">
                      {app.reference}
                    </span>
                  </div>

                  <p className="text-[12.5px] text-muted-foreground mt-0.5">
                    Applicant: <span className="text-foreground">{app.applicant.name}</span> ({app.applicant.mobile}) · {app.accounts.length} account{app.accounts.length === 1 ? "" : "s"}
                  </p>

                  <div className="flex items-center gap-3 text-[11.5px] text-muted-foreground mt-1">
                    <span>
                      Assigned: <span className="font-medium text-foreground">{app.assignedTo.name}</span>
                    </span>
                    <span>·</span>
                    <span className="tabular">
                      Updated {new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(app.updatedAt))}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t border-border/40 sm:border-0">
                <Badge
                  variant={
                    app.status === "approved"
                      ? "success"
                      : app.status === "returned"
                      ? "warning"
                      : app.status === "rejected"
                      ? "destructive"
                      : "outline"
                  }
                >
                  {app.status === "approved"
                    ? "Approved"
                    : app.status === "returned"
                    ? "Returned"
                    : app.status === "rejected"
                    ? "Declined"
                    : app.status === "checking_signatures"
                    ? "Signatures Pending"
                    : app.status === "call_verification"
                    ? "Callback Pending"
                    : "Received"}
                </Badge>

                <ChevronRight
                  size={16}
                  strokeWidth={1.8}
                  className="text-muted-foreground group-hover:translate-x-0.5 transition-transform"
                />
              </div>
            </Link>
          ))}

          {effective === "partial-load" && <PartialLoadFooter />}
        </div>
      )}
    </div>
  );
}
