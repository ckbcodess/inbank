# NIBS Interface System & Design Tokens

> **Architecture Context**: Next.js 15 (App Router) + React 19 + Tailwind CSS v4 + Base UI (`@base-ui/react`) + Lucide React.  
> **Source of Truth**: [`DESIGN-LANGUAGE.md`](file:///c:/Users/rnsfo/Desktop/newprojects/inbank/DESIGN-LANGUAGE.md) and [`src/app/globals.css`](file:///c:/Users/rnsfo/Desktop/newprojects/inbank/src/app/globals.css).

---

## 1. Active Design Tokens & Color Palette

All colors are strictly managed via semantic CSS variables and OKLCH color spaces. **Raw hex codes and arbitrary Tailwind color utilities (e.g., `text-blue-500`, `bg-gray-100`) are strictly forbidden.**

### Core Semantic Tokens

| Token | CSS Variable | Light Mode (OKLCH / Value) | Dark Mode (OKLCH / Value) | Usage |
|---|---|---|---|---|
| Background | `--background` | `oklch(1 0 0)` | `oklch(0.145 0 0)` | Page canvas background |
| Foreground | `--foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` | Primary text, titles |
| Card | `--card` | `oklch(1 0 0)` | `oklch(0.205 0 0)` | Panels, elevated sections |
| Card Foreground | `--card-foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` | Text inside cards |
| Muted | `--muted` | `oklch(0.97 0 0)` | `oklch(0.269 0 0)` | Secondary fills, icon backgrounds |
| Muted Foreground | `--muted-foreground` | `oklch(0.556 0 0)` | `oklch(0.708 0 0)` | Sub-labels, captions, metadata |
| Border / Input | `--border`, `--input` | `oklch(0.922 0 0)` | `oklch(0.269 0 0)` | Structural borders, inputs |
| Primary (Accent) | `--primary` | `oklch(0.55 0.17 255)` (Restrained Blue) | `oklch(0.62 0.16 255)` | Action buttons, active outlines |
| Primary FG | `--primary-foreground`| `oklch(1 0 0)` | `oklch(1 0 0)` | Text on primary button |
| Secondary | `--secondary` | `oklch(0.97 0 0)` | `oklch(0.269 0 0)` | Secondary action fills |
| Destructive | `--destructive` | `oklch(0.577 0.245 27.325)` | `oklch(0.637 0.237 25.331)` | Error messages, destructive CTA |
| Success | `--success` | `oklch(0.62 0.15 150)` | `oklch(0.68 0.15 150)` | Success status badges |
| Warning | `--warning` | `oklch(0.72 0.16 75)` | `oklch(0.78 0.15 75)` | Warning indicators |
| Active Border | `--active-border` | `var(--primary)` | `var(--ring)` | Selected card / row border |
| Active BG | `--active-bg` | `color-mix(in oklch, var(--primary) 8%, transparent)` | `color-mix(in oklch, var(--primary) 12%, transparent)` | Selected card / row background |

### Data Visualization Scales

- **Sequential Scale** (`--chart-1` to `--chart-5`): Single blue hue ramp representing magnitude.
- **Secondary Chart Scale** (`--chart-secondary-1` to `--chart-secondary-5`): Complementary warm hue ramp.
- **Categorical Identity Scale** (`--cat-1` to `--cat-5`, `--cat-other`): Fixed 8-family hues validated for color-blind safety (CVD). **Never reorder or cycle past 5 categories** (6th+ folds into `--cat-other`). Never rely on color alone for critical data interpretation.

---

## 2. Typography & Text Scaling Rules

The app uses **Geist Sans** (`--font-sans`) and **Geist Mono** (`--font-mono`).

### Font Weight Restrictions (Non-Negotiable)
- **Zero Bold Rule**: `globals.css` forces `font-weight: inherit` across headings and text. Headings are differentiated strictly by **size, letter-spacing, and line-height**, never by `font-bold` or `font-semibold`.
- **Page Titles**: Use `tracking-[-0.01em]` and `text-[22px] leading-tight`.
- **Tabular Numerics**: **All monetary amounts, account numbers, dates, references, percentages, and rates MUST carry the `.tabular` class** (`font-variant-numeric: tabular-nums`).

### Fixed Type Hierarchy Table

| UI Context | Tailwind Classes |
|---|---|
| Page Title | `text-[22px] leading-tight tracking-[-0.01em] text-foreground` |
| Large Value / Total | `text-[22px] leading-tight text-foreground tabular` |
| Panel / Section Heading | `text-[15px]` or `text-[16px] text-foreground` |
| Row Primary Text / Item Title | `text-[14px] text-foreground` |
| Body Text / Table Cells / Inputs | `text-[13px] text-foreground` |
| Meta / Caption / Helper Text | `text-[12px] text-muted-foreground` |
| Uppercase Group Header | `text-[11px] uppercase tracking-wider text-muted-foreground` |
| Long-form Paragraphs | Add `leading-relaxed` |

---

## 3. Spacing & Border Radius Rules

- **Root Page Gap**: `gap-5` across all screens.
- **Panel Radius**: `rounded-2xl` (Panels, cards, major content containers).
- **Inset Block Radius**: `rounded-xl` (Nested container sections, secondary callouts).
- **Control / Tile Radius**: `rounded-lg` (Buttons, form fields, icon tiles).
- **Badges / Pills**: `rounded-full`.

---

## 4. Iconography Conventions

- **Library**: `lucide-react` only.
- **Size**: Strictly between `size={15}` and `size={18}` (e.g. `size={16}`, `size={17}`).
- **Stroke Width**: `strokeWidth={1.7}` to `strokeWidth={1.9}`. Never use the heavy default stroke width.

---

## 5. Core Layout & Component Patterns

### A. Page Skeleton (Universal Pattern)

```tsx
<div className="flex flex-col gap-5">
  <PageHeader
    title="Screen Name"
    description="One sentence in plain language describing this view."
    actions={/* Optional Button or Action Group */}
    backTo={/* ONLY on object-detail screens: { href: "/accounts", label: "Accounts" } */}
  />

  <StateSwitcher section="X.X" states={...} value={state} onChange={setState} labels={...} />

  <div className="rounded-2xl border border-border bg-card">
    {/* Screen Content */}
  </div>
</div>
```

### B. Containers & Panels
- **Standard Panel**: `rounded-2xl border border-border bg-card`
- **Padded Panel**: `rounded-2xl border border-border bg-card p-5`
- **Divider before Footer / Summary**: `border-t border-border pt-5`

### C. Search & Filter Toolbars
```tsx
<div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
  <div className="relative min-w-[200px] flex-1">
    <Search size={15} strokeWidth={1.9} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
    <Input value={query} onChange={...} placeholder="Search by …" className="pl-9" aria-label="Search" />
  </div>
</div>
```
- **Filter Chips**: `<Button variant={active ? "secondary" : "ghost"} size="sm">`

### D. List Rows
```tsx
<ul className="divide-y divide-border">
  <li>
    <Link href="/cards/123" className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-muted/50">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <CreditCard size={17} strokeWidth={1.8} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[14px] text-foreground">Debit Card · 4829</span>
        <span className="mt-0.5 text-[12px] text-muted-foreground tabular">Active · GHS Account</span>
      </span>
      <span className="flex shrink-0 flex-col items-end">
        <span className="text-[14px] text-foreground tabular">GHS 12,450.00</span>
        <span className="mt-0.5 text-[12px] text-muted-foreground tabular">Limit: GHS 20,000</span>
      </span>
      <ChevronRight size={16} strokeWidth={1.8} className="shrink-0 text-muted-foreground" />
    </Link>
  </li>
</ul>
```

### E. Action Hub & Mobile-Aligned Cards (Send & Pay / Rail Hubs)
When aligning hub and action selection interfaces to the mobile app design system:
- **Grid Layout**: 2 columns on desktop/tablet, single column on mobile (`grid grid-cols-1 gap-4 sm:grid-cols-2`).
- **Dedicated Card Fills (`surface/on-card`)**:
  - **Light Mode**: `bg-[#f6f6f5]` (distinct warm soft surface), `hover:bg-[#eeeeed]`, `border-[#ebebe9]`.
  - **Dark Mode**: `dark:bg-[#1e1e1e]` (elevated dark surface), `dark:hover:bg-[#262626]`, `dark:border-[#292928]`.
  - **Radius & Padding**: `rounded-[16px] p-4`.
- **Icon Badge Container**:
  - `rounded-[12px] size-[38.5px]`
  - **Light Mode**: `bg-white border border-black/[0.04] text-amber-500 shadow-[0_1px_2px_rgba(0,0,0,0.03)]`
  - **Dark Mode**: `dark:bg-[#252525] dark:border-white/[0.06] dark:text-[#fdc307]`
- **Typography & Arrow**:
  - Label: `text-[16px] font-medium tracking-[-0.01em] text-foreground`
  - Trailing Chevron: `size={20} strokeWidth={1.8}` in `text-[#737373] dark:text-[#999999]` with `group-hover:translate-x-0.5`.

### F. Data Tables
```tsx
<div className="overflow-x-auto">
  <table className="w-full min-w-[720px] text-[13px]">
    <thead>
      <tr className="border-b border-border text-left text-muted-foreground">
        <th className="px-4 py-3 font-normal">Account Name</th>
        <th className="px-4 py-3 font-normal text-right">Balance</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-border">
      <tr className="transition-colors hover:bg-muted/50">
        <td className="px-4 py-3.5 text-foreground">Operational Account</td>
        <td className="px-4 py-3.5 text-right tabular text-foreground">GHS 45,210.00</td>
      </tr>
    </tbody>
  </table>
</div>
```

### F. Five Mandatory List States
Always import from `@/components/states/ListStates`:
1. `ListSkeleton` — Loading state (skeleton rows, never a bare spinner).
2. `TrueEmptyState` — Zero user records exist. Explains what appears here + primary action.
3. `FilteredEmptyState` — Search/filter produced zero hits. Must provide a reset action.
4. `ListErrorState` — Fetch failure. Must provide a retry action and reassure data integrity.
5. `PartialLoadFooter` — Infinite scroll or pagination in-flight loading.

---

## 6. Interaction & Component API Rules

- **Zero Redundant Selectors**: If a choice or parameter was chosen on a preceding screen (e.g. choosing a payment rail on a hub screen), **NEVER** re-render a dropdown or selector on the subsequent form to re-choose that parameter. Trust the prior decision; use a `< Back` link to allow returning to the selection screen.
- **Zero Duplicate Functional Controls**: Never place two controls that do the same thing on the same screen (e.g. duplicate switcher dropdowns, redundant secondary submit buttons).
- **Automatic Resolution Over Manual Entry**: Never prompt for information the banking directory or system can resolve automatically (e.g. recipient name auto-resolved upon entering account number).
- **Navigating Buttons**: Use `<Button nativeButton={false} render={<Link href="..." />}>`. Never wrap `<Button>` inside `<Link>`.
- **Permission Concealment**: If an actor role lacks permission, the element is **hidden / omitted from the DOM**, not rendered disabled.
- **Explicit Condition Messaging**: If a button is disabled due to object state, **display the explicit reason directly below** in `text-[12px] text-muted-foreground`. Silent grey-outs are disallowed.
- **Inline Form Validation**: Validation errors are displayed directly under the field in `text-[12px] text-destructive` with `aria-invalid="true"`. Never use modal popups for form validation errors.
- **Consequence Confirmations**: Confirmations (e.g. `ComplianceActionDialog`) must explicitly detail the audit trail and side effects before the commit button.

---

## 7. Visual & Interaction Anti-Patterns Checklist (Strictly Prohibited)

- ❌ No redundant selectors or dropdowns re-asking for parameters chosen on the previous screen.
- ❌ No duplicate functional controls performing the same action on the same page.
- ❌ No manual inputs for system-resolvable data (e.g. manual name typing when account lookup exists).
- ❌ No text fluff, redundant subtitle descriptions under self-explanatory card titles, or clutter.
- ❌ No raw colors / hex values in JSX or ad-hoc Tailwind color classes.
- ❌ No `font-bold` or `font-semibold` on text elements.
- ❌ No `rounded-md` on outer panel containers (always `rounded-2xl`).
- ❌ No default Lucide icon stroke weights (must be `1.7`–`1.9`).
- ❌ No generic, shared empty state for both true empty and filtered empty.
- ❌ No un-formatted numbers/currencies (missing `.tabular`).
- ❌ No theme-specific conditional CSS (`dark:bg-...` workarounds when tokens suffice).

---

## 8. Holistic Product Design & Dual-Journey UX Rules

### A. Contextual In-Flow Creation vs. Dedicated Management Hub
When designing any feature that consumes saved or configured entities (e.g., Beneficiaries, Payment Groups, Scheduled Orders, Categories):
1. **Administrative Hub (Primary Nav Destination)**:
   - Provide a first-class, standalone page (e.g. `/beneficiaries`) equipped with persistent search, segmentation filters, item counts, edit, and deletion capabilities.
   - Users visit this surface to organize, review, audit, and prepare their data ahead of time.
2. **Contextual In-Flow Creation (In-The-Moment Empowerment)**:
   - When a user is in the middle of an active workflow (e.g. `Send & Pay → To Group` or `Buy Airtime`), **never force them to abort the flow** to visit the administrative hub just to create an entity.
   - Embed a prominent `+ Create new [entity]` option directly within the selector, or provide a checkbox (`[x] Save for future use`).
   - Completing in-flow creation must **auto-select the newly created item and advance the user forward immediately**.
3. **Anti-Phantom Rule**:
   - Never present a hardcoded dropdown of items without a corresponding management surface and creation mechanism. If an entity exists in a dropdown, the user must own and be able to create their own.

### B. Cognitive Separation: Recognition (Quick-Pick) vs. Recall (Manual Entry)
- **Place Quick-Pick Avatars Above Manual Steps**:
  - Quick-pick items (saved contacts, meters, group circles) must live in a top hero strip above the first step header, not buried inside form inputs.
  - Use a subtle hairline divider or a muted `"Or enter new details"` label to bridge into the manual input form.
- **Automatic Collapse on Selection**:
  - Tapping a saved avatar or group must immediately populate all known parameters and collapse the step into a calm, verified badge (`<Check /> Recipient Name [Change]`), advancing focus directly to Amount or Confirmation.

---

## 9. Clean Minimal Screen Language (House Default — Non-Negotiable)

> This is the agreed visual + information register for **every new screen** in this
> product (established on the dashboard revamp, Sept 2026). Reference vibe:
> **Wealthsimple** and **Origin** — quiet, spacious, numbers-forward. When generating
> any new screen, produce it in this language by default; do not revert to dense,
> boxed-in layouts.

### A. The feel
- **Space is the primary design material.** Lead with generous padding and large gaps
  (`gap-6`/`gap-8`+, `py-8`+ on hero blocks). White space carries hierarchy — resist
  filling it.
- **Hairlines over boxes.** Prefer `divide-y divide-border/40..50` and single
  `border-t border-border` separators to nested bordered cards. When a card is needed,
  one calm panel (`rounded-2xl border border-border bg-card`, the shared
  `.premium-card` elevation) — never cards inside cards.
- **One loud thing per screen: the number.** The primary figure is large and thin
  (`text-[40px]`–`[76px]`, `tracking-[-0.02em]`, `.tabular`). Everything else is quiet.
- **Tiny tracked eyebrows** label sections: `text-[11px] uppercase tracking-[0.14em]
  text-muted-foreground`. Use for micro-labels above content.
- **Type weight:** headings, section titles, labels and buttons are **medium** —
  apply `font-medium` (500). Body copy and numbers stay **normal** (400). Semibold (600)
  and bold (700) remain banned. The base-layer `font-weight: inherit` cap in globals.css is
  overridden by the `font-medium` utility, so use it rather than leaning on size/tracking
  alone for heading hierarchy.
- **Monochrome + one restrained accent.** Trend lines are `foreground/70–80` with a
  whisper gradient fill; category color only via `--cat-1..5` / `--cat-other`. Positive
  deltas use `--success`; a decline uses `muted-foreground`, never `destructive`.

### B. Information architecture (glance → disclosure → detail)
1. **Glance (above the fold):** the one question the screen answers, plus anything that
   genuinely needs action. On the dashboard that is **total balance + trend + a "Needs
   attention" band**. Nothing decorative competes here.
2. **Wrap detail in disclosures.** Secondary breakdowns (e.g. the individual accounts
   behind a total) live in a **collapsed disclosure** with a hairline teaser (an
   allocation bar), opened on demand — never a permanently expanded list eating space.
3. **Each module appears exactly once.** No element is repeated across the screen
   (no duplicate account lists, no restating a count like "5 accounts" as its own tile).
   If it was shown in the hero, omit it from the detail grid.
4. **Priority surface.** Show high-priority, time-sensitive items (failed payments,
   expiring/blocked cards, dormant accounts, due bills) in a compact **"Needs attention"**
   band that only renders when items exist. Derive it from real data, cap it (~4), each
   row links to the fix.

### C. Anti-clutter rules (in addition to §7)
- ❌ No redundant summary tiles that restate a number already visible (counts, totals
  shown twice).
- ❌ No always-open long lists for secondary detail — collapse them.
- ❌ No stat tile / widget that exists only to fill a grid cell.
- ❌ No repeating the same module in two places on one screen.
- ✅ Honest data only — charts, trends, and breakdowns are derived from the ledger
  (`src/lib/dashboard-insights.ts` patterns), never hardcoded decoration.
- ✅ Every amount respects the hide-amounts toggle and carries `.tabular`.

### D. Reference implementation
The dashboard kit at `src/components/dashboard/v2/MinimalKit.tsx` is the canonical
source of these primitives — `BalanceHeadline`, `TrendChart`, `Eyebrow`, `SectionHeader`,
`Panel`, `AccountsDisclosure`, `AttentionBand`, `AllocationBar`/`DotLegend`. Reuse and
extend these rather than reinventing a denser pattern.

### E. Phone scale (below `sm`, ~360–430px)
The dashboard is the reference (`src/components/dashboard/v2/parts.tsx` + `layouts/`).
Desktop values are unchanged; these apply below `sm` only.
- **Balance is the loudest thing on screen.** Greeting drops to `text-[20px]` (26px from
  `sm`); the currency code shrinks to `0.6em` beside the digits. The hero must fit a
  seven-figure balance (`GHS 1,284,530.44`) on one line at 360px, so `xl` is 34px on a phone.
- **Actions sit under the balance, never beside the greeting.** Use
  `<MoneyActions variant="row" className="sm:hidden" />` (three equal columns, 48px icon
  circle over a 12.5px label, primary action filled) and hide the pill version with
  `className="hidden sm:flex"`. Pills that wrap into a ragged second row are the failure mode.
- **Panels: 16px inside a 16px gutter.** `p-4 gap-3` on a phone, `sm:p-6 sm:gap-6`; section
  stack `gap-6` (`sm:gap-8`–`10`), card grid `gap-4` (`sm:gap-6`). Page top padding is `pt-6`.
- **Group small stats into one panel of rows** on a phone rather than stacking one boxed
  tile per figure; they become tiles again from `sm`.
- **Nothing that only works on a desktop.** The app-download QR banner is hidden on a phone
  (a screen can't scan itself).
- Header links like "View all" keep a taller hit area (`-my-2 py-2`) so they're thumb-sized
  without shifting the text.
