import Link from 'next/link';

const dataSources = [
  { code: 'US', name: 'NMVTIS', desc: 'National Motor Vehicle Title Information System' },
  { code: 'US', name: 'NHTSA', desc: 'National Highway Traffic Safety Administration' },
  { code: 'US', name: 'State DMV Records', desc: 'All 50 US states title and registration data' },
  { code: 'US', name: 'Insurance Databases', desc: 'US insurance claims and total loss records' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-ch-bg">
      {/* Hero */}
      <div className="bg-ch-charcoal text-white py-16 px-4 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold mb-4">
          Why &ldquo;CheckAm&rdquo;?
        </h1>
        <p className="text-slate-300 max-w-xl mx-auto text-lg leading-relaxed">
          &ldquo;Haki&rdquo; is a Swahili word that means truth, right, and genuineness.
          It carries weight across Africa.
        </p>
        <p className="text-slate-400 max-w-xl mx-auto mt-3">
          <strong className="text-white">CheckAm</strong> means the genuine truth about your car.
          It is that simple.
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12 space-y-12">

        {/* Mission */}
        <div className="bg-ch-red-light border border-red-200 rounded-2xl p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-ch-red mb-3">Our Mission</p>
          <p className="text-lg text-ch-text leading-relaxed">
            CheckAm was built with one mission: to protect Nigerian Tokunbo buyers from purchasing
            vehicles with hidden histories, tampered odometers, salvage titles, and undisclosed damage.
          </p>
        </div>

        {/* Vision */}
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ch-primary mb-2">Our Vision</p>
            <h2 className="text-2xl font-bold text-ch-text mb-3">Nigeria first, Africa next</h2>
            <p className="text-ch-text-secondary text-sm leading-relaxed mb-3">
              CheckAm launched in Nigeria because Nigeria is the largest Tokunbo vehicle market
              in Africa and buyers have historically had the least protection. But the problem
              exists across the continent.
            </p>
            <p className="text-ch-text-secondary text-sm leading-relaxed">
              Our roadmap includes expansion to Ghana, Kenya, and Tanzania — the same databases,
              the same grading system, the same commitment to putting buyers first.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ch-primary mb-2">Data Sources</p>
            <h2 className="text-2xl font-bold text-ch-text mb-3">Official US government databases</h2>
            <div className="space-y-3">
              {dataSources.map((source) => (
                <div key={source.name} className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-ch-primary rounded-lg flex items-center justify-center shrink-0">
                    <span className="text-white text-xs font-bold">{source.code}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ch-text">{source.name}</p>
                    <p className="text-xs text-ch-text-muted">{source.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Problem */}
        <div className="bg-white border border-ch-border rounded-2xl p-6 sm:p-8">
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ch-primary mb-2">
                The Problem in Nigeria
              </p>
              <h3 className="text-xl font-bold text-ch-text mb-3">
                Thousands of Tokunbo buyers get deceived every year
              </h3>
              <p className="text-sm text-ch-text-secondary leading-relaxed">
                Nigeria imports hundreds of thousands of used vehicles from the United States
                every year — Tokunbo cars that pass through Cotonou, Apapa, and Tin Can Island
                ports. Before CheckAm, there was no reliable way for a Nigerian buyer to check
                a car&apos;s history before purchase.
              </p>
            </div>
            <div className="bg-ch-red-light rounded-xl p-5">
              <p className="text-sm font-semibold text-ch-text mb-3">Common hidden problems we uncover</p>
              <ul className="space-y-2">
                {[
                  'Salvage or rebuilt titles from US insurance write-offs',
                  'Odometers rolled back by tens of thousands of miles',
                  'Flood damage repaired and hidden under fresh paint',
                  'Theft records and outstanding finance',
                  'Open safety recalls never repaired before export',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-ch-text-secondary">
                    <span className="text-ch-red shrink-0">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-ch-charcoal rounded-2xl p-8 text-center text-white">
          <h3 className="text-2xl font-bold mb-3">Ready to check your next Tokunbo?</h3>
          <p className="text-slate-400 mb-6">One report. Full truth. ₦15,000.</p>
          <Link
            href="/search"
            className="inline-block bg-ch-primary hover:bg-ch-primary-dark text-white font-semibold px-8 py-3 rounded-lg transition-colors"
          >
            Check a Car Now
          </Link>
        </div>
      </div>
    </div>
  );
}
