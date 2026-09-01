import Link from 'next/link';
import { Button } from '@/components/ui/button';

// The step numbers stay: this is a real sequence a first-time buyer has to
// follow in order, so the numbering carries information rather than decorating.
const steps = [
  {
    n: '1',
    title: 'Find the VIN',
    body: 'Seventeen characters, on the dashboard through the windscreen, the driver’s door sticker, or the import papers.',
  },
  {
    n: '2',
    title: 'Pay ₦15,000',
    body: 'Card or bank transfer through Paystack. If there is no US record for your VIN, you get your money back.',
  },
  {
    n: '3',
    title: 'Read the report',
    body: 'Title brands, odometer timeline, accidents, auction photos and open recalls — on screen as soon as the check completes, and emailed to you as a PDF.',
  },
];

export default function HowItWorks() {
  return (
    <section className="bg-ch-paper py-20 sm:py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl sm:text-5xl text-ch-ink max-w-2xl">
          Three steps, one price, no account needed.
        </h2>

        <ol className="mt-14 grid sm:grid-cols-3 gap-px bg-ch-rule rule-y">
          {steps.map((step) => (
            <li key={step.n} className="bg-ch-paper p-6 sm:p-8">
              <span className="block text-5xl text-ch-primary tabular font-display leading-none">
                {step.n}
              </span>
              <h3 className="mt-5 text-xl text-ch-ink">{step.title}</h3>
              <p className="mt-3 text-ch-text-secondary leading-relaxed">{step.body}</p>
            </li>
          ))}
        </ol>

        <div className="mt-12">
          <Link href="/search">
            <Button className="bg-ch-primary-dark hover:bg-ch-ink text-white px-10 h-12 text-base font-semibold rounded-none">
              Check a car now
            </Button>
          </Link>
          <p className="mt-3 text-sm text-ch-text-muted">
            No account needed. The check starts the moment your payment clears.
          </p>
        </div>
      </div>
    </section>
  );
}
