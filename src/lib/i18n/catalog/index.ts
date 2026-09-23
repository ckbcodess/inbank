/**
 * Phrase catalog — English source text → French / Spanish / Mandarin.
 *
 * Keyed by the exact English copy as it renders, so screens keep their
 * English strings inline and the DOM translator swaps them at runtime.
 * `{0}`, `{1}` … mark interpolated values (amounts, names, dates); the
 * translation may reorder them.
 *
 * Loaded lazily (dynamic import) only when a non-English language is active.
 */
import type { SupportedLanguage } from "../languages";
import type { Entry } from "./types";
import common from "./common";
import payments from "./payments";
import onboarding from "./onboarding";
import dashboard from "./dashboard";
import cards from "./cards";
import accounts from "./accounts";
import beneficiaries from "./beneficiaries";
import services from "./services";
import business from "./business";
import admin from "./admin";
import data from "./data";

const ALL: Entry[][] = [
  common,
  payments,
  onboarding,
  dashboard,
  cards,
  accounts,
  beneficiaries,
  services,
  business,
  admin,
  data,
];

const COLUMN: Record<Exclude<SupportedLanguage, "en">, 1 | 2 | 3> = { fr: 1, es: 2, zh: 3 };

export function buildCatalog(lang: Exclude<SupportedLanguage, "en">): Map<string, string> {
  const col = COLUMN[lang];
  const map = new Map<string, string>();
  for (const group of ALL) {
    for (const entry of group) {
      const value = entry[col];
      if (value) map.set(entry[0], value);
    }
  }
  return map;
}
