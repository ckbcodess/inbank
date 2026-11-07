# Design system tokens: a smaller core that scales

Written 2026-11-06. This is a proposal: nothing in Figma or the code has changed yet.
Files: **1. TOKENS** (`Jt6NULjnrNV65dMSSrddas`), **2. CORE COMPONENTS** (`lgNxPD7Kn0ZaFZ7Ev1rVwu`), `src/app/globals.css`.
This replaces the Phase 2 list in `docs/figma-cleanup-plan.md`.

## The idea

The design system holds what is true for every product. A project holds what is true for that product. Brand sits
between them as a small swap. A token's value alone doesn't earn it a place in the core: its meaning has to apply
everywhere.

| Layer | Holds | Example | Who sees it |
|---|---|---|---|
| 1. Primitives | Raw colour ramps and number scales | `amber/400`, `gray/950` | Nobody picks these. Hidden from publishing |
| 2. Brand | The few values a brand swaps | `brand/primary` | Set once per project, as a mode |
| 3. Semantic | What a colour is for | `surface/card`, `status/error` | Everyone. This is the design system |
| 4. Project | What only this product needs | `hero/*`, `avatar/*`, `tile` | Only that project |

Layers 1 to 3 are the design system. Layer 4 never enters it.

## What's there today

- **442 variables in 12 collections, all published.** Nothing is hidden from publishing.
- **Theme has 177.** 79 are `illustration/*` (45%), 47 are `component/*` and 51 are core groups.
- **CORE COMPONENTS binds only 44 of the 177.** The other 133 aren't bound to any layer there.
- **Primitives: 118, and Theme points at only 55.** All 118 are published, but they have no scopes, so they already stay out of the pickers.
- **Four Theme variables are aliases in name only:** `icon/icon`, `input/text`, `input/placeholder` and
  `input/border-error` carry the same code variable as `text/primary`, `text/secondary` and `status/error`.
- **Brand words sit in shared names.** `text/on-amber` is white in business banking, so its name is already wrong.
- **Brand Colors (12) duplicates the amber ramp, and nothing uses it.** It is the right idea, wired to nothing.
- **Typography is 69 variables across two collections** beside the 10 text styles. Only `weight/medium` is used heavily.
- **Effect styles:** 27, of which 16 are Tailwind blur presets. Usage not scanned yet.

How the scan was done: direct bindings on all 9 component pages of CORE COMPONENTS. It doesn't see bindings inside
styles, or on TOKENS's own example pages (Dashboard, Tasks, Capture test and so on). Check both before deleting.

### Figma and code have drifted

**Synced and published on 2026-11-07.** The table is the state before the sync. `--destructive`,
`--destructive-text`, `--tile` and `--tile-hover` went in with raw values because no primitive matches them.

51 core tokens were compared and 8 differed. The code is the value source.

| Token | Figma (light / dark) | Code (light / dark) |
|---|---|---|
| `--destructive` | `#dc2626` / same | `#ea3446` / same |
| `--destructive-text` | `#b91c1c` / same | `#b72a38` / same |
| `--ring` | `#b8b8b8` / `#ffc423` | `#451a03` / `#ffc423` |
| `--field` | `#ffffff` / `#1c1c1c` | `#ffffff` / `#181818` |
| `--field-border` | `#ebebeb` / `#2b2b2b` | `#ebebeb` / `#212121` |
| `--field-border-focus` | `#78350f` / `#8a8a8a` | `#181818` / `#8a8a8a` |
| `--tile` | `#f5f5f5` / `#181818` | `#f7f7f7` / a colour mix |
| `--tile-hover` | `#ebebeb` / `#1c1c1c` | `#eeeeee` / `#1c1c1c` |

**Radius and motion are settled: the code is correct** (designer, 2026-11-06). The constitution now matches it.

- **Radius** xl, 2xl and 3xl in Figma were 12, 16 and 20. They are now 10, 10 and 10.
- **Motion** needs nothing in Figma, because Figma has no motion variables.

`--destructive` and `--destructive-text` are raw hex in the code, which also breaks CONSTITUTION §4.

## The core: about 79 variables

Code keeps the shadcn names it already uses (`--background`, `--card`, `--muted`, `--primary`, `--border`, `--ring`).
That's what lets any shadcn component work in a new project with no mapping. Figma names stay readable, and code
syntax carries the code name.

**Colour: 42**

| Group | Variables | Count |
|---|---|---|
| Surface | `background`, `card`, `muted`, `accent`, `overlay` (from `modal`), `hover`, `selected` (from `active`), `scrim` (backdrops; the opacity sits on the fill) | 8 |
| Text | `primary`, `secondary`, `on-primary` (from `on-amber`), `on-accent` | 4 |
| Icon | `primary`, `secondary`, `on-primary`, aliased to the matching text tokens (code has no icon tokens, because icons inherit text colour). They exist so designers can pick a colour for icons, because text tokens only appear in the text picker | 3 |
| Action | `primary`, `primary-hover` | 2 |
| Border | `default`, `selected` (from `active`), `focus` | 3 |
| Input | `surface`, `border`, `border-focus` | 3 |
| Status | `success`, `warning`, `error`, `info`, each with `-text` and `-tint`, plus `on-error` | 13 |
| Data | `cat-1` to `cat-5`, `cat-other` | 6 |

**Everything else: 37**

| Collection | Variables | Count |
|---|---|---|
| Brand | `primary`, `primary-hover`, `on-primary`. One mode per brand, no scopes so they stay out of pickers | 3 |
| Spacing | 0, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, plus layout sizes 56, 80, 96, 120, 128 | 17 |
| Radius | `sm` 4, `lg` 8, `xl` 10, `2xl` 10, `3xl` 10, `full`. Three names share a value but mark different roles, and code classes use all of them | 6 |
| Control height | `xs`, `sm`, `default`, `md`, `xl` (`--control-*`, missing from Figma today) | 5 |
| Stroke | 1, 2 (replaces Border Width and Stroke Width) | 2 |
| Type | one family, `regular`, `medium` | 3 |
| Opacity | `disabled` | 1 |

Plus the 10 text styles and a few effect styles, which aren't variables. Primitives stay in the file, hidden.

## Where the rest of Theme goes

177 Theme variables become 38 core, 14 merged and 125 moved out.

**Merged into a core token, then deleted (14):** `icon/icon`, `input/text`, `input/placeholder`, `input/border-error`,
`surface/item-hover`, `menu/surface`, `menu/item-hover`, `hero/sheet-border`, `badge-text` success, warning, error and
blue, and `badge-tint` and `badge-text` gray.
The `menu/*` and `badge-text` merges change values slightly, for example `menu/surface` in dark (`#1c1c1c` to `#121212`)
and `badge-text/success` against `status/success-text` (`#166534` to `#16a34a`). Compare each one first.

**Moved to the NIBS project layer (46):** `surface/` surface, panel, card-auth, card-item, tile, tile-hover, account-card,
logo-disc, skeleton-shine. `border/sheet-rim`. `input/surface-hover`, `surface-focus`. `chip/*` (4), `hero/*` (14),
`shell/*` (4), `component/icon/*` (4), decorative badges violet, slate, orange, teal (8).

**Illustration (79): not Figma variables by default.** On 2026-11-07, 75 were hidden from publishing. The 4 bound in CORE COMPONENTS (`tx/yellow`, `tx/yellow-ink`, `tx/pink`, `tx/pink-ink`, 147 bindings) stay published until they're rebound. They stay in code as NIBS tokens. Art colours belong in the art.
Add one to the NIBS Figma library only if a designer actually needs to pick it. `tx`, `tint` and `avatar` (33 together)
are the same idea, a pale tint plus an ink, and the code's `on-tint` utility already works the ink out from the tint.
That's a later code simplification.

Only 11 of the moved variables are bound in CORE COMPONENTS, so this is cheap:
`illustration/tx/yellow`, `yellow-ink`, `pink`, `pink-ink`, the slate, violet and orange badges, and `surface/surface`.
The Badge component should drop to the semantic variants (neutral, success, warning, error, info).

## How a new project handles new colours

Ask these in order and stop at the first yes.

1. **Does a semantic token already mean this?** Use it. Most "new colours" end here.
2. **Is it the project's brand?** Add a brand file and a Brand mode, plus a primitive ramp if the hue is new.
3. **Is it only this product's?** Make a project token in the project's own library and CSS. It may point at primitives
   or hold its own value. The design system doesn't change.
4. **Is it art?** It stays in the asset, not in tokens.

**Promotion rule.** A project token moves into the core only when a second product needs the same meaning, and it gets
a generic name when it does. `hero/surface` would become `surface/inverse`. Nothing is added to core speculatively.

**Naming rule.** Core names never contain a brand, hue or product (`on-amber`, `tx`, `bancassurance`). If the name only
makes sense in one product, it's a project token.

**Tests for core:** would a product with a different brand need it? Does a core component use it? Both yes, or it stays out.

## The code setup

Tokens and components should travel differently. shadcn isn't really a package you install: its CLI copies component
source into your repo. That suits components, which projects adapt. It's wrong for tokens, because every copy forks the
values and updates stop reaching projects. So:

- **Tokens: a private npm package.** One version, updates by bumping it.
- **Components: your own shadcn registry, later.** `npx shadcn add @gcb/button`, the same habit you have now.
  A `registry:theme` item is available but it copies CSS variables into the project, so don't use it for tokens.

```
design-system/                  its own repo
  tokens/
    primitives.json             DTCG format (the W3C community group's stable spec)
    semantic.json               light and dark
    dimensions.json
    brands/gcb-amber.json
    brands/gcb-smoke.json
  build/                        Style Dictionary v5
  dist/                         what gets published
    theme.css                   primitives, semantic, Tailwind @theme mapping
    brands/gcb-amber.css
    index.js, index.d.ts        token names and motion values for JS
    figma/*.json                what the Figma sync reads
```

In a project, the whole setup is four lines:

```css
@import "tailwindcss";
@import "@gcb/tokens/theme.css";
@import "@gcb/tokens/brands/gcb-amber.css";
@import "./project-tokens.css"; /* NIBS: hero, tile, avatar, plan art */
```

Business banking becomes `brands/gcb-smoke.css` under `[data-app="business"]`, replacing the two hand-written blocks in
`globals.css`. The hero overrides in those blocks stay in `project-tokens.css`.

- **Hosting:** GitHub Packages keeps it private and sits beside the code.
- **Versioning:** Changesets. Adding a token or changing a value is a minor. Renaming or removing one is a major.
- **Direction:** JSON to CSS and Figma, never back. This matches the existing rule to change code first, then sync Figma.
- **CI check:** fail the build if a core token name contains a brand or hue, or if a semantic token holds a raw value.

## The Figma setup

| File | Holds | Published |
|---|---|---|
| 1. TOKENS | Primitives (hidden), Brand, Semantic, Dimensions, text and effect styles | About 79 variables |
| 2. CORE COMPONENTS | Components, bound only to semantic tokens | Yes |
| NIBS Tokens (new) | The 46 project tokens, plus any illustration ones designers pick | To NIBS files only |

Limits on your plan (the GCB UX team is on Pro):

- **Extended collections are Enterprise only.** That's Figma's own answer to multi-brand, and you can't use it. Brand as
  modes on one small collection does the same job, up to 10 modes per collection on Pro.
- **The Variables REST API is Enterprise only.** So sync can't be a plain CI job. Use a plugin or this MCP, which is how
  `scripts/figma/` already works. The repo's plugin needs turning from a one-off into a reusable sync.
- **Modes are per project.** A project file sets Brand once at the page level, and Light and Dark as usual. Business
  banking gets a Smoke mode, which Figma doesn't have today.

Theme's `action/primary`, `action/primary-hover` and `text/on-primary` alias Brand, not `amber/*` directly. Keep it that way.
Move the example pages (Dashboard, Tasks, Calendar, Capture test and so on) out of TOKENS, so the library holds only tokens and their docs.

## Order of work

Each phase stands alone. Name a version in Figma by hand before each (File → Save to version history), because the Figma tool can't.

1. **Sync values to the code.** Done on 2026-11-07: 9 colour variables and 3 radius values, published and accepted in CORE COMPONENTS.
2. **Clear strays in CORE COMPONENTS.** Done on 2026-11-07; every change is in `scripts/figma/rebind-log-2026-11-07.json`.
   `Semantic` turned out not to be stray: those are TOKENS variables showing an old collection name.
   One stray stays on purpose: 5 overlay backdrops are bound to the `black` primitive, because core has no token for them.
   Add `surface/scrim` before hiding primitives. Figma holds the light opacities only (Sheet and Drawer 35%, dialogs 60%);
   code goes to 65% and 75% in dark and adds a blur, which Figma doesn't have.
3. **Merges.** Keep `spacing/11` to `15` and the spacing primitives `size-56`, `80`, `96`, `120` and `128`: the designer decided on 2026-11-07 to keep them and removed their `_deprecated/` prefix.
   The 8 true duplicates were merged and deleted from TOKENS on 2026-11-07. `icon/primary` was then added back at the designer's request, because deleting `icon/icon` left no way to pick an icon colour Icons on `text/primary` in CORE COMPONENTS moved to it on 2026-11-07. `icon/secondary` and `icon/on-primary` were added the same day (Theme is now 172), and icons in CORE COMPONENTS moved to them. The Radial chart's outlined letters stay on `text/on-amber`, because they are text, not icons. `menu/surface`, `menu/item-hover` and the four `badge-text` colours differ in value and are separate tokens in code, so they wait for a decision.
4. **Hide primitives.** Done on 2026-11-07: all 118 colour primitives are hidden, and the 5 backdrops use `surface/scrim`. Tested with `pink/400` through a real publish first, and aliases keep resolving. Spacing Primitives stay published, because CORE COMPONENTS binds them directly.
5. **Rewire Brand** and rename `text/on-amber`. Done on 2026-11-07: Theme's primary, hover and on-primary alias Brand, which has Amber and Smoke modes, and `text/on-amber` is now `text/on-primary`. The `brand/25` to `900` ramp is hidden. `component/hero/primary` follows Brand, but code gives business banking a lighter hero button, so that needs its own value when the hero moves to the NIBS layer in phase 6.
6. **Split out NIBS.** Project tokens now live as a local `NIBS` collection in the Internet Banking file (`JcCeoeiauwHBrJmtaDSqzl`): 44 variables and the two shell styles, with raw values. Each frame with a Theme mode has the matching NIBS mode, and a new dark frame must set both. The separate `NIBS Tokens` file is no longer needed. Other illustration variables were deleted rather than moved. Badge dropped Slate, Indigo, Purple, Pink and Orange. Done on 2026-11-07: 125 variables and 2 styles deleted from TOKENS, leaving Theme at 56. Older Internet Banking pages keep stale bindings, by the designer's choice.
7. **Trim dimensions.** Done on 2026-11-07 in a lighter form. A full collapse isn't worth it: Internet Banking has about 120,000 `border` bindings alone, and some frames use Spacing and Typography Mobile modes, so collapsing would change layouts. Instead, 33 unused variables were hidden, and Border sides and Stroke Width were merged into `border` and `border-2` (about 1,325 bindings) and hidden, not deleted, because older pages may still use them. Spacing, Typography modes and Control Sizing stay. Revisit when the package generates tokens; the core target of about 94 applies to the package, not these Figma files.
8. **Split `globals.css`** into `core` and `project` files inside this repo. No values change, so nothing moves on screen.
9. **Extract the package,** point NIBS at it, and turn the plugin into the sync.
10. **Start the component registry** when the second project is real, not before.

## Button set (applied 2026-11-07)

Standard filled buttons are amber, smoke, black and white. Brand modes decide which colour leads; variants stay available in every product. Black and white flip in dark mode (designer). A core token doesn't need a NIBS use to exist.

| Button type | Fill | Text | Amber mode | Smoke mode |
|---|---|---|---|---|
| Primary | `action/primary` | `text/on-primary` | Amber | Smoke |
| Brand alt (was Smoke) | `action/brand-alt` | `text/on-brand-alt` | Smoke | Amber |
| Neutral (was Black) | `action/neutral` | `text/on-neutral` | Black, white in dark | Same |
| Neutral inverse (new) | `action/neutral-inverse` | `text/primary` | White, black in dark | Same |

Selected states and Tertiary color and Link color use `action/primary-subtle` and `action/primary-text`, replacing `illustration/tx/yellow` and `yellow-ink`. This added 15 variables (8 Theme, 7 Brand), taking the core to about 94. The Button set is now 99 variants. Amber and Smoke were tested on real instances in light and dark. Their CSS names (`--brand-alt`, `--neutral` and so on) don't exist in code yet; they arrive with the package. Pink Badge variants are a separate decision.

## Decisions

Made (designer, 2026-11-06):

- **The design system is for GCB products only, for now.** The Figma files stay in the GCB UX team and the package is
  `@gcb/tokens`. The core still carries no brand, because personal and business banking already need two (amber and
  smoke), and it keeps other clients possible later without a rebuild.
- **The code is correct for radius and motion.**

Still open:

- **A GCB GitHub organisation.** GitHub Packages ties a package's scope to the account that owns it, and this repo sits
  under a personal account (`ckbcodess`). `@gcb/tokens` needs an organisation called `gcb`, or the scope becomes that
  organisation's name. Needed by phase 9, not before.
- **Constitution changes**, if this plan is accepted. §4 describes the current Figma layers and says primary is GCB amber;
  those move to the brand layer. §4's token list stays true for NIBS, as project tokens.

## Sources

- [Figma: variable mode limits and extended collections](https://help.figma.com/hc/en-us/articles/35794667554839)
- [Figma: Variables REST API requirements](https://developers.figma.com/docs/rest-api/variables)
- [shadcn: registry item schema](https://ui.shadcn.com/docs/registry/registry-item-json)
- [Design Tokens spec, first stable version](https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/)
