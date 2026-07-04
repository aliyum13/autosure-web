const testimonials = [
  {
    quote: "The Tokunbo I was about to buy had a salvage title and had been in two accidents in Texas. CarHaki saved me over ₦2 million. Every Nigerian buying from Benin should use this first.",
    name: 'Adebayo Okafor',
    role: 'Lagos, Nigeria',
    initials: 'AO',
  },
  {
    quote: "I now run a CarHaki check on every car I source from Cotonou. It's made my dealership more professional and my customers trust me. Zero complaints since I started.",
    name: 'Chukwuemeka Uba',
    role: 'Dealer, Abuja',
    initials: 'CU',
  },
  {
    quote: "Paid via Paystack, report came in under a minute. The odometer history showed the car had been clocked — saved me from buying a 200,000-mile car disguised as a 60,000-mile one.",
    name: 'Fatima Ibrahim',
    role: 'Kano, Nigeria',
    initials: 'FI',
  },
];

export default function Testimonials() {
  return (
    <section className="bg-slate-50 py-16 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-wider text-ch-blue mb-3">
            Trusted in Nigeria
          </p>
          <h2 className="text-3xl font-bold text-ch-text mb-4">What Our Users Say</h2>
          <div className="inline-flex items-center gap-2 bg-white border border-ch-border rounded-full px-4 py-2 shadow-soft">
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <span key={i} className="text-amber-400 text-sm">★</span>
              ))}
            </div>
            <span className="text-sm font-semibold text-ch-text">4.9</span>
            <span className="text-xs text-ch-text-muted">from early users</span>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div key={t.name} className="bg-white border border-ch-border rounded-2xl p-6 shadow-soft hover-lift">
              <div className="flex gap-0.5 mb-4">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-amber-400 text-sm">★</span>
                ))}
              </div>
              <p className="text-sm text-ch-text-secondary leading-relaxed mb-4">&ldquo;{t.quote}&rdquo;</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-ch-blue-light rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-ch-blue">{t.initials}</span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-ch-text">{t.name}</div>
                  <div className="text-xs text-ch-text-muted">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
