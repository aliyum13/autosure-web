'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { validateVIN } from '@/lib/vin';

interface VinInputProps {
  placeholder?: string;
  buttonText?: string;
  className?: string;
  size?: 'default' | 'large';
  // Sample VINs help a first-time visitor on the homepage try the product.
  // On the dashboard they are noise to someone who already has their own VIN,
  // and one misclick runs a check on a demo car instead of theirs.
  showSamples?: boolean;
}

export default function VinInput({
  placeholder = 'Enter VIN — e.g. 1HGCM82633A004352',
  buttonText = 'Check History',
  className,
  size = 'default',
  showSamples = true,
}: VinInputProps) {
  const [vin, setVin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = vin.trim().toUpperCase();

    if (!cleaned) {
      setError('Please enter a VIN.');
      return;
    }

    // Shared with the server rather than re-implemented here. The old inline
    // regex collapsed every bad character into "invalid format"; validateVIN
    // names the I/O/Q case specifically, which is the 0/O and 1/I confusion
    // that otherwise ends in a paid report ClearVin refuses to generate.
    //
    // checkDigitValid is deliberately IGNORED. It is soft by design — real VINs
    // from certain plants fail it yet exist in NMVTIS — so blocking on it here
    // would reject genuine sales. The preview page uses it only where an actual
    // ClearVin rejection corroborates it.
    const check = validateVIN(cleaned);
    if (!check.valid) {
      setError(check.reason || 'Please enter a valid VIN.');
      return;
    }

    setError('');
    setLoading(true);
    router.push(`/preview/${cleaned}`);
  };

  const sampleVins = ['1HGCM82633A004352', '5TDYK3DC8DS290235'];

  return (
    <div className={cn('w-full', className)}>
      <form onSubmit={handleSubmit}>
        <div className={cn(
          'flex gap-2',
          size === 'large' ? 'flex-col sm:flex-row' : 'flex-row'
        )}>
          <div className="relative flex-1">
            <Input
              value={vin}
              onChange={(e) => {
                setVin(e.target.value.toUpperCase());
                setError('');
              }}
              placeholder={placeholder}
              maxLength={17}
              className={cn(
                'font-mono w-full border-ch-border focus-visible:ring-ch-blue pr-14',
                size === 'large' ? 'h-12 text-base' : 'h-10',
                error && 'border-ch-red focus-visible:ring-ch-red',
                vin.length === 17 && !error && 'border-green-500 focus-visible:ring-green-500'
              )}
            />
            {vin.length > 0 && (
              <span className={cn(
                'absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono font-semibold pointer-events-none',
                vin.length === 17 ? 'text-green-500' : 'text-ch-text-muted'
              )}>
                {vin.length === 17 ? '✓ 17' : `${vin.length}/17`}
              </span>
            )}
          </div>
          <Button
            type="submit"
            disabled={loading}
            className={cn(
              'bg-ch-blue hover:bg-ch-blue-dark text-white shrink-0',
              size === 'large' ? 'h-12 px-6' : 'h-10 px-4'
            )}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Search className="w-4 h-4 mr-2" />
            )}
            {buttonText}
          </Button>
        </div>
      </form>

      {error && (
        <p className="text-ch-red text-sm mt-2">{error}</p>
      )}

      {showSamples && (
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <span className="text-xs text-ch-text-muted">Sample VINs:</span>
        {sampleVins.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setVin(v)}
            className="text-xs font-mono bg-slate-100 hover:bg-ch-blue-light text-ch-text-secondary hover:text-ch-blue px-2 py-1 rounded transition-colors"
          >
            {v}
          </button>
        ))}
      </div>
      )}
    </div>
  );
}
