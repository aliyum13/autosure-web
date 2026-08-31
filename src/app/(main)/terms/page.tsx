export default function TermsPage() {
  return (
    <div className="min-h-screen bg-ch-bg py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-ch-text mb-2">Terms of Service</h1>
        <p className="text-ch-text-muted text-sm mb-8">Last updated: June 2026</p>

        <div className="bg-white border border-ch-border rounded-none p-6 sm:p-8 space-y-6">
          {[
            {
              title: '1. Acceptance of Terms',
              content: 'By accessing or using CheckAm ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, you may not use the Service.',
            },
            {
              title: '2. Services Provided',
              content: 'CheckAm provides US Vehicle History Reports for vehicles imported to Nigeria from the United States. Reports are sourced from NMVTIS, NHTSA, US state DMV records, and US insurance databases.',
            },
            {
              title: '3. Payment & Refunds',
              content: 'All payments are processed via Paystack in Nigerian Naira (NGN). Reports are priced at ₦15,000 per report. Bundle pricing: 3-report bundle ₦35,000, 5-report bundle ₦50,000. If no data is found for your VIN, you are entitled to a full refund — contact us within 24 hours of purchase.',
            },
            {
              title: '4. Data Accuracy',
              content: 'CheckAm provides data in good faith from official US government sources. However, we cannot guarantee that all incidents are recorded in these databases. A clean report does not guarantee a clean vehicle. Always conduct a physical inspection.',
            },
            {
              title: '5. User Accounts',
              content: 'You are responsible for maintaining the security of your account credentials. You must be at least 18 years old to create an account. One account per person.',
            },
            {
              title: '6. Prohibited Use',
              content: 'You may not use CheckAm to: resell, sublicense, redistribute, or share report data with third parties, attempt to circumvent our payment system, use automated tools to scrape our data, modify or alter report content, or use the service for any unlawful purpose.',
            },
            {
              title: '7. Permitted Use & Data Source',
              content: 'Vehicle history reports are generated using data licensed from ClearVin and are provided strictly for your personal, internal use in evaluating a specific vehicle purchase. Reports may not be resold, redistributed, published, or used for any commercial purpose. All vehicle history data, branding, and report formatting are the property of ClearVin LLC and are protected by applicable intellectual property and copyright laws. CheckAm displays this data unmodified as licensed from ClearVin.',
            },
            {
              title: '8. Liability Waiver',
              content: 'By purchasing and using a CheckAm report, you acknowledge and agree that CheckAm and its data providers (including ClearVin) are not liable for any loss, damage, or claim arising from your reliance on report data, including but not limited to incomplete records, data not yet reported to NMVTIS, or purchasing decisions made using the report. You agree to conduct an independent vehicle inspection before completing any purchase.',
            },
            {
              title: '9. Limitation of Liability',
              content: 'CheckAm is not liable for any purchasing decisions made based on our reports. We provide information as a tool to assist buyers — the final decision remains with the buyer.',
            },
            {
              title: '10. Governing Law',
              content: 'These terms are governed by the laws of the Federal Republic of Nigeria. Disputes shall be resolved in Nigerian courts.',
            },
            {
              title: '11. Contact',
              // TODO(checkam-legal): address removed — it was CarHaki's, carried
              // over by the rename. Restore with CheckAm's own registered address
              // once the entity is formalised. See the same TODO in privacy.
              content: 'For questions about these terms: checkamafrica@gmail.com',
            },
          ].map((section) => (
            <div key={section.title}>
              <h2 className="text-lg font-semibold text-ch-text mb-2">{section.title}</h2>
              <p className="measure text-ch-text-secondary text-sm leading-relaxed">{section.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
