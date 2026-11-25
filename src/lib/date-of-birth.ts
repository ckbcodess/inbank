/**
 * Dates of birth are typed, day first ("14/05/1990"), because paging a calendar back thirty years is slower than
 * eight digits. Stored as an ISO date ("1990-05-14").
 */
export const DATE_OF_BIRTH_PLACEHOLDER = "DD/MM/YYYY";

/** "14051990" → "14/05/1990", grouped as it's typed. */
export function formatDateOfBirth(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4)].filter(Boolean).join("/");
}

export function isCompleteDateOfBirth(raw: string): boolean {
  return raw.replace(/\D/g, "").length === 8;
}

/** "14/05/1990", "4/5/1990" or "1990-05-14" → "1990-05-14". Returns "" for anything that isn't a real past date. */
export function parseDateOfBirth(raw: string): string {
  const text = raw.trim();
  const dayFirst = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(text);
  const yearFirst = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  const parts = dayFirst ? [dayFirst[3], dayFirst[2], dayFirst[1]] : yearFirst ? yearFirst.slice(1) : null;
  if (!parts) return "";
  const [year, month, day] = parts.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  // `Date` rolls 31 February into March, so check it kept the day that was typed.
  const real = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  if (!real || year < 1900 || date.getTime() >= Date.now()) return "";
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** "1990-05-14" → "14/05/1990". */
export function displayDateOfBirth(iso: string): string {
  const [year, month, day] = iso.split("-");
  return year && month && day ? `${day}/${month}/${year}` : "";
}
