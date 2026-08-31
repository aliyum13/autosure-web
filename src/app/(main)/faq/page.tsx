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
        a: 'If CheckAm cannot retrieve any data for your VIN, we will issue a full refund. Email us at checkamafrica@gmail.com within 24 hours of your purchase.',
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
        a: "The overall grade summarises the vehicle's history: A (Excellent, 90–100), B (Good, 75–89), C (Acceptable, 60–74), D (Concerning, 45–59), E (Poor, 20–44), F (Critical Risk, 0–19). The grade is calculated from title brands, accidents, recalls, odometer issues, and theft records.",
      },
    ],
  },
];

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-ch-bg py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-ch-text mb-3">
            Frequently Asked Questions
          </h1>
          <p className="text-ch-text-secondary">
            Everything you need to know about CheckAm reports.
          </p>
        </div>

        <div className="space-y-8">
          {faqs.map((section) => (
            <div key={section.category}>
              <h2 className="font-display text-2xl text-ch-ink mb-4">
                {section.category}
              </h2>
              <div className="space-y-3">
                {section.items.map((item) => (
                  <div key={item.q} className="bg-white border border-ch-border rounded-none p-5">
                    <p className="font-semibold text-ch-text mb-2">{item.q}</p>
                    <p className="measure text-sm text-ch-text-secondary leading-relaxed">{item.a}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 bg-ch-charcoal rounded-none p-6 text-center text-white">
          <p className="font-semibold mb-2">Still have questions?</p>
          <p className="text-slate-400 text-sm mb-4">
            Email us and we will come back to you.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="mailto:checkamafrica@gmail.com"
              className="inline-block bg-ch-primary-dark hover:bg-ch-ink text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors"
            >
              Email us — checkamafrica@gmail.com
            </a>
            {/* TODO(checkam-contact): a "Join WhatsApp Channel" button sat here,
                pointing at CarHaki's channel. Restore it when CheckAm has one. */}
          </div>
        </div>
      </div>
    </div>
  );
}
