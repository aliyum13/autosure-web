import Image from 'next/image';
import VinInput from '@/components/shared/VinInput';
import RecentlyViewed from '@/components/home/RecentlyViewed';
import { Landmark, Database, Timer, Lock, BadgeCheck } from 'lucide-react';

// The four facts a cold visitor needs before they will type a VIN. Set as one
// quiet row under the VIN bar so they support it rather than compete with it.
const provenance = [
  { Icon: Landmark, label: 'NMVTIS', detail: 'US federal title database' },
  { Icon: Database, label: 'Official records', detail: 'US titles, recalls, insurance claims' },
  { Icon: Timer, label: 'Straight after payment', detail: 'Emailed to you as a PDF' },
  { Icon: Lock, label: 'Paystack', detail: 'Card or bank transfer' },
];

export default function Hero() {
  return (
    // The one soft wash the design allows: a faint blue fade from the top.
    <section className="bg-gradient-to-b from-ch-primary-light/70 to-white px-4 pt-14 pb-20 sm:pt-20">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7">
          <p className="text-sm font-semibold text-ch-primary">
            US vehicle history for Nigerian buyers
          </p>
          <h1 className="mt-4 text-4xl sm:text-5xl text-ch-ink">
            Be sure
            <br />
            <span className="text-ch-primary">before you buy.</span>
          </h1>

          <p className="measure mt-6 text-lg text-ch-text-secondary">
            Salvaged, flooded, odometer rolled back — the history a seller will
            never mention. Enter the VIN of any American-imported car and read
            what the United States already recorded about it.
          </p>

          <div className="mt-8 max-w-xl">
            <VinInput size="large" />
          </div>

          <RecentlyViewed />

          <dl className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 max-w-xl">
            {provenance.map(({ Icon, label, detail }) => (
              <div key={label} className="flex items-start gap-3">
                <span className="mt-0.5 w-8 h-8 rounded-lg bg-ch-primary-light text-ch-primary flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" strokeWidth={2} aria-hidden />
                </span>
                <div>
                  <dt className="text-sm font-semibold text-ch-ink">{label}</dt>
                  <dd className="text-sm text-ch-text-muted">{detail}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>

        {/* Vehicle image. No photography exists yet, so the logo's car mark
            stands in; swap the <Image> src for a photo when there is one. */}
        <div className="lg:col-span-5 relative max-w-md w-full mx-auto">
          <div className="surface-card overflow-hidden">
            <Image
              src="/images/logo-512.png"
              alt=""
              width={512}
              height={512}
              priority
              className="w-full h-auto"
            />
          </div>
          {/* Decorative — makes no factual claim. */}
          <div className="absolute -bottom-5 left-4 sm:-left-6 surface-card flex items-center gap-3 px-4 py-3">
            <span className="w-9 h-9 rounded-full bg-ch-secondary-light text-ch-secondary flex items-center justify-center shrink-0">
              <BadgeCheck className="w-5 h-5" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold text-ch-ink leading-tight">Verified Vehicle</p>
              <p className="text-xs text-ch-text-muted">Real data. No guesswork.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
