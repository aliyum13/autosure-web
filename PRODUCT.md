# CheckAm — product truth

Durable facts about what this product is and who it serves. Visual decisions live
in DESIGN.md, never here.

## Platform

`web`. Mobile-first in practice: the primary user is on a phone, often standing
next to the car they are considering.

## Users and jobs

**Primary: the first-time guest buyer.** 86% of orders to date came from
customers with no account (recorded when the sign-in prompt was added to the
report email). They are not browsing. They are mid-negotiation on one specific
imported car, usually on a phone, often with a seller waiting. The job is a
single decision: *is this car what the seller says it is, and should I hand over
my money?*

They arrive sceptical of the site itself as well as the car. Nothing about
CheckAm is familiar to them, they are being asked for ₦15,000 up front, and
Nigerian used-car buying has trained them to expect to be cheated. Trust has to
be earned before the VIN box, not after.

**Secondary: dealers** sourcing from Cotonou and Benin, who run checks
repeatedly and care about speed and bundle credits. **Tertiary: returning
account holders** (the other 14%), who live in the dashboard.

The redesign is aimed at the first group.

## What the product makes possible

Enter a 17-character USA VIN, pay ₦15,000, and get that vehicle's American
history in about thirty seconds: title brands (salvage, rebuilt, flood, junk),
odometer records and rollback detection, accident and damage history, open NHTSA
safety recalls, theft records, market valuation, an A–F grade with a risk score,
and a plain-English summary.

**The mechanism that matters:** the records are American, and they exist because
the United States forces them to. NMVTIS is a federal title database; NHTSA
publishes recalls; US insurers report total losses. A car that was written off in
Texas carries that fact in a US government system no Nigerian seller can reach,
edit, or talk their way around. CheckAm is a window into paperwork that already
exists on the other side of the ocean, not an opinion or an inspection.

That is the honest position: not "we know cars" but "America wrote this down."

## Durable constraints and commitments

- **Data comes from ClearVin** (NMVTIS-derived) with NHTSA as a fallback for
  basic decoding. Reports are licensed for the buyer's personal use in
  evaluating one vehicle and may not be resold or redistributed. ClearVin
  branding and formatting in the PDF are ClearVin's property.
- **Not every VIN returns data.** Vehicles never registered in the US have no US
  history. The product must keep saying so before payment, not after.
- **A report is not an inspection.** Not all incidents get reported. The site
  tells people to inspect the car physically as well. This wording is
  deliberate and must survive any redesign.
- **Guest checkout stays.** Accounts are optional and always have been. Any
  design that makes an account feel required breaks the main path.
- **Payments are Paystack**, priced in naira, single report ₦15,000 with
  multi-report bundles. Bundle credits and referral earnings can pay for a
  report instead of cash.
- **Brand commitments:** the name CheckAm (Nigerian Pidgin, "check it"), the
  circular checkmark mark, and the brand green `#16A34A`. Confirmed as fixed by
  the user; a redesign works around them.
- **Contact is currently email only** (`support@checkamvin.com`). There is no
  WhatsApp line or social account yet, and the design must not imply otherwise.
  See `TODO(checkam-contact)` in the code.
- **No customer testimonials exist.** CheckAm has served no customers under this
  brand. Any social proof must come from the data source or the guarantee, never
  from invented quotes. A previous set of inherited testimonials was removed for
  exactly this reason.
- **Legal entity is not yet formalised**, so the privacy policy publishes no
  registered address. See `TODO(checkam-legal)`.

## Voice

Nigerian Pidgin used deliberately and sparingly — "check am before you buy" —
mixed with plain, universally readable English. Bold and street-smart, never
cartoonish. Pidgin belongs in headlines and calls to action; explanation stays
plain.

## Terminology

**Tokunbo** — an imported second-hand vehicle. The word the audience actually
uses; do not replace it with "used import". **VIN** — the 17-character
identifier. **Report** — one VIN's full history. **Credit** — a prepaid report
from a bundle.
