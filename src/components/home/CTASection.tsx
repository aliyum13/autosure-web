import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function CTASection() {
  return (
    <section className="bg-ch-primary-dark py-20 sm:py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="grid lg:grid-cols-12 gap-8 items-end">
          <div className="lg:col-span-7">
            <h2 className="text-4xl sm:text-6xl text-white">
              Be sure before
              <br />
              you pay.
            </h2>
            <p className="measure mt-6 text-white/90 text-lg leading-relaxed">
              One VIN, one report, ₦15,000. If America has no record of the car,
              you get your money back.
            </p>
          </div>
          <div className="lg:col-span-5 flex flex-col sm:flex-row lg:justify-end gap-3">
            <Link href="/search">
              <Button className="w-full sm:w-auto bg-white text-ch-ink hover:bg-white/90 font-semibold px-8 h-12 rounded-none">
                Check a car now
              </Button>
            </Link>
            <Link href="/pricing">
              <Button
                variant="outline"
                className="w-full sm:w-auto bg-transparent border-white/50 text-white hover:bg-white/10 hover:text-white px-8 h-12 rounded-none"
              >
                See pricing
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
