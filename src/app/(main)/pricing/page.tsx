import Link from 'next/link';
import { Check, CreditCard, Landmark, Smartphone, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';

const included = [
  'Full title history (salvage / rebuilt / flood)',
  'Odometer timeline — detect rollback',
  'Accident and damage records',
  'Open NHTSA recall alerts',
  'Theft records',
  'PDF download and shareable link',
];

// A classified rate card: one row per rate, read across. The single report is
// the main path and carries the heavier rule rather than a "popular" sticker.
const rates = [
  {
    label: 'One report',
    price: '₦15,000',
    per: '₦15,000 per car',
    saving: null,
    cta: 'Get a report',
    lead: true,
  },
  {
    label: 'Three reports',
    price: '₦35,000',
    per: '₦11,667 per car',
    saving: 'Saves ₦10,000',
    cta: 'Buy three',
    lead: false,
  },
  {
    label: 'Five reports',
    price: '₦50,000',
    per: '₦10,000 per car',
    saving: 'Saves ₦25,000',
    cta: 'Buy five',
    lead: false,
  },
];

const paymentMethods = [
  { Icon: CreditCard, label: 'Visa / Mastercard' },
  { Icon: Landmark, label: 'Bank transfer' },
  { Icon: Smartphone, label: 'USSD' },
  { Icon: Wallet, label: 'PayAttitude' },
];

const faqs = [
  {
    q: 'What if there is no data for my VIN?',
    a: 'You get a full refund. Some cars were never registered in the United States and have no US history to return. Email support@autosurevin.com within 24 hours of paying.',
  },
  {
    q: 'How long does a report take?',
    a: 'The check starts the moment Paystack confirms your payment. The report appears on screen when it completes and arrives by email as a PDF.',
  },
  {
    q: 'Can I share my report?',
    a: 'Yes. Every completed report has a link you can send to a mechanic, your family, or the seller.',
  },
  {
    q: 'Do bundle credits expire?',
    a: 'No. Credits sit in your account and you spend them one car at a time, whenever you like.',
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-4 pt-16 sm:pt-20 pb-20">
        <p className="text-sm font-semibold text-ch-primary">Pricing</p>
        <h1 className="mt-4 text-4xl sm:text-h1 text-ch-ink">₦15,000 a car.</h1>
        <p className="measure mt-4 text-lg text-ch-text-secondary">
          No subscription, no account required. You pay for one car at a time, and
          if America holds no record of it you get your money back.
        </p>

        {/* Rate card: one row per rate, read across. The single report is the
            main path, so it carries the primary border rather than a sticker. */}
        <div className="mt-12 grid gap-4">
          {rates.map((r) => (
            <div
              key={r.label}
              className={`surface-card p-6 grid sm:grid-cols-12 gap-3 sm:gap-6 items-center ${
                r.lead ? 'border-ch-primary' : ''
              }`}
            >
              <h2 className={`sm:col-span-3 text-ch-ink ${r.lead ? 'text-2xl' : 'text-xl'}`}>
                {r.label}
              </h2>
              <div className="sm:col-span-3">
                <span className={`font-bold text-ch-ink tabular ${r.lead ? 'text-4xl sm:text-5xl' : 'text-3xl'}`}>
                  {r.price}
                </span>
              </div>
              <p className="sm:col-span-3 text-sm text-ch-text-muted tabular">
                {r.per}
                {r.saving && (
                  <span className="block text-ch-secondary-dark font-medium">{r.saving}</span>
                )}
              </p>
              <div className="sm:col-span-3 sm:text-right">
                <Button
                  asChild
                  variant={r.lead ? 'default' : 'outline'}
                  className={
                    r.lead
                      ? 'h-11 px-6 bg-ch-primary hover:bg-ch-primary-dark text-white font-semibold transition-colors duration-200 ease-out'
                      : 'h-11 px-6 border-ch-primary text-ch-primary hover:bg-ch-primary hover:text-white transition-colors duration-200 ease-out'
                  }
                >
                  <Link href="/search">{r.cta}</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* What you get, once — it is identical at every rate. */}
        <section className="mt-20">
          <h2 className="text-3xl sm:text-h2 text-ch-ink">Every report contains</h2>
          <ul className="mt-8 surface-card p-6 grid sm:grid-cols-2 gap-x-10 gap-y-4">
            {included.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-ch-text-secondary">
                <Check className="w-5 h-5 text-ch-secondary shrink-0 mt-0.5" strokeWidth={2.5} aria-hidden />
                {f}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-20">
          <h2 className="text-3xl sm:text-h2 text-ch-ink">Paying</h2>
          <ul className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {paymentMethods.map(({ Icon, label }) => (
              <li key={label} className="surface-card p-4 flex items-center gap-3 text-sm font-medium text-ch-text">
                <span className="w-9 h-9 rounded-lg bg-ch-primary-light text-ch-primary flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" strokeWidth={2} aria-hidden />
                </span>
                {label}
              </li>
            ))}
          </ul>
          <p className="measure mt-4 text-sm text-ch-text-muted">
            All payments run through Paystack. AutoSure never sees your card details.
          </p>
        </section>

        <section className="mt-20">
          <h2 className="text-3xl sm:text-h2 text-ch-ink">Questions about paying</h2>
          <dl className="mt-8 surface-card divide-y divide-ch-border">
            {faqs.map((f) => (
              <div key={f.q} className="grid sm:grid-cols-12 gap-2 sm:gap-8 p-6">
                <dt className="sm:col-span-5 text-lg font-semibold text-ch-ink">{f.q}</dt>
                <dd className="sm:col-span-7 text-ch-text-secondary">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}
