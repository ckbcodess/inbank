/**
 * Every country a customer can send money to (Ghana excluded: this is the "Outside Ghana" list).
 * Names come from the runtime's ISO region data; flags are circular crops of the
 * MIT-licensed country-flag-icons set, copied to public/flags/<CODE>.svg.
 *
 * Money settles in the country's own currency when we quote it (see RATES in
 * components/payments/flows/shared.tsx); every other country settles in USD.
 */

export const COUNTRY_CODES = ["AD","AE","AF","AG","AI","AL","AM","AO","AR","AS","AT","AU","AW","AX","AZ","BA","BB","BD","BE","BF","BG","BH","BI","BJ","BL","BM","BN","BO","BQ","BR","BS","BT","BW","BY","BZ","CA","CC","CD","CF","CG","CH","CI","CK","CL","CM","CN","CO","CR","CU","CV","CW","CX","CY","CZ","DE","DJ","DK","DM","DO","DZ","EC","EE","EG","EH","ER","ES","ET","FI","FJ","FK","FM","FO","FR","GA","GB","GD","GE","GF","GG","GI","GL","GM","GN","GP","GQ","GR","GT","GU","GW","GY","HK","HN","HR","HT","HU","ID","IE","IL","IM","IN","IO","IQ","IR","IS","IT","JE","JM","JO","JP","KE","KG","KH","KI","KM","KN","KR","KW","KY","KZ","LA","LB","LC","LI","LK","LR","LS","LT","LU","LV","LY","MA","MC","MD","ME","MF","MG","MH","MK","ML","MM","MN","MO","MP","MQ","MR","MS","MT","MU","MV","MW","MX","MY","MZ","NA","NC","NE","NF","NG","NI","NL","NO","NP","NR","NU","NZ","OM","PA","PE","PF","PG","PH","PK","PL","PM","PN","PR","PS","PT","PW","PY","QA","RE","RO","RS","RU","RW","SA","SB","SC","SD","SE","SG","SH","SI","SJ","SK","SL","SM","SN","SO","SR","SS","ST","SV","SX","SY","SZ","TC","TD","TG","TH","TJ","TK","TL","TM","TN","TO","TR","TT","TV","TW","TZ","UA","UG","US","UY","UZ","VA","VC","VE","VG","VI","VN","VU","WF","WS","XK","YE","YT","ZA","ZM","ZW"] as const;

export type CountryCode = (typeof COUNTRY_CODES)[number];

export interface Country {
  code: CountryCode;
  name: string;
  /** The currency the recipient is paid in. */
  currency: string;
}

const NAME_OVERRIDES: Partial<Record<string, string>> = {
  HK: "Hong Kong",
  MO: "Macao",
};

const CURRENCY_GROUPS: Record<string, string> = {
  EUR: "AT BE CY DE EE ES FI FR GR HR IE IT LT LU LV MT NL PT SI SK AD MC SM VA ME XK AX BL GF GP MF MQ PM RE YT",
  GBP: "GB GG IM JE",
  CAD: "CA",
  AUD: "AU CX CC NF KI NR TV",
  NZD: "NZ CK NU TK PN",
  JPY: "JP",
  CNY: "CN",
  AED: "AE",
  NGN: "NG",
  KES: "KE",
  ZAR: "ZA",
  EGP: "EG",
  RWF: "RW",
  ZMW: "ZM",
  XOF: "BJ BF CI GW ML NE SN TG",
  CHF: "CH LI",
  SEK: "SE",
  NOK: "NO SJ",
  DKK: "DK FO GL",
  INR: "IN",
  BRL: "BR",
  MXN: "MX",
  SGD: "SG",
  HKD: "HK",
  KRW: "KR",
  TRY: "TR",
  SAR: "SA",
  QAR: "QA",
};

const CURRENCY_BY_CODE: Record<string, string> = {};
for (const [currency, list] of Object.entries(CURRENCY_GROUPS)) {
  for (const code of list.split(" ")) CURRENCY_BY_CODE[code] = currency;
}

const displayNames =
  typeof Intl !== "undefined" && "DisplayNames" in Intl
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null;

/** All destination countries, A to Z. */
export const COUNTRIES: Country[] = COUNTRY_CODES.map((code) => ({
  code,
  name: NAME_OVERRIDES[code] ?? displayNames?.of(code) ?? code,
  currency: CURRENCY_BY_CODE[code] ?? "USD",
})).sort((a, b) => a.name.localeCompare(b.name));

/**
 * The countries PAPSS (the Pan-African Payment and Settlement System) can pay into here,
 * with the name the PAPSS flow uses for each. Picking one of these offers PAPSS instead.
 */
export const PAPSS_COUNTRY_NAMES: Partial<Record<CountryCode, string>> = {
  NG: "Nigeria",
  KE: "Kenya",
  ZA: "South Africa",
  CI: "Côte d'Ivoire",
  EG: "Egypt",
  RW: "Rwanda",
  ZM: "Zambia",
};

export function findCountryByName(name: string): Country | undefined {
  return COUNTRIES.find((c) => c.name === name);
}
