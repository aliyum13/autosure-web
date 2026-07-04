import VinInput from '@/components/shared/VinInput';
import RecentlyViewed from '@/components/home/RecentlyViewed';
import Link from 'next/link';

const trustPills = [
  { icon: '🛡️', text: 'NMVTIS Official Database' },
  { icon: '✓', text: '50M+ USA Records' },
  { icon: '⚡', text: 'Report in 30 Seconds' },
  { icon: '🔒', text: 'Secured by Paystack' },
];

export default function Hero() {
  return (
    <section className="relative bg-white overflow-hidden py-16 sm:py-24 px-4">
      {/* Background gradient blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-blue-50 rounded-full blur-3xl opacity-60" />
        <div className="absolute -bottom-32 -left-32 w-[400px] h-[400px] bg-blue-50 rounded-full blur-3xl opacity-40" />
      </div>

      <div className="relative max-w-3xl mx-auto text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-4 py-1.5 mb-8 animate-fade-up">
          <span className="w-2 h-2 bg-ch-blue rounded-full animate-pulse" />
          <span className="text-xs font-semibold text-ch-blue tracking-wider uppercase">
            Powered by USA Government Records
          </span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-ch-text leading-tight mb-6 animate-fade-up-delay-1">
          Avoid Salvaged, Flooded &{' '}
          <span className="relative">
            <span className="text-ch-blue">Tampered</span>
            <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 200 8" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 6 Q50 0 100 6 Q150 12 200 6" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.3"/>
            </svg>
          </span>{' '}
          Tokunbo Cars.
        </h1>

        <p className="text-lg text-ch-text-secondary max-w-xl mx-auto mb-10 leading-relaxed animate-fade-up-delay-2">
          Enter any USA VIN and get the full vehicle history in seconds —
          accident records, title brands, mileage, and open safety recalls.
        </p>

        <div className="animate-fade-up-delay-3">
          <VinInput size="large" className="max-w-2xl mx-auto" />
        </div>

        <RecentlyViewed />

        <div className="flex flex-wrap justify-center gap-3 mt-8">
          {trustPills.map((pill) => (
            <div
              key={pill.text}
              className="flex items-center gap-1.5 bg-white border border-slate-200 shadow-soft rounded-full px-4 py-2 hover-lift"
            >
              <span className="text-sm">{pill.icon}</span>
              <span className="text-xs font-medium text-slate-600">{pill.text}</span>
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-400 mt-6">
          Not sure where to find the VIN?{' '}
          <Link href="/faq#vin" className="text-ch-blue hover:underline">
            See how →
          </Link>
        </p>
      </div>
    </section>
  );
}
