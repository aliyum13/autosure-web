'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SearchPage() {
  const [vin, setVin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = vin.trim().toUpperCase();
    if (!cleaned) { setError('Please enter a VIN.'); return; }
    if (cleaned.length !== 17) { setError('VIN must be exactly 17 characters.'); return; }
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(cleaned)) {
      setError('Invalid VIN. Use letters A-H, J-N, P-Z and digits only.');
      return;
    }
    setError('');
    setLoading(true);
    router.push(`/preview/${cleaned}`);
  };

  const samples = ['1HGCM82633A004352', '5TDYK3DC8DS290235'];

  return (
    <div className="min-h-screen bg-ch-bg">
      {/* Hero */}
      <div className="relative bg-white border-b border-ch-border py-16 px-4 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 right-0 w-80 h-80 bg-ch-primary-light rounded-full blur-3xl opacity-60" />
        </div>
        <div className="relative max-w-2xl mx-auto text-center">
          <span className="inline-block text-xs font-semibold uppercase tracking-wider text-ch-primary bg-ch-primary-light px-3 py-1 rounded-full mb-4 animate-fade-up">
            USA Vehicle Records
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold text-ch-text mb-3 animate-fade-up-delay-1">
            Check Your Tokunbo Car&apos;s History
          </h1>
          <p className="text-ch-text-secondary mb-8 animate-fade-up-delay-2">
            Enter the 17-character VIN from the car&apos;s dashboard, door sticker, or import documents.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 animate-fade-up-delay-3">
            <Input
              value={vin}
              onChange={(e) => { setVin(e.target.value.toUpperCase()); setError(''); }}
              placeholder="Enter VIN — e.g. 1HGCM82633A004352"
              maxLength={17}
              className="flex-1 font-mono h-12 border-ch-border focus-visible:ring-ch-primary text-base shadow-soft"
            />
            <Button
              type="submit"
              disabled={loading}
              className="h-12 px-6 bg-ch-primary hover:bg-ch-primary-dark text-white shadow-green-glow hover-lift"
            >
              {loading
                ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                : <Search className="w-4 h-4 mr-2" />}
              Search
            </Button>
          </form>

          {error && <p className="text-ch-red text-sm mt-2">{error}</p>}

          <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
            <span className="text-xs text-ch-text-muted">Try a sample:</span>
            {samples.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVin(v)}
                className="text-xs font-mono bg-slate-100 hover:bg-ch-primary-light text-ch-text-secondary hover:text-ch-primary px-2 py-1 rounded transition-colors"
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tip */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white border border-ch-border rounded-2xl p-5 shadow-soft hover-lift">
          <p className="text-sm font-semibold text-ch-text mb-1">📍 Where to find the VIN</p>
          <p className="text-sm text-ch-text-secondary">
            Look on the driver&apos;s door sticker, the dashboard (visible through the windscreen),
            or the seller&apos;s import documents. USA VINs are always 17 characters.
          </p>
        </div>
      </div>
    </div>
  );
}
