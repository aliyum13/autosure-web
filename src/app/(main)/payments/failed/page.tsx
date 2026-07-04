import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function PaymentFailedPage() {
  return (
    <div className="min-h-screen bg-ch-bg flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white border border-ch-border rounded-2xl p-8 text-center">
        <div className="text-5xl mb-4">❌</div>
        <h1 className="text-2xl font-bold text-ch-text mb-2">Payment Failed</h1>
        <p className="text-ch-text-secondary mb-6">
          Your payment was not completed. You have not been charged.
          Please try again or contact us if the problem persists.
        </p>
        <div className="flex flex-col gap-3">
          <Link href="/search">
            <Button className="w-full bg-ch-blue hover:bg-ch-blue-dark text-white shadow-blue-glow hover-lift">Try Again</Button>
          </Link>
          <a href="https://chat.whatsapp.com/CL4YVA9Ny0gG6vWfFIAQZP?mode=gi_t">
            <Button variant="outline" className="w-full border-ch-border">Contact Support on WhatsApp</Button>
          </a>
          <Link href="/dashboard">
            <Button variant="ghost" className="w-full text-ch-text-muted">Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
