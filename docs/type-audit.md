# Type audit

Read from `src/` on 2026-10-19. Nothing here has been changed in code. It's a list for the designer to decide on.

**Figma status (2026-10-19):** the TOKENS file now has exactly these 10 text styles. They were built in place on the old
styles (Heading/Screen → Page title, Text/Small → Row and input, Text/Extra Small → Meta…), so existing layers stayed bound.
The 500 weight comes from binding `fontWeight` to the `weight/medium` variable. The other 13 old styles are named `_deprecated/…`.

## The roles (CONSTITUTION §5)

These are the only text styles the system should have. All are Open Sans. Line height is 150% unless a role sets its own.
Tracking comes from the `--ls-*` tokens.

| Role | Size / line height | Weight | Tracking | Code |
|---|---|---|---|---|
| Page title | 22 / 28 | 500 | heading (−2%) | `PageHeader`: `lg:text-[22px] sm:leading-[28px]` |
| Page title · phone | 18 / 24 | 500 | heading | `text-[18px] leading-[24px]` (20 between sm and lg) |
| Hero figure | 44 / 48 | 400 | heading | `HERO_FIGURE.xl`: `sm:text-[44px] sm:leading-[48px]` |
| Hero figure · phone | 28 / 32 | 400 | heading | `text-[28px] leading-[32px]` |
| Section heading | 16 / 150% | 500 | heading | `text-[16px] font-medium` |
| Section heading · phone | 14 / 150% | 500 | heading | `text-[14px] font-medium` |
| Row and input | 14 / 150% | 400 | none | `text-[14px]` |
| Body | 13 / 150% | 400 | none | `text-[13px]` |
| Label | 13 / 150% | 500 | none | `text-[13px] font-medium` |
| Meta | 12 / 150% | 400 | none | `text-[12px] text-muted-foreground` |

**Conflict:** the constitution gives hero figures as 40–76px, but the dashboard hero is 28px on phones.
Either the rule should say "28 on phones", or the phone hero should grow.

## Off-scale sizes in code

On the scale: 12, 13, 14, 16, 18, 20, 22, plus 28/44 for hero figures (and 40–76 for other big figures, per the constitution).

| Size | Uses | Nearest role | Where it's most used |
|---|---|---|---|
| 13.5px | 222 | 13 or 14 | PaymentFlow (28), RequestCardFlow (10), signup/business (10) |
| 12.5px | 149 | 12 or 13 | signup/business (12), activate (7), TransactionDetailSheet (4) |
| 15px | 106 | 14 or 16 | settings (5), VirtualCardDetailsView (4), CardDeliveryTracker (4) |
| 11px | 83 | 12 | motion-lab (11), sandbox dashboard (10), FxQuickModal (7) |
| 11.5px | 56 | 12 | VirtualCardDetailsView (8), RecentActivityWidget (4) |
| 10px | 40 | 12 (or keep as micro) | sandbox dashboard (8), motion-lab (8), TopHeader (3) |
| 14.5px | 35 | 14 | RequestCardFlow (5), migrate (5), payments shared (3) |
| 17px | 24 | 16 or 18 | MobilePromoBanner (4), LinkSourceAccountModal (4) |
| 10.5px | 24 | 12 | FxQuickModal (4), CardsStack (3) |
| 26, 24, 34, 32, 30, 23, 21 | ~50 | 22 or a hero figure | headline numbers on detail pages |
| 15.5, 16.5, 19, 19.5, 21.5, 12.25 | ~30 | nearest role | scattered |
| `text-xs` (10.5px), `text-sm` (12.25px) | 140 | 12 / 13 | mostly motion-lab and sandbox (109), plus ui/dropdown-menu, table, card |
| below 10px (9, 8.5, 8, 7.5, 6.5, 6) | ~15 | leave | card artwork and mini card faces, where it's artwork rather than UI text |

The `motion-lab` and `sandbox` pages are prototype scaffolding, so those uses can be ignored.
The real drift is 13.5, 12.5, 15 and 11.5 in product flows: about 530 uses.
