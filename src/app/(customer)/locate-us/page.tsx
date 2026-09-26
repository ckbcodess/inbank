"use client";

import { useMemo, useState } from "react";
import {
  Clock,
  ExternalLink,
  MapPin,
  Navigation,
  Phone,
  Search,
  X,
} from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/input";
import { FilteredEmptyState, TrueEmptyState } from "@/components/states/ListStates";

export interface BranchLocation {
  id: string;
  name: string;
  type: "branch" | "atm" | "deposit";
  address: string;
  city: string;
  region: string;
  hours: string;
  phone: string;
  services: string[];
  isOpenNow: boolean;
}

const LOCATIONS: BranchLocation[] = [
  {
    id: "loc-01",
    name: "Accra Main Branch — High Street",
    type: "branch",
    address: "Thorpe Road, High Street, Central Business District",
    city: "Accra",
    region: "Greater Accra",
    hours: "Mon – Fri: 8:30 AM – 4:00 PM · Sat: 9:00 AM – 1:00 PM",
    phone: "+233 30 266 4910",
    services: ["Forex Bureau", "Corporate Banking", "Priority Banking", "24/7 ATM", "Safe Deposit Boxes"],
    isOpenNow: true,
  },
  {
    id: "loc-02",
    name: "Airport City Branch & Prestige Lounge",
    type: "branch",
    address: "Ground Floor, Silver Star Tower, Airport City",
    city: "Accra",
    region: "Greater Accra",
    hours: "Mon – Fri: 8:30 AM – 5:00 PM · Sat: 9:00 AM – 2:00 PM",
    phone: "+233 30 277 8214",
    services: ["Prestige Banking", "Forex Bureau", "Cash Deposit Terminal", "24/7 ATM"],
    isOpenNow: true,
  },
  {
    id: "loc-03",
    name: "East Legon Smart Branch",
    type: "branch",
    address: "Lagos Avenue, Opposite PH Hotel, East Legon",
    city: "Accra",
    region: "Greater Accra",
    hours: "Mon – Fri: 8:30 AM – 4:30 PM · Sat: 9:00 AM – 2:00 PM",
    phone: "+233 30 254 1109",
    services: ["Smart Teller", "Forex Bureau", "Cash Deposit ATM", "24/7 ATM"],
    isOpenNow: true,
  },
  {
    id: "loc-04",
    name: "Accra Mall 24/7 Cash Hub",
    type: "atm",
    address: "Tetteh Quarshie Interchange, Food Court Entrance",
    city: "Accra",
    region: "Greater Accra",
    hours: "Open 24/7 (365 Days)",
    phone: "+233 30 268 1525",
    services: ["Cardless Cash", "Cash Withdrawal", "PIN Services", "GhanaPay QR"],
    isOpenNow: true,
  },
  {
    id: "loc-05",
    name: "Spintex Road Branch",
    type: "branch",
    address: "Spintex Coastal Estate Junction, Near Shell",
    city: "Accra",
    region: "Greater Accra",
    hours: "Mon – Fri: 8:30 AM – 4:00 PM",
    phone: "+233 30 281 3340",
    services: ["SME Banking", "Bulk Cash Deposit", "24/7 ATM"],
    isOpenNow: true,
  },
  {
    id: "loc-06",
    name: "Tema Main Branch",
    type: "branch",
    address: "Community 1, Near Meridian Hotel Roundabout",
    city: "Tema",
    region: "Greater Accra",
    hours: "Mon – Fri: 8:30 AM – 4:00 PM · Sat: 9:00 AM – 1:00 PM",
    phone: "+233 30 320 2851",
    services: ["Harbour Clearing Services", "Trade & FX", "24/7 ATM", "Night Depository"],
    isOpenNow: true,
  },
  {
    id: "loc-07",
    name: "Kumasi Main Branch — Harper Road",
    type: "branch",
    address: "Harper Road, Adum Commercial District",
    city: "Kumasi",
    region: "Ashanti",
    hours: "Mon – Fri: 8:30 AM – 4:30 PM · Sat: 9:00 AM – 2:00 PM",
    phone: "+233 32 202 2314",
    services: ["Commercial Banking", "Forex Bureau", "Prestige Lounge", "24/7 ATM"],
    isOpenNow: true,
  },
  {
    id: "loc-08",
    name: "KNUST Campus Branch",
    type: "branch",
    address: "Commercial Area, Kwame Nkrumah University, Kumasi",
    city: "Kumasi",
    region: "Ashanti",
    hours: "Mon – Fri: 8:30 AM – 4:00 PM",
    phone: "+233 32 206 0142",
    services: ["Student Accounts", "Tuition Fee Services", "24/7 Multi-ATM"],
    isOpenNow: true,
  },
  {
    id: "loc-09",
    name: "Takoradi Main Branch — Market Circle",
    type: "branch",
    address: "Market Circle, Collins Avenue",
    city: "Takoradi",
    region: "Western",
    hours: "Mon – Fri: 8:30 AM – 4:00 PM",
    phone: "+233 31 202 3551",
    services: ["Oil & Gas Desk", "Trade Services", "24/7 ATM", "Bulk Cash Deposit"],
    isOpenNow: true,
  },
  {
    id: "loc-10",
    name: "Tamale Main Branch",
    type: "branch",
    address: "Old Market Road, Central Business Area",
    city: "Tamale",
    region: "Northern",
    hours: "Mon – Fri: 8:30 AM – 4:00 PM",
    phone: "+233 37 202 2451",
    services: ["Agribusiness Finance", "Forex Bureau", "24/7 ATM"],
    isOpenNow: true,
  },
  {
    id: "loc-11",
    name: "Osu Oxford Street Cash Depository",
    type: "deposit",
    address: "Oxford Street, Opposite Woodin, Osu",
    city: "Accra",
    region: "Greater Accra",
    hours: "Open 24/7",
    phone: "+233 30 268 1525",
    services: ["Instant Cash Deposit", "Bulk Note Acceptor", "Real-time Account Credit"],
    isOpenNow: true,
  },
  {
    id: "loc-12",
    name: "Cape Coast Main Branch",
    type: "branch",
    address: "Commercial Street, Near Cape Coast Castle",
    city: "Cape Coast",
    region: "Central",
    hours: "Mon – Fri: 8:30 AM – 4:00 PM",
    phone: "+233 33 213 2410",
    services: ["Institutional Banking", "Forex Bureau", "24/7 ATM"],
    isOpenNow: true,
  },
];

export default function LocateUsPage() {
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "branch" | "atm" | "deposit">("all");
  const [selectedCity, setSelectedCity] = useState<string>("all");

  const filteredLocations = useMemo(() => {
    return LOCATIONS.filter((loc) => {
      const matchType = filterType === "all" || loc.type === filterType;
      const matchCity = selectedCity === "all" || loc.city === selectedCity;
      const matchQuery =
        !query.trim() ||
        loc.name.toLowerCase().includes(query.toLowerCase()) ||
        loc.address.toLowerCase().includes(query.toLowerCase()) ||
        loc.city.toLowerCase().includes(query.toLowerCase()) ||
        loc.region.toLowerCase().includes(query.toLowerCase()) ||
        loc.services.some((s) => s.toLowerCase().includes(query.toLowerCase()));

      return matchType && matchCity && matchQuery;
    });
  }, [query, filterType, selectedCity]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto py-2">
      <PageHeader
        title="Locate Us"
        description="Find GCB Bank branches, prestige lounges, 24/7 cash withdrawal ATMs, and instant deposit terminals nationwide."
      />

      {/* ── Search & Filter Controls ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search branch name, suburb, city, or service..."
            className="pl-9 pr-8 h-10 text-[13px] bg-card border-border"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Type Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setFilterType("all")}
            className={`px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-colors cursor-pointer shrink-0 ${
              filterType === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            All ({LOCATIONS.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("branch")}
            className={`px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-colors cursor-pointer shrink-0 ${
              filterType === "branch"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            Branches
          </button>
          <button
            type="button"
            onClick={() => setFilterType("atm")}
            className={`px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-colors cursor-pointer shrink-0 ${
              filterType === "atm"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            24/7 ATMs
          </button>
          <button
            type="button"
            onClick={() => setFilterType("deposit")}
            className={`px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-colors cursor-pointer shrink-0 ${
              filterType === "deposit"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            Cash Deposit
          </button>
        </div>
      </div>

      {/* ── Locations Grid ── */}
      {filteredLocations.length === 0 ? (
        query || selectedCity !== "All" || filterType !== "all" ? (
          <FilteredEmptyState
            onReset={() => {
              setQuery("");
              setSelectedCity("All");
              setFilterType("all");
            }}
            description={
              query
                ? `We couldn't find any branch or ATM matching "${query}". Clear filters to view all locations.`
                : "No branch or ATM found matching the selected filters."
            }
          />
        ) : (
          <TrueEmptyState
            icon={<MapPin size={22} strokeWidth={1.8} />}
            title="No locations found"
            description="Branch and ATM locations will appear here."
          />
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredLocations.map((loc) => {
            const mapsQuery = encodeURIComponent(`GCB Bank ${loc.name}, ${loc.address}, ${loc.city}`);
            const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

            return (
              <div
                key={loc.id}
                className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-sm"
              >
                <div className="flex flex-col gap-3">
                  {/* Header Row: Title & Type Pill */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col">
                      <span className="text-[15px] font-medium text-foreground tracking-tight">
                        {loc.name}
                      </span>
                      <span className="text-[12.5px] text-muted-foreground mt-0.5">
                        {loc.address}, {loc.city}
                      </span>
                    </div>
                    <span
                      className={`text-[11px] font-medium px-2 py-0.5 rounded-md shrink-0 uppercase tracking-wider ${
                        loc.type === "branch"
                          ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                          : loc.type === "atm"
                          ? "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                          : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      }`}
                    >
                      {loc.type === "branch" ? "Branch" : loc.type === "atm" ? "ATM" : "Deposit"}
                    </span>
                  </div>

                  {/* Hours & Contact */}
                  <div className="flex flex-col gap-1.5 text-[12.5px] text-muted-foreground pt-1 border-t border-border/50">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="shrink-0 text-muted-foreground" />
                      <span>{loc.hours}</span>
                    </div>
                    {loc.phone && (
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="shrink-0 text-muted-foreground" />
                        <a href={`tel:${loc.phone}`} className="hover:text-foreground hover:underline">
                          {loc.phone}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Services Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {loc.services.map((svc) => (
                      <span
                        key={svc}
                        className="text-[11px] bg-muted/60 text-muted-foreground px-2 py-0.5 rounded-md"
                      >
                        {svc}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="flex items-center justify-between gap-2 pt-4 mt-3 border-t border-border/60">
                  <div className="flex items-center gap-1.5 text-[11.5px] text-emerald-600 dark:text-emerald-400">
                    <span className="size-2 rounded-full bg-emerald-500" />
                    <span>Open for Service</span>
                  </div>

                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-primary hover:underline"
                  >
                    <Navigation size={13} strokeWidth={2} />
                    <span>Get Directions</span>
                    <ExternalLink size={11} className="opacity-70" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
