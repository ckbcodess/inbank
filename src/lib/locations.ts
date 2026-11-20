/**
 * GCB branches, ATMs and deposit terminals for Locate us (FR-RET: branch, ATM and service-point locator). Opening
 * hours are data, not a sentence, so "open now" is worked out from the clock instead of being written down. Mock
 * locations until the bank's branch register is connected.
 */

export type LocationType = "branch" | "atm" | "deposit";

/** Opening times as "HH:MM" in Ghana time (GMT, no daylight saving). A missing day is closed. */
export interface Hours {
  weekdays?: [string, string];
  saturday?: [string, string];
  sunday?: [string, string];
  /** Open around the clock, every day. */
  always?: boolean;
}

export interface BranchLocation {
  id: string;
  name: string;
  type: LocationType;
  address: string;
  city: string;
  region: string;
  hours: Hours;
  phone: string;
  services: string[];
}

const WEEKDAYS_4: Hours = { weekdays: ["08:30", "16:00"] };
const WEEKDAYS_4_SAT_1: Hours = { weekdays: ["08:30", "16:00"], saturday: ["09:00", "13:00"] };

export const LOCATIONS: BranchLocation[] = [
  {
    id: "loc-01",
    name: "Accra Main Branch, High Street",
    type: "branch",
    address: "Thorpe Road, High Street, Central Business District",
    city: "Accra",
    region: "Greater Accra",
    hours: WEEKDAYS_4_SAT_1,
    phone: "+233 30 266 4910",
    services: ["Forex Bureau", "Corporate Banking", "Priority Banking", "24/7 ATM", "Safe Deposit Boxes"],
  },
  {
    id: "loc-02",
    name: "Airport City Branch & Prestige Lounge",
    type: "branch",
    address: "Ground Floor, Silver Star Tower, Airport City",
    city: "Accra",
    region: "Greater Accra",
    hours: { weekdays: ["08:30", "17:00"], saturday: ["09:00", "14:00"] },
    phone: "+233 30 277 8214",
    services: ["Prestige Banking", "Forex Bureau", "Cash Deposit Terminal", "24/7 ATM"],
  },
  {
    id: "loc-03",
    name: "East Legon Smart Branch",
    type: "branch",
    address: "Lagos Avenue, Opposite PH Hotel, East Legon",
    city: "Accra",
    region: "Greater Accra",
    hours: { weekdays: ["08:30", "16:30"], saturday: ["09:00", "14:00"] },
    phone: "+233 30 254 1109",
    services: ["Smart Teller", "Forex Bureau", "Cash Deposit ATM", "24/7 ATM"],
  },
  {
    id: "loc-04",
    name: "Accra Mall Cash Hub",
    type: "atm",
    address: "Tetteh Quarshie Interchange, Food Court Entrance",
    city: "Accra",
    region: "Greater Accra",
    hours: { always: true },
    phone: "+233 30 268 1525",
    services: ["Cardless Cash", "Cash Withdrawal", "PIN Services", "GhanaPay QR"],
  },
  {
    id: "loc-05",
    name: "Spintex Road Branch",
    type: "branch",
    address: "Spintex Coastal Estate Junction, Near Shell",
    city: "Accra",
    region: "Greater Accra",
    hours: WEEKDAYS_4,
    phone: "+233 30 281 3340",
    services: ["SME Banking", "Bulk Cash Deposit", "24/7 ATM"],
  },
  {
    id: "loc-06",
    name: "Tema Main Branch",
    type: "branch",
    address: "Community 1, Near Meridian Hotel Roundabout",
    city: "Tema",
    region: "Greater Accra",
    hours: WEEKDAYS_4_SAT_1,
    phone: "+233 30 320 2851",
    services: ["Harbour Clearing Services", "Trade & FX", "24/7 ATM", "Night Depository"],
  },
  {
    id: "loc-07",
    name: "Kumasi Main Branch, Harper Road",
    type: "branch",
    address: "Harper Road, Adum Commercial District",
    city: "Kumasi",
    region: "Ashanti",
    hours: { weekdays: ["08:30", "16:30"], saturday: ["09:00", "14:00"] },
    phone: "+233 32 202 2314",
    services: ["Commercial Banking", "Forex Bureau", "Prestige Lounge", "24/7 ATM"],
  },
  {
    id: "loc-08",
    name: "KNUST Campus Branch",
    type: "branch",
    address: "Commercial Area, Kwame Nkrumah University",
    city: "Kumasi",
    region: "Ashanti",
    hours: WEEKDAYS_4,
    phone: "+233 32 206 0142",
    services: ["Student Accounts", "Tuition Fee Services", "24/7 Multi-ATM"],
  },
  {
    id: "loc-09",
    name: "Takoradi Main Branch, Market Circle",
    type: "branch",
    address: "Market Circle, Collins Avenue",
    city: "Takoradi",
    region: "Western",
    hours: WEEKDAYS_4,
    phone: "+233 31 202 3551",
    services: ["Oil & Gas Desk", "Trade Services", "24/7 ATM", "Bulk Cash Deposit"],
  },
  {
    id: "loc-10",
    name: "Tamale Main Branch",
    type: "branch",
    address: "Old Market Road, Central Business Area",
    city: "Tamale",
    region: "Northern",
    hours: WEEKDAYS_4,
    phone: "+233 37 202 2451",
    services: ["Agribusiness Finance", "Forex Bureau", "24/7 ATM"],
  },
  {
    id: "loc-11",
    name: "Osu Oxford Street Cash Depository",
    type: "deposit",
    address: "Oxford Street, Opposite Woodin, Osu",
    city: "Accra",
    region: "Greater Accra",
    hours: { always: true },
    phone: "+233 30 268 1525",
    services: ["Instant Cash Deposit", "Bulk Note Acceptor", "Real-time Account Credit"],
  },
  {
    id: "loc-12",
    name: "Cape Coast Main Branch",
    type: "branch",
    address: "Commercial Street, Near Cape Coast Castle",
    city: "Cape Coast",
    region: "Central",
    hours: WEEKDAYS_4,
    phone: "+233 33 213 2410",
    services: ["Institutional Banking", "Forex Bureau", "24/7 ATM"],
  },
];

export const LOCATION_TYPE_LABEL: Record<LocationType, string> = {
  branch: "Branch",
  atm: "ATM",
  deposit: "Cash Deposit",
};

function dayHours(hours: Hours, day: number): [string, string] | undefined {
  if (day === 0) return hours.sunday;
  if (day === 6) return hours.saturday;
  return hours.weekdays;
}

const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** "16:00" → "4:00 PM". */
export function clockLabel(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${suffix}`;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Whether it's open at `now`, and the one line that says so: "Open 24/7", "Open until 4:00 PM", "Opens at 8:30 AM" or
 * "Opens Monday at 8:30 AM". Ghana is on GMT all year, so UTC hours are local hours.
 */
export function openStatus(hours: Hours, now: Date): { open: boolean; label: string } {
  if (hours.always) return { open: true, label: "Open 24/7" };
  const day = now.getUTCDay();
  const mins = now.getUTCHours() * 60 + now.getUTCMinutes();
  const today = dayHours(hours, day);
  if (today && mins >= minutes(today[0]) && mins < minutes(today[1])) {
    return { open: true, label: `Open until ${clockLabel(today[1])}` };
  }
  if (today && mins < minutes(today[0])) return { open: false, label: `Opens at ${clockLabel(today[0])}` };
  for (let i = 1; i <= 7; i++) {
    const next = dayHours(hours, (day + i) % 7);
    if (next) {
      const when = i === 1 ? "tomorrow" : DAY_NAMES[(day + i) % 7];
      return { open: false, label: `Opens ${when} at ${clockLabel(next[0])}` };
    }
  }
  return { open: false, label: "Closed" };
}

/**
 * The opening times as rows for the location sheet. Saturday and Sunday share a row when their hours match, and the
 * row that covers today (Ghana time) is marked so the sheet can bring it forward.
 */
export function hoursRows(hours: Hours, now?: Date | null): { days: string; time: string; today: boolean; closed: boolean }[] {
  const day = now ? now.getUTCDay() : -1;
  if (hours.always) return [{ days: "Every day", time: "Open 24 hours", today: true, closed: false }];
  const span = (h?: [string, string]) => (h ? `${clockLabel(h[0])} – ${clockLabel(h[1])}` : "Closed");
  const row = (days: string, h: [string, string] | undefined, covers: number[]) => ({
    days,
    time: span(h),
    today: covers.includes(day),
    closed: !h,
  });
  const weekend =
    span(hours.saturday) === span(hours.sunday)
      ? [row("Saturday – Sunday", hours.saturday, [6, 0])]
      : [row("Saturday", hours.saturday, [6]), row("Sunday", hours.sunday, [0])];
  return [row("Monday – Friday", hours.weekdays, [1, 2, 3, 4, 5]), ...weekend];
}
