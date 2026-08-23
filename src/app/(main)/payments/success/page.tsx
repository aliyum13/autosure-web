'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Loader2, Mail, FileText } from 'lucide-react';
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

    const t = setTimeout(tick, 3000);
    return () => { cancelled = true; clearTimeout(t); };
  }, [reportId, reportState]);

  useEffect(() => {
    if (isComp || isCredit) { setStatus('success'); return; }
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
      <div className="min-h-screen bg-ch-bg flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-ch-blue mx-auto mb-4" />
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
      <div className="min-h-screen bg-ch-bg flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white border border-ch-border rounded-2xl p-8 text-center">
          <div className="text-5xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-ch-text mb-2">Payment Not Confirmed</h1>
          <p className="text-ch-text-secondary mb-6">
            We couldn&apos;t confirm your payment. If you were charged, your report will be sent to your email shortly.
            If you need help, contact us.
          </p>
          <div className="flex flex-col gap-3">
            <Link href="/">
              <Button className="w-full bg-ch-blue hover:bg-ch-blue-dark text-white">Try Again</Button>
            </Link>
            <a href="mailto:support@carhaki.com">
              <Button variant="outline" className="w-full border-ch-border">support@carhaki.com</Button>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ch-bg flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white border border-ch-border rounded-2xl p-8 text-center shadow-soft-lg animate-fade-up">
        
        {/* Success icon */}
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-soft">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>

        <h1 className="text-2xl font-bold text-ch-text mb-2">
          {isCredit ? 'Report Requested! 🎉' : 'Payment Successful! 🎉'}
        </h1>

        {/* Bundle credit remaining banner */}
        {isCredit && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-2">
            <p className="text-green-800 font-semibold text-sm">
              This report was covered by your bundle 🎁
            </p>
            <p className="text-green-700 text-sm mt-1">
              You have <strong>{creditsRemaining}</strong> {creditsRemaining === 1 ? 'report' : 'reports'} remaining.
              Use the same email to check more cars — no extra payment needed.
            </p>
          </div>
        )}
        
        {/* Report access — shown in place of the email-only notice whenever we
            know the report id, so the customer is never dependent on an email
            arriving to reach something they've already paid for. */}
        {reportState === 'ready' && reportId ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5 my-6">
            <FileText className="w-8 h-8 text-green-700 mx-auto mb-3" />
            <p className="text-ch-text font-semibold mb-1">Your report is ready</p>
            <p className="text-ch-text-secondary text-sm mb-4">
              We&apos;ve also emailed you a copy, but you can open it right now.
            </p>
            <Link href={`/reports/${reportId}`}>
              <Button className="w-full bg-ch-blue hover:bg-ch-blue-dark text-white shadow-blue-glow">
                View Your Report
              </Button>
            </Link>
          </div>
        ) : reportState === 'generating' ? (
          <div className="bg-ch-blue/5 border border-ch-blue/20 rounded-2xl p-5 my-6">
            <Loader2 className="w-8 h-8 text-ch-blue mx-auto mb-3 animate-spin" />
            <p className="text-ch-text font-semibold mb-1">Generating your report…</p>
            <p className="text-ch-text-secondary text-sm">
              This usually takes under a minute. This page will update automatically —
              you don&apos;t need to refresh. We&apos;ll email you a copy too.
            </p>
          </div>
        ) : (
          <div className="bg-ch-blue/5 border border-ch-blue/20 rounded-2xl p-5 my-6">
            <Mail className="w-8 h-8 text-ch-blue mx-auto mb-3" />
            <p className="text-ch-text font-semibold mb-1">Your report is on its way!</p>
            <p className="text-ch-text-secondary text-sm">
              We are generating your full vehicle history report right now.
              It will be sent to your email as a PDF within the next few minutes.
            </p>
          </div>
        )}

        <div className="space-y-2 text-sm text-ch-text-secondary mb-6">
          <p>📧 Check your inbox (and spam folder)</p>
          <p>📎 The report comes as a PDF attachment</p>
          <p>⏱ Usually delivered in under 2 minutes</p>
        </div>

        <div className="flex flex-col gap-3">
          <Link href="/">
            <Button className="w-full bg-ch-blue hover:bg-ch-blue-dark text-white shadow-blue-glow hover-lift">Check Another Car</Button>
          </Link>
          <a href="mailto:support@carhaki.com">
            <Button variant="outline" className="w-full border-ch-border text-sm">
              Need help? support@carhaki.com
            </Button>
          </a>
        </div>

      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-ch-bg flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-ch-blue" />
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
