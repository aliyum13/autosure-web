import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function CTASection() {
  return (
    <section className="bg-ch-primary py-16 sm:py-20 px-4">
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-8 text-center lg:text-left">
        {/* The logo carries its own white ground, so it sits on a white tile. */}
        <div className="w-20 h-20 rounded-2xl bg-white p-2 shrink-0">
          <Image src="/images/logo-180.png" alt="" width={180} height={180} className="w-full h-full" />
        </div>
        <div className="flex-1">
          <h2 className="text-3xl sm:text-4xl text-white">
            Be sure before
            <br />
            you pay.
          </h2>
          <p className="mt-3 text-lg text-white/85">
            One VIN, one report, ₦15,000. If America has no record of the car,
            email us within 24 hours and you get your money back.
          </p>
        </div>
        <Button asChild className="shrink-0 h-12 px-8 rounded-lg bg-white text-ch-primary hover:bg-ch-primary-light text-base font-semibold transition-colors duration-200 ease-out">
          <Link href="/search">Check a car now</Link>
        </Button>
      </div>
    </section>
  );
}
