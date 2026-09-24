import Link from 'next/link';
import { TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import VinInput from '@/components/shared/VinInput';

// A real, working VIN — not ClearVin's sandbox-only test VINs used elsewhere
// (those fail against live credentials). Picking a different constant here
// rather than reusing VinInput's sampleVins deliberately: this section proves
// the product with a VIN guaranteed to resolve, independent of whatever those
// chips point at.
const SAMPLE_VIN = '5TDBKRFH7GS348731';
const SAMPLE_VEHICLE = '2016 Toyota Highlander';

// Fixed illustrative gauge, not computed from live data — this section shows
// ClearVin's own rating from one specific real report, not a live widget.
// Coordinates are a hand-plotted semicircle (cx=100, cy=110, r=90) split into
// four 45° zones, good to bad; ClearVin's D sits in the red "bad" zone.
function RatingGauge() {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-ch-text-muted font-semibold mb-3">
        ClearVin Rating
      </p>
      <svg viewBox="0 0 200 130" className="w-full max-w-[220px] h-auto" role="img" aria-label="ClearVin Rating: D, Bad">
        <path d="M10,110 A90,90 0 0 1 36.4,46.4" fill="none" stroke="var(--color-ch-primary-dark)" strokeWidth="16" />
        <path d="M36.4,46.4 A90,90 0 0 1 100,20" fill="none" stroke="var(--color-ch-gold)" strokeWidth="16" />
        <path d="M100,20 A90,90 0 0 1 163.6,46.4" fill="none" stroke="var(--color-ch-amber)" strokeWidth="16" />
        <path d="M163.6,46.4 A90,90 0 0 1 190,110" fill="none" stroke="var(--color-ch-red)" strokeWidth="16" />
        {/* Needle, pointing into the red zone */}
        <line x1="100" y1="110" x2="160.6" y2="75" stroke="var(--color-ch-ink)" strokeWidth="3" strokeLinecap="round" />
        <circle cx="100" cy="110" r="6" fill="var(--color-ch-ink)" />
      </svg>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-display text-5xl text-ch-red leading-none">D</span>
        <span className="text-lg font-semibold text-ch-red">Bad</span>
      </div>
    </div>
  );
}

// Three real points from the report: 10mi (Dec 2016) climbing normally to
// 94,212mi (Feb 2024), then reported as 11mi two months later — a drop that
// cannot happen on a real odometer. That last segment is drawn dashed and red
// on purpose; the first is a plain rising line, because nothing about it is
// unusual on its own.
function OdometerChart() {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-ch-text-muted font-semibold mb-3">
        Odometer History
      </p>
      <svg viewBox="0 0 460 220" className="w-full h-auto font-sans" role="img" aria-label="Odometer history: 10 miles in December 2016, rising to 94,212 miles in February 2024, then reported as 11 miles in April 2024">
        <line x1="30" y1="188" x2="430" y2="188" className="stroke-ch-rule" strokeWidth="1" />

        {/* Dec 2016 -> Feb 2024: a normal, rising history */}
        <line x1="50" y1="187" x2="230" y2="41" className="stroke-ch-ink" strokeWidth="2" />
        {/* Feb 2024 -> Apr 2024: the impossible drop */}
        <line x1="230" y1="41" x2="410" y2="187" className="stroke-ch-red" strokeWidth="2" strokeDasharray="6 5" />

        <circle cx="50" cy="187" r="4" className="fill-ch-ink" />
        <circle cx="230" cy="41" r="4" className="fill-ch-ink" />
        <circle cx="410" cy="187" r="4" className="fill-ch-red" />

        <text x="50" y="172" textAnchor="middle" className="fill-ch-text text-[13px] font-semibold tabular">10 mi</text>
        <text x="230" y="26" textAnchor="middle" className="fill-ch-text text-[13px] font-semibold tabular">94,212 mi</text>
        <text x="410" y="172" textAnchor="middle" className="fill-ch-red text-[13px] font-semibold tabular">11 mi</text>

        <text x="50" y="207" textAnchor="middle" className="fill-ch-text-muted text-[11px]">Dec 2016</text>
        <text x="230" y="207" textAnchor="middle" className="fill-ch-text-muted text-[11px]">Feb 2024</text>
        <text x="410" y="207" textAnchor="middle" className="fill-ch-text-muted text-[11px]">Apr 2024</text>
      </svg>
      <div className="mt-2 inline-flex items-center gap-2 bg-ch-red-light px-3 py-1.5">
        <TriangleAlert className="w-3.5 h-3.5 text-ch-red shrink-0" strokeWidth={2} aria-hidden />
        <span className="text-xs font-semibold text-ch-red">Possible Odometer Rollback</span>
      </div>
    </div>
  );
}

const titleBrands = ['Salvage', 'Not Actual'];

function TitleBrandsTable() {
  return (
    <div className="border border-ch-border">
      <div className="px-4 py-2.5 bg-slate-50 rule-b">
        <p className="text-xs uppercase tracking-wide text-ch-text-muted font-semibold">Title Brands</p>
      </div>
      {titleBrands.map((brand, i) => (
        <div
          key={brand}
          className={`flex items-center gap-2.5 px-4 py-3${i < titleBrands.length - 1 ? ' rule-b' : ''}`}
        >
          <TriangleAlert className="w-4 h-4 text-ch-red shrink-0" strokeWidth={2} aria-hidden />
          <span className="text-sm font-semibold text-ch-text">{brand}</span>
        </div>
      ))}
    </div>
  );
}

const findings = [
  'Salvage title — declared total loss after a front-end collision',
  'Odometer rollback flagged by NMVTIS',
  'Sold at salvage auction for $2,600 vs. ~$14,250 average clean retail value',
];

export default function SampleReportSection() {
  return (
    <section className="bg-ch-paper py-20 sm:py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl sm:text-5xl text-ch-ink max-w-3xl">
          A clean-looking import. A salvage title underneath.
        </h2>
        <p className="measure mt-6 text-ch-text-secondary text-lg leading-relaxed">
          Here&apos;s what AutoSure found on a real VIN — the kind of history a good detailing job won&apos;t show you.
        </p>

        {/* Report mockup — everything below is generated from our own report
            data, no external photos or images. */}
        <div className="mt-12 bg-white border border-ch-border p-6 sm:p-10">
          <div className="flex flex-wrap items-baseline justify-between gap-3 pb-6 rule-b">
            <h3 className="text-xl sm:text-2xl text-ch-ink">{SAMPLE_VEHICLE}</h3>
            <code className="text-xs font-mono text-ch-text-muted bg-slate-100 px-2 py-1 rounded">{SAMPLE_VIN}</code>
          </div>

          <div className="grid lg:grid-cols-12 gap-10 pt-8">
            <div className="lg:col-span-4">
              <RatingGauge />
            </div>
            <div className="lg:col-span-8">
              <OdometerChart />
            </div>
          </div>

          <div className="mt-10 pt-8 rule-t max-w-sm">
            <TitleBrandsTable />
          </div>
        </div>

        {/* Findings — highlighted rows, not paragraphs */}
        <div className="mt-8 space-y-2">
          {findings.map((finding) => (
            <div key={finding} className="flex items-start gap-3 bg-ch-red-light px-4 py-3">
              <TriangleAlert className="w-4 h-4 text-ch-red shrink-0 translate-y-0.5" strokeWidth={2} aria-hidden />
              <p className="text-sm text-ch-text font-medium leading-relaxed">{finding}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 grid sm:grid-cols-12 gap-8 items-start">
          <div className="sm:col-span-5">
            <Link href={`/preview/${SAMPLE_VIN}`}>
              <Button className="w-full sm:w-auto bg-ch-primary-dark hover:bg-ch-ink text-white px-8 h-12 text-base font-semibold rounded-none">
                Run this VIN yourself
              </Button>
            </Link>
            <p className="mt-2 text-xs text-ch-text-muted font-mono">{SAMPLE_VIN} — {SAMPLE_VEHICLE}</p>
          </div>
          <div className="sm:col-span-7 sm:pl-8 sm:rule-l">
            <p className="text-sm font-semibold text-ch-ink mb-3">Check your own VIN</p>
            {/* showSamples=false: this section already makes its own case with
                a real VIN above, and VinInput's own sample chips are a
                separate, unrelated homepage surface — not touched here. */}
            <VinInput showSamples={false} className="max-w-md" />
          </div>
        </div>
      </div>
    </section>
  );
}
