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
    <section className="bg-white py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl sm:text-4xl text-ch-ink max-w-2xl">
          ₦15,000 a car. Less than a tank of fuel.
        </h2>

        <div className="mt-12 grid lg:grid-cols-12 gap-6">
          {/* The single report is the main path, so it gets the width and the
              primary border rather than a "most popular" sticker. */}
          <div className="lg:col-span-7 surface-card border-ch-primary p-6 sm:p-8">
            <div className="flex items-baseline justify-between gap-4 pb-5 border-b border-ch-border">
              <h3 className="text-2xl text-ch-ink">One report</h3>
              <span className="text-4xl font-bold text-ch-ink tabular">₦15,000</span>
            </div>
            <ul className="mt-5 grid sm:grid-cols-2 gap-x-6 gap-y-3">
              {included.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-ch-text-secondary">
                  <Check className="w-4 h-4 text-ch-secondary shrink-0 mt-0.5" strokeWidth={2.5} aria-hidden />
                  {f}
                </li>
              ))}
            </ul>
            <Button asChild className="mt-8 h-12 px-8 rounded-lg bg-ch-primary hover:bg-ch-primary-dark text-white text-base font-semibold transition-colors duration-200 ease-out">
              <Link href="/search">Get a report — ₦15,000</Link>
            </Button>
          </div>

          <div className="lg:col-span-5 flex flex-col gap-6">
            <div>
              <h3 className="text-xl text-ch-ink">Buying more than one</h3>
              <p className="mt-2 text-sm text-ch-text-secondary">
                Credits never expire, and you spend them one car at a time.
              </p>
            </div>
            {bundles.map((b) => (
              <div key={b.label} className="surface-card hover:shadow-card-hover p-6">
                <div className="flex items-baseline justify-between gap-4">
                  <h4 className="text-base text-ch-ink">{b.label}</h4>
                  <span className="text-2xl font-bold text-ch-ink tabular">{b.price}</span>
                </div>
                <p className="mt-1 text-sm font-medium text-ch-secondary">{b.saving}</p>
                <Button
                  asChild
                  variant="outline"
                  className="mt-4 h-10 px-5 rounded-lg border-ch-primary text-ch-primary hover:bg-ch-primary hover:text-white transition-colors duration-200 ease-out"
                >
                  <Link href="/search">Buy {b.qty} reports</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
