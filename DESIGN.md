# AutoSure — visual world

Durable visual decisions. Product truth lives in PRODUCT.md.

## The world: the motor page

AutoSure is built as **the motor page of a newspaper** — the classified and
vehicle section of a daily, printed on cheap warm stock: ruled columns, a
high-contrast masthead serif, hairline rules doing the work that borders and
shadows do elsewhere, tabular figures, and a single spot colour used sparingly
enough that it still means something when it appears.

**Why this world.** The product's mechanism is that *America already wrote this
down*. A car written off in Texas carries that fact in a federal database no
Lagos seller can reach or edit. The newspaper is the audience's existing mental
model for that idea: the published record, dated and typeset, that exists
whether or not it flatters you. A newspaper does not persuade by feeling
trustworthy; it persuades by being on the record. That is the exact argument
AutoSure has to make to a sceptical buyer in a car yard, and it is a world that
scales into dense report data later without changing key.

**Chosen against the rut.** This category ships one of two pages: the rounded
SaaS landing (soft cards, gradient blobs, pill badges, drop shadows) or its
predictable opposite, the dark "cyber-security" page. The incumbent look was the
first of those and is the explicit anti-reference. Neither is in this system.

Derived over: the US title certificate, the Copart auction sheet, the customs
bill of lading, Lagos roadside signwriting, the clearing agent's folder, the
instrument cluster.

## Type

- **Playfair Display** (`--font-heading`) — display. High-contrast transitional
  serif, a masthead voice. Headlines only, tight leading, tracking pulled in at
  display sizes.
- **Crimson Text** (`--font-body`) — text, UI, labels, data. A book serif that
  carries body copy, controls, and tabular figures.

No third face. Body measure stays 65–75ch. Display caps at 6rem.

Numerals in any data position use `font-variant-numeric: tabular-nums` so
columns align the way a printed table does.

## Colour

Brand commitments are fixed (PRODUCT.md): the AutoSure logo, `#1E40AF` and `#0D9488`.

- `--ch-paper` `#F7F5EF` — the stock everything prints on.
- `--ch-ink` `#1A1A1A` — text and rules.
- `--primary-color` / `--ch-primary` `#1E40AF` — the single spot colour. Rules under headlines,
  the mark, primary actions, the live indicator. Used sparingly on purpose:
  spot colour that appears everywhere stops reading as emphasis.
- `--ch-primary-dark` `#1E3A8A` — pressed and hover states.
- `--ch-primary-on-dark` `#93C5FD` — the brand blue on charcoal surfaces.
- `--secondary-color` / `--ch-secondary` `#0D9488` — brand teal. Secondary
  accents only; never competes with the primary for emphasis.
- `--ch-gold` `#F5B400` — the stamp. Second-tier emphasis only.
- Rules are ink at low alpha, never a grey token invented for the purpose.

Light, not dark: the use scene is a phone held outdoors in Nigerian daylight.

## Structure

- **Rules, not boxes.** Hairline rules and column dividers separate content.
  Radii are near-zero. Shadows are not the depth system; overlap and rules are.
- **No eyebrows.** No kicker or label above a heading, anywhere. The heading
  carries itself.
- **Icons are drawn**, from lucide, one stroke weight. Never emoji.
- **Sections earn their own shape.** No page built from a row of identical
  icon-heading-text cards, and no hero-metric strip.

## Browser surfaces

Selection, caret, focus ring, and scrollbar are themed from the palette rather
than left to the browser. Focus is a visible ink ring, never removed.

## Motion

One authored moment: the masthead rule drawing in under the headline on first
paint. Exponential ease-out from an already-visible default, so nothing depends
on JavaScript to become readable. Everything else is state feedback. Respects
`prefers-reduced-motion`.
