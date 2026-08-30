const stats = [
  { value: '$1.5B+', label: 'Lost to Tokunbo Fraud Yearly' },
  { value: '50M+', label: 'USA Vehicle Records' },
  { value: '30s', label: 'Average Report Time' },
  { value: '100%', label: 'Secured Payment' },
];

export default function StatsStrip() {
  return (
    <section className="bg-ch-primary py-10 px-4">
      <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
        {stats.map((stat) => (
          <div key={stat.label}>
            <div className="text-2xl sm:text-3xl font-extrabold text-white">{stat.value}</div>
            <div className="text-xs text-white/75 mt-1 leading-snug">{stat.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
