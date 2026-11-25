/** Splits one CSV row into trimmed cells, keeping commas and doubled quotes inside quoted cells. */
export function splitCsvRow(row: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"') {
      if (quoted && row[i + 1] === '"') {
        cur += '"';
        i++;
      } else quoted = !quoted;
    } else if (ch === "," && !quoted) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

/** The rows of a CSV that have anything in them, without the byte-order mark Excel adds. */
export function csvRows(text: string): string[] {
  return text
    .replace(/^﻿/, "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((r) => r.trim() !== "");
}
