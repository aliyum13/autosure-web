'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Copy, Share2, Printer, ArrowLeft, X, ChevronLeft, ChevronRight, Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Cookies from 'js-cookie';

interface Report {
  id: string;
  vin: string;
  status: string;
  overall_grade: string;
  risk_score: number;
  grade_label: string;
  processed_data: {
    clearvin_html?: string;
    clearvin_report_id?: string;
    data_source?: string;
    vehicle?: Record<string, unknown>;
    recalls?: unknown[];
    accidents?: unknown[];
    theft?: unknown[];
    odometer_records?: unknown[];
  } | null;
  created_at: string;
  has_pdf?: boolean;
}

// Renders the stored PDF (reports.pdf_data, served by /api/reports/[id]/pdf).
//
// The embed URL is deliberately BARE. That route now returns
// `Content-Disposition: inline` by default and `attachment` only for
// ?download=1, so the <object> can actually render.
//
// Historical note worth keeping: the route hardcoded `attachment` from its
// first commit, which made inline rendering impossible regardless of markup.
// The resulting blank box was misread as an iOS Safari quirk, and the
// always-visible "Open Report PDF" button below was built to work around it.
// The button is retained for now — it is still genuinely useful on browsers
// with no PDF viewer — but its original justification was wrong, and it is a
// candidate for removal once inline rendering is confirmed on a real device.
function ReportPdfView({ id, vin }: { id: string; vin: string }) {
  const pdfUrl = `/api/reports/${id}/pdf`;          // inline — for the embed
  const pdfDownloadUrl = `${pdfUrl}?download=1`;    // attachment — for buttons

  return (
    <div className="flex-1 flex flex-col">
      <div className="max-w-4xl w-full mx-auto px-4 pt-4 print:hidden">
        <a href={pdfDownloadUrl} target="_blank" rel="noopener noreferrer" className="block">
          <Button className="w-full sm:w-auto bg-ch-primary-dark hover:bg-ch-ink text-white gap-2">
            <Download className="w-4 h-4" />
            Download PDF
          </Button>
        </a>
        <p className="text-xs text-ch-text-muted mt-2">
          Trouble viewing the report below? Tap &ldquo;Download PDF&rdquo; to save it to your device.
        </p>
      </div>

      <object data={pdfUrl} type="application/pdf" className="w-full flex-1 min-h-[70vh] mt-4">
        {/* Shown when the browser can't render a PDF inline */}
        <div className="max-w-md mx-auto px-4 py-12 text-center">
          <FileText className="w-12 h-12 text-ch-text-muted mx-auto mb-3" />
          <h2 className="font-semibold text-ch-text mb-1">Your report is ready</h2>
          <p className="text-sm text-ch-text-secondary mb-5">
            {vin} — your browser can&apos;t show the PDF inline, so download it instead.
          </p>
          <a href={pdfDownloadUrl} target="_blank" rel="noopener noreferrer">
            <Button className="bg-ch-primary-dark hover:bg-ch-ink text-white gap-2">
              <Download className="w-4 h-4" />
              Download PDF
            </Button>
          </a>
        </div>
      </object>
    </div>
  );
}


function ClearVinFrame({ html }: { html: string }) {
  const [height, setHeight] = useState(800);
  const [srcDoc, setSrcDoc] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!html) return;

    // Inject script to force all links (PDF download, gallery) to open in new tab
    const injectedScript = `
      <base target="_blank">
      <style>
        /* Hide ClearVin's own download/print links - we handle these in CheckAm toolbar */
        a[href*="download"][href*="format=pdf"],
        a[href*="format=pdf"] { display: none !important; }
        
        /* Offset anchor jump targets to account for CheckAm sticky toolbar (~56px) */
        [id]::before {
          content: '';
          display: block;
          height: 64px;
          margin-top: -64px;
          pointer-events: none;
        }
        
        /* Smooth scrolling */
        html { scroll-behavior: smooth; }

        /* Print styles */
        @page { margin: 12mm; }
        @media print {
          html {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          html, body {
            width: 100% !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          body { zoom: 0.72; }
          * { max-width: none !important; overflow: visible !important; }
          img { max-width: 100% !important; page-break-inside: avoid; }
          table { page-break-inside: avoid; }
          h1, h2, h3 { page-break-after: avoid; }
        }
      </style>
      <script>
        function fixHeight() {
          try {
            var h = document.documentElement.scrollHeight;
            parent.postMessage({ type: 'ch-report-height', height: h }, '*');
          } catch (e) {}
        }
        document.addEventListener('DOMContentLoaded', function() {
          document.querySelectorAll('a[href]').forEach(function(a) {
            a.setAttribute('target', '_blank');
            a.setAttribute('rel', 'noopener noreferrer');
          });
          fixHeight();
          setTimeout(fixHeight, 500);
          setTimeout(fixHeight, 1500);
          window.addEventListener('load', fixHeight);
          var observer = new MutationObserver(function() { fixHeight(); });
          observer.observe(document.body, { childList: true, subtree: true });
        });
      <\/script>
    `;

    const modifiedHtml = html.includes('<head>')
      ? html.replace('<head>', '<head>' + injectedScript)
      : injectedScript + html;

    setSrcDoc(modifiedHtml);
  }, [html]);

  // Listen for height messages from the iframe (works cross-context on mobile)
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === 'ch-report-height' && typeof e.data.height === 'number') {
        setHeight(e.data.height + 50);
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  return (
    <iframe
      ref={iframeRef}
      srcDoc={srcDoc}
      style={{ width: '100%', height: `${height}px`, border: 'none' }}
      title="Vehicle History Report"
      sandbox="allow-same-origin allow-scripts allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
    />
  );
}

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  // Pure UI hint read from a non-httpOnly cookie set at login — not an
  // authorization check. See src/lib/session.ts.
  const [authed, setAuthed] = useState(false);
  useEffect(() => setAuthed(Cookies.get('checkam_authed') === '1'), []);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);


  useEffect(() => {
    if (!id) return;
    // Fetch report publicly - no auth required to view
    fetch(`/api/reports/${id}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setReport)
      .catch(() => setLoading(false))
      .finally(() => setLoading(false));
  }, [id]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };


  // Extract all images from ClearVin HTML for our gallery
  const extractImages = (html: string): string[] => {
    const matches = html.matchAll(/src="(https:\/\/[^"]*(?:iaai|copart|manheim|auction)[^"]*\.(?:jpg|jpeg|png|webp)[^"]*)"/gi);
    const imgs = Array.from(matches, m => m[1]);
    // Also catch clearvin CDN images
    const matches2 = html.matchAll(/src="(https:\/\/[^"]*clearvin[^"]*\.(?:jpg|jpeg|png|webp)[^"]*)"/gi);
    const imgs2 = Array.from(matches2, m => m[1]);
    // Also catch any proxied images we might have
    const matches3 = html.matchAll(/"(https:\/\/[^"]*\.(?:jpg|jpeg|png|webp))"/gi);
    const imgs3 = Array.from(matches3, m => m[1]).filter(u => u.includes('vehicle') || u.includes('photo') || u.includes('image') || u.includes('auction'));
    return [...new Set([...imgs, ...imgs2, ...imgs3])];
  };

  if (loading) {
    return <div className="min-h-screen bg-ch-bg flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-ch-primary" /></div>;
  }
  if (!report) return (
    <div className="min-h-screen bg-ch-bg flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4">🔍</div>
        <h2 className="text-xl font-bold text-ch-text mb-2">Report Not Found</h2>
        <p className="text-ch-text-secondary mb-6">This report may not exist or is still being generated. If you just paid, please check your dashboard.</p>
        <Button onClick={() => router.push('/')} className="bg-ch-primary-dark hover:bg-ch-ink text-white">Go to CheckAm</Button>
      </div>
    </div>
  );

  const clearvinHtml = report.processed_data?.clearvin_html || '';
  // Prefer the stored PDF when we have one. Reports generated before the
  // pdf_data migration (and any where ClearVin's PDF fetch failed) have
  // has_pdf false and keep the original iframe rendering below — unchanged,
  // so nothing regresses for historical reports.
  const hasPdf = report.has_pdf === true;
  const isClearVin = report.processed_data?.data_source === 'CLEARVIN' && clearvinHtml;

  // Full-report view. Body is the stored PDF when we have one (self-contained,
  // no dependency on ClearVin's assets), otherwise the original ClearVin iframe.
  // Toolbar, photo gallery and disclaimer are shared by both.
  if (hasPdf || isClearVin) {
    return (
      <div className="min-h-screen bg-ch-bg flex flex-col">
        {/* Toolbar */}
        <div className="bg-white border-b border-ch-border sticky top-0 z-10 print:hidden">
          <div className="max-w-6xl mx-auto px-3 py-2 flex items-center gap-2">
            {/* Back button */}
            <Button variant="outline" size="sm" onClick={() => router.push(authed ? '/dashboard' : '/')} className="border-ch-border gap-1 shrink-0">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{authed ? 'Dashboard' : 'CheckAm'}</span>
            </Button>

            {/* VIN + date — takes remaining space */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-ch-text truncate">{report.vin}</p>
              <p className="text-xs text-ch-text-muted hidden sm:block">
                {new Date(report.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>

            {/* Action buttons — icon-only on mobile, icon+label on desktop */}
            <div className="flex items-center gap-1.5 shrink-0">
              <a href={`/api/reports/${id}/pdf?download=1`} target="_blank" rel="noopener noreferrer">
                <Button size="sm" className="bg-ch-primary-dark hover:bg-ch-ink text-white gap-1.5 px-2 sm:px-3">
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-xs">Download PDF</span>
                </Button>
              </a>
              <Button size="sm" variant="outline" onClick={copyLink} className="border-ch-border gap-1.5 px-2 sm:px-3">
                <Copy className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-xs">{copied ? 'Copied!' : 'Copy Link'}</span>
              </Button>
              <a href={`https://wa.me/?text=CheckAm Report: ${typeof window !== 'undefined' ? window.location.href : ''}`} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" className="border-ch-border gap-1.5 px-2 sm:px-3">
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-xs">Share</span>
                </Button>
              </a>
              {/* Print only on the iframe path — window.print() can't reach an
                  embedded <object>'s PDF contents. The browser's own PDF viewer
                  provides print for the PDF path. */}
              {!hasPdf && (
                <Button size="sm" variant="outline" onClick={() => window.print()} className="border-ch-border gap-1.5 px-2 sm:px-3">
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-xs">Print</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Body: stored PDF when available, otherwise ClearVin's HTML in an iframe */}
        {hasPdf ? <ReportPdfView id={id} vin={report.vin} /> : <ClearVinFrame html={clearvinHtml} />}

        {/* Gallery button - shown below iframe */}
        {clearvinHtml && (() => {
          const imgs = extractImages(clearvinHtml);
          return imgs.length > 0 ? (
            <div className="max-w-4xl mx-auto px-4 pb-2 print:hidden">
              <button
                onClick={() => { setGalleryImages(imgs); setGalleryIndex(0); }}
                className="text-sm text-ch-primary underline hover:no-underline"
              >
                View all {imgs.length} auction photos
              </button>
            </div>
          ) : null;
        })()}

        {/* Gallery Lightbox */}
        {galleryIndex !== null && galleryImages.length > 0 && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center print:hidden" onClick={() => setGalleryIndex(null)}>
            <button onClick={() => setGalleryIndex(null)} className="absolute top-4 right-4 text-white hover:text-gray-300">
              <X className="w-8 h-8" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setGalleryIndex(i => i !== null && i > 0 ? i - 1 : galleryImages.length - 1); }}
              className="absolute left-4 text-white hover:text-gray-300"
            >
              <ChevronLeft className="w-10 h-10" />
            </button>
            <img
              src={`/api/proxy/image?url=${encodeURIComponent(galleryImages[galleryIndex])}`}
              alt={`Auction photo ${galleryIndex + 1}`}
              className="max-h-[85vh] max-w-[85vw] object-contain rounded"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={(e) => { e.stopPropagation(); setGalleryIndex(i => i !== null && i < galleryImages.length - 1 ? i + 1 : 0); }}
              className="absolute right-4 text-white hover:text-gray-300"
            >
              <ChevronRight className="w-10 h-10" />
            </button>
            <p className="absolute bottom-4 text-white text-sm">{galleryIndex + 1} / {galleryImages.length}</p>
          </div>
        )}

        {/* NMVTIS Disclaimer */}
        <div className="max-w-4xl mx-auto px-4 py-6 print:hidden">
          <div className="bg-slate-50 border border-ch-border rounded-none p-4 text-xs text-ch-text-muted leading-relaxed">
            <p className="font-semibold text-ch-text mb-1">NMVTIS Disclaimer</p>
            <p>Federal law requires that we notify you that this report was obtained from the National Motor Vehicle Title Information System (NMVTIS). NMVTIS information is provided by states, insurance companies, and salvage yards. Not all states supply information to NMVTIS. The absence of information does not necessarily mean the absence of a problem. Always verify a vehicle&apos;s history with the appropriate state agency or other sources.</p>
          </div>
        </div>
      </div>
    );
  }

  // NHTSA fallback report display
  const data = report.processed_data;
  const vehicle = data?.vehicle || {};
  const recalls = data?.recalls || [];
  const accidents = data?.accidents || [];
  const theft = data?.theft || [];
  const odometer = data?.odometer_records || [];

  // Mirrors the scale in lib/generate.ts — keep the two in step. Grade B is
  // gold, which needs dark text: white on #F5B400 is about 1.9:1 and fails
  // contrast at badge size.
  const gradeColor = report.overall_grade === 'A' ? 'bg-ch-primary-dark text-white' :
    report.overall_grade === 'B' ? 'bg-ch-gold text-ch-charcoal' :
    report.overall_grade === 'C' ? 'bg-ch-amber text-white' : 'bg-ch-red text-white';

  return (
    <div className="min-h-screen bg-ch-bg py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="bg-white border border-ch-border rounded-none p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-ch-primary font-semibold mb-1">US Vehicle History Report</p>
              <h1 className="text-2xl font-bold text-ch-text">
                {String(vehicle?.year ?? '')} {String(vehicle?.make ?? '')} {String(vehicle?.model ?? '')}
              </h1>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <code className="text-xs font-mono text-ch-text-muted bg-slate-100 px-2 py-1 rounded">{report.vin}</code>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${gradeColor}`}>Grade {report.overall_grade}</span>
              </div>
            </div>
            <div className="bg-slate-50 rounded-none p-4 text-center shrink-0">
              <p className="text-xs uppercase tracking-wide text-ch-text-muted mb-1">Risk Score</p>
              <p className="text-3xl font-extrabold text-ch-primary">{report.risk_score}</p>
              <p className="text-xs text-ch-text-muted">out of 100</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-ch-border flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={copyLink} className="border-ch-border text-xs gap-1.5">
              <Copy className="w-3.5 h-3.5" />{copied ? 'Copied!' : 'Copy Link'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.print()} className="border-ch-border text-xs gap-1.5">
              <Printer className="w-3.5 h-3.5" /> Print
            </Button>
          </div>
        </div>

        {/* Specs */}
        {vehicle && Object.keys(vehicle).length > 0 && (
          <div className="bg-white border border-ch-border rounded-none p-6">
            <h2 className="font-semibold text-ch-text mb-4">Vehicle Specifications</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {([
                { label: 'Make', value: vehicle.make },
                { label: 'Model', value: vehicle.model },
                { label: 'Year', value: vehicle.year?.toString() },
                { label: 'Engine', value: vehicle.engine },
                { label: 'Fuel Type', value: vehicle.fuel_type },
                { label: 'Drive Type', value: vehicle.drive_type },
                { label: 'Body Type', value: vehicle.body_type },
                { label: 'Doors', value: vehicle.doors?.toString() },
                { label: 'Manufactured In', value: vehicle.country_of_manufacture },
              ] as { label: string; value: string | undefined }[]).map((spec) => spec.value && (
                <div key={spec.label} className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs uppercase tracking-wide text-ch-text-muted mb-0.5">{spec.label}</p>
                  <p className="text-sm font-semibold text-ch-text">{String(spec.value)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recalls */}
        <div className="bg-white border border-ch-border rounded-none p-6">
          <h2 className="font-semibold text-ch-text mb-4">NHTSA Safety Recalls ({recalls.length})</h2>
          {recalls.length === 0 ? (
            <div className="bg-ch-green-light rounded-lg p-4"><p className="text-ch-green font-semibold text-sm">✓ No open safety recalls</p></div>
          ) : (
            <div className="space-y-3">
              {(recalls as Record<string, unknown>[]).map((r, i) => (
                <div key={i} className="border border-ch-border rounded-lg p-4">
                  <p className="text-xs font-medium text-ch-text-secondary uppercase mb-1">{String(r.component || '')}</p>
                  <p className="text-sm text-ch-text-secondary">{String(r.summary || '')}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* NMVTIS Disclaimer */}
        <div className="bg-slate-50 border border-ch-border rounded-none p-4 text-xs text-ch-text-muted">
          <p className="font-semibold text-ch-text mb-1">NMVTIS Disclaimer</p>
          <p>This report was obtained from NMVTIS. Not all states supply information to NMVTIS. Always verify a vehicle's history with the appropriate state agency.</p>
        </div>

        <div className="flex gap-3 pb-4">
          <Button variant="outline" onClick={() => router.push('/search')} className="border-ch-border">← Check Another Car</Button>
          <Button variant="outline" onClick={() => window.print()} className="border-ch-border">Print Report</Button>
        </div>
      </div>
    </div>
  );
}
