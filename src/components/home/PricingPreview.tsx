import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

const included = [
  'Full title history (salvage / rebuilt / flood)',
  'Odometer timeline — detect rollback',
  'Accident and damage records',
  'Open NHTSA recall alerts',
  'Theft and stolen vehicle records',
  'Auction sale history and photos',
  'PDF download and shareable link',
];

const bundles = [
  { label: 'Three reports', price: '₦35,000', saving: 'Saves ₦10,000', qty: 3 },
  { label: 'Five reports', price: '₦50,000', saving: 'Saves ₦25,000', qty: 5 },
];

export default function PricingPreview() {
  return (
    <section className="bg-ch-paper py-20 sm:py-24 px-4 rule-t">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl sm:text-5xl text-ch-ink max-w-2xl">
          ₦15,000 a car. Less than a tank of fuel.
        </h2>

        <div className="mt-14 grid lg:grid-cols-12 gap-10 lg:gap-12">
          {/* The single report is the main path, so it gets the width and the
              rule weight rather than a "most popular" sticker. */}
          <div className="lg:col-span-7">
            <div className="flex items-baseline justify-between gap-4 pb-4 border-b-2 border-ch-ink">
              <h3 className="text-2xl text-ch-ink">One report</h3>
              <span className="text-4xl sm:text-5xl text-ch-ink tabular">₦15,000</span>
            </div>
            <ul className="mt-6 grid sm:grid-cols-2 gap-x-8">
              {included.map((f) => (
                <li key={f} className="flex items-start gap-2.5 py-2.5 text-sm text-ch-text-secondary rule-b">
                  <Check className="w-4 h-4 text-ch-primary shrink-0 mt-0.5" strokeWidth={2.5} aria-hidden />
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/search" className="inline-block mt-8">
              <Button className="bg-ch-primary-dark hover:bg-ch-ink text-white px-10 h-12 text-base font-semibold rounded-none">
                Get a report — ₦15,000
              </Button>
            </Link>
          </div>

          <div className="lg:col-span-5 lg:pl-12 lg:rule-l">
            <h3 className="text-xl text-ch-ink">Buying more than one</h3>
            <p className="measure mt-3 text-sm text-ch-text-secondary leading-relaxed">
              Credits never expire, and you spend them one car at a time.
            </p>
            <dl className="mt-6 rule-t">
              {bundles.map((b) => (
                <div key={b.label} className="py-5 rule-b">
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-ch-ink font-semibold">{b.label}</dt>
                    <dd className="text-2xl text-ch-ink tabular">{b.price}</dd>
                  </div>
                  <p className="mt-1 text-sm text-ch-primary-dark">{b.saving}</p>
                  <Link href="/search" className="inline-block mt-3">
                    <Button
                      variant="outline"
                      className="border-ch-ink text-ch-ink hover:bg-ch-ink hover:text-white rounded-none h-9"
                    >
                      Buy {b.qty} reports
                    </Button>
                  </Link>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
