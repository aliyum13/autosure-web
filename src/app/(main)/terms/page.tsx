import type { ReactNode } from 'react';
import ScrollToHash from './ScrollToHash';

// NMVTIS bullet list — kept as its own array so the disclaimer section below
// stays readable; content is verbatim from ClearVin's required disclosure,
// see terms section 11.
const nmvtisPoints = [
  'Information from participating state motor vehicle titling agencies.',
  "Information on automobiles, buses, trucks, motorcycles, recreational vehicles, motor homes, and tractors. NMVTIS may not currently include commercial vehicles if those vehicles are not included in a state's primary database for title records (in some states, those vehicles are managed by a separate state agency), although these records may be added at a later time.",
  'Information on "brands" applied to vehicles provided by participating state motor vehicle titling agencies. Brand types and definitions vary by state but may provide useful information about the condition or prior use of the vehicle.',
  "Most recent odometer reading in the state's title record.",
  'Information from insurance companies, and auto recyclers, including junk and salvage yards, that is required by law to be reported to the system, beginning March 31, 2009. This information will include if the vehicle was determined to be a "total loss" by an insurance carrier.',
  'Information from junk and salvage yards receiving a "cash for clunker" vehicle traded-in under the Consumer Assistance to Recycle and Save Act of 2009 (CARS) Program.',
];

const sections: { title: string; content: ReactNode }[] = [
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
    // Verbatim, per ClearVin's data-licensing requirement — do not summarise
    // or reword. Checkout links here as /terms#nmvtis-disclaimer; keep that id
    // on the heading below if this section is ever restructured.
    title: '11. NMVTIS and Data Source Disclaimers',
    content: (
      <>
        <p className="font-semibold text-ch-text text-sm mb-2">NMVTIS CONSUMER ACCESS PRODUCT DISCLAIMER</p>
        <p className="mb-3">
          The National Motor Vehicle Title Information System (NMVTIS) is an electronic system that contains information on certain automobiles titled in the United States. NMVTIS is intended to serve as a reliable source of title and brand history for automobiles, but it does not contain detailed information regarding a vehicle&apos;s repair history. All states, insurance companies, and junk and salvage yards are required by federal law to regularly report information to NMVTIS. However, NMVTIS does not contain information on all motor vehicles in the United States because some states are not yet providing their vehicle data to the system. Currently, the data provided to NMVTIS by states is provided in a variety of time frames; while some states report and update NMVTIS data in &quot;real-time&quot; (as title transactions occur), other states send updates less frequently, such as once every 24 hours or within a period of days. Information on previous, significant vehicle damage may not be included in the system if the vehicle was never determined by an insurance company (or other appropriate entity) to be a &quot;total loss&quot; or branded by a state titling agency. Conversely, an insurance carrier may be required to report a &quot;total loss&quot; even if the vehicle&apos;s titling-state has not determined the vehicle to be &quot;salvage&quot; or &quot;junk.&quot; A vehicle history report is NOT a substitute for an independent vehicle inspection. Before making a decision to purchase a vehicle, consumers are strongly encouraged to also obtain an independent vehicle inspection to ensure the vehicle does not have hidden damage. The Approved NMVTIS Data Providers (look for the NMVTIS logo) can include vehicle condition data from sources other than NMVTIS. NMVTIS data INCLUDES (as available by those entities required to report to the System):
        </p>
        <ul className="list-disc pl-5 space-y-2 mb-3">
          {nmvtisPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
        <p className="mb-4">
          Consumers are advised to visit{' '}
          <a href="https://www.vehiclehistory.gov" target="_blank" rel="noopener noreferrer" className="text-ch-primary hover:underline">
            www.vehiclehistory.gov
          </a>{' '}
          for details on how to interpret the information in the system and understand the meaning of various labels applied to vehicles by the participating state motor vehicle titling agencies.
        </p>
        <p className="font-semibold text-ch-text text-sm mb-2">NVS Data Disclaimer</p>
        <p>
          The ultimate source of the lien information available through ClearVin vehicle history reports is provided by the National Vehicle Service (NVS). Although every effort is made to ensure the accuracy of transmission and data, the reports are provided &apos;as is.&apos; Some lien holders and jurisdictions do not report to NVS. Records from NVS may be incomplete. ClearVin makes no warranty either expressed or implied as to the validity of the NVS data. Other than that, data provided is a true and correct reproduction of the NVS data.
        </p>
      </>
    ),
  },
  {
    title: '12. Contact',
    // TODO(checkam-legal): address removed — it was CarHaki's, carried
    // over by the rename. Restore with CheckAm's own registered address
    // once the entity is formalised. See the same TODO in privacy.
    content: 'For questions about these terms: checkamafrica@gmail.com',
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-ch-bg py-12 px-4">
      <ScrollToHash />
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-ch-text mb-2">Terms of Service</h1>
        <p className="text-ch-text-muted text-sm mb-8">Last updated: June 2026</p>

        <div className="bg-white border border-ch-border rounded-none p-6 sm:p-8 space-y-6">
          {sections.map((section) => (
            <div key={section.title} id={section.title.startsWith('11.') ? 'nmvtis-disclaimer' : undefined}>
              <h2 className="text-lg font-semibold text-ch-text mb-2 scroll-mt-20">{section.title}</h2>
              <div className="measure text-ch-text-secondary text-sm leading-relaxed">{section.content}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
