import Link from 'next/link';

const dataSources = [
  { name: 'NMVTIS', desc: 'National Motor Vehicle Title Information System — the federal title database' },
  { name: 'NHTSA', desc: 'National Highway Traffic Safety Administration — recall notices, per VIN' },
  { name: 'State DMV records', desc: 'Title and registration data from all fifty US states' },
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
    <div className="min-h-screen bg-ch-paper">
      <div className="max-w-5xl mx-auto px-4 pt-14 sm:pt-20 pb-20">
        <h1 className="rule-draw inline-block text-4xl sm:text-6xl text-ch-ink">
          Check am.
        </h1>
        <p className="measure mt-12 text-lg text-ch-text-secondary leading-relaxed">
          It is Nigerian Pidgin, and it means exactly what it sounds like: check
          it. Before you hand over the money, before you trust the mileage on the
          dash, before you believe the story about one careful owner in Houston —
          check am.
        </p>

        <section className="mt-16 grid lg:grid-cols-12 gap-10 lg:gap-12">
          <div className="lg:col-span-7">
            <h2 className="text-2xl sm:text-4xl text-ch-ink">
              The paperwork already exists. It is just on the wrong continent.
            </h2>
            <p className="measure mt-6 text-ch-text-secondary leading-relaxed">
              Nigeria imports hundreds of thousands of used American vehicles a
              year, through Cotonou, Apapa and Tin Can Island. Every one of them
              left behind a paper trail in the United States: who titled it, what
              an insurer paid out on it, what the odometer read each time it
              changed hands.
            </p>
            <p className="measure mt-4 text-ch-text-secondary leading-relaxed">
              That record is federal, it is dated, and the man selling you the car
              in Lagos cannot reach it, edit it, or delete it. Until now he could
              simply assume you would never look.
            </p>
          </div>

          <div className="lg:col-span-5 lg:pl-10 lg:rule-l">
            <h2 className="text-xl text-ch-ink">Where the data comes from</h2>
            <dl className="mt-6 rule-t">
              {dataSources.map((s) => (
                <div key={s.name} className="py-4 rule-b">
                  <dt className="text-sm font-semibold text-ch-ink">{s.name}</dt>
                  <dd className="mt-1 text-sm text-ch-text-muted leading-relaxed">{s.desc}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="mt-16">
          <h2 className="text-2xl sm:text-4xl text-ch-ink max-w-2xl">
            What a report turns up.
          </h2>
          <ul className="mt-6 rule-t">
            {hidden.map((item) => (
              <li key={item} className="py-4 rule-b text-ch-text-secondary">
                {item}
              </li>
            ))}
          </ul>
          <p className="measure mt-6 text-sm text-ch-text-muted leading-relaxed">
            A report is not an inspection. Not every incident reaches a US
            database, so check the car physically as well — this tells you what
            the paperwork says, which is the half nobody else can show you.
          </p>
        </section>

        <section className="mt-16">
          <h2 className="text-2xl sm:text-4xl text-ch-ink">Nigeria first.</h2>
          <p className="measure mt-6 text-ch-text-secondary leading-relaxed">
            CheckAm launched in Nigeria because it is the largest Tokunbo market in
            Africa and the one where buyers have had the least protection. The
            same databases cover every American car exported anywhere, so the same
            check works wherever those cars land next.
          </p>
        </section>

        <section className="mt-16 bg-ch-ink text-white p-8 sm:p-12">
          <h2 className="text-3xl sm:text-4xl text-white">Ready to check your next Tokunbo?</h2>
          <p className="measure mt-3 text-white/70 text-lg">One VIN. ₦15,000. About thirty seconds.</p>
          <Link
            href="/search"
            className="inline-block mt-8 bg-white text-ch-ink hover:bg-white/90 font-semibold px-8 py-3.5 transition-colors"
          >
            Check a car now
          </Link>
        </section>
      </div>
    </div>
  );
}
