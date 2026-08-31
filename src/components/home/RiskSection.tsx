import { Gauge, CarFront, Droplets, TriangleAlert } from 'lucide-react';

// Four ways an imported car lies, each paired with the US record that catches
// it. Set as a numbered editorial list rather than a grid of equal cards: these
// are not four features, they are four claims with evidence behind them.
const risks = [
  {
    Icon: Gauge,
    title: 'Mileage rollback',
    body: 'Odometers are wound back before export. A car showing 60,000 miles may have done 200,000.',
    record: 'US DMV odometer readings, dated at each title transfer',
  },
  {
    Icon: CarFront,
    title: 'Salvage and rebuilt titles',
    body: 'Insurance write-offs are repaired, repainted and shipped. A salvage title means the car was declared a total loss.',
    record: 'NMVTIS title brands, reported by the state that issued them',
  },
  {
    Icon: Droplets,
    title: 'Flood and fire damage',
    body: 'Flood cars are dried out and exported. The electrical faults and rust arrive months later.',
    record: 'Damage brands filed by US insurers',
  },
  {
    Icon: TriangleAlert,
    title: 'Open safety recalls',
    body: 'Recalls issued in America are rarely repaired before a car leaves it, and never mentioned after.',
    record: 'NHTSA recall database, checked per VIN',
  },
];

export default function RiskSection() {
  return (
    <section className="bg-ch-ink text-white py-20 sm:py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl sm:text-5xl text-white max-w-3xl">
          The seller knows. You don&apos;t. That is the whole business.
        </h2>
        <p className="measure mt-6 text-white/60 text-lg leading-relaxed">
          Four things that happen to a car in America and are never mentioned in
          Nigeria — and the record that catches each one.
        </p>

        <ol className="mt-14 border-t border-white/15">
          {risks.map(({ Icon, title, body, record }) => (
            <li
              key={title}
              className="grid sm:grid-cols-12 gap-4 sm:gap-8 py-8 border-b border-white/15"
            >
              <div className="sm:col-span-5 flex items-start gap-3">
                <Icon className="w-5 h-5 text-ch-primary shrink-0 translate-y-1" strokeWidth={2} aria-hidden />
                <h3 className="text-xl sm:text-2xl text-white">{title}</h3>
              </div>
              <p className="sm:col-span-4 text-white/70 leading-relaxed">{body}</p>
              <p className="sm:col-span-3 text-sm text-ch-primary leading-relaxed">{record}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
