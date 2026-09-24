import Image from 'next/image';
import Link from 'next/link';
import { TriangleAlert, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

// A real, working VIN — not ClearVin's sandbox-only test VINs used elsewhere
// (those fail against live credentials). Picking a different constant here
// rather than reusing VinInput's sampleVins deliberately: this section proves
// the product with a VIN guaranteed to resolve, independent of whatever those
// chips point at.
const SAMPLE_VIN = '5TDBKRFH7GS348731';
const SAMPLE_VEHICLE = '2016 Toyota Highlander';

// Three real points from the report: 10mi (Dec 2016) climbing normally to
// 94,212mi (Feb 2024), then reported as 11mi two months later — a drop that
// cannot happen on a real odometer. That last segment is drawn dashed and in
// the danger colour on purpose; the first is a plain rising line, because
// nothing about it is unusual on its own.
function OdometerChart() {
  const gridY = [41, 90, 139, 188];
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-ch-text-muted mb-3">
        Odometer history
      </p>
      <svg viewBox="0 0 460 220" className="w-full h-auto font-sans" role="img" aria-label="Odometer history: 10 miles in December 2016, rising to 94,212 miles in February 2024, then reported as 11 miles in April 2024">
        {gridY.map((y) => (
          <line key={y} x1="30" y1={y} x2="430" y2={y} className="stroke-ch-rule" strokeWidth="1" />
        ))}

        {/* Dec 2016 -> Feb 2024: a normal, rising history */}
        <line x1="50" y1="187" x2="230" y2="41" className="stroke-ch-primary" strokeWidth="2" />
        {/* Feb 2024 -> Apr 2024: the impossible drop */}
        <line x1="230" y1="41" x2="410" y2="187" className="stroke-ch-red" strokeWidth="2" strokeDasharray="6 5" />

        <circle cx="50" cy="187" r="4" className="fill-white stroke-ch-primary" strokeWidth="2" />
        <circle cx="230" cy="41" r="4" className="fill-white stroke-ch-primary" strokeWidth="2" />
        <circle cx="410" cy="187" r="4" className="fill-ch-red" />

        <text x="50" y="172" textAnchor="middle" className="fill-ch-text text-[13px] font-semibold tabular">10 mi</text>
        <text x="230" y="26" textAnchor="middle" className="fill-ch-text text-[13px] font-semibold tabular">94,212 mi</text>
        <text x="410" y="172" textAnchor="middle" className="fill-ch-red text-[13px] font-semibold tabular">11 mi</text>

        <text x="50" y="207" textAnchor="middle" className="fill-ch-text-muted text-[11px]">Dec 2016</text>
        <text x="230" y="207" textAnchor="middle" className="fill-ch-text-muted text-[11px]">Feb 2024</text>
        <text x="410" y="207" textAnchor="middle" className="fill-ch-text-muted text-[11px]">Apr 2024</text>
      </svg>
    </div>
  );
}

// The status chips across the top of the mock report. Every one is a finding
// from the real report for SAMPLE_VIN.
const statusChips = ['Salvage title', 'Not Actual mileage', 'Possible rollback', 'ClearVin rating: D'];

const findings = [
  'Salvage title — declared total loss after a front-end collision',
  'Odometer rollback flagged by NMVTIS',
  'Sold at salvage auction for $2,600 vs. ~$14,250 average clean retail value',
  'ClearVin rates it D (Bad)',
];

export default function SampleReportSection() {
  return (
    <section className="bg-white py-20 px-4">
      <div className="max-w-6xl mx-auto rounded-2xl bg-ch-primary-light/60 border border-ch-border p-6 sm:p-10 lg:p-12 grid lg:grid-cols-12 gap-10 items-center">
        {/* Report mock — everything in it is the real report for SAMPLE_VIN,
            drawn here; no external photos or images. */}
        <div className="lg:col-span-7 surface-card p-5 sm:p-8 min-w-0">
          <div className="flex items-center justify-between gap-3 pb-5 border-b border-ch-border">
            <div className="flex items-center gap-2">
              <Image src="/images/logo-180.png" alt="" width={28} height={28} className="rounded-md" />
              <span className="text-sm font-bold tracking-tight">
                <span className="text-ch-ink">Auto</span><span className="text-ch-primary">Sure</span>
              </span>
            </div>
            <code className="text-xs font-mono tabular text-ch-text-muted bg-ch-surface border border-ch-border px-2 py-1 rounded-md truncate">
              {SAMPLE_VIN}
            </code>
          </div>

          <h3 className="mt-5 text-xl text-ch-ink">{SAMPLE_VEHICLE}</h3>

          <ul className="mt-4 flex flex-wrap gap-2">
            {statusChips.map((chip) => (
              <li key={chip} className="inline-flex items-center gap-1.5 rounded-full bg-ch-red-light text-ch-red text-xs font-semibold px-2.5 py-1">
                <TriangleAlert className="w-3 h-3" strokeWidth={2.5} aria-hidden />
                {chip}
              </li>
            ))}
          </ul>

          <div className="mt-6">
            <OdometerChart />
          </div>
        </div>

        <div className="lg:col-span-5">
          <h2 className="text-3xl sm:text-4xl text-ch-ink">
            A clean-looking import. A salvage title underneath.
          </h2>
          <p className="mt-4 text-lg text-ch-text-secondary">
            Here&apos;s what AutoSure found on a real VIN — the kind of history a good detailing job won&apos;t show you.
          </p>

          <ul className="mt-6 space-y-3">
            {findings.map((finding) => (
              <li key={finding} className="flex items-start gap-3">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-ch-secondary text-white flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3" strokeWidth={3} aria-hidden />
                </span>
                <span className="text-ch-text">{finding}</span>
              </li>
            ))}
          </ul>

          <div className="mt-8">
            <Button asChild className="h-12 px-6 rounded-lg bg-ch-primary hover:bg-ch-primary-dark text-white text-base font-semibold transition-colors duration-200 ease-out">
              <Link href={`/preview/${SAMPLE_VIN}`}>Run this VIN yourself</Link>
            </Button>
            <p className="mt-2 text-xs text-ch-text-muted font-mono">{SAMPLE_VIN} — {SAMPLE_VEHICLE}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
