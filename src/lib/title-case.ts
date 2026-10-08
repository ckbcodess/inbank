const SMALL = new Set(["of", "the", "to", "for", "and", "in", "on", "a", "or", "at", "by", "as", "an", "per"]);

function capWord(word: string, first: boolean): string {
  if (!first && SMALL.has(word.toLowerCase())) return word.toLowerCase();
  // Acronyms and mixed-case brand words ("PIN", "PayCode", "SWIFT") are left alone.
  if (/^\(?[A-Z]{2,}/.test(word) || /[A-Z].*[A-Z]/.test(word)) return word;
  return word
    .split("-")
    .map((part) => part.replace(/[A-Za-z]/, (c) => c.toUpperCase()))
    .join("-");
}

/** Title Case for field labels: every word capitalised except short joining words, acronyms kept as written. */
export function toTitleCase(text: string): string {
  return text
    .split(" ")
    .map((w, i) => capWord(w, i === 0))
    .join(" ");
}
