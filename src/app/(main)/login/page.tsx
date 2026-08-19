'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Mail, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Step = 'email' | 'code';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const requestCode = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        return;
      }
      setStep('code');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Verification failed.');
        return;
      }
      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ch-bg flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white border border-ch-border rounded-2xl p-8 shadow-soft-lg animate-fade-up">
        <div className="w-16 h-16 bg-ch-blue/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Mail className="w-8 h-8 text-ch-blue" />
        </div>

        {step === 'email' ? (
          <>
            <h1 className="text-2xl font-bold text-ch-text mb-2 text-center">Log in to CarHaki</h1>
            <p className="text-ch-text-secondary text-center mb-6">
              Enter the email you used at checkout — we&apos;ll send you a one-time code.
            </p>
            <form onSubmit={requestCode} className="space-y-4">
              <div>
                <Label htmlFor="email" className="mb-1.5">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" disabled={loading} className="w-full bg-ch-blue hover:bg-ch-blue-dark text-white shadow-blue-glow">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send code'}
              </Button>
            </form>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-ch-text mb-2 text-center">Enter your code</h1>
            <p className="text-ch-text-secondary text-center mb-6">
              We sent a 6-digit code to <strong>{email}</strong>. It expires in 10 minutes.
            </p>
            <form onSubmit={verifyCode} className="space-y-4">
              <div>
                <Label htmlFor="code" className="mb-1.5">6-digit code</Label>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="text-center text-2xl tracking-[0.3em] font-mono h-12"
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" disabled={loading || code.length !== 6} className="w-full bg-ch-blue hover:bg-ch-blue-dark text-white shadow-blue-glow">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify & log in'}
              </Button>
              <button
                type="button"
                onClick={() => { setStep('email'); setCode(''); setError(''); }}
                className="w-full flex items-center justify-center gap-1 text-sm text-ch-text-secondary hover:text-ch-text"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Use a different email
              </button>
            </form>
          </>
        )}

        <p className="text-ch-text-secondary text-xs text-center mt-6">
          Need help? <a href="mailto:carhakisupport@gmail.com" className="text-ch-blue">carhakisupport@gmail.com</a>
        </p>
      </div>
    </div>
  );
}
