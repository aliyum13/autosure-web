import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

const singleFeatures = [
  'Full title history (salvage / rebuilt / flood)',
  'Odometer timeline — detect rollback',
  'Accident & damage records',
  'Open NHTSA recall alerts',
  'Theft & stolen vehicle records',
  'Auction sale history & photos',
  'Overall grade (A–F) with risk score',
  'PDF download + shareable link',
];

const bundles = [
  { label: '3-Report Bundle', price: '₦35,000', saving: 'Save ₦10,000', qty: 3 },
  { label: '5-Report Bundle', price: '₦50,000', saving: 'Save ₦25,000', qty: 5 },
];

export default function PricingPreview() {
  return (
    <section className="bg-white py-16 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-wider text-ch-primary mb-3">
            Pricing
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-ch-text mb-3">
            One Report. Full Truth. ₦15,000.
          </h2>
          <p className="text-ch-text-secondary">
            That&apos;s less than a tank of fuel. The cost of not checking could be your entire investment.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-6">
          {/* Single report */}
          <div className="border-2 border-ch-primary rounded-2xl p-6 relative shadow-green-glow hover-lift bg-white">
            <div className="absolute -top-3 left-4">
              <span className="bg-ch-primary text-white text-xs font-semibold px-3 py-1 rounded-full shadow-green-glow">
                MOST POPULAR
              </span>
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ch-primary mb-1">
              US Vehicle Report
            </p>
            <div className="text-4xl font-extrabold text-ch-text mb-1">₦15,000</div>
            <p className="text-xs text-ch-text-muted mb-5">Full history — one report</p>
            <ul className="space-y-2 mb-6">
              {singleFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-ch-text-secondary">
                  <Check className="w-4 h-4 text-ch-green shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/search">
              <Button className="w-full bg-ch-primary hover:bg-ch-primary-dark text-white">
                Get Report — ₦15,000
              </Button>
            </Link>
          </div>

          {/* Bundles */}
          {bundles.map((bundle) => (
            <div key={bundle.label} className="border border-ch-border rounded-2xl p-6 hover-lift bg-white shadow-soft">
              <p className="text-xs font-semibold uppercase tracking-wider text-ch-text-muted mb-1">
                {bundle.label}
              </p>
              <div className="text-4xl font-extrabold text-ch-text mb-1">{bundle.price}</div>
              <p className="text-xs text-ch-green font-medium mb-5">{bundle.saving}</p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-start gap-2 text-sm text-ch-text-secondary">
                  <Check className="w-4 h-4 text-ch-green shrink-0 mt-0.5" />
                  {bundle.qty} × US Vehicle Reports
                </li>
                <li className="flex items-start gap-2 text-sm text-ch-text-secondary">
                  <Check className="w-4 h-4 text-ch-green shrink-0 mt-0.5" />
                  Everything in single report
                </li>
                <li className="flex items-start gap-2 text-sm text-ch-text-secondary">
                  <Check className="w-4 h-4 text-ch-green shrink-0 mt-0.5" />
                  Use one at a time — no expiry
                </li>
              </ul>
              
                <Link href="/search">
                <Button variant="outline" className="w-full border-ch-primary text-ch-primary hover:bg-ch-primary-light">
                  Buy {bundle.label}
                </Button>
              </Link>

            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link href="/pricing" className="text-sm text-ch-primary hover:underline">
            See Full Pricing →
          </Link>
        </div>
      </div>
    </section>
  );
}
