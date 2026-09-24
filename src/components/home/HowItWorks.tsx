import Link from 'next/link';
import { ScanLine, CreditCard, FileText, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

// The step numbers stay: this is a real sequence a first-time buyer has to
// follow in order, so the numbering carries information rather than decorating.
const steps = [
  {
    n: '1',
    Icon: ScanLine,
    title: 'Find the VIN',
    body: 'Seventeen characters, on the dashboard through the windscreen, the driver’s door sticker, or the import papers.',
  },
  {
    n: '2',
    Icon: CreditCard,
    title: 'Pay ₦15,000',
    body: 'Card or bank transfer through Paystack. If there is no US record for your VIN, email us within 24 hours for your money back.',
  },
  {
    n: '3',
    Icon: FileText,
    title: 'Read the report',
    body: 'Title brands, odometer timeline, accidents, auction photos and open recalls — on screen as soon as the check completes, and emailed to you as a PDF.',
  },
];

export default function HowItWorks() {
  return (
    <section className="bg-ch-surface py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl sm:text-4xl text-ch-ink max-w-2xl">
          Three steps, one price, no account needed.
        </h2>

        <ol className="mt-12 grid gap-6 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-stretch">
          {steps.map(({ n, Icon, title, body }, i) => (
            <li key={n} className="contents">
              <div className="surface-card p-6 sm:p-8">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-full bg-ch-primary text-white text-sm font-bold tabular flex items-center justify-center">
                    {n}
                  </span>
                  <span className="w-9 h-9 rounded-lg bg-ch-primary-light text-ch-primary flex items-center justify-center">
                    <Icon className="w-5 h-5" strokeWidth={2} aria-hidden />
                  </span>
                </div>
                <h3 className="mt-5 text-xl text-ch-ink">{title}</h3>
                <p className="mt-2 text-ch-text-secondary">{body}</p>
              </div>
              {i < steps.length - 1 && (
                <ArrowRight className="hidden lg:block self-center w-5 h-5 text-ch-text-muted" aria-hidden />
              )}
            </li>
          ))}
        </ol>

        <div className="mt-12">
          <Button asChild className="h-12 px-8 rounded-lg bg-ch-primary hover:bg-ch-primary-dark text-white text-base font-semibold transition-colors duration-200 ease-out">
            <Link href="/search">Check a car now</Link>
          </Button>
          <p className="mt-3 text-sm text-ch-text-muted">
            No account needed. The check starts the moment your payment clears.
          </p>
        </div>
      </div>
    </section>
  );
}
