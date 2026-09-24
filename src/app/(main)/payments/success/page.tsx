'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Loader2, Mail, FileText, XCircle, Paperclip, Timer, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get('reference') || searchParams.get('trxref');
  const isComp = searchParams.get('comp') === '1';
  const isCredit = searchParams.get('credit') === '1';
  const creditsRemaining = parseInt(searchParams.get('remaining') || '0', 10);
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>((isComp || isCredit) ? 'success' : 'verifying');
  const [attempt, setAttempt] = useState(0);
  const [reportId, setReportId] = useState<string | null>(null);
  // 'ready' -> link the report; 'generating' -> poll; 'unavailable' -> generation
  // finished in a terminal non-COMPLETED state, so no link should be offered.
  const [reportState, setReportState] = useState<'unknown' | 'generating' | 'ready' | 'unavailable'>('unknown');

  // Poll the lightweight status endpoint while generation is still in flight.
  // Without this the page could link straight to a PROCESSING report, which
  // /api/reports/[id] serves as a 404 ("Report Not Found") — worse than showing
  // nothing. Capped so a stuck generation degrades to the email path instead of
  // polling forever.
  useEffect(() => {
    if (!reportId || reportState !== 'generating') return;
    let cancelled = false;
    let polls = 0;

    const tick = async () => {
      if (cancelled) return;
      polls += 1;
      try {
        const res = await fetch(`/api/reports/${reportId}/status`);
        if (res.ok) {
          const d = await res.json();
          if (cancelled) return;
          if (d.done) {
            setReportState(d.status === 'COMPLETED' ? 'ready' : 'unavailable');
            return;
          }
        }
      } catch { /* transient — keep polling */ }
      if (!cancelled && polls < 20) setTimeout(tick, 3000);
    };

    // First poll fires immediately: an already-COMPLETED report shouldn't sit
    // behind a spinner for 3s just to confirm what's usually already true.
    tick();
    return () => { cancelled = true; };
  }, [reportId, reportState]);

  useEffect(() => {
    if (isComp || isCredit) {
      setStatus('success');
      // Credit redemptions never hit verify — orders/create generates inline and
      // redirects with the report id, so pick it up from the query string.
      const fromParam = searchParams.get('report');
      if (fromParam) { setReportId(fromParam); setReportState('generating'); }
      return;
    }
    if (!reference) { setStatus('failed'); return; }

    const verify = async (tries = 0): Promise<void> => {
      try {
        const res = await fetch(`/api/payments/verify?reference=${reference}`);
        const data = await res.json();
        if (data.status === 'success' || data.status === 'already_verified') {
          setStatus('success');
          if (data.report_id) {
            setReportId(data.report_id);
            const rs = data.report_status;
            setReportState(
              rs === 'COMPLETED' ? 'ready'
              : rs === 'PROCESSING' || rs === 'PENDING' || !rs ? 'generating'
              : 'unavailable'
            );
          }
          return;
        }
        if (tries < 4) {
          setAttempt(tries + 1);
          await new Promise((r) => setTimeout(r, 2000));
          return verify(tries + 1);
        }
        setStatus('failed');
      } catch {
        if (tries < 4) {
          await new Promise((r) => setTimeout(r, 2000));
          return verify(tries + 1);
        }
        setStatus('failed');
      }
    };

    setTimeout(() => verify(), 1000);
  }, [reference, isComp, isCredit]);

  if (status === 'verifying') {
    return (
      <div className="min-h-screen bg-ch-surface flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-ch-primary mx-auto mb-4" />
          <p className="text-ch-text font-semibold">Verifying your payment...</p>
          <p className="text-ch-text-muted text-sm mt-1">
            {attempt > 0 ? `Checking again (${attempt}/4)...` : 'Please wait'}
          </p>
        </div>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="min-h-screen bg-ch-surface flex items-center justify-center px-4 py-20">
        <div className="max-w-md w-full surface-card p-8 text-center">
          <XCircle className="w-12 h-12 text-ch-red mx-auto mb-4" strokeWidth={1.75} aria-hidden />
          <h1 className="text-2xl text-ch-ink mb-2">Payment Not Confirmed</h1>
          <p className="text-ch-text-secondary mb-6">
            We couldn&apos;t confirm your payment. If you were charged, your report will be sent to your email shortly.
            If you need help, contact us.
          </p>
          <div className="flex flex-col gap-3">
            <Button asChild className="w-full h-11 bg-ch-primary hover:bg-ch-primary-dark text-white font-semibold">
              <Link href="/">Try Again</Link>
            </Button>
            <Button asChild variant="outline" className="w-full h-11 border-ch-border">
              <a href="mailto:support@autosurevin.com">support@autosurevin.com</a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ch-surface flex items-center justify-center px-4 py-20">
      <div className="max-w-md w-full surface-card p-8 text-center">
        {/* Success icon */}
        <div className="w-20 h-20 bg-ch-secondary-light rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-12 h-12 text-ch-secondary" strokeWidth={1.75} aria-hidden />
        </div>

        <h1 className="text-2xl text-ch-ink mb-2">
          {isCredit ? 'Report Requested' : 'Payment Successful'}
        </h1>

        {/* Bundle credit remaining banner */}
        {isCredit && (
          <div className="bg-ch-secondary-light border border-ch-secondary/30 rounded-lg p-4 mb-2">
            <p className="text-ch-secondary-dark font-semibold text-sm inline-flex items-center gap-1.5">
              <Gift className="w-4 h-4" aria-hidden />
              This report was covered by your bundle
            </p>
            <p className="text-ch-secondary-dark text-sm mt-1">
              You have <strong>{creditsRemaining}</strong> {creditsRemaining === 1 ? 'report' : 'reports'} remaining.
              Use the same email to check more cars — no extra payment needed.
            </p>
          </div>
        )}
        
        {/* Report access — shown in place of the email-only notice whenever we
            know the report id, so the customer is never dependent on an email
            arriving to reach something they've already paid for. */}
        {reportState === 'ready' && reportId ? (
          <div className="bg-ch-secondary-light border border-ch-secondary/30 rounded-lg p-5 my-6">
            <FileText className="w-8 h-8 text-ch-secondary mx-auto mb-3" />
            <p className="text-ch-text font-semibold mb-1">Your report is ready</p>
            <p className="text-ch-text-secondary text-sm mb-4">
              We&apos;ve also emailed you a copy, but you can open it right now.
            </p>
            <Button asChild className="w-full h-11 bg-ch-primary hover:bg-ch-primary-dark text-white font-semibold">
              <Link href={`/reports/${reportId}`}>View Your Report</Link>
            </Button>
          </div>
        ) : reportState === 'generating' ? (
          <div className="bg-ch-primary/5 border border-ch-primary/20 rounded-lg p-5 my-6">
            <Loader2 className="w-8 h-8 text-ch-primary mx-auto mb-3 animate-spin" />
            <p className="text-ch-text font-semibold mb-1">Generating your report…</p>
            <p className="text-ch-text-secondary text-sm">
              This usually takes under a minute. This page will update automatically —
              you don&apos;t need to refresh. We&apos;ll email you a copy too.
            </p>
          </div>
        ) : (
          <div className="bg-ch-primary/5 border border-ch-primary/20 rounded-lg p-5 my-6">
            <Mail className="w-8 h-8 text-ch-primary mx-auto mb-3" />
            <p className="text-ch-text font-semibold mb-1">Your report is on its way!</p>
            <p className="text-ch-text-secondary text-sm">
              We are generating your full vehicle history report right now.
              It will be sent to your email as a PDF within the next few minutes.
            </p>
          </div>
        )}

        <ul className="space-y-2 text-sm text-ch-text-secondary mb-6 inline-block text-left">
          <li className="flex items-center gap-2"><Mail className="w-4 h-4 text-ch-primary shrink-0" aria-hidden />Check your inbox (and spam folder)</li>
          <li className="flex items-center gap-2"><Paperclip className="w-4 h-4 text-ch-primary shrink-0" aria-hidden />The report comes as a PDF attachment</li>
          <li className="flex items-center gap-2"><Timer className="w-4 h-4 text-ch-primary shrink-0" aria-hidden />Usually delivered in under 2 minutes</li>
        </ul>

        <div className="flex flex-col gap-3">
          <Button asChild className="w-full h-11 bg-ch-primary hover:bg-ch-primary-dark text-white font-semibold">
            <Link href="/">Check Another Car</Link>
          </Button>
          <Button asChild variant="outline" className="w-full h-11 border-ch-border text-sm">
            <a href="mailto:support@autosurevin.com">Need help? support@autosurevin.com</a>
          </Button>
        </div>

      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-ch-surface flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-ch-primary" />
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
