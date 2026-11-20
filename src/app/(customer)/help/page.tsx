"use client";

/**
 * FAQs: the answers customers look for most, by topic, with search. An answer that has a place in the app links
 * to it. When the answer isn't here, the doors to a person (Contact support) and to a written case (Report an issue,
 * Reported Issues) sit at the end.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import { SearchField } from "@/components/ui/search-field";
import { SectionHeading } from "@/components/ui/section-heading";
import { ListCard } from "@/components/ui/list-card";
import { FilteredEmptyState } from "@/components/states/ListStates";
import { ContactSupportDialog } from "@/components/help/ContactSupportDialog";
import { ChevronDown, ChevronRight, Headset, MessageSquareWarning, Ticket } from "@/components/ui/icons";
import { FAQS, FAQ_TOPICS, type Faq } from "@/lib/faqs";
import { SmoothCollapse } from "@/components/ui/smooth-height";
import { DURATION } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { isOpen, useMyIssues } from "@/lib/issues-store";
import { useSession } from "@/lib/session-store";

const ROW =
  "flex w-full cursor-pointer items-center gap-3 rounded-xl px-2 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none sm:px-3";
const ROW_ICON = "flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground";

/** One question. The answer slides open and shut (`SmoothCollapse`) instead of snapping like a native `<details>`. */
function FaqItem({ faq }: { faq: Faq }) {
  const [open, setOpen] = useState(false);
  const panelId = `faq-${faq.id}`;
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-2 py-3 text-left text-body text-foreground transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none sm:px-3"
      >
        <span>{faq.question}</span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={cn("shrink-0 text-muted-foreground transition-transform duration-reveal ease-settle", open && "rotate-180")}
        />
      </button>
      <SmoothCollapse open={open} duration={DURATION.reveal}>
        <div id={panelId} className="flex flex-col items-start gap-3 px-2 pt-1 pb-4 sm:px-3">
          <p className="text-body leading-relaxed text-muted-foreground">{faq.answer}</p>
          {faq.link && (
            <Link href={faq.link.href} className="text-body text-foreground underline underline-offset-4">
              {faq.link.label}
            </Link>
          )}
        </div>
      </SmoothCollapse>
    </div>
  );
}

export default function FaqsPage() {
  const [query, setQuery] = useState("");
  const [contactOpen, setContactOpen] = useState(false);
  const actor = useSession((s) => s.actor);
  const issues = useMyIssues(actor?.id);
  const openCount = issues.filter(isOpen).length;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FAQS;
    return FAQS.filter((f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q));
  }, [query]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10">
      <PageHeader title="FAQs" />

      <SearchField value={query} onChange={setQuery} placeholder="Search questions" />

      {matches.length === 0 ? (
        <FilteredEmptyState
          onReset={() => setQuery("")}
          description={`No answers mention “${query.trim()}”. Try other words, or contact us below.`}
        />
      ) : (
        FAQ_TOPICS.map((topic) => {
          const items = matches.filter((f) => f.topic === topic);
          if (items.length === 0) return null;
          return (
            <section key={topic} className="flex flex-col gap-3">
              <SectionHeading title={topic} />
              <ListCard as="div">
                {items.map((f) => (
                  <FaqItem key={f.id} faq={f} />
                ))}
              </ListCard>
            </section>
          );
        })
      )}

      <section className="flex flex-col gap-3">
        <SectionHeading title="Still need help?" />
        <ListCard>
          <li>
            <button type="button" onClick={() => setContactOpen(true)} className={ROW}>
              <span className={ROW_ICON}>
                <Headset size={16} aria-hidden="true" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-body text-foreground">Contact support</span>
                <span className="truncate text-caption text-muted-foreground">Call, WhatsApp or email us</span>
              </span>
              <ChevronRight size={15} aria-hidden="true" className="shrink-0 text-muted-foreground" />
            </button>
          </li>
          <li>
            <Link href="/help/issues?new=1" className={ROW}>
              <span className={ROW_ICON}>
                <MessageSquareWarning size={16} aria-hidden="true" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-body text-foreground">Report an issue</span>
                <span className="truncate text-caption text-muted-foreground">Get a case reference you can track</span>
              </span>
              <ChevronRight size={15} aria-hidden="true" className="shrink-0 text-muted-foreground" />
            </Link>
          </li>
          {issues.length > 0 && (
            <li>
              <Link href="/help/issues" className={ROW}>
                <span className={ROW_ICON}>
                  <Ticket size={16} aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-body text-foreground">Reported issues</span>
                  <span className="truncate text-caption text-muted-foreground">
                    {openCount === 0 ? "None open" : openCount === 1 ? "1 open" : `${openCount} open`}
                  </span>
                </span>
                <ChevronRight size={15} aria-hidden="true" className="shrink-0 text-muted-foreground" />
              </Link>
            </li>
          )}
        </ListCard>
      </section>

      <ContactSupportDialog open={contactOpen} onOpenChange={setContactOpen} />
    </div>
  );
}
