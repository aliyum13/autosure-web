const risks = [
  {
    icon: '🔄',
    color: 'bg-orange-50 border-orange-100',
    iconBg: 'bg-orange-100',
    title: 'Mileage Rollback Fraud',
    description: 'Odometers are wound back before export from the USA. A car showing 60,000 miles may have done 200,000. CarHaki shows the real mileage timeline from official US DMV records.',
  },
  {
    icon: '🚗',
    color: 'bg-red-50 border-red-100',
    iconBg: 'bg-red-100',
    title: 'Salvage & Rebuilt Titles',
    description: 'Insurance write-offs are repaired, repainted, and shipped to Nigeria. A salvage title means the car was declared a total loss — a fact sellers rarely disclose.',
  },
  {
    icon: '💧',
    color: 'bg-blue-50 border-blue-100',
    iconBg: 'bg-blue-100',
    title: 'Flood & Fire Damage',
    description: 'Flood-damaged cars are dried out and exported. Electrical failures and rust appear months later. Reports reveal flood damage brands from US insurance companies.',
  },
  {
    icon: '⚠️',
    color: 'bg-yellow-50 border-yellow-100',
    iconBg: 'bg-yellow-100',
    title: 'Open Safety Recalls',
    description: 'Millions of Tokunbo cars have open NHTSA safety recalls never repaired before export. CarHaki checks every VIN against the national recall database.',
  },
];

export default function RiskSection() {
  return (
    <section className="bg-slate-950 py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-ch-blue mb-4">
            Why It Matters
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            The Risks Every Nigerian Tokunbo Buyer Faces
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Dealers know the full history. Buyers know nothing. CarHaki closes that gap.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          {risks.map((risk) => (
            <div
              key={risk.title}
              className={`border rounded-2xl p-6 ${risk.color} hover-lift`}
            >
              <div className={`w-12 h-12 ${risk.iconBg} rounded-xl flex items-center justify-center text-2xl mb-4`}>
                {risk.icon}
              </div>
              <h3 className="font-bold text-slate-900 mb-2 text-base">{risk.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{risk.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
