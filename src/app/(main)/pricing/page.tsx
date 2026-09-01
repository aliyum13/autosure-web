import Link from 'next/link';
import { Check, CreditCard, Landmark, Smartphone, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';

const included = [
  'Full title history (salvage / rebuilt / flood)',
  'Odometer timeline — detect rollback',
  'Accident and damage records',
  'Open NHTSA recall alerts',
  'Theft records',
  'AI plain-English summary',
  'Overall grade (A–F) with risk score',
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
    a: 'You get a full refund. Some cars were never registered in the United States and have no US history to return. Email checkamafrica@gmail.com within 24 hours of paying.',
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
    <div className="min-h-screen bg-ch-paper">
      <div className="max-w-5xl mx-auto px-4 pt-14 sm:pt-20 pb-20">
        <h1 className="rule-draw inline-block text-4xl sm:text-6xl text-ch-ink">
          ₦15,000 a car.
        </h1>
        <p className="measure mt-12 text-lg text-ch-text-secondary leading-relaxed">
          No subscription, no account required. You pay for one car at a time, and
          if America holds no record of it you get your money back.
        </p>

        {/* Rate card */}
        <div className="mt-14 rule-t">
          {rates.map((r) => (
            <div
              key={r.label}
              className={`grid sm:grid-cols-12 gap-3 sm:gap-6 items-baseline py-6 ${
                r.lead ? 'border-b-2 border-ch-ink' : 'rule-b'
              }`}
            >
              <h2 className={`sm:col-span-3 text-ch-ink ${r.lead ? 'text-2xl' : 'text-xl'}`}>
                {r.label}
              </h2>
              <div className="sm:col-span-3">
                <span className={`text-ch-ink tabular ${r.lead ? 'text-4xl sm:text-5xl' : 'text-3xl'}`}>
                  {r.price}
                </span>
              </div>
              <p className="sm:col-span-3 text-sm text-ch-text-muted tabular">
                {r.per}
                {r.saving && (
                  <span className="block text-ch-primary-dark font-medium">{r.saving}</span>
                )}
              </p>
              <div className="sm:col-span-3 sm:text-right">
                <Link href="/search">
                  <Button
                    className={
                      r.lead
                        ? 'bg-ch-primary-dark hover:bg-ch-ink text-white rounded-none h-11 px-6'
                        : 'bg-transparent border border-ch-ink text-ch-ink hover:bg-ch-ink hover:text-white rounded-none h-10 px-5'
                    }
                  >
                    {r.cta}
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* What you get, once — it is identical at every rate. */}
        <section className="mt-16">
          <h2 className="text-2xl sm:text-3xl text-ch-ink">Every report contains</h2>
          <ul className="mt-6 grid sm:grid-cols-2 gap-x-10 rule-t">
            {included.map((f) => (
              <li key={f} className="flex items-start gap-2.5 py-3 text-sm text-ch-text-secondary rule-b">
                <Check className="w-4 h-4 text-ch-primary-dark shrink-0 mt-0.5" strokeWidth={2.5} aria-hidden />
                {f}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-16">
          <h2 className="text-2xl sm:text-3xl text-ch-ink">Paying</h2>
          <ul className="mt-6 flex flex-wrap gap-x-8 gap-y-3 rule-y py-4">
            {paymentMethods.map(({ Icon, label }) => (
              <li key={label} className="flex items-center gap-2 text-sm text-ch-text-secondary">
                <Icon className="w-4 h-4 text-ch-primary-dark" strokeWidth={2} aria-hidden />
                {label}
              </li>
            ))}
          </ul>
          <p className="measure mt-4 text-sm text-ch-text-muted">
            All payments run through Paystack. CheckAm never sees your card details.
          </p>
        </section>

        <section className="mt-16">
          <h2 className="text-2xl sm:text-3xl text-ch-ink">Questions about paying</h2>
          <dl className="mt-6 rule-t">
            {faqs.map((f) => (
              <div key={f.q} className="grid sm:grid-cols-12 gap-2 sm:gap-8 py-6 rule-b">
                <dt className="sm:col-span-5 text-lg text-ch-ink font-display">{f.q}</dt>
                <dd className="sm:col-span-7 measure text-ch-text-secondary leading-relaxed">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}
