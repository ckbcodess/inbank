"use client";

/**
 * Locate us: GCB branches, ATMs and cash deposit terminals. Quiet rows (name, area, whether it's open right now,
 * worked out from its hours); a row opens a sheet with the hours, phone, services and directions. Branches or ATMs is
 * a segmented control (ATMs includes cash deposit terminals); search sits with a location dropdown beside it. Both
 * choices live in the URL.
 */

import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Banknote, ChevronRight, ExternalLink, Landmark, Navigation, Phone, PiggyBank } from "@/components/ui/icons";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchField } from "@/components/ui/search-field";
import { ListCard } from "@/components/ui/list-card";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FilteredEmptyState } from "@/components/states/ListStates";
import { LOCATIONS, LOCATION_TYPE_LABEL, hoursRows, openStatus, type BranchLocation, type LocationType } from "@/lib/locations";
import { cn } from "@/lib/utils";

const TYPE_ICON: Record<LocationType, typeof Landmark> = { branch: Landmark, atm: Banknote, deposit: PiggyBank };

const CITIES = Array.from(new Set(LOCATIONS.map((l) => l.city))).sort((a, b) => a.localeCompare(b));

type Kind = "all" | "branch" | "atm";
const KIND_OPTIONS: { value: Kind; label: string }[] = [
  { value: "all", label: "All" },
  { value: "branch", label: "Branches" },
  { value: "atm", label: "ATMs" },
];
/** A cash deposit terminal is a machine too, so it sits with the ATMs. */
const kindOf = (type: LocationType): Exclude<Kind, "all"> => (type === "branch" ? "branch" : "atm");

const directionsUrl = (loc: BranchLocation) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`GCB Bank ${loc.name}, ${loc.address}, ${loc.city}`)}`;

/** The clock, read after mount (so the server and the first paint agree) and once a minute after that. */
function useNow(): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

function LocationSheet({ loc, now, onClose }: { loc: BranchLocation | null; now: Date | null; onClose: () => void }) {
  const status = loc && now ? openStatus(loc.hours, now) : null;
  return (
    <Dialog open={!!loc} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="sm">
        {loc && (
          <>
            <DialogHeader>
              <DialogTitle>{loc.name}</DialogTitle>
            </DialogHeader>
            <DialogBody className="gap-8">
              {/* The answer first: can I go now? Then where it is and its number. */}
              <div className="flex flex-col gap-1 px-1">
                {status && (
                  <span className="flex items-center gap-2 text-body text-foreground">
                    <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", status.open ? "bg-success" : "bg-muted-foreground/50")} />
                    {status.label}
                  </span>
                )}
                <span className="text-body text-muted-foreground">
                  {loc.address}, {loc.city}
                </span>
                <span className="tabular text-body text-muted-foreground" translate="no">
                  {loc.phone}
                </span>
              </div>

              <section className="flex flex-col gap-2">
                <h3 className="px-1 text-body font-medium text-foreground">Opening hours</h3>
                <dl className="flex flex-col">
                  {hoursRows(loc.hours, now).map((r) => (
                    <div
                      key={r.days}
                      className={cn("flex items-baseline justify-between gap-6 px-1 py-2", r.today ? "text-foreground" : "text-muted-foreground")}
                    >
                      <dt className="text-body">{r.days}</dt>
                      <dd className={cn("tabular text-body", r.today && "font-medium")}>{r.time}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              <section className="flex flex-col gap-3">
                <h3 className="px-1 text-body font-medium text-foreground">Services</h3>
                <ul className="flex flex-wrap gap-2 px-1">
                  {loc.services.map((s) => (
                    <li key={s}>
                      <Badge variant="secondary">{s}</Badge>
                    </li>
                  ))}
                </ul>
              </section>
            </DialogBody>
            <DialogFooter className="flex-row gap-2">
              <Button variant="outline" size="md" className="flex-1" nativeButton={false} render={<a href={`tel:${loc.phone.replace(/\s/g, "")}`} />}>
                <Phone size={15} aria-hidden="true" />
                Call
              </Button>
              <Button
                size="md"
                className="flex-1"
                nativeButton={false}
                render={<a href={directionsUrl(loc)} target="_blank" rel="noopener noreferrer" />}
              >
                <Navigation size={15} aria-hidden="true" />
                Directions
                <ExternalLink size={13} aria-hidden="true" />
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function LocateUs() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const now = useNow();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<BranchLocation | null>(null);

  const kind = (params.get("type") as Kind | null) ?? "all";
  const selectedCity = params.get("city") ?? "all";

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value === "all") next.delete(key);
    else next.set(key, value);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return LOCATIONS.filter((loc) => {
      const matchType = kind === "all" || kindOf(loc.type) === kind;
      const matchCity = selectedCity === "all" || loc.city === selectedCity;
      const matchQuery =
        !q ||
        [loc.name, loc.address, loc.city, loc.region, ...loc.services].some((s) => s.toLowerCase().includes(q));
      return matchType && matchCity && matchQuery;
    });
  }, [query, kind, selectedCity]);

  const clearFilters = () => router.replace(pathname, { scroll: false });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <PageHeader title="Locate Us" />

      <div className="flex items-center">
        <SegmentedControl aria-label="Branches or ATMs" options={KIND_OPTIONS} value={kind} onChange={(v) => setParam("type", v)} />
      </div>

      <div className="flex w-full items-center gap-2">
        <SearchField value={query} onChange={setQuery} placeholder="Search branch, area or service" />
        <Select value={selectedCity} onValueChange={(v) => setParam("city", (v as string) ?? "all")}>
          <SelectTrigger size="md" className="w-40 shrink-0 sm:w-48" aria-label="Location">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All locations</SelectItem>
            {CITIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <FilteredEmptyState
          onReset={() => {
            setQuery("");
            clearFilters();
          }}
          description={
            query.trim()
              ? `No branch or ATM matches “${query.trim()}”.`
              : "No branch or ATM matches these filters."
          }
        />
      ) : (
        <ListCard>
          {filtered.map((loc) => {
            const Icon = TYPE_ICON[loc.type];
            const status = now ? openStatus(loc.hours, now) : null;
            return (
              <li key={loc.id}>
                <button
                  type="button"
                  onClick={() => setSelected(loc)}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-2 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none sm:px-3"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
                    <Icon size={16} aria-hidden="true" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-body text-foreground">{loc.name}</span>
                    <span className="truncate text-caption text-muted-foreground">
                      {LOCATION_TYPE_LABEL[loc.type]} · {loc.city}
                    </span>
                    {status && (
                      <span className={cn("truncate text-caption sm:hidden", status.open ? "text-success-text" : "text-muted-foreground")}>
                        {status.label}
                      </span>
                    )}
                  </span>
                  {status && (
                    <span className={cn("shrink-0 text-right text-caption max-sm:hidden", status.open ? "text-success-text" : "text-muted-foreground")}>
                      {status.label}
                    </span>
                  )}
                  <ChevronRight size={15} aria-hidden="true" className="shrink-0 text-muted-foreground" />
                </button>
              </li>
            );
          })}
        </ListCard>
      )}

      <LocationSheet loc={selected} now={now} onClose={() => setSelected(null)} />
    </div>
  );
}

export default function LocateUsPage() {
  return (
    <Suspense fallback={null}>
      <LocateUs />
    </Suspense>
  );
}
