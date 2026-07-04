import Link from 'next/link';
import { Button } from '@/components/ui/button';

const steps = [
  {
    number: '01',
    emoji: '🔍',
    title: 'Enter the VIN',
    description: "Find the 17-character VIN on the car's dashboard (visible through the windshield), door sticker, or import documents.",
  },
  {
    number: '02',
    emoji: '🔒',
    title: 'Pay Securely',
    description: 'Pay ₦15,000 via card or bank transfer through Paystack. Money-back guarantee if no data is found for your VIN.',
  },
  {
    number: '03',
    emoji: '📋',
    title: 'Get Your Report',
    description: 'Full report instantly: accident history, title brands, odometer timeline, auction photos, and open recalls — sent to your email as PDF.',
  },
];

export default function HowItWorks() {
  return (
    <section className="bg-white py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-ch-blue mb-4">
            How It Works
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-ch-text">
            Get a Full Report in 3 Steps
          </h2>
        </div>

        <div className="relative grid sm:grid-cols-3 gap-8">
          {/* Connecting line (desktop only) */}
          <div className="hidden sm:block absolute top-10 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-slate-200" />

          {steps.map((step) => (
            <div key={step.number} className="relative text-center">
              {/* Step number circle */}
              <div className="relative inline-flex items-center justify-center w-20 h-20 bg-ch-blue rounded-2xl mb-5 shadow-blue-glow hover-lift">
                <span className="text-3xl">{step.emoji}</span>
                <span className="absolute -top-2 -right-2 w-6 h-6 bg-slate-900 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {step.number.replace('0', '')}
                </span>
              </div>
              <h3 className="font-bold text-ch-text mb-2 text-base">{step.title}</h3>
              <p className="text-sm text-ch-text-secondary leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link href="/search">
            <Button className="bg-ch-blue hover:bg-ch-blue-dark text-white px-10 h-12 text-base font-semibold shadow-blue-glow hover-lift">
              Check a Car Now →
            </Button>
          </Link>
          <p className="text-xs text-slate-400 mt-3">No account needed · Results in 30 seconds</p>
        </div>
      </div>
    </section>
  );
}
