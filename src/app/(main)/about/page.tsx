import Link from 'next/link';
import { TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

const dataSources = [
  { name: 'NMVTIS', desc: 'National Motor Vehicle Title Information System — the federal title database' },
  { name: 'NHTSA', desc: 'National Highway Traffic Safety Administration — recall notices, per VIN' },
  { name: 'State DMV records', desc: 'US state title records' },
  { name: 'Insurance databases', desc: 'US insurance claims and total-loss records' },
];

const hidden = [
  'Salvage or rebuilt titles from US insurance write-offs',
  'Odometers rolled back by tens of thousands of miles',
  'Flood damage repaired and hidden under fresh paint',
  'Theft records and outstanding finance',
  'Open safety recalls never repaired before export',
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-4 pt-16 sm:pt-20 pb-20">
        <p className="text-sm font-semibold text-ch-primary">About AutoSure</p>
        <h1 className="mt-4 text-4xl sm:text-h1 text-ch-ink">Use AutoSure to be sure.</h1>
        <p className="measure mt-4 text-lg text-ch-text-secondary">
          Auto, as in the car. Sure, as in certain — not &ldquo;the seller
          swore,&rdquo; not &ldquo;e dey kampe,&rdquo; certain. Before you hand
          over the money, before you trust the mileage on the dash, before you
          believe the story about one careful owner in Houston, AutoSure puts the
          car&apos;s American record in front of you. Every vehicle you check is
          one you can be confident about.
        </p>

        <section className="mt-20 grid lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          <div className="lg:col-span-7">
            <h2 className="text-3xl sm:text-h2 text-ch-ink">
              The paperwork already exists. It is just on the wrong continent.
            </h2>
            <p className="measure mt-6 text-ch-text-secondary">
              Nigeria imports tens of thousands of used American vehicles a
              year, through Cotonou, Apapa and Tin Can Island. Every one of them
              left behind a paper trail in the United States: who titled it, what
              an insurer paid out on it, what the odometer read each time it
              changed hands.
            </p>
            <p className="measure mt-4 text-ch-text-secondary">
              That record is federal, it is dated, and the man selling you the car
              in Lagos cannot reach it, edit it, or delete it. Until now he could
              simply assume you would never look.
            </p>
          </div>

          <div className="lg:col-span-5 surface-card p-6">
            <h2 className="text-xl text-ch-ink">Where the data comes from</h2>
            <dl className="mt-4 divide-y divide-ch-border">
              {dataSources.map((s) => (
                <div key={s.name} className="py-4 last:pb-0">
                  <dt className="text-sm font-semibold text-ch-ink">{s.name}</dt>
                  <dd className="mt-1 text-sm text-ch-text-muted">{s.desc}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="mt-20">
          <h2 className="text-3xl sm:text-h2 text-ch-ink max-w-2xl">
            What a report turns up.
          </h2>
          <ul className="mt-8 surface-card divide-y divide-ch-border">
            {hidden.map((item) => (
              <li key={item} className="px-6 py-4 flex items-start gap-3 text-ch-text-secondary">
                <TriangleAlert className="w-5 h-5 text-ch-red shrink-0 mt-0.5" strokeWidth={2} aria-hidden />
                {item}
              </li>
            ))}
          </ul>
          <p className="measure mt-6 text-sm text-ch-text-muted">
            A report is not an inspection. Not every incident reaches a US
            database, so check the car physically as well — this tells you what
            the paperwork says, which is the half nobody else can show you.
          </p>
        </section>

        <section className="mt-20">
          <h2 className="text-3xl sm:text-h2 text-ch-ink">Nigeria first.</h2>
          <p className="measure mt-6 text-ch-text-secondary">
            AutoSure launched in Nigeria because it is one of Africa&apos;s largest
            markets for imported used cars, and one where buyers have had the least
            protection. The
            same databases cover every American car exported anywhere, so the same
            check works wherever those cars land next.
          </p>
        </section>

        <section className="mt-20 rounded-2xl bg-ch-primary text-white p-8 sm:p-12">
          <h2 className="text-3xl sm:text-h2 text-white">Ready to check your next Tokunbo?</h2>
          <p className="measure mt-3 text-white/85 text-lg">One VIN. ₦15,000. Checked against the US federal record.</p>
          <Button asChild className="mt-8 h-12 px-8 rounded-lg bg-white text-ch-primary hover:bg-ch-primary-light text-base font-semibold transition-colors duration-200 ease-out">
            <Link href="/search">Check a car now</Link>
          </Button>
        </section>
      </div>
    </div>
  );
}
