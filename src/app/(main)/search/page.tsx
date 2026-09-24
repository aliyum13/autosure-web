import VinInput from '@/components/shared/VinInput';
import { MapPin } from 'lucide-react';

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Same hero wash and VIN bar as the homepage, so the two entry points
          read as one product. */}
      <div className="bg-gradient-to-b from-ch-primary-light/70 to-white px-4 pt-16 pb-12 sm:pt-20">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-sm font-semibold text-ch-primary">USA vehicle records</p>
          <h1 className="mt-4 text-4xl sm:text-h1 text-ch-ink">
            Check your Tokunbo car&apos;s history
          </h1>
          <p className="mt-4 text-lg text-ch-text-secondary">
            Enter the 17-character VIN from the car&apos;s dashboard, door sticker, or import documents.
          </p>
          <div className="mt-8 text-left">
            <VinInput size="large" buttonText="Search" />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-20">
        <div className="surface-card p-5 flex items-start gap-3">
          <span className="w-9 h-9 rounded-lg bg-ch-primary-light text-ch-primary flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold text-ch-ink">Where to find the VIN</p>
            <p className="mt-1 text-sm text-ch-text-secondary">
              Look on the driver&apos;s door sticker, the dashboard (visible through the windscreen),
              or the seller&apos;s import documents. USA VINs are always 17 characters.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
