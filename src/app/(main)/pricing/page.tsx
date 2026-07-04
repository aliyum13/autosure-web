import Link from 'next/link';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

const singleFeatures = [
  'Full title history (salvage / rebuilt / flood)',
  'Odometer timeline — detect rollback',
  'Accident & damage records',
  'Open NHTSA recall alerts',
  'Theft records',
  'AI plain-English summary',
  'Overall grade (A–F) with risk score',
  'PDF download + shareable link',
];

const bundles = [
  {
    label: '3-Report Bundle',
    tag: '3-REPORT BUNDLE',
    price: '₦35,000',
    perReport: '₦11,667 per report',
    saving: 'Save ₦10,000 vs buying separately',
    features: ['3 × US Vehicle Reports', 'Everything in single report', 'Use one at a time — no expiry'],
    cta: 'Buy 3-Report Bundle',
    bundleId: 'triple',
  },
  {
    label: '5-Report Bundle',
    tag: '5-REPORT BUNDLE',
    price: '₦50,000',
    perReport: '₦10,000 per report',
    saving: 'Save ₦25,000 vs buying separately',
    features: ['5 × US Vehicle Reports', 'Everything in single report', 'Use one at a time — no expiry'],
    cta: 'Buy 5-Report Bundle',
    bundleId: 'five',
  },
];

const paymentMethods = [
  { icon: '💳', label: 'Visa / Mastercard' },
  { icon: '🏦', label: 'Bank Transfer' },
  { icon: '📱', label: 'USSD' },
  { icon: '💰', label: 'PayAttitude' },
];

const faqs = [
  {
    q: 'What if no data is found for my VIN?',
    a: 'If we cannot retrieve any data for your VIN, we will issue a full refund. Email carhakisupport@gmail.com within 24 hours of purchase.',
  },
  {
    q: 'How long does a report take?',
    a: 'Reports are generated instantly — usually within 30 seconds of payment confirmation.',
  },
  {
    q: 'Can I share my report?',
    a: 'Yes. Every completed report has a shareable link you can send to mechanics, family, or the seller.',
  },
  {
    q: 'Do bundles expire?',
    a: 'Bundle credits are stored in your account. After purchase, check any VIN from your dashboard — each check uses one credit. Credits never expire.',
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-ch-bg">
      {/* Hero */}
      <div className="bg-ch-navy text-white py-14 px-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
          Simple, Honest Pricing
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">
          Protect a ₦3M Purchase for Just ₦15,000
        </h1>
        <p className="text-slate-400 max-w-md mx-auto">
          No subscriptions. Pay per report. Money-back guarantee if no data found.
        </p>
      </div>

      {/* Cards */}
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid sm:grid-cols-3 gap-6 mb-12">
          {/* Single */}
          <div className="border-2 border-ch-blue rounded-2xl p-6 relative bg-white">
            <div className="absolute -top-3 left-4">
              <span className="bg-ch-blue text-white text-xs font-semibold px-3 py-1 rounded-full">
                MOST POPULAR
              </span>
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ch-blue mb-1 mt-2">
              US Vehicle Report
            </p>
            <div className="text-4xl font-extrabold text-ch-text mb-0.5">₦15,000</div>
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
              <Button className="w-full bg-ch-blue hover:bg-ch-blue-dark text-white shadow-blue-glow hover-lift">
                Get Report — ₦15,000
              </Button>
            </Link>
          </div>

          {/* Bundles — go to /search, bundle selected on preview page */}
          {bundles.map((bundle) => (
            <div key={bundle.label} className="border border-ch-border rounded-2xl p-6 bg-white">
              <p className="text-xs font-semibold uppercase tracking-wider text-ch-text-muted mb-1">
                {bundle.tag}
              </p>
              <div className="text-4xl font-extrabold text-ch-text mb-0.5">{bundle.price}</div>
              <p className="text-xs text-ch-text-muted mb-0.5">{bundle.perReport}</p>
              <p className="text-xs text-ch-green font-medium mb-5">{bundle.saving}</p>
              <ul className="space-y-2 mb-6">
                {bundle.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-ch-text-secondary">
                    <Check className="w-4 h-4 text-ch-green shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/search">
                <Button variant="outline" className="w-full border-ch-blue text-ch-blue hover:bg-ch-blue-light">
                  {bundle.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>

        {/* Payment methods */}
        <div className="text-center mb-12">
          <p className="text-sm text-ch-text-muted mb-4">Accepted payment methods via Paystack</p>
          <div className="flex justify-center gap-4 flex-wrap">
            {paymentMethods.map((m) => (
              <div key={m.label} className="flex items-center gap-2 bg-white border border-ch-border rounded-lg px-4 py-2">
                <span>{m.icon}</span>
                <span className="text-sm text-ch-text-secondary">{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* FAQs */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-ch-text text-center mb-6">Pricing FAQ</h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <div key={faq.q} className="bg-white border border-ch-border rounded-xl p-5">
                <p className="font-semibold text-ch-text mb-2">{faq.q}</p>
                <p className="text-sm text-ch-text-secondary">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
