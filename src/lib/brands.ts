/**
 * The companies a customer pays: one table for how to recognise each by name and which logo it has.
 * A transaction row shows the logo in a white circle when there is one, and the usual tinted kind icon when there isn't,
 * so adding a brand is one line here plus one file in `public/brands/`.
 *
 * The mobile networks live in `operators.ts` (their wallets, lines and marks), and this table reads from it rather than repeating it.
 *
 * Logos are drawn for a white disc, so they are fixed dark-on-light and do not follow the OS theme. A brand with no `logo` yet is listed so the names are ready; its rows keep the kind icon until the file is added.
 */
import { operatorFromName, OPERATORS } from "@/lib/operators";

export interface Brand {
  id: string;
  name: string;
  /** Any spelling of the name that should match. */
  match: RegExp;
  /** The mark, in /public. Leave it out until we have the file and the right to use it. */
  logo?: string;
  /** The logo is already a full circle, so it fills the mark edge to edge. Otherwise it sits on a white disc with room around it. */
  round?: boolean;
  /** Put a white disc behind the logo even when it fills the circle, for a mark with transparent or dark areas that vanish in dark mode. */
  disc?: boolean;
}

export const BRANDS: Brand[] = [
  { id: "gcb", name: "GCB Bank", match: /\bgcb\b/i, logo: "/brands/gcb.svg" },
  { id: "absa", name: "Absa Bank Ghana", match: /\babsa\b/i, logo: "/brands/absa.svg" },
  { id: "access", name: "Access Bank", match: /\baccess bank\b/i, logo: "/brands/access.png", round: true },
  { id: "adehyeman", name: "Adehyeman Savings and Loans", match: /\badehyeman\b/i },
  { id: "advans", name: "Advans Ghana", match: /\badvans\b/i, logo: "/brands/advans.png", round: true },
  { id: "affinity", name: "Affinity Ghana", match: /\baffinity\b/i, logo: "/brands/affinity.png", round: true },
  { id: "adb", name: "Agricultural Development Bank", match: /\badb\b|agricultural development bank/i, logo: "/brands/adb.png", round: true },
  { id: "arb-apex", name: "ARB Apex Bank", match: /\barb apex\b/i },
  { id: "bank-of-africa", name: "Bank of Africa", match: /\bbank of africa\b/i, logo: "/brands/bank-of-africa.png", round: true },
  { id: "bestpoint", name: "Bestpoint Savings and Loans", match: /\bbestpoint\b/i, logo: "/brands/bestpoint.png", round: true },
  { id: "calbank", name: "CalBank", match: /\bcal\s?bank\b/i, logo: "/brands/calbank.png", round: true },
  { id: "consolidated-bank", name: "Consolidated Bank Ghana", match: /consolidated bank/i },
  { id: "ecobank", name: "Ecobank", match: /\becobank\b/i, logo: "/brands/ecobank.png" },
  { id: "etranzact", name: "Etranzact", match: /\betranzact\b/i, logo: "/brands/etranzact.png", round: true },
  { id: "fidelity", name: "Fidelity Bank", match: /\bfidelity bank\b/i },
  { id: "first-atlantic", name: "First Atlantic Bank", match: /first atlantic/i, logo: "/brands/first-atlantic.webp", round: true },
  { id: "first-bank", name: "First Bank Ghana", match: /\bfirst bank\b/i, logo: "/brands/first-bank.png", round: true },
  { id: "fnb", name: "First National Bank", match: /first national bank|\bfnb\b/i, logo: "/brands/fnb.png", round: true },
  { id: "gtbank", name: "GTBank", match: /\bgtbank\b|guaranty trust/i, logo: "/brands/gtbank.png", round: true },
  { id: "letshego", name: "Letshego", match: /\bletshego\b/i },
  { id: "nib", name: "National Investment Bank", match: /\bnib\b|national investment bank/i },
  { id: "omnibsic", name: "OmniBSIC", match: /\bomnibsic\b/i },
  { id: "prudential", name: "Prudential Bank", match: /\bprudential bank\b/i, logo: "/brands/prudential.png", round: true },
  { id: "republic", name: "Republic Bank", match: /\brepublic bank\b/i, logo: "/brands/republic.png", round: true },
  { id: "services-integrity", name: "Services Integrity Savings & Loans", match: /services integrity/i, logo: "/brands/services-integrity.jpg", round: true },
  { id: "sinapi", name: "Sinapi Aba", match: /\bsinapi\b/i },
  { id: "socgen", name: "Société Générale Ghana", match: /soci[eé]t[eé] g[eé]n[eé]rale|\bsg ghana\b/i, logo: "/brands/socgen.svg" },
  { id: "stanbic", name: "Stanbic Bank", match: /\bstanbic\b/i, logo: "/brands/stanbic.png", round: true },
  { id: "standard-chartered", name: "Standard Chartered Bank", match: /standard chartered/i, logo: "/brands/standard-chartered.png", round: true },
  { id: "transflow", name: "TransFlow", match: /\btransflow\b/i, logo: "/brands/transflow.png", round: true },
  { id: "uba", name: "United Bank for Africa", match: /\buba\b|united bank for africa/i, logo: "/brands/uba.png", round: true },
  { id: "umb", name: "Universal Merchant Bank", match: /\bumb\b|universal merchant bank/i },
  { id: "zenith", name: "Zenith Bank", match: /\bzenith\b/i, logo: "/brands/zenith.png", round: true },
  { id: "bank-of-ghana", name: "Bank of Ghana", match: /bank of ghana/i, logo: "/brands/bank-of-ghana.png", round: true },
  { id: "fidelity-ng", name: "Fidelity Bank Nigeria", match: /fidelity bank nigeria/i, logo: "/brands/fidelity-ng.svg" },
  { id: "standard-bank", name: "Standard Bank", match: /standard bank (south africa|sa)\b|standard bank group/i, logo: "/brands/standard-bank.png", round: true },
  { id: "equity", name: "Equity Bank", match: /\bequity bank\b/i },
  { id: "kcb", name: "KCB Bank", match: /\bkcb\b/i },
  { id: "ecg", name: "ECG", match: /\becg\b|electricity company of ghana/i, logo: "/brands/ecg.png", round: true },
  { id: "gwcl", name: "Ghana Water", match: /\bgwcl\b|ghana water/i },
  { id: "nedco", name: "NEDCo", match: /\bnedco\b/i },
  { id: "dstv", name: "DStv", match: /\bdstv\b|multichoice/i, logo: "/brands/dstv.png", round: true },
  { id: "gotv", name: "GOtv", match: /\bgotv\b/i, logo: "/brands/gotv.png", round: true },
  { id: "startimes", name: "StarTimes", match: /\bstartimes?\b/i },
  { id: "surfline", name: "Surfline", match: /\bsurfline\b/i, logo: "/brands/surfline.png", round: true },
  { id: "melcom", name: "Melcom", match: /\bmelcom\b/i, logo: "/brands/melcom-centred.svg", round: true },
  { id: "shoprite", name: "Shoprite", match: /\bshoprite\b/i, logo: "/brands/shoprite.png", round: true },
  { id: "shell", name: "Shell", match: /\bshell\b/i, logo: "/brands/shell.png", round: true },
  { id: "totalenergies", name: "TotalEnergies", match: /\btotal(energies)?\b/i },
  { id: "bolt", name: "Bolt", match: /\bbolt\b/i, logo: "/brands/bolt.png", round: true },
  { id: "netflix", name: "Netflix", match: /\bnetflix\b/i, logo: "/brands/netflix.png", round: true },
  { id: "spotify", name: "Spotify", match: /\bspotify\b/i, logo: "/brands/spotify.svg" },
  { id: "gra", name: "Ghana Revenue Authority", match: /\bgra\b|ghana revenue authority/i, logo: "/brands/gra.png", round: true, disc: true },
  { id: "dvla", name: "DVLA", match: /\bdvla\b/i, logo: "/brands/dvla.png", round: true },
  { id: "passports", name: "Passports Office", match: /passports? office|\bpassport\b/i },
  { id: "nhis", name: "NHIS", match: /\bnhis\b|national health insurance/i, logo: "/brands/nhis.svg" },
  { id: "waec", name: "WAEC", match: /\bwaec\b/i, logo: "/brands/waec.png", round: true },
  { id: "cocobod", name: "Ghana Cocoa Board", match: /cocoa board|\bcocobod\b/i, logo: "/brands/cocobod.png", round: true },
  { id: "moe", name: "Ministry of Education", match: /ministry of education/i },
  { id: "knust", name: "KNUST", match: /\bknust\b/i },
  { id: "legon", name: "University of Ghana", match: /university of ghana|\blegon\b/i, logo: "/brands/legon.png", round: true },
  { id: "korle-bu", name: "Korle Bu Teaching Hospital", match: /korle[- ]?bu/i, logo: "/brands/korle-bu.png", round: true },
  { id: "sic", name: "SIC Insurance", match: /\bsic insurance\b/i },
  { id: "action-chapel", name: "Action Chapel International", match: /action chapel/i, logo: "/brands/action-chapel.png", round: true },
  { id: "icgc", name: "ICGC Christ Temple", match: /\bicgc\b|christ temple/i, logo: "/brands/icgc.png", round: true },
];

/** The brand a name belongs to, or null. Networks (MTN, Telecel, AT, GhanaPay, G-Money) come from the operators table. */
export function brandFor(name?: string | null): Brand | null {
  if (!name) return null;
  const op = operatorFromName(name);
  if (op) return { id: op.toLowerCase(), name: OPERATORS[op].telco, match: /./, logo: OPERATORS[op].logo, round: true };
  return BRANDS.find((b) => b.match.test(name)) ?? null;
}

/** The logo for a name when we have one, otherwise null (and the row keeps its kind icon). */
export function brandLogo(name?: string | null): { src: string; round: boolean; disc: boolean } | null {
  const b = brandFor(name);
  return b?.logo ? { src: b.logo, round: Boolean(b.round), disc: Boolean(b.disc) } : null;
}
