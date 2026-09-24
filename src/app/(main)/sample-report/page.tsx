import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShieldCheck, FileText } from 'lucide-react';

export const metadata = {
  title: 'Sample Report — AutoSure',
  description: 'See a real AutoSure vehicle history report before you buy.',
};

export default function SampleReportPage() {
  return (
    <div className="min-h-screen bg-ch-surface flex items-center justify-center px-4 py-20">
      <div className="max-w-md w-full surface-card p-8 text-center space-y-6">

        <div className="w-14 h-14 bg-ch-primary-light rounded-xl flex items-center justify-center mx-auto">
          <FileText className="w-7 h-7 text-ch-primary" aria-hidden />
        </div>

        <div>
          <h1 className="text-2xl text-ch-ink mb-2">Sample AutoSure Report</h1>
          <p className="text-sm text-ch-text-secondary leading-relaxed">
            This is a real vehicle history report for a <strong className="text-ch-ink">2016 Mercedes-Benz C300</strong> — exactly what you receive after payment. Salvage title, stolen & recovered, front-end damage, odometer rollback. Sold in Nigeria as clean Tokunbo.
          </p>
        </div>

        <Button asChild className="bg-ch-primary hover:bg-ch-primary-dark text-white w-full h-12 text-base font-semibold transition-colors duration-200 ease-out">
          <a href="/sample-report.pdf" target="_blank" rel="noopener noreferrer">View Sample Report (PDF)</a>
        </Button>

        <div className="pt-6 border-t border-ch-border">
          <p className="text-sm text-ch-text-secondary mb-4">Ready to check your own car?</p>
          <Button asChild variant="outline" className="w-full h-11 font-semibold border-ch-primary text-ch-primary hover:bg-ch-primary hover:text-white transition-colors duration-200 ease-out">
            <Link href="/">Check a VIN — ₦15,000</Link>
          </Button>
        </div>

        <div className="flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4 text-ch-text-muted" />
          <p className="text-xs text-ch-text-muted">Powered by ClearVin · Secured by Paystack</p>
        </div>

      </div>
    </div>
  );
}
