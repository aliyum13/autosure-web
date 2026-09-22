export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-ch-bg py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-ch-text mb-2">Privacy Policy</h1>
        <p className="text-ch-text-muted text-sm mb-8">Last updated: June 2026</p>

        <div className="bg-white border border-ch-border rounded-none p-6 sm:p-8 space-y-6">
          {[
            {
              title: '1. Information We Collect',
              content: 'We collect: account information (name, email, phone number), VINs you search, payment transaction records (via Paystack — we do not store card details), and usage data (pages visited, report history).',
            },
            {
              title: '2. How We Use Your Information',
              content: 'We use your information to: provide vehicle history reports, process payments, send report notifications via email, improve our service, and comply with legal obligations.',
            },
            {
              title: '3. Data Sharing',
              content: 'We share data with: Paystack (payment processing), ClearVin/NMVTIS (vehicle data retrieval), SendGrid (email delivery), and Anthropic (AI report summaries). We do not sell your personal data to third parties.',
            },
            {
              title: '4. Data Security',
              content: 'We use industry-standard encryption (TLS/HTTPS) for all data transmission. Passwords are hashed and never stored in plain text. JWT authentication tokens are stored in secure httpOnly cookies.',
            },
            {
              title: '5. Data Retention',
              content: 'Account data is retained for the duration of your account. Report data is retained for 12 months. Payment records are retained for 6 years as required by Nigerian tax law (FIRS guidelines).',
            },
            {
              title: '6. Your Rights (NDPA 2023)',
              content: 'Under the Nigeria Data Protection Act 2023, you have the right to: access your personal data, correct inaccurate data, request deletion of your data, and withdraw consent. Contact us at support@checkamvin.com to exercise these rights.',
            },
            {
              title: '7. Cookies',
              content: 'We use httpOnly cookies for authentication (JWT tokens). We do not use tracking or advertising cookies. You can clear cookies at any time through your browser settings.',
            },
            {
              // TODO(checkam-legal): no registered address here yet, and that
              // is a known compliance gap rather than an oversight. Nigeria's
              // NDPA generally expects a data controller to publish a physical
              // address alongside its contact details. The address that used to
              // sit here arrived with the CarHaki rename and was that business's,
              // so it has been removed rather than misattributed. Put CheckAm's
              // own registered address back once the entity is formalised.
              title: '8. Contact',
              content: 'Data Controller: CheckAm | support@checkamvin.com',
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
