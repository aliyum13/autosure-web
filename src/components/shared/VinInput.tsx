'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, Car } from 'lucide-react';
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

  // The green tick has to mean "this will be accepted", not "this is 17
  // characters long". Counting alone, a VIN containing O or I looked accepted
  // right up to the moment submit rejected it — the field actively reassured
  // the customer about the exact typo it was going to refuse.
  //
  // Same soft-signal rule as submit: .valid ignores checkDigitValid, so a real
  // VIN from a plant that does not conform still shows as fine here.
  const looksValid = useMemo(() => vin.length === 17 && validateVIN(vin).valid, [vin]);

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
        {size === 'large' ? (
          // The page's focal point: one tall field with the submit button
          // attached inside its right edge. The outline lives on the bar as a
          // whole (focus-within), so the input inside suppresses its own.
          <div className={cn(
            'flex items-center h-14 pl-4 pr-1.5 gap-3 bg-white border rounded-xl shadow-card transition-shadow duration-200 ease-out',
            'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ch-secondary',
            error ? 'border-ch-red' : looksValid ? 'border-ch-secondary' : 'border-ch-border'
          )}>
            <Car className="w-5 h-5 text-ch-text-muted shrink-0" aria-hidden />
            <input
              value={vin}
              onChange={(e) => {
                setVin(e.target.value.toUpperCase());
                setError('');
              }}
              placeholder={placeholder}
              maxLength={17}
              aria-label="Vehicle Identification Number (VIN)"
              aria-invalid={!!error}
              className="flex-1 min-w-0 h-full bg-transparent font-mono text-base text-ch-text placeholder:text-ch-text-muted focus-visible:outline-none"
            />
            {vin.length > 0 && (
              <span className={cn(
                'hidden sm:inline text-xs font-mono font-semibold pointer-events-none shrink-0',
                looksValid ? 'text-ch-secondary' : 'text-ch-text-muted'
              )}>
                {looksValid ? '✓ 17' : `${vin.length}/17`}
              </span>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="h-11 px-4 sm:px-5 rounded-lg bg-ch-primary hover:bg-ch-primary-dark text-white text-sm font-semibold shrink-0 transition-colors duration-200 ease-out"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin sm:mr-2" />
              ) : (
                <Search className="w-4 h-4 sm:mr-2" />
              )}
              <span className="sr-only sm:not-sr-only">{buttonText}</span>
            </Button>
          </div>
        ) : (
        <div className="flex gap-2 flex-row">
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
                'font-mono w-full h-10 border-ch-border pr-14',
                error && 'border-ch-red',
                looksValid && !error && 'border-ch-secondary'
              )}
            />
            {vin.length > 0 && (
              <span className={cn(
                'absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono font-semibold pointer-events-none',
                looksValid ? 'text-ch-secondary' : 'text-ch-text-muted'
              )}>
                {looksValid ? '✓ 17' : `${vin.length}/17`}
              </span>
            )}
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="bg-ch-primary hover:bg-ch-primary-dark text-white shrink-0 h-10 px-4"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Search className="w-4 h-4 mr-2" />
            )}
            {buttonText}
          </Button>
        </div>
        )}
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
            className="text-xs font-mono bg-ch-surface border border-ch-border hover:bg-ch-primary-light text-ch-text-secondary hover:text-ch-primary px-2 py-1 rounded-md transition-colors duration-200 ease-out"
          >
            {v}
          </button>
        ))}
      </div>
      )}
    </div>
  );
}
