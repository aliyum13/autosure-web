const faqs = [
  {
    category: 'About Reports',
    items: [
      {
        q: 'What is a CheckAm US Vehicle Report?',
        a: 'A CheckAm report pulls data from NMVTIS (National Motor Vehicle Title Information System), NHTSA (National Highway Traffic Safety Administration), US state DMV records, and US insurance databases to give you a comprehensive history of any USA-imported vehicle.',
      },
      {
        q: 'What does the report include?',
        a: 'Each report includes: title history (salvage, rebuilt, flood, junk), odometer records and rollback detection, accident and damage history, open NHTSA safety recalls, theft records, market valuation, an overall grade (A–F) with risk score, and an AI plain-English summary.',
      },
      {
        q: 'How accurate is the data?',
        a: 'Our data comes directly from official US government databases. However, not all accidents or incidents are reported to these databases. Always conduct a physical inspection in addition to checking the report.',
      },
    ],
  },
  {
    category: 'Searching & VINs',
    items: [
      {
        q: 'Where do I find the VIN?',
        a: "The VIN (Vehicle Identification Number) is a 17-character code found on: the driver's door sticker, the dashboard visible through the windscreen, the seller's import documents, or the vehicle registration papers.",
      },
      {
        q: 'What if my VIN is less than 17 characters?',
        a: 'USA VINs are always exactly 17 characters. If the number you have is shorter, it may be a chassis number from a Japanese vehicle, which CheckAm does not currently support. Please verify the VIN with the seller.',
      },
      {
        q: 'Can I check a locally registered Nigerian vehicle?',
        a: 'Currently CheckAm only supports USA-imported vehicles (Tokunbo cars). We are working on expanding to locally registered vehicles in a future update.',
      },
    ],
  },
  {
    category: 'Payments',
    items: [
      {
        q: 'How do I pay?',
        a: 'We accept card payments (Visa/Mastercard), bank transfer, USSD, and PayAttitude — all processed securely through Paystack.',
      },
      {
        q: 'What if no data is found for my VIN?',
        a: 'If CheckAm cannot retrieve any data for your VIN, we will issue a full refund. Email us at support@checkamvin.com within 24 hours of your purchase.',
      },
      {
        q: 'Is my payment secure?',
        a: 'Yes. All payments are processed by Paystack, a PCI-DSS compliant payment processor trusted by thousands of Nigerian businesses. CheckAm never stores your card details.',
      },
    ],
  },
  {
    category: 'Understanding Your Report',
    items: [
      {
        q: 'What does a salvage title mean?',
        a: "A salvage title means the vehicle was declared a total loss by a US insurance company — typically due to an accident, flood, or theft recovery. The car was subsequently repaired and exported. Salvage and rebuilt titles significantly reduce a vehicle's value and reliability.",
      },
      {
        q: 'What is an open safety recall?',
        a: "An open safety recall means the manufacturer has identified a safety defect in the vehicle and issued a recall notice, but the repair has not yet been performed. Open recalls should be fixed by an authorised dealer — they're usually free of charge.",
      },
      {
        q: "What does the A–F grade mean?",
        a: "The overall grade summarises the vehicle's history: A (Excellent, 90–100), B (Good, 75–89), C (Fair, 55–74), D (Poor, 35–54), F (High Risk, below 35). There is no E grade. The score is calculated from title brands, accidents, recalls, odometer issues and theft records.",
      },
    ],
  },
];

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-ch-paper">
      <div className="max-w-5xl mx-auto px-4 pt-14 sm:pt-20 pb-20">
        <h1 className="rule-draw inline-block text-4xl sm:text-6xl text-ch-ink">
          Questions.
        </h1>
        <p className="measure mt-12 text-lg text-ch-text-secondary leading-relaxed">
          What the report covers, where the data comes from, and what it cannot
          tell you.
        </p>

        {faqs.map((section) => (
          <section key={section.category} className="mt-16">
            <h2 className="text-2xl sm:text-3xl text-ch-ink">{section.category}</h2>
            <dl className="mt-6 rule-t">
              {section.items.map((item) => (
                <div key={item.q} className="grid sm:grid-cols-12 gap-2 sm:gap-8 py-6 rule-b">
                  <dt className="sm:col-span-5 font-display text-lg text-ch-ink">{item.q}</dt>
                  <dd className="sm:col-span-7 measure text-ch-text-secondary leading-relaxed">
                    {item.a}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}

        <section className="mt-16 bg-ch-ink text-white p-8 sm:p-10">
          <h2 className="text-2xl sm:text-3xl text-white">Still stuck?</h2>
          <p className="measure mt-3 text-white/70 leading-relaxed">
            Email us and a person will answer. We have no phone line yet.
          </p>
          {/* TODO(checkam-contact): a WhatsApp button sat here pointing at
              CarHaki's channel. Restore it when CheckAm has one of its own. */}
          <a
            href="mailto:support@checkamvin.com"
            className="inline-block mt-6 bg-white text-ch-ink hover:bg-white/90 text-sm font-semibold px-6 py-3 transition-colors"
          >
            support@checkamvin.com
          </a>
        </section>
      </div>
    </div>
  );
}
