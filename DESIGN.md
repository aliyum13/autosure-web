# AutoSure — visual world

Durable visual decisions. Product truth lives in PRODUCT.md.

## The world: calm fintech

AutoSure looks like a financial product people already trust with money: light
surfaces, one sans family, the logo's royal blue and teal, and restraint
everywhere else. The page makes one argument — type a VIN — so the VIN bar is
the focal point and nothing competes with it.

This replaced the Phase 5 "motor page of a newspaper" direction (serif pairing,
cream stock, hairline rules, near-zero radii), which read editorial rather than
trustworthy-with-your-money.

## Type

- **Inter**, one family throughout (`--font-heading` and `--font-body` both
  point at it; `font-sans` / `font-display` alias them).
- Headings 600/700, leading ~1.15, tracking `-0.01em`. Body 400, leading 1.6.
- Scale: h1 48px, h2 36px, h3 28px, h4 24px, body 16px, small 14px.
- VIN codes and figures: monospace, tabular numerals.

## Colour

Brand commitments are fixed (PRODUCT.md): the AutoSure logo, `#1E40AF` and `#0D9488`.
The `ch-*` token names are kept; only their values move.

- `--primary-color` / `ch-primary` `#1E40AF` — heading accents, primary
  buttons, icon glyphs, links. `ch-primary-dark` `#1E3A8A` for hover/pressed;
  `ch-primary-light` `#EFF6FF` for icon tiles and tinted panels;
  `ch-primary-on-dark` `#93C5FD` for blue on dark surfaces.
- `--secondary-color` / `ch-secondary` `#0D9488` — verification marks, success
  states, the focus ring. `ch-green` points at it.
- `ch-paper` / `ch-bg` `#FFFFFF` — page background.
- `ch-surface` `#F8FAFC` — alternate section background, for banding.
- `ch-ink` / `ch-text` `#0F172A` — body text and the dark footer band.
- `ch-text-secondary` `#475569`, `ch-text-muted` `#64748B`.
- `ch-border` / `ch-rule` `#E2E8F0`.
- `ch-red` stays the danger colour (rollback, title brands).

## Surface

- Cards: `surface-card` — 12px radius, 1px `#E2E8F0` border, shadow
  `0 1px 3px rgba(0,0,0,.08)`. Interactive cards add `hover:shadow-card-hover`
  (`0 2px 6px rgba(0,0,0,.12)`). Nothing heavier anywhere.
- Buttons: 8px radius (`rounded-lg`), solid fill, no gradients.
- ~80px between major sections (`py-20`).
- Icons are drawn, from lucide, one stroke weight, usually in a tinted
  rounded-square tile. Never emoji.

## Focus

A 2px teal outline on every interactive element, always visible. Set once in
`globals.css` and used by the shadcn Button and Input primitives instead of
their own ring. Buttons that navigate are `<Button asChild><Link/></Button>`,
never a button nested in a link — that is invalid markup and a double tab stop.

## Motion

Micro-interactions only: 200ms ease-out on hover and focus. No entrance
animations, no drawn-in rules. The only gradient is the single soft wash at the
top of the hero.
