import { Gauge, CarFront, Droplets, TriangleAlert, ShieldAlert } from 'lucide-react';

// Five ways an imported car lies, each paired with the US record that catches
// it. "Auction records" is deliberately not one of them: ClearVin does not
// return auction data for every VIN, so it cannot be promised as a category.
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
    body: 'Insurance write-offs are repaired, repainted and shipped as clean.',
    record: 'NMVTIS title brands, reported by the issuing state',
  },
  {
    Icon: Droplets,
    title: 'Flood and fire damage',
    body: 'Flood cars are dried out and exported. The electrical faults arrive months later.',
    record: 'Damage brands filed by US insurers',
  },
  {
    Icon: TriangleAlert,
    title: 'Open safety recalls',
    body: 'Recalls issued in America are rarely repaired before a car leaves it.',
    record: 'NHTSA recall database, checked per VIN',
  },
  {
    Icon: ShieldAlert,
    title: 'Theft records',
    body: 'A car reported stolen in the US can still turn up on a Lagos lot.',
    record: 'Theft records in the vehicle history report',
  },
];

export default function RiskSection() {
  return (
    <section className="bg-ch-surface py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl sm:text-4xl text-ch-ink max-w-3xl">
          The seller knows. You don&apos;t. That is the whole business.
        </h2>
        <p className="measure mt-4 text-lg text-ch-text-secondary">
          Five things that happen to a car in America and are never mentioned in
          Nigeria — and the record that catches each one.
        </p>

        {/* One card, five columns split by hairlines. Two-up on tablet (the
            fifth spans the row), stacked on mobile. */}
        <ul className="mt-12 surface-card grid sm:grid-cols-2 lg:grid-cols-5 overflow-hidden">
          {risks.map(({ Icon, title, body, record }) => (
            <li
              key={title}
              className="p-6 border-ch-border max-sm:not-first:border-t sm:max-lg:nth-[n+3]:border-t sm:max-lg:even:border-l sm:max-lg:last:col-span-2 lg:not-first:border-l"
            >
              <span className="w-10 h-10 rounded-lg bg-ch-primary-light text-ch-primary flex items-center justify-center">
                <Icon className="w-5 h-5" strokeWidth={2} aria-hidden />
              </span>
              <h3 className="mt-4 text-base text-ch-ink">{title}</h3>
              <p className="mt-2 text-sm text-ch-text-secondary">{body}</p>
              <p className="mt-3 text-xs text-ch-text-muted">{record}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
