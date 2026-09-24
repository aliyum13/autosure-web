import Link from 'next/link';
import { XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PaymentFailedPage() {
  return (
    <div className="min-h-screen bg-ch-surface flex items-center justify-center px-4 py-20">
      <div className="max-w-md w-full surface-card p-8 text-center">
        <XCircle className="w-12 h-12 text-ch-red mx-auto mb-4" strokeWidth={1.75} aria-hidden />
        <h1 className="text-2xl text-ch-ink mb-2">Payment Failed</h1>
        <p className="text-ch-text-secondary mb-6">
          Your payment was not completed. You have not been charged.
          Please try again or contact us if the problem persists.
        </p>
        <div className="flex flex-col gap-3">
          <Button asChild className="w-full h-11 bg-ch-primary hover:bg-ch-primary-dark text-white font-semibold">
            <Link href="/search">Try Again</Link>
          </Button>
          {/* TODO(autosure-contact): AutoSure has no WhatsApp line or social accounts yet. */}
          <Button asChild variant="outline" className="w-full h-11 border-ch-border">
            <a href="mailto:support@autosurevin.com">Email Support</a>
          </Button>
          <Button asChild variant="ghost" className="w-full h-11 text-ch-text-muted">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
