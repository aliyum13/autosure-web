import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function CTASection() {
  return (
    <section className="relative bg-ch-charcoal py-20 px-4 overflow-hidden">
      {/* gradient accent */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-ch-primary/20 rounded-full blur-3xl" />
      </div>
      <div className="relative max-w-2xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
          Check am before you pay.
        </h2>
        <p className="text-slate-400 mb-8 text-lg">One report. Full truth. ₦15,000.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/search">
            <Button className="bg-white text-ch-charcoal hover:bg-slate-100 font-semibold px-8 h-12 hover-lift">
              Check a Car Now
            </Button>
          </Link>
          <Link href="/pricing">
            <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800 px-8 h-12">
              See Pricing
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
