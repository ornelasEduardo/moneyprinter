# Design Guide — finance dashboards & product UI

How we craft planning/analytics surfaces (Plan hub, Analytics, calculators, tables) so they're genuinely excellent, not just competent. Synthesized from dashboard-UX research: Gestalt/perception (NN/g, Laws of UX, IxDF), hierarchy & type systems (NN/g, Material 3, Carbon, Polaris, Refactoring UI), financial data-viz (Tufte/Few, FT Visual Vocabulary, Storytelling with Data), fintech product craft (Eleken, Pencil & Paper, UXDA), and accessibility (WCAG 2.2, W3C APG, Deque, TPGi). Sources listed at the end.

**How to use this:** the non-negotiables are §0–§1. The rest is a working reference — skim the section for the surface you're building, then run the pre-ship checklist (§7). `CLAUDE.md` carries the short version; this is the long version.

---

## 0. The non-negotiables

1. **doom tokens only** (§1) — never hardcode a color, space, radius, or shadow.
2. **One focal point per view** (§2) — a single "am I okay?" answer, largest, top-left.
3. **Group by question** (§2) — proximity/common-region, not a uniform grid of equal tiles.
4. **Every number carries context and an action** (§4, §5) — a bare figure is unfinished.
5. **Meaning never rides on color alone** (§4, §6) — pair with sign, icon, or text.
6. **Design the empty, loading, error, and edge states** (§5) — the happy path is not the deliverable.
7. **Verify visually** — screenshot it. Passing tests ≠ good design.

---

## 1. doom tokens only

Style through doom's CSS custom properties. Real values live in `node_modules/doom-design-system/dist/styles/{palettes.js, globals.css, themes/definitions.js}`. The app ships the **`default`** theme.

| Need | Token(s) |
|---|---|
| Brand / primary action | `--primary` (purple), `--primary-hover`, on-accent text `--primary-foreground` |
| Secondary accent | `--secondary` (yellow), on-accent text `--secondary-foreground` |
| Status | `--success` / `--warning` / `--error` (+ their `-foreground`) |
| Surfaces | `--background`, `--card-bg`, `--card-border`, `--surface-accent` |
| Text | `--foreground`, `--muted-foreground` (secondary/metadata) |
| Spacing | `--space-1 … --space-12` (4/8pt scale) |
| Radius / shadow | `--radius-{sm,md,lg,pill}`, `--shadow-{sm,md,lg}`, `--surface-border-width` |
| Type / weight | `--text-2xs … --text-5xl`, `--font-regular … --font-black`, `--font-heading` |

- **DO** reuse doom components (Card, Badge, Table, Sidebar, Chart) before hand-rolling markup/D3 — see the `reference_doom_chart` gotchas for Chart.
- **DO** use the paired `-foreground` token on any accent surface (near-black on yellow, etc.) — they're contrast-checked (§6.1).
- **DON'T** invent hex values, ad-hoc `margin: 13px`, or a local color meaning. One semantic meaning per color, app-wide.

---

## 2. Layout, hierarchy & Gestalt

The eye groups by perception before it reads. Make the grouping do the work.

- **One focal point.** Pick a single hero per view (goal timeline on the Plan hub; net position / savings rate on Analytics), sized 2–3× adjacent labels with the most contrast. **DON'T** give six KPIs equal size/weight — a view with no dominant element makes the user do the triage.
- **Proximity over dividers.** Tight gap (`--space-1`/`--space-2`) *within* a group; 2–3× gap (`--space-6`/`--space-8`) *between* groups. Whitespace groups more cleanly than borders. **DON'T** use uniform gutters everywhere and then add rules to compensate.
- **Common region, used sparingly.** A bordered card is the strongest grouping cue — reserve it for content that reads as one unit (a metric + its trend + its baseline). **DON'T** nest borders or wrap every widget in its own box ("card fatigue" flattens everything to equal importance). In our neubrutalist doom language cards *are* bordered — so lean on **density and emphasis** (not more borders) to keep a focal point, and never border-inside-a-border.
- **Similarity = same meaning.** Lock one category to one color/icon everywhere (a category's color on a KPI tile matches its color in the detail chart). **DON'T** let a hue mean "expense" on one screen and "alert" on another.
- **Figure/ground.** Primary data at high contrast; recede the frame — mute gridlines, axes, borders, timestamps relative to the numbers. **DON'T** let axis labels compete with the trend line.
- **Continuity / alignment.** Left-align text, right-align numbers, keep card heights and column edges on a grid — broken alignment reads as broken relationship. **DON'T** stagger card heights by content length or rotate axis labels arbitrarily.
- **Scanning path.** Most-important top-left (F/Z pattern); primary CTA bottom-right on sparse summary views; most decision-relevant column leftmost in dense tables. **DON'T** center or bottom-right the primary metric and expect it to be found.
- **Three-tier hierarchy.** Summary → Context → Details. Densely pack the ~20% of the screen carrying primary decisions; let secondary zones breathe. **DON'T** spread a flat uniform grid across the whole viewport.

---

## 3. Typography, grid & spacing

- **Four levers, minimum combination.** Size, weight, color, spacing each signal importance — use the fewest needed. Bump a KPI one scale step *and* one weight, then stop. **DON'T** make it bigger + bolder + colored + boxed.
- **Constrain the scale.** ~4–5 sizes and 2 weights per view, all from doom's `--text-*` / `--font-*` tokens (a modular scale). **DON'T** introduce one-off `font-size`s.
- **De-emphasize with contrast, not just size.** Use `--muted-foreground` for captions/metadata. A small high-contrast label still competes with the hero.
- **Whitespace is a spacing token, not leftover.** All gaps/padding from `--space-*` on an 8pt rhythm. **DON'T** hardcode nudges.
- **Line length & height.** Prose ~45–75ch (`max-width: 60ch`); line-height 1.4–1.6 body, 1.1–1.25 large headings, ~1.3 dense table cells. Don't apply one global line-height to a 48px number and a 12px cell.
- **`text-wrap: balance`** on card titles/headings that wrap (not on long body copy).
- **Uppercase labels** get `letter-spacing: 0.05–0.1em` (up to 0.15em at 10–12px). Don't track mixed-case body.
- **Numbers: tabular, right-aligned, fixed precision.** `font-variant-numeric: tabular-nums` on every monetary figure/column; right-align; one decimal precision per column; reuse the shared `money()` formatters. De-emphasize the currency symbol (lighter/smaller) so the digits read first. **DON'T** mix proportional and tabular figures, or show `$1,204` beside `$1,204.50` in one column.
- **Density by task.** A compact row-padding set for 50-row tables; comfortable padding for onboarding/marketing. Don't reuse 24–32px card padding inside a dense table.
- **Responsive = priority stacking.** Collapse to one column ordered by importance (hero → trend → secondary → detail), not naive DOM reflow that buries the primary metric.

---

## 4. Numbers & data visualization

- **Chart to intent** (FT Visual Vocabulary): trend → line/area; comparison → bar; single value → big number + sparkline; part-to-whole (>3) → stacked bar, not pie. **DON'T** use a line for categorical comparison or a pie for >3 slices.
- **Bars start at zero; lines may not, but say so.** Bar length is magnitude — a truncated bar axis lies. Line charts compare movement, so a non-zero baseline is OK if the range is labeled or a break is marked. **DON'T** zoom a bar axis to dramatize a small delta.
- **No dual Y-axes, no 3D.** Dual axes manufacture fake correlation and slow readers; 3D distorts area. Use two small multiples instead.
- **Label directly, drop the legend** where possible — series name + end value at the endpoint, in series color. Removes a lookup step, essential on small tiles.
- **A number needs a comparison.** Show delta vs. prior period / target / benchmark ("+12% vs last month"), a threshold/target reference line, and annotate inflection points (e.g., a recurring price hike) on the chart — not buried in a tooltip. **DON'T** ship a headline figure with zero context.
- **Gains/losses = direction + sign + magnitude, never color alone.** Pair red/green with ▲/▼ and +/−. Prefer a colorblind-safe series palette (Okabe–Ito: `#0072B2 #E69F00 #D55E00 #009E73 #CC79A7`) plus a second channel (dash/shape/label). ~8% of men have red-green CVD (§6).
- **Data-ink.** Faint gridlines (or none if direct labels make them redundant); strip decorative borders/shadows/gradients from chart panels.
- **Sparklines carry shape, not precision** — small, axis-free, emphasized endpoint tying to the big number beside them. No axis labels/legend on a sparkline.
- **Negatives, unambiguous and consistent.** Pick one convention app-wide (leading true-minus `−` + color, parentheses only in exports) and never signal negative by color alone.
- **Abbreviate, keep exact one step away.** `$1.2M` in tiles (consistent decimals), exact figure in tooltip/table/on-click — never silently round a balance a user must reconcile.

---

## 5. Finance product craft (trust, behavior, states)

- **Show your work.** Every computed figure (net worth, "you can afford X", projections) drills into the transactions/formula/date-range behind it. Black-box numbers are the #1 trust-killer once a user catches one error.
- **Formatting discipline is a trust signal.** Identical currency/decimal/sign/date formatting everywhere the same value type appears. Inconsistency reads as "careless with my money."
- **Explain data asks in context.** One line at the point of asking ("used to detect price hikes in recurring charges"), not only a policy link.
- **Make local-first visible.** A low-key persistent cue that data lives on-device; an indicator that lights up only on an actual external call (ties to the governed-egress model). An invisible guarantee earns no trust.
- **Granular, default-off opt-in for any external/AI call.** Per-capability toggles with plain-language "what this touches," never a single master "Enable AI" or a pre-checked box that sends data off-device.
- **Insight → action.** Frame as "X changed → here's what you can do," action one click away. **DON'T** stop at "spending up 12%."
- **Progress framing over judgment.** "68% to your emergency fund / $400 to go" beats shortfall or moralizing ("you overspent"). Neutral, observational tone for negative movement. Celebrate real milestones (goal reached, debt paid) — not arbitrary streaks/badges.
- **Plain-language microcopy.** Name things by what the user controls ("Exclude from net worth", "Pause tracker"), active voice, no backend jargon.
- **State design (all of it):**
  - *Empty / first-run:* one clear next action + one line on what will appear ("Import a statement to see your spending trend"); consider sample data. Never a blank chart or zero-row table.
  - *Loading:* skeleton with the title visible immediately + specific copy ("Matching your transactions…"); disable the trigger to stop anxious repeat-taps.
  - *Error / partial failure:* what happened, what it means for their data/money, the next step ("3 of 40 rows couldn't import — the date format didn't match; review them"). Never claim full success on partial failure.
  - *Edge values:* zero, negative net worth, huge numbers, single-point charts are real states — design and test them; keep sign/color/label legible and non-alarming.
- **Reversibility over modals.** Prefer an Undo toast to a pre-action "Are you sure?"; reserve hard confirmation for genuinely irreversible, high-consequence actions (money movement / deletion) and show the exact numbers first.

---

## 6. Accessibility (WCAG 2.2, AA baseline / AAA where it counts)

- **6.1 Contrast.** Text ≥ 4.5:1 (≥3:1 large ≥18pt/14pt-bold); aim AAA 7:1 for primary balances/totals. Non-text (icons, input/card borders, chart strokes, focus rings) ≥ 3:1 (SC 1.4.11). **Check every text/icon-on-accent combo actually shipped** — use doom's `-foreground` tokens; don't reuse `--foreground` on a yellow/purple fill without measuring.
- **6.2 Never color alone** (SC 1.4.1) — deltas get a sign + ▲/▼; status pills get an icon/label. Run the grayscale test.
- **6.3 Focus visible** (2.4.7/2.4.11/2.4.13) — ≥2px outline, ≥3:1 focused-vs-unfocused, never `outline:none` with only a faint bg shift; sticky headers/toasts must not obscure the focused row.
- **6.4 Keyboard.** Tables: native, tab-reachable sort/filter/row-action controls (or the ARIA `grid` pattern with roving tabindex for interactive grids). Drawers/modals: `role="dialog"` + `aria-modal` + `aria-labelledby`, focus moves in on open, trapped, Escape closes, focus returns to the trigger. No `<div onClick>` controls.
- **6.5 Reduced motion.** Wrap chart/number/drawer animation in `@media (prefers-reduced-motion: reduce)`; never make motion the sole signal a value changed (pair with a persistent indicator).
- **6.6 Semantics.** Real heading hierarchy (no skipped levels, no bold-`<div>` fake headings); landmark elements (`<main>`, `<nav>`, `<section aria-label>`) for each major region; icon-only buttons get a specific `aria-label` ("Delete transaction", not "Delete"); custom controls expose the matching ARIA role/state (`role="switch"`+`aria-checked`, combobox pattern, etc.).
- **6.7 Tables.** Real `<table>` with `<caption>`, `<th scope="col|row">`; don't build tabular data from `<div>` grids (or supply full `role="grid"` semantics if virtualization forces it).
- **6.8 Async updates.** A persistent (mounted-empty) `aria-live="polite"` region for recalculated totals / filter results / "Saved"; `assertive` only for errors.
- **6.9 Numbers for AT.** True minus `−` (U+2212) adjacent to the digit, no space; if using accounting parentheses, also expose the sign via visually-hidden text for critical figures.
- **6.10 Targets & reflow.** Interactive targets ≥24×24px (prefer 44×44), ≥24px apart (SC 2.5.8); single-column reflow at 400% zoom, with dense tables scrolling inside their own bounded region — not the whole page.

---

## 7. Pre-ship checklist

- [ ] Every color/space/radius/shadow is a doom token — zero hardcoded values
- [ ] Exactly one focal point; groups read by proximity/common-region, not a flat grid
- [ ] Numbers: tabular, right-aligned, consistent precision, `money()` formatting, de-emphasized symbol
- [ ] Every metric has a comparison/context and (where relevant) a next action
- [ ] Bars start at zero; no dual-axis/3D/pie-overuse; series colorblind-safe + directly labeled
- [ ] Gains/losses & status convey meaning without color (sign/icon/text); grayscale test passes
- [ ] Empty, loading, error/partial-failure, and edge-value (zero/negative/huge) states designed
- [ ] Contrast measured (AAA on primary figures; on-accent combos checked); focus visible; reduced-motion honored
- [ ] Keyboard: tables, drawers/modals (focus trap + return), icon buttons labeled, semantics/landmarks correct
- [ ] Screenshotted and eyeballed against the app's neubrutalist language

---

## Sources

**Gestalt / perception:** [Laws of UX — Common Region](https://lawsofux.com/law-of-common-region/) · [Uniform Connectedness](https://lawsofux.com/law-of-uniform-connectedness/) · [NN/g — Psychology for UX](https://www.nngroup.com/articles/psychology-study-guide/) · [NN/g — Proximity](https://www.nngroup.com/articles/gestalt-proximity/) · [Playfair — Gestalt for Dashboards](https://playfairdata.com/applying-gestalt-principles-to-dashboard-design/) · [Baymard — Dashboard Cards](https://baymard.com/blog/cards-dashboard-layout) · [Smashing — Dashboard Design](https://www.smashingmagazine.com/2021/11/dashboard-design-research-decluttering-data-viz/)

**Hierarchy / type / spacing:** [NN/g — Visual Hierarchy](https://www.nngroup.com/articles/visual-hierarchy-ux-definition/) · [Material 3 — Typography](https://m3.material.io/styles/typography) · [Carbon — Spacing](https://carbondesignsystem.com/elements/spacing/overview/) · [Polaris — Spacing](https://legacy.polaris.shopify.com/design/spacing) · [UXPin — Line Length](https://www.uxpin.com/studio/blog/optimal-line-length-for-readability/) · [MDN — text-wrap](https://developer.mozilla.org/en-US/docs/Web/CSS/text-wrap) · [Design Better Data Tables](https://medium.com/mission-log/design-better-data-tables-430a30a00d8c)

**Data viz:** [FT Visual Vocabulary](https://github.com/Financial-Times/chart-doctor/tree/main/visual-vocabulary) · [Storytelling with Data — zero baseline](https://www.storytellingwithdata.com/blog/2012/09/bar-charts-must-have-zero-baseline) · [PolicyViz — Dual Axis](https://policyviz.com/2022/10/06/avoiding-the-dual-axis-chart/) · [W3C — Use of Color](https://www.w3.org/WAI/WCAG21/Understanding/use-of-color.html) · [Few — Information Dashboard Design](https://www.smartcville.com/blog/2020/06/25/book-review-information-dashboard-design-by-stephen-few/) · [Pencil & Paper — Data Tables](https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables) · [Fintech typography: readable money](https://medium.com/design-bootcamp/the-elements-of-fintech-typography-part-1-readable-money-b6c1226acbde)

**Fintech product:** [Eleken — Fintech UX Best Practices](https://www.eleken.co/blog-posts/fintech-ux-best-practices) · [UXDA — Dark Patterns in Banking](https://theuxda.com/blog/dark-patterns-in-digital-banking-compromise-financial-brands) · [Pencil & Paper — Empty States](https://www.pencilandpaper.io/articles/empty-states) · [NN/g — Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/) · [Local-First UX](https://medium.com/@2W/local-first-ux-5916e6a6dbee) · [Creode — Emotion in Financial UX](https://www.creode.co.uk/journal/the-role-of-emotion-in-financial-ux)

**Accessibility:** [WCAG 2.2](https://www.w3.org/TR/WCAG22/) · [W3C APG — Dialog (Modal)](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) · [W3C — Tables Tutorial](https://www.w3.org/WAI/tutorials/tables/) · [NN/g — Accessible Visual Treatments](https://www.nngroup.com/articles/visual-treatments-accessibility/) · [Deque — Negative Numbers](https://www.deque.com/blog/ensuring-negative-numbers-are-available-for-everyone/) · [TPGi — Formatting Currency](https://www.tpgi.com/money-talks-formatting-currency-in-web-content/) · [Sara Soueidan — Accessible Icon Buttons](https://www.sarasoueidan.com/blog/accessible-icon-buttons/) · [Okabe–Ito palette / AudioEye](https://www.audioeye.com/post/colorblind-friendly-palettes/)
