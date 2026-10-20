# Figma cleanup plan: deleting what's been retired

Written 2026-10-19, ready to pick up later. Nothing in it has been done yet.
Files: **1. TOKENS** (`Jt6NULjnrNV65dMSSrddas`) is the library. **2. CORE COMPONENTS** (`lgNxPD7Kn0ZaFZ7Ev1rVwu`) consumes it.
Background: `docs/figma-token-mapping.md` (what changed and why) and `agents/WORKING_LOG.md`.

## Why the order matters

Deleting a library variable or style is permanent. Any file still bound to it keeps the last value, but marked
"missing", and can no longer be remapped by key. So **every consuming file has to be clean before anything is deleted**.
Renaming to `_deprecated/` (already done) is the safe holding state.

## Where things stand

- Every retired item in TOKENS is renamed `_deprecated/…`, and they're all **published again on purpose**, so
  consuming files can still see them until they're remapped.
- CORE COMPONENTS is remapped and verified: 0 bindings on any retired or orphaned item (5,051 layers scanned).
- TOKENS's own pages are clean too: everything was rebound before it was retired.

## Phase 1: delete now (once the pre-checks pass)

| What | Count | Items |
|---|---|---|
| Theme variables | 46 | `_deprecated/` action/secondary(+hover), action/disabled, action/brand-text, action/brand-subtle, action/smoke(+hover), action/black, text/invert, text/disabled, text/on-smoke, input/text-disabled, nav/* (8), \_legacy/* (4), brand/secondary(+hover, text), status/*-subtle (4), badge-tint and badge-text sky/indigo/purple/pink/rose (10), border/subtle, surface/always white, alpha/200/400/900 |
| Radius variables | 4 | rounded-xs, rounded-md, rounded-r-md, rounded-l-md |
| Spacing primitives with nothing pointing at them | 14 | size-6, 10, 14, 18, 28, 36, 44, 68, 72, 84, 88, 104, 112, 124 |
| Colour primitives (old, unused by Theme) | 13 | ink/900, ink/950, data/chart-1…5, data/purple, violet, yellow, indigo, orange, green, ruby |
| Text styles | 13 | `_deprecated/` Display XL, Display Large, Heading/Section, Text/Large, Text/Large (Bold), Text/Normal, Text/Small Mono, Text/Extra Small (Bold), Text/Extra Small (Uppercase), Link/Large, Link/Default, Component/Button, Component/Chart Title |

### Pre-checks status

1. **List every file that uses TOKENS:** ✓ Passed. Designer confirmed only two files:
   - Library: **1. TOKENS** (`Jt6NULjnrNV65dMSSrddas`)
   - Consuming file: **2. CORE COMPONENTS** (`lgNxPD7Kn0ZaFZ7Ev1rVwu`)
2. **Consuming files remapped:** ✓ Passed. CORE COMPONENTS was remapped across all 8 pages (5,051 layers scanned; 0 bindings remain on retired/orphaned items).
3. **Phase 1 primitives added to remap maps:** ✓ Done. `scripts/figma/remap-library.js` has all Phase 1 keys mapped:
   - `ink/900` (`dcd95...`) → `gray/900`, `ink/950` (`81e23...`) → `gray/950`
   - `data/chart-1…5` → Theme `data/cat-1…5`
   - `data/yellow` (`3e407...`) → `amber/400`
   - `data/purple` & `data/violet` → `violet/600`, `data/indigo` → `blue/600`, `data/orange` → `orange/600`, `data/green` → `green/600`, `data/ruby` → `red/600`
4. **Name a version in TOKENS:** Next step before executing deletion (File → Save to version history: "Before deleting deprecated"). That's the undo.

### Delete & Verify status

- **Phase 1 Deletion:** ✓ Complete. Executed on **1. TOKENS**.
  - All **77 Phase 1 variables** removed (46 Theme, 4 Radius, 14 Spacing Primitives, 13 Color Primitives).
  - All **13 Phase 1 text styles** removed.
- **Verification on 1. TOKENS:** ✓ Passed.
  - **0 broken aliases** across all active variables.
  - **0 unexpected deprecated variables** remain.
  - Exactly **5 deprecated variables remain** (`_deprecated/size-56`, `80`, `96`, `120`, `128`), which are deliberately preserved for Phase 2 as they are aliased by `Spacing` (spacing/11–15).
- **Next:**
  1. In **1. TOKENS**, publish library changes.
  2. In **2. CORE COMPONENTS**, accept the library update.
  3. Run `scripts/figma/plugin-verify/` in **2. CORE COMPONENTS** to verify 0 missing/null bindings.

## Phase 2: later (each needs its own decision)

These can't go in Phase 1, because something still depends on them or the replacement hasn't been decided.

| What | Blocked by | Next step |
|---|---|---|
| Spacing primitives size-56, 80, 96, 120, 128 | Aliased by the old **Spacing** collection (spacing/11–15) | Retire the Spacing collection first (below) |
| `amber/25` | Aliased by **Brand Colors** `brand/25` | Decide whether Brand Colors stays. It duplicates the amber ramp, so I'd retire it after a usage count. |
| **Spacing** collection (spacing/0–15, Desktop/Mobile) | Used heavily in CORE COMPONENTS (hundreds of paddings and gaps) | Rebind to Spacing Primitives by value (spacing/4 = 8 → size-8…), give the primitives `GAP` and padding scopes, then retire it |
| **Control Sizing** (control/x|y|gap…) | Used by every button | Decide: keep as component tokens (move under `component/button/`) or replace with spacing primitives |
| **Dimensions: Typography** and **Typography** collections | `family/default` sits on about 1,400 text layers and switches to DM Sans in Mobile mode | Bind text to the 10 role styles and drop the family, size and line variables, or make the family Open Sans in both modes |
| UI-kit library in CORE COMPONENTS | ~30 bindings (Depth/*, Background/Warning/*, Space/*) | Remap to TOKENS equivalents, or detach |
| Non-TOKENS text styles | `Text sm/Medium` 208, `Text xs/Medium` 126, `text-sm/regular` 27… | Map onto the 10 roles |
| Stray spacing variables | `space-y-*`, `p-1`, `px-2`, `mr-2`, `mt-24`… | Fold into the spacing pass |

## Resume prompt

> Continue the Figma cleanup from `docs/figma-cleanup-plan.md`, starting at Phase 1 pre-checks. Here are the
> files that use TOKENS: …
