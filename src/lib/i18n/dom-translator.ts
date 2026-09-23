/**
 * DOM translator — swaps rendered English copy for the active language.
 *
 * Screens keep their English strings inline. When a non-English language is
 * active, this walks the page (and every later React update, via a
 * MutationObserver) and replaces text nodes and a few text attributes with
 * catalog entries. The original English is remembered per node, so switching
 * back to English restores it exactly, and React re-renders are re-translated.
 *
 * Matching, in order:
 *  1. exact phrase                         "Send Money"
 *  2. template with placeholders           "You’ve sent {0} to {1}."
 *     — adjacent text nodes under one element are joined first, so JSX like
 *       `Step {n} of {total}` matches as one sentence
 *  3. trailing-colon / dates               "Amount:" · "23 Sep 2026"
 *
 * Anything that doesn't match (names, amounts, account numbers, customer
 * data) is left untouched. Opt a subtree out with `translate="no"` or
 * `data-no-translate`.
 *
 * Hydration safety: server-rendered markup React hasn't hydrated yet (a
 * streamed Suspense boundary) is left alone — rewriting it would trip React's
 * hydration text check. Such elements are parked and retried until React owns
 * them (detected by React's `__reactFiber$…` expando).
 */

import type { SupportedLanguage } from "./languages";

type Lang = Exclude<SupportedLanguage, "en">;

const ATTRS = ["placeholder", "aria-label", "title", "alt"] as const;
/** Never touched (text or attributes). */
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE"]);
/** Attributes (placeholder, aria-label…) are translated, but never their text — it's the user's input. */
const FIELD_TAGS = new Set(["TEXTAREA", "INPUT"]);

const PENDING_RETRY_MS = 120;
const PENDING_MAX_ATTEMPTS = 50; // ~6s, then give up on non-React markup
const CACHE_LIMIT = 5000;

function isReactOwned(el: Element): boolean {
  // Own keys only — `for…in` would walk hundreds of inherited DOM properties
  return Object.keys(el).some((key) => key.startsWith("__reactFiber$"));
}

const LOCALE: Record<Lang, string> = { fr: "fr-FR", es: "es-ES", zh: "zh-CN" };

interface TextRec {
  orig: string;
  applied: string;
}

interface Template {
  re: RegExp;
  value: string;
  /** order[i] = placeholder number captured by regex group i + 1 */
  order: number[];
  weight: number;
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONTH_RE = "(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sept?(?:ember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";
const WEEKDAY_RE = "(?:(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,? )?";
// "23 Sep 2026", "Wed 23 Sep", "Sep 23, 2026", "Sep 2026"
const DATE_DMY = new RegExp(`^${WEEKDAY_RE}(\\d{1,2}) ${MONTH_RE}\\.?(?:,? (\\d{4}))?$`);
const DATE_MDY = new RegExp(`^${WEEKDAY_RE}${MONTH_RE}\\.? (\\d{1,2})(?:,? (\\d{4}))?$`);
const DATE_MY = new RegExp(`^${MONTH_RE} (\\d{4})$`);

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalise(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

export class DomTranslator {
  private lang: Lang | null = null;
  private dict = new Map<string, string>();
  private templates: Template[] = [];
  private cache = new Map<string, string | null>();

  private texts = new WeakMap<Text, TextRec>();
  private touchedTexts = new Set<Text>();
  private attrs = new WeakMap<Element, Map<string, TextRec>>();
  private touchedEls = new Set<Element>();

  private observer: MutationObserver | null = null;

  private owned = new WeakSet<Element>();
  private pending = new Map<Element, number>();
  private pendingTimer: ReturnType<typeof setTimeout> | null = null;

  /** Tests run without React; the app always requires hydrated markup. */
  constructor(private readonly requireReactOwnership = true) {}

  /** Activate a language with its catalog, or pass null to restore English. */
  setLanguage(lang: Lang | null, catalog?: Map<string, string>) {
    this.lang = lang;
    this.cache.clear();
    if (lang && catalog) {
      this.dict = catalog;
      this.templates = this.compileTemplates(catalog);
    } else {
      this.dict = new Map();
      this.templates = [];
    }

    if (typeof document === "undefined") return;

    if (!lang) {
      this.observer?.disconnect();
      this.observer = null;
      this.clearPending();
      this.restoreAll();
      return;
    }

    this.processTree(document.body);
    if (!this.observer) {
      this.observer = new MutationObserver((records) => this.onMutations(records));
      this.observer.observe(document.body, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: [...ATTRS],
      });
    }
  }

  destroy() {
    this.setLanguage(null);
  }

  // ─── Lookup ───────────────────────────────────────────────────────────────

  private compileTemplates(catalog: Map<string, string>): Template[] {
    const out: Template[] = [];
    for (const [en, value] of catalog) {
      if (!/\{\d+\}/.test(en)) continue;
      const literal = en.replace(/\{\d+\}/g, "");
      if (!/[A-Za-z]{2,}/.test(literal)) continue;
      const order: number[] = [];
      const src = en
        .split(/(\{\d+\})/)
        .map((part) => {
          const m = /^\{(\d+)\}$/.exec(part);
          if (m) {
            order.push(Number(m[1]));
            return "(.+?)";
          }
          return escapeRe(part);
        })
        .join("");
      out.push({ re: new RegExp(`^${src}$`), value, order, weight: literal.length });
    }
    // Most specific (longest literal text) first
    return out.sort((a, b) => b.weight - a.weight);
  }

  /** Translate one normalised string, or null if nothing matches. */
  translate(text: string, depth = 0): string | null {
    if (!this.lang) return null;
    const hit = this.cache.get(text);
    if (hit !== undefined) return hit;

    let result: string | null = this.dict.get(text) ?? null;

    if (result === null && /[A-Za-z]/.test(text)) {
      result = this.translateDate(text);
    }

    if (result === null && depth < 2 && /[A-Za-z]{2,}/.test(text)) {
      for (const t of this.templates) {
        const m = t.re.exec(text);
        if (!m) continue;
        result = t.value.replace(/\{(\d+)\}/g, (_, n) => {
          const raw = m[t.order.indexOf(Number(n)) + 1] ?? "";
          const inner = normalise(raw);
          return (inner && this.translate(inner, depth + 1)) ?? raw;
        });
        break;
      }
    }

    if (result === null) {
      // "Amount:" → "Montant :"
      const colon = /^(.+?)\s*:$/.exec(text);
      if (colon) {
        const base = this.dict.get(colon[1]);
        if (base) result = this.lang === "fr" ? `${base} :` : this.lang === "zh" ? `${base}：` : `${base}:`;
      }
    }

    if (result === null && /[A-Za-z]/.test(text) && /[·•|]/.test(text) && depth < 2) {
      // "Savings · Active" — translate each segment independently
      const parts = text.split(/(\s*[·•|]\s*)/);
      let changed = false;
      const mapped = parts.map((p, i) => {
        if (i % 2 === 1) return p;
        const n = normalise(p);
        const tr = n ? this.translate(n, depth + 1) : null;
        if (tr) changed = true;
        return tr ?? p;
      });
      if (changed) result = mapped.join("");
    }

    if (this.cache.size > CACHE_LIMIT) this.cache.clear();
    this.cache.set(text, result);
    return result;
  }

  private translateDate(text: string): string | null {
    if (!this.lang) return null;
    const locale = LOCALE[this.lang];

    const my = DATE_MY.exec(text);
    if (my) {
      const mi = MONTHS.indexOf(my[1].slice(0, 3).toLowerCase());
      return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(
        new Date(Number(my[2]), mi, 1),
      );
    }

    let weekday: string | undefined;
    let day: number;
    let month: string;
    let year: string | undefined;
    const dmy = DATE_DMY.exec(text);
    const mdy = dmy ? null : DATE_MDY.exec(text);
    if (dmy) [, weekday, day, month, year] = [dmy[0], dmy[1], Number(dmy[2]), dmy[3], dmy[4]];
    else if (mdy) [, weekday, month, day, year] = [mdy[0], mdy[1], mdy[2], Number(mdy[3]), mdy[4]];
    else return null;

    const mi = MONTHS.indexOf(month.slice(0, 3).toLowerCase());
    if (mi < 0 || !day) return null;
    const date = new Date(year ? Number(year) : new Date().getFullYear(), mi, day);
    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: month.length > 4 ? "long" : "short",
      ...(year ? { year: "numeric" as const } : {}),
      ...(weekday ? { weekday: "short" as const } : {}),
    }).format(date);
  }

  /** Translate raw DOM text, preserving its leading/trailing whitespace. */
  private translateRaw(raw: string): string | null {
    const core = normalise(raw);
    if (!core || !/[A-Za-z]/.test(core)) return null;
    const tr = this.translate(core);
    if (tr === null) return null;
    const lead = /^\s*/.exec(raw)![0];
    const trail = /\s*$/.exec(raw)![0];
    return lead + tr + trail;
  }

  // ─── DOM walking ──────────────────────────────────────────────────────────

  private skipped(el: Element | null): boolean {
    for (let cur = el; cur; cur = cur.parentElement) {
      if (SKIP_TAGS.has(cur.tagName)) return true;
      if (cur.getAttribute("translate") === "no" || cur.hasAttribute("data-no-translate")) return true;
      if ((cur as HTMLElement).isContentEditable) return true;
    }
    return false;
  }

  private processTree(root: Node) {
    if (root.nodeType === Node.TEXT_NODE) {
      if (root.parentElement) this.processElement(root.parentElement);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    const el = root as Element;
    if (this.skipped(el)) return;
    this.processElement(el);
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT, {
      acceptNode: (n) => {
        const e = n as Element;
        if (SKIP_TAGS.has(e.tagName) || e.getAttribute("translate") === "no" || e.hasAttribute("data-no-translate")) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    let n = walker.nextNode();
    while (n) {
      this.processElement(n as Element);
      n = walker.nextNode();
    }
  }

  private origOf(node: Text): string {
    const rec = this.texts.get(node);
    const current = node.nodeValue ?? "";
    if (rec && current === rec.applied) return rec.orig;
    return current;
  }

  private writeText(node: Text, orig: string, value: string) {
    if (node.nodeValue !== value) node.nodeValue = value;
    this.texts.set(node, { orig, applied: value });
    this.touchedTexts.add(node);
  }

  private processElement(el: Element) {
    if (!this.isReady(el)) return;
    this.processAttrs(el);
    if (FIELD_TAGS.has(el.tagName)) return;

    const texts: Text[] = [];
    let onlyText = true;
    for (const child of el.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) texts.push(child as Text);
      else if (child.nodeType !== Node.COMMENT_NODE) onlyText = false;
    }
    if (texts.length === 0) return;

    const origs = texts.map((t) => this.origOf(t));

    // Joined sentence across adjacent text nodes (JSX interpolation)
    if (onlyText && texts.length > 1) {
      const joined = this.translateRaw(origs.join(""));
      if (joined !== null) {
        texts.forEach((t, i) => this.writeText(t, origs[i], i === 0 ? joined : ""));
        return;
      }
    }

    texts.forEach((t, i) => {
      const tr = this.translateRaw(origs[i]);
      if (tr !== null) this.writeText(t, origs[i], tr);
      else if (this.texts.has(t)) this.writeText(t, origs[i], origs[i]);
    });
  }

  private processAttrs(el: Element) {
    for (const name of ATTRS) {
      if (!el.hasAttribute(name)) continue;
      const current = el.getAttribute(name) ?? "";
      let map = this.attrs.get(el);
      const rec = map?.get(name);
      const orig = rec && current === rec.applied ? rec.orig : current;
      const tr = this.translateRaw(orig);
      const value = tr ?? orig;
      if (current !== value) el.setAttribute(name, value);
      if (tr !== null || rec) {
        if (!map) {
          map = new Map();
          this.attrs.set(el, map);
        }
        map.set(name, { orig, applied: value });
        this.touchedEls.add(el);
      }
    }
  }

  private onMutations(records: MutationRecord[]) {
    if (!this.lang) return;
    const added = new Set<Node>();
    const changed = new Set<Element>();
    for (const r of records) {
      if (r.type === "characterData") {
        const t = r.target as Text;
        const rec = this.texts.get(t);
        if (rec && t.nodeValue === rec.applied) continue; // our own write
        if (t.parentElement) changed.add(t.parentElement);
      } else if (r.type === "attributes") {
        const el = r.target as Element;
        const rec = this.attrs.get(el)?.get(r.attributeName!);
        if (rec && el.getAttribute(r.attributeName!) === rec.applied) continue;
        changed.add(el);
      } else {
        if (r.target.nodeType === Node.ELEMENT_NODE) changed.add(r.target as Element);
        r.addedNodes.forEach((n) => added.add(n));
      }
    }
    for (const n of added) {
      if (!n.isConnected) continue;
      const parent = n.nodeType === Node.ELEMENT_NODE ? (n as Element) : n.parentElement;
      if (parent && !this.skipped(parent)) this.processTree(n);
    }
    for (const el of changed) {
      if (el.isConnected && !this.skipped(el)) this.processElement(el);
    }
    // Discard the records our own writes just produced
    this.observer?.takeRecords();
    this.prune();
  }

  // ─── Hydration gate ───────────────────────────────────────────────────────

  private isReady(el: Element): boolean {
    if (!this.requireReactOwnership || this.owned.has(el)) return true;
    if (isReactOwned(el)) {
      this.owned.add(el);
      return true;
    }
    if (!this.pending.has(el)) this.pending.set(el, 0);
    this.schedulePending();
    return false;
  }

  private schedulePending() {
    if (this.pendingTimer || this.pending.size === 0) return;
    this.pendingTimer = setTimeout(() => {
      this.pendingTimer = null;
      if (!this.lang) return;
      const ready: Element[] = [];
      for (const [el, attempts] of this.pending) {
        if (!el.isConnected || attempts >= PENDING_MAX_ATTEMPTS) this.pending.delete(el);
        else if (isReactOwned(el)) {
          this.pending.delete(el);
          this.owned.add(el);
          ready.push(el);
        } else this.pending.set(el, attempts + 1);
      }
      ready.forEach((el) => this.processElement(el));
      this.observer?.takeRecords();
      this.schedulePending();
    }, PENDING_RETRY_MS);
  }

  private clearPending() {
    if (this.pendingTimer) clearTimeout(this.pendingTimer);
    this.pendingTimer = null;
    this.pending.clear();
  }

  private prune() {
    if (this.touchedTexts.size < 4000) return;
    for (const t of this.touchedTexts) if (!t.isConnected) this.touchedTexts.delete(t);
    for (const e of this.touchedEls) if (!e.isConnected) this.touchedEls.delete(e);
  }

  private restoreAll() {
    for (const t of this.touchedTexts) {
      const rec = this.texts.get(t);
      if (rec && t.nodeValue === rec.applied) t.nodeValue = rec.orig;
      this.texts.delete(t);
    }
    this.touchedTexts.clear();
    for (const el of this.touchedEls) {
      const map = this.attrs.get(el);
      map?.forEach((rec, name) => {
        if (el.getAttribute(name) === rec.applied) el.setAttribute(name, rec.orig);
      });
      this.attrs.delete(el);
    }
    this.touchedEls.clear();
  }
}
