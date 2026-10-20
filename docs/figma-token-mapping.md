# Figma tokens → code: proposed mapping

Figma file: [1. TOKENS](https://www.figma.com/design/Jt6NULjnrNV65dMSSrddas/1.-TOKENS). Code: `src/app/globals.css`.
Read on 2026-10-19.

**Status:** section 1 was applied to Figma on 2026-10-19. All 41 variables were revalued and given code syntax, and 5 were renamed.
Where the code value exactly matches one of your colour primitives, the variable still points to it (for example
action/primary → amber/400 and surface/card dark → gray/850). Everything else holds the code value directly.
Sections 2 and 3 were applied on 2026-10-19. The Theme collection now has 49 active variables and 46 in `_deprecated/`, and no layer is bound to a deprecated one.
Section 4 was applied on 2026-10-19: 124 variables were added, the 120 in the table below plus hero/primary, primary-hover,
primary-foreground and sheet-border as aliases. Each has scopes and code syntax. Where a value exactly matches a primitive, it points to it.
The Theme collection now has 219 variables: 173 active and 46 deprecated. Every active one has code syntax, none uses "All scopes",
and no names are duplicated. Section 5 is not applied.

**Shell gradients (2026-10-19):** shell/backdrop-top and -bottom and shell/card-top and -bottom (code `--shell-surface-*` and `--shell-*`) feed
two gradient paint styles, `shell/backdrop` and `shell/card`. Their stops are bound, so they're flat in light and a gradient in dark, like the code.

**Capture test (2026-10-19, "Capture test" page, Card Details):** `scripts/figma/bind-pass.js` added 28 bindings and corrected 67 the
importer had made. The importer binds the first variable with a matching value, for example 47 icon strokes to input/border-focus.
It also kept 7 Tailwind opacity modifiers and applied the shell styles. The dark copy flips correctly. Card faces are left out
because they keep their own colours. Still raw: 1 colour (#f5be18), plus the importer's 36 single-child wrapper frames and
128 auto-layout frames, which haven't been cleaned up yet.
To undo, use the file's version history (File → Show version history).

## How it works

- **The code is the source of truth for values.** The Figma variables take the code's light and dark values.
- **Groups stay.** A variable's Figma name is `group/name`, and it's yours to organise.
- **Code syntax carries the code name.** Every variable gets its exact CSS name in Figma's code syntax field
  (Web: `var(--card)`), so devs see the real token in Dev Mode whatever the Figma name is.
- **Rename only when the meaning changed.** Where a Figma name already means the same thing, it stays and
  only its value and code syntax change. Renaming or regrouping keeps bindings, so nothing comes unbound.
- **Nothing is deleted.** Figma-only variables move into `_deprecated/` until we've checked nothing uses them.
- **Everything lives in your existing Theme collection** (Light and Dark). Your primitive collections are left alone.

✓ = already matches · ≈ = off by a shade · → = value changes

## 1. Existing variables: keep, rename or revalue

| Figma now | Figma after | Code syntax | Light | Dark |
|---|---|---|---|---|
| surface/shell | **surface/background** | `--background` | #f6f6f5 → #ffffff | #111111 → #0a0a0a |
| surface/card | surface/card | `--card` | #ffffff → #fafafa | ✓ #181818 |
| surface/surface | surface/surface | `--surface` | #f6f6f5 → #fafafa | #1e1e1e → #080808 |
| surface/overlay | **surface/modal** | `--modal` | ✓ #ffffff | #292928 → #121212 |
| surface/muted | surface/muted | `--muted` | ≈ #ebebeb | ≈ #262626 |
| text/primary | text/primary | `--foreground` | ✓ #0a0a0a | ≈ #fafafa |
| text/secondary | text/secondary | `--muted-foreground` | #747472 → #8a8a8a | ≈ #a1a1a1 |
| text/on-amber | text/on-amber | `--primary-foreground` | #451a03 → #290e00 | #451a03 → #321800 |
| action/primary | action/primary | `--primary` | ✓ #ffc423 | ✓ #ffc423 |
| action/primary-hover | action/primary-hover | `--primary-hover` | #fde68a → #ffd966 | #fde68a → #ffd966 |
| status/error | status/error | `--destructive` | #dc2626 → #dd1d43 | #ef4444 → #e51f47 |
| status/success | status/success | `--success` | ✓ #16a34a | ✓ #22c55e |
| status/warning | status/warning | `--warning` | → oklch(0.72 0.16 75) | → oklch(0.78 0.15 75) |
| status/info | status/info | `--info` | → oklch(0.6 0.19 255) | → oklch(0.72 0.15 255) |
| border/default | border/default | `--border` | ≈ #ebebeb | ≈ #262626 |
| border/strong | **border/active** | `--active-border` | ✓ #000000 | ✓ #ffffff |
| border/focus | border/focus | `--ring` | #ffc423 → #b8b8b8 | ✓ #ffc423 |
| input/surface | input/surface | `--field` | #f6f6f5 → #ffffff | #1e1e1e → #1a1a1a |
| input/border | input/border | `--field-border` | ≈ #ebebeb | ≈ #2b2b2b |
| input/border-focus | input/border-focus | `--field-border-focus` | #ffc423 → #553911 | #ffc423 → #8a8a8a |
| data/chart-1…5 | **data/cat-1…5** | `--cat-1…5` | five blues → blue, orange, green, amber, pink | same, dark values |
| badge-tint/success, badge-text/success | same | `--pill-success`, `--pill-success-text` | → | → |
| badge-tint/warning, badge-text/warning | same | `--pill-warning`, `--pill-warning-text` | → | → |
| badge-tint/error, badge-text/error | same | `--pill-destructive`, `--pill-destructive-text` | → | → |
| badge-tint/gray, badge-text/gray | same | `--pill-neutral`, `--pill-neutral-text` | → | → |
| badge-tint/slate, badge-text/slate | same | `--pill-slate`, `--pill-slate-text` | → | → |
| badge-tint/blue, badge-text/blue | same | `--pill-info`, `--pill-info-text` | → | → |
| badge-tint/orange, badge-text/orange | same | `--pill-orange`, `--pill-orange-text` | → | → |
| badge-tint/brand, badge-text/brand | **badge-tint/violet, badge-text/violet** | `--pill-violet`, `--pill-violet-text` | → | → |

Bold = renamed. Rows with "→" take their values straight from globals.css at apply time.

## 2. You decide

| Figma now | Why it's unclear | Suggestion |
|---|---|---|
| icon/icon, input/text | Code has no separate token; both use `--foreground` | Keep, alias to text/primary |
| input/placeholder | Code uses `--muted-foreground` | Keep, alias to text/secondary |
| input/border-error | Code uses `--destructive` on invalid fields | Keep, alias to status/error |
| text/disabled, action/disabled, input/text-disabled | Code disables with opacity, not a colour | Deprecate |
| status/*-subtle (4) | Code uses the badge tints for this | Deprecate |
| nav/* (8) | Code nav uses background, foreground and the active tokens | Deprecate |
| action/secondary, action/smoke, brand/secondary (+ hovers, text) | No secondary or smoke token in code | Deprecate (smoke/600 primitive stays) |

## 3. Figma only: move to `_deprecated/`

`_legacy/*` (4), `alpha/*` (3), action/brand-subtle, action/brand-text, action/black, surface/always white,
border/subtle, text/invert, text/on-smoke, and badge-tint/badge-text for sky, indigo, purple, pink and rose (10).
Before anything here is deleted, I count how many layers are bound to it.

## Sections 2 and 3: what was done (2026-10-19)

Usage was counted for all 50 variables across the 14 pages, local paint and effect styles, and other variables.

- **Aliased, with code syntax:** icon/icon and input/text → text/primary, input/placeholder → text/secondary,
  input/border-error → status/error
- **Moved to `_deprecated/` and hidden from publishing** (no layers, styles or variables used them; 20):
  nav/focus, \_legacy/semantic-background, -border and -foreground, alpha/200, 400 and 900, action/black, action/disabled,
  status/success-, warning- and info-subtle, action/secondary-hover, action/smoke-hover, brand/secondary-hover,
  brand/secondary-text, and badge-tint/badge-text indigo and rose

### Rebound, then deprecated (26)

These 26 were in use. On 2026-10-19 their 415 layers across Experiment, Examples, Page 82, Calendar, Tasks
and Chart were rebound to these code tokens, and the old variables then moved to `_deprecated/`. A rescan found no layers left on them.

| Old | Now bound to |
|---|---|
| nav/surface, text/invert | surface/background |
| nav/text, input/text-disabled, text/disabled | text/secondary |
| nav/text-active | text/primary |
| nav/surface-active, action/smoke, brand/secondary | action/primary (these turned amber) |
| nav/on-action, text/on-smoke | text/on-amber |
| nav/action, action/secondary | surface/muted |
| nav/border, border/subtle | border/default |
| action/brand-subtle, action/brand-text | tx/yellow, tx/yellow-ink |
| badge sky, purple, pink | badge blue, badge violet, tx/pink + tx/pink-ink |
| status/error-subtle | badge-tint/error |
| surface/always white, \_legacy/background-color | primitives white, black |

Usage before the rebind:

| Variable | Layers | Where |
|---|---|---|
| action/brand-subtle | 119 | Calendar (116), Examples, Experiment, Page 82 |
| action/brand-text | 104 | Calendar (99), Examples, Experiment |
| nav/text | 36 | Experiment |
| action/secondary | 27 | Calendar, Page 82, Examples, Experiment, Tasks, Chart |
| action/smoke | 23 | Page 82 (Case Detail) |
| nav/on-action | 22 | Page 82, Experiment |
| border/subtle | 18 | Page 82 |
| text/invert | 12 | Calendar, Examples |
| nav/surface-active | 9 | Page 82 |
| nav/text-active | 8 | Experiment |
| input/text-disabled (→ text/disabled) | 8 | Page 82 (Case Detail) |
| nav/surface | 5 | Experiment, Page 82 |
| brand/secondary, text/on-smoke | 4 each | Page 82 (Case Detail) |
| nav/border | 3 | Experiment, Page 82 |
| nav/action | 2 | Experiment |
| surface/always white | 2 | Page 82 |
| badge-tint/badge-text sky | 2 each | Page 82 |
| badge-tint/badge-text pink, purple | 1 each | Page 82 |
| status/error-subtle, \_legacy/background-color | 1 each | Page 82, Calendar |

## 4. Code only: add (values from globals.css)

| Group | Figma names → code syntax |
|---|---|
| surface/ | panel → `--panel` · card-auth → `--card-auth` · card-item → `--card-item` · tile → `--tile` · tile-hover → `--tile-hover` · item-hover → `--item-hover` · hover → `--hover` · accent → `--accent` · active → `--active-bg` · account-card → `--account-card` · logo-disc → `--logo-disc` · skeleton-shine → `--skeleton-shine` |
| text/ | on-accent → `--accent-foreground` |
| border/ | sheet-rim → `--sheet-rim` |
| menu/ | surface → `--menu` · item-hover → `--menu-item-hover` (`--popover` points to `--menu` in code, so no separate variable) |
| input/ | surface-hover → `--field-hover` · surface-focus → `--field-focus` |
| status/ | success-text → `--success-text` · warning-text → `--warning-text` · error-text → `--destructive-text` · info-text → `--info-text` · on-error → `--destructive-foreground` |
| badge-tint/, badge-text/ | teal → `--pill-teal`, `--pill-teal-text` |
| chip/ | surface → `--chip` · foreground → `--chip-foreground` · selected → `--chip-selected` · selected-foreground → `--chip-selected-foreground` |
| hero/ | surface · border · foreground · balance-foreground · button-foreground · glass-top · glass-bottom · glass-hover · wave-a · wave-b · glow, each → `--hero-<name>`. Plus primary, primary-hover, primary-foreground and sheet-border as aliases of the action/ and border/ variables, as in code |
| data/ | cat-other → `--cat-other` · spend-1…5, spend-other → `--spend-*` |
| tint/ | teal-bg, teal-text, sand-bg, sand-text, green-bg, green-text, plum-bg, plum-text → `--tint-*` |
| avatar/ | teal, sand, green, lilac, yellow, red, blue, lemon, pink → `--avatar-*` |
| tx/ | yellow, teal, sand, lilac, green, pink, lemon, blue, each with `-ink` → `--tx-*` |
| banner/ | gold-1…3, green-1…3, blue-1…3 → `--banner-*` |
| icon/ | tile-accent → `--tile-accent` · duo-outline → `--duo-outline` · glass-shine, glass-shade → `--glass-*` · {amber, blue, green, violet, rose, teal, slate}-{light, mid, dark, ink} → `--icon-*` (28) |
| ticket/ | paper, ink, rule → `--ticket-*` |

Left out on purpose: `--mc-*` (Mastercard logo colours), `--device-*` and `--dm-*` (demo-only),
`--hover-overlay` and `--hover-fill` (percentages, not colours), `--ripple-color` (currentColor).

## 5. Not colour, but it will show up

- **Spacing and radius: unified 2026-10-19 (replaces the note below).** Spacing Primitives are now 0 2 4 8 12 16 20 24 32 40 48 64,
  each with code syntax `calc(var(--spacing) * N)`. The radius variables are rounded-sm 4, lg 8, xl 12, 2xl 16 (new), 3xl 20 and full,
  with code syntax `var(--radius-*)`. 1,126 layers moved from rounded-md (6) to rounded-lg (8). Retired to `_deprecated/` (nothing
  bound to them): 19 spacing primitives, plus rounded-xs, md, r-md and l-md. Still to do: the semantic `Spacing` collection
  (spacing/0–15, Desktop/Mobile) is a second scale with its own names, and spacing/11–15 point at retired primitives.
- **Spacing (earlier note):** The code moved to a 4px grid (`--spacing: 4px`), so a Tailwind step N is 4N px
  (`p-4` = 16, `p-6` = 24, `gap-10` = 40). Those values match your Spacing Primitives (size-4 … size-128). Still to do in Figma:
  give them Tailwind code syntax, and decide whether the semantic `spacing/N` names (where `spacing/4` = 8px, not Tailwind's 16) stay.
- **Radius is the same story.** The code's base is 8.75px: sm 5.25, md 7, lg 8.75, xl 12.25, 2xl 15.75, 3xl 19.25.
  Figma has lg 8, xl 12 and 3xl 24, and no 2xl, even though every panel uses `rounded-2xl`.
- **Typography breaks the constitution.** Figma has Geist Mono, DM Sans for the Mobile mode, and Light and Bold weights.
  Code is Open Sans only, weights 400 and 500.

## 6. Values the cleanup pass can't tell apart

Several code tokens share a value, so a captured colour can't tell you which token it came from:
- `#ffffff` (light) is shared by background, modal, menu, field, card-auth, chip-selected and active-bg
- `#fafafa` (light) is shared by card, card-item, surface, field-hover and menu-item-hover
- `#ebebeb` (light) is shared by muted, border and field-border

The binding pass picks one by property: strokes go to border/default, text to text/primary and text/secondary,
page frames to surface/background, and the rest to surface/card. Anything it isn't sure about gets a
`check-token` label on the layer so you can fix it by hand.
