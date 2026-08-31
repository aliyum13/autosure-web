import VinInput from '@/components/shared/VinInput';
import RecentlyViewed from '@/components/home/RecentlyViewed';
import { Landmark, Database, Timer, Lock } from 'lucide-react';

// Drawn icons at one stroke weight, not emoji. These are the four facts a cold
// visitor needs before they will type a VIN, so they sit in a ruled row rather
// than floating as pills.
const provenance = [
  { Icon: Landmark, label: 'NMVTIS', detail: 'US federal title database' },
  { Icon: Database, label: '50M+ records', detail: 'US titles, recalls, insurance' },
  { Icon: Timer, label: '~30 seconds', detail: 'Report delivered by email' },
  { Icon: Lock, label: 'Paystack', detail: 'Card or bank transfer' },
];

export default function Hero() {
  return (
    <section className="bg-ch-paper px-4 pt-14 pb-0 sm:pt-20">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          <div className="lg:col-span-7">
            <h1 className="rule-draw inline-block text-[2.75rem] leading-[1.02] sm:text-6xl lg:text-[4.25rem] text-ch-ink animate-fade-up">
              Check am
              <br />
              before you buy.
            </h1>

            <p className="measure mt-12 text-lg sm:text-xl text-ch-text-secondary leading-relaxed animate-fade-up-delay-1">
              Salvaged, flooded, odometer rolled back — the history a seller will
              never mention. Enter the VIN of any American-imported car and read
              what the United States already recorded about it.
            </p>

            <div className="mt-8 animate-fade-up-delay-2">
              <VinInput size="large" className="max-w-xl" />
            </div>

            <RecentlyViewed />
          </div>

          {/* The argument, as a ruled column: the records are American, and a
              Lagos seller cannot reach them. */}
          <aside className="lg:col-span-5 lg:pl-10 lg:rule-l animate-fade-up-delay-3">
            <p className="measure text-base text-ch-text-secondary leading-relaxed">
              A car written off in Texas carries that fact in a US government
              database. The seller in front of you cannot edit it, delete it, or
              talk his way around it — and until now, could safely assume you
              would never look.
            </p>
            <dl className="mt-8 rule-t">
              {provenance.map(({ Icon, label, detail }) => (
                <div key={label} className="flex items-baseline gap-4 py-3.5 rule-b">
                  <Icon className="w-4 h-4 text-ch-primary shrink-0 translate-y-0.5" strokeWidth={2} aria-hidden />
                  <dt className="text-sm font-semibold text-ch-ink w-32 shrink-0">{label}</dt>
                  <dd className="text-sm text-ch-text-muted">{detail}</dd>
                </div>
              ))}
            </dl>
          </aside>
        </div>
      </div>
    </section>
  );
}
