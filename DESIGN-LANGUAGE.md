# NIBS Design Language — paste this into any prompt that generates new screens

You are adding screens to an existing Next.js 15 + TypeScript + Tailwind v4 banking
app. A design system already exists and is non-negotiable. Your job is to make new
screens indistinguishable from the ones already there. When in doubt, open an
existing screen and copy its structure rather than inventing one.

Reference screens — read one before writing anything:
- List pattern: `src/app/(customer)/accounts/page.tsx`, `src/app/(customer)/cards/page.tsx`
- Object detail: `src/app/(customer)/cards/[id]/page.tsx`
- Table-based: `src/app/admin/fee-concessions/page.tsx`
- Reference/static: `src/app/(customer)/fx-rates/page.tsx`

## Absolute rules

1. **Never use raw colours.** No hex, no `text-blue-500`, no `bg-gray-100`. Only
   semantic tokens: `bg-card`, `bg-muted`, `bg-background`, `text-foreground`,
   `text-muted-foreground`, `border-border`, `text-destructive`, `bg-primary`,
   `text-primary-foreground`, and the CSS vars `var(--active-bg)`,
   `var(--active-border)`, `var(--surface)`. Both light and dark themes must work
   with zero extra effort — that only holds if you stay on tokens.
2. **Never use bold.** `globals.css` deliberately caps font weight; headings are
   distinguished by *size and letter-spacing*, never `font-bold` or `font-semibold`.
   Page titles use `tracking-[-0.01em]`. If something needs emphasis, make it
   larger or give it more space — do not make it heavier.
3. **All numbers get the `tabular` class.** Money, dates, account numbers,
   references, percentages, rates. Digits must not jitter between rows.
4. **Icons are Lucide only**, `size={15}`–`size={18}`, `strokeWidth={1.7}`–`{1.9}`.
   Never the default stroke weight — it reads too heavy against this type.
5. **Radius is `rounded-2xl` for panels, `rounded-xl` for inset blocks,
   `rounded-lg` for controls and icon tiles.** Never `rounded-md` on a panel.

## Page skeleton — start every screen with this

```tsx
<div className="flex flex-col gap-5">
  <PageHeader
    title="Screen name"
    description="One sentence on what this is for, in plain language."
    actions={/* optional right-aligned Button */}
    backTo={/* ONLY on object-detail screens: { href, label } */}
  />

  <StateSwitcher section="13.1" states={...} value={state} onChange={setState} labels={...} />

  <div className="rounded-2xl border border-border bg-card">
    {/* content */}
  </div>
</div>
```

- Root gap is `gap-5`. Don't vary it.
- Every screen gets a `StateSwitcher` naming the section of the states doc it
  implements. It is a review affordance and it is expected on new screens too.

## Containers and sections

- Panel: `rounded-2xl border border-border bg-card`
- Panel with padding: add `p-5`
- Section heading inside a panel: `text-[15px] text-foreground`
- Supporting line under it: `mt-1 text-[13px] leading-relaxed text-muted-foreground`
- Divider before a footer/summary row: `border-t border-border pt-5`

## Toolbars (search + filters)

```tsx
<div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
  <div className="relative min-w-[200px] flex-1">
    <Search size={15} strokeWidth={1.9}
      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
    <Input value={query} onChange={...} placeholder="Search by …" className="pl-9" aria-label="…" />
  </div>
</div>
```

Filter chips are `<Button variant={active ? "secondary" : "ghost"} size="sm">`.

## List rows

```tsx
<ul className="divide-y divide-border">
  <li>
    <Link href="…" className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-muted/50">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon size={17} strokeWidth={1.8} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[14px] text-foreground">Primary</span>
        <span className="mt-0.5 text-[12px] text-muted-foreground tabular">Secondary · meta</span>
      </span>
      <span className="flex shrink-0 flex-col items-end">
        <span className="text-[14px] text-foreground tabular">Amount</span>
        <span className="mt-0.5 text-[12px] text-muted-foreground tabular">Sub-amount</span>
      </span>
      <ChevronRight size={16} strokeWidth={1.8} className="shrink-0 text-muted-foreground" />
    </Link>
  </li>
</ul>
```

Rules: `min-w-0` + `truncate` on the flexible column, `shrink-0` on fixed columns.
Rows that navigate are a `Link` filling the whole row — never a nested button.

## Tables

```tsx
<div className="overflow-x-auto">
  <table className="w-full min-w-[720px] text-[13px]">
    <thead>
      <tr className="border-b border-border text-left text-muted-foreground">
        <th className="px-4 py-3 font-normal">Column</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-border">
      <tr className="transition-colors hover:bg-muted/50">
        <td className="px-4 py-3.5 text-foreground">…</td>
      </tr>
    </tbody>
  </table>
</div>
```

`font-normal` on `th` is required — the muted colour carries the hierarchy, not weight.
Wide tables always scroll inside their own container; the page never scrolls sideways.

## Detail (key/value) blocks

```tsx
<dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-border pt-5 text-[13px]">
  <div>
    <dt className="text-muted-foreground">Label</dt>
    <dd className="mt-0.5 text-foreground">Value</dd>
  </div>
</dl>
```

## Type scale — use these exact sizes, nothing between

| Use | Class |
|---|---|
| Page title | `text-[22px] leading-tight tracking-[-0.01em]` |
| Big value (balance, total) | `text-[22px] leading-tight` + `tabular` |
| Panel heading | `text-[15px]` or `text-[16px]` |
| Row primary / emphasis | `text-[14px]` |
| Body, table cells, form text | `text-[13px]` |
| Meta, captions, helper text | `text-[12px]` |
| Uppercase group labels | `text-[11px] uppercase tracking-wider text-muted-foreground` |

Long-form paragraphs get `leading-relaxed`.

## States — never a generic empty

Import from `@/components/states/ListStates` and use the right one:

- `ListSkeleton` — loading. Skeleton rows, never a bare spinner.
- `TrueEmptyState` — nothing exists yet. Explains what will appear here; carries a
  primary action when one makes sense.
- `FilteredEmptyState` — a filter matched nothing. **Different copy, and always a
  reset action.** Never reuse true-empty copy here; it is the single most common
  way a screen starts to feel cheap.
- `ListErrorState` — fetch failed. Must offer retry and must reassure that data is
  unaffected. Never silently fall back to empty.
- `PartialLoadFooter` — appended below rows that stay interactive.

## Interaction principles that make this feel considered

- **Hidden, not disabled, for permissions.** If a role may not use something, it is
  absent from the DOM — not greyed out.
- **Disabled for *state* must say why.** If a button is disabled because of the
  object's condition, print the reason underneath in `text-[12px] text-muted-foreground`
  ("Funding is unavailable while this card is blocked. Unblock it first."). Silent
  grey-out is forbidden.
- **Validation is inline, never a blocking modal.** Put the message directly under
  the field in `text-[12px] text-destructive`, and set `aria-invalid`.
- **Destructive vs recoverable must look different.** Destructive uses
  `variant="destructive"`; a recoverable/restoring action uses `outline` or
  `default`. Never render "reject" and "return for clarification" alike.
- **Confirmations state their consequence**, including the audit trail, before the
  commit button — see `ComplianceActionDialog`.

## Component API notes (easy to get wrong)

- A Button that navigates: `<Button nativeButton={false} render={<Link href="…" />}>`.
  Never wrap a `Button` in a `Link`.
- Sizes in use: `size="sm"`, `size="icon-sm"`, `size="icon"`, default.
- Variants in use: default, `outline`, `ghost`, `secondary`, `destructive`.
- Selected/active card or option:
  `border-[var(--active-border)] bg-[var(--active-bg)]`, unselected:
  `border-border bg-card hover:bg-muted/50`.

## Architecture constraints that outrank visual preference

- Object-detail screens are reached from their parent list and carry `backTo`.
  They never appear in navigation.
- Navigation is derived from the actor in `src/lib/navigation.ts`. Never hardcode a
  nav item into the Sidebar; add it to the matrix and add its icon to `ICON_MAP`.
- The customer shell and the Admin Portal share nothing but Login and MFA. Never
  import a customer component into an admin screen to save time.

## Definition of done

`npx tsc --noEmit`, `npx eslint . --max-warnings=0`, and `npx next build` must all
pass with zero errors, and the screen must render correctly in **both** light and
dark themes without any theme-specific code.
