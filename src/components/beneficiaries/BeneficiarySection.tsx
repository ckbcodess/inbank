"use client";

/**
 * The pages that sit above the lists: the hub, a section's chooser (People or Billers), and one kind's list.
 *
 * Each level only becomes a chooser when it holds more than a handful (`CHOOSER_THRESHOLD`). A customer with a
 * few beneficiaries sees one short list straight away; with many, they narrow by choosing: hub, then People,
 * then Bank Accounts. Search on the hub looks across everything.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Star, User, Users } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { BeneficiaryForm, KIND } from "@/components/beneficiaries/BeneficiaryForm";
import {
  ALL_KINDS,
  BILLER_GROUPS,
  BILLER_KINDS,
  BeneficiaryListView,
  KIND_GROUPS,
  PEOPLE_GROUPS,
  CHOOSER_THRESHOLD,
  PEOPLE_KINDS,
  SearchBox,
  initials,
  payHref,
} from "@/components/beneficiaries/BeneficiaryList";
import { groupAvatarTint } from "@/components/payments/flows/beneficiaries";
import { ActionTile } from "@/components/ui/action-tile";
import { Button } from "@/components/ui/button";
import { CediReceiptIcon } from "@/components/ui/cedi-receipt-icon";
import { rankBeneficiaries, useBeneficiariesStore, type TransactionType } from "@/lib/beneficiaries-store";
import { useGroupsStore } from "@/lib/groups-store";

export type Section = "people" | "billers";

const SECTION = {
  people: {
    title: "People",
    kinds: PEOPLE_KINDS,
    groups: PEOPLE_GROUPS,
    addLabel: "Add Person",
    emptyTitle: "No one saved yet",
    emptyDescription: "Save people you pay often to send in one tap.",
  },
  billers: {
    title: "Billers",
    kinds: BILLER_KINDS,
    groups: BILLER_GROUPS,
    addLabel: "Add Biller",
    emptyTitle: "No billers saved yet",
    emptyDescription: "Save a biller to pay it in one tap.",
  },
} as const;

/** How many pinned people the hub shows before "See all". */
const PINNED_SHOWN = 5;

const HUB = { href: "/beneficiaries", label: "Beneficiaries" };

function countText(n: number) {
  return n === 0 ? "Nothing saved yet" : `${n} saved`;
}

/** The first page: a short list for a few beneficiaries, otherwise search, the pinned few, and a tile for each section. */
export function BeneficiariesHub() {
  const router = useRouter();
  const beneficiaries = useBeneficiariesStore((s) => s.beneficiaries);
  const groups = useGroupsStore((s) => s.groups);
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);

  // Old links (?tab=groups, ?tab=billers, ?edit=<group>) and "add someone" links (?add=1)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    const edit = params.get("edit");
    if (tab === "groups") router.replace(`/beneficiaries/groups${edit ? `?edit=${edit}` : ""}`);
    else if (tab === "billers") router.replace("/beneficiaries/billers");
    else if (tab === "people") router.replace("/beneficiaries/people");
    else if (params.get("add") === "1") setFormOpen(true);
  }, [router]);

  const compact = groups.length === 0 && beneficiaries.length <= CHOOSER_THRESHOLD;
  if (compact) {
    return (
      <BeneficiaryListView
        title="Beneficiaries"
        kinds={ALL_KINDS}
        addLabel="Add"
        viewKey="all"
        emptyTitle="Nothing saved yet"
        emptyDescription="Save people and billers you pay often to send in one tap."
      />
    );
  }

  const people = beneficiaries.filter((b) => PEOPLE_KINDS.includes(b.transactionType)).length;
  const billers = beneficiaries.filter((b) => BILLER_KINDS.includes(b.transactionType)).length;
  const allPinned = rankBeneficiaries(beneficiaries.filter((b) => b.pinned));
  // A few at a glance; the rest are one tap away, so a long list of pins never becomes a wall
  const pinned = allPinned.slice(0, PINNED_SHOWN);
  const searching = query.trim() !== "";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <PageHeader
        title="Beneficiaries"
        actions={
          <Button onClick={() => setFormOpen(true)} className="shrink-0">
            <Plus size={15} strokeWidth={2} />
            Add
          </Button>
        }
      />

      <SearchBox value={query} onChange={setQuery} placeholder="Search everyone you've saved" />

      {searching ? (
        <BeneficiaryListView
          embedded
          externalQuery={query}
          title="Beneficiaries"
          kinds={ALL_KINDS}
          addLabel="Add"
          viewKey="search"
          emptyTitle="Nothing saved yet"
          emptyDescription=""
        />
      ) : (
        <>
          {pinned.length > 0 && (
            <section className="flex flex-col gap-4">
              <h2 className="min-h-8 text-[16px] font-medium text-foreground">Pinned</h2>
              <div className="flex flex-wrap gap-x-3 gap-y-5">
                {pinned.map((b) => (
                  <Link
                    key={b.id}
                    href={payHref(b)}
                    className="group flex w-[84px] shrink-0 flex-col items-center gap-2 text-center"
                    title={`Pay ${b.name}`}
                  >
                    <span
                      className="flex size-14 items-center justify-center rounded-full border border-black/5 text-[14px] font-medium text-primary-foreground shadow-xs transition-[filter] duration-150 group-hover:brightness-[0.97] dark:border-white/10 dark:group-hover:brightness-[0.85]"
                      style={{ backgroundColor: groupAvatarTint(b.id) }}
                    >
                      {initials(b.name)}
                    </span>
                    <span className="flex w-full flex-col px-0.5">
                      <span className="truncate text-[12px] font-medium text-foreground">{b.name}</span>
                      <span className="truncate text-[11px] text-muted-foreground">
                        {b.bankName || b.network || b.billerName || KIND[b.transactionType].label}
                      </span>
                    </span>
                  </Link>
                ))}
                {allPinned.length > PINNED_SHOWN && (
                  <Link href="/beneficiaries/pinned" className="group flex w-[84px] shrink-0 flex-col items-center gap-2 text-center">
                    <span className="flex size-14 items-center justify-center rounded-full border border-dashed border-border bg-card text-foreground transition-colors duration-150 group-hover:bg-muted">
                      <Star size={18} strokeWidth={1.8} />
                    </span>
                    <span className="flex w-full flex-col px-0.5">
                      <span className="text-[12px] font-medium text-foreground">See all</span>
                      <span className="text-[11px] text-muted-foreground tabular">{allPinned.length} pinned</span>
                    </span>
                  </Link>
                )}
              </div>
            </section>
          )}

          <div className="flex flex-col gap-3.5">
            <ActionTile href="/beneficiaries/people" icon={User} title="People" description={countText(people)} />
            <ActionTile href="/beneficiaries/billers" icon={CediReceiptIcon} title="Billers" description={countText(billers)} />
            <ActionTile href="/beneficiaries/groups" icon={Users} title="Groups" description={countText(groups.length)} />
          </div>
        </>
      )}

      <BeneficiaryForm open={formOpen} onOpenChange={setFormOpen} kinds={ALL_KINDS} />
    </div>
  );
}

/** People or Billers: a chooser of the kinds you have when there are many, otherwise the list itself. */
export function BeneficiarySectionPage({ section }: { section: Section }) {
  const cfg = SECTION[section];
  const beneficiaries = useBeneficiariesStore((s) => s.beneficiaries);
  const [formOpen, setFormOpen] = useState(false);

  const mine = beneficiaries.filter((b) => (cfg.kinds as readonly TransactionType[]).includes(b.transactionType));
  const present = cfg.groups.filter((g) => mine.some((b) => KIND_GROUPS[g].types.includes(b.transactionType)));

  if (mine.length <= CHOOSER_THRESHOLD || present.length <= 1) {
    return (
      <BeneficiaryListView
        title={cfg.title}
        backTo={HUB}
        kinds={[...cfg.kinds]}
        addLabel={cfg.addLabel}
        viewKey={section}
        emptyTitle={cfg.emptyTitle}
        emptyDescription={cfg.emptyDescription}
      />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <PageHeader
        title={cfg.title}
        backTo={HUB}
        actions={
          <Button onClick={() => setFormOpen(true)} className="shrink-0">
            <Plus size={15} strokeWidth={2} />
            {cfg.addLabel}
          </Button>
        }
      />
      <div className="flex flex-col gap-3.5">
        {present.map((g) => (
          <ActionTile
            key={g}
            href={`/beneficiaries/${section}/${g}`}
            icon={KIND_GROUPS[g].icon}
            title={KIND_GROUPS[g].plural}
            description={countText(mine.filter((b) => KIND_GROUPS[g].types.includes(b.transactionType)).length)}
          />
        ))}
      </div>
      <BeneficiaryForm open={formOpen} onOpenChange={setFormOpen} kinds={[...cfg.kinds]} />
    </div>
  );
}

/** One group's list: Bank Accounts, Mobile Money Wallets, International Banks, and so on. */
export function BeneficiaryKindPage({ section, kind }: { section: Section; kind: string }) {
  const cfg = SECTION[section];
  const g = KIND_GROUPS[(cfg.groups as readonly string[]).includes(kind) ? kind : cfg.groups[0]];
  return (
    <BeneficiaryListView
      title={g.plural}
      backTo={{ href: `/beneficiaries/${section}`, label: cfg.title }}
      kinds={g.types}
      addLabel={`Add ${g.label}`}
      viewKey={`${section}:${g.id}`}
      emptyTitle={`No ${g.plural.toLowerCase()} saved yet`}
      emptyDescription={g.description}
    />
  );
}

/** Everyone pinned, when there are more than the hub shows. */
export function PinnedPage() {
  return (
    <BeneficiaryListView
      title="Pinned"
      backTo={HUB}
      kinds={ALL_KINDS}
      addLabel="Add"
      viewKey="pinned"
      pinnedOnly
      emptyTitle="Nothing pinned"
      emptyDescription="Pin someone from their row to keep them one tap away."
    />
  );
}
