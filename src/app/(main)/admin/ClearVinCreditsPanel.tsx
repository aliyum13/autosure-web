'use client';

import { useState, useEffect } from 'react';
import { Loader2, Gauge, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Estimate {
  synced: boolean;
  knownBalance: number | null;
  syncedAt: string | null;
  recordedBy: string | null;
  note: string | null;
  chargedSince: number;
  failedSince: number;
  estimate: number | null;
  lowThreshold: number;
  isLow: boolean;
  baselineStale: boolean;
  previousEstimateAtSync: number | null;
}

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-NG', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

export default function ClearVinCreditsPanel() {
  const [data, setData] = useState<Estimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [balance, setBalance] = useState('');
  const [threshold, setThreshold] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [driftMsg, setDriftMsg] = useState('');

  // State set only from async callbacks, never synchronously in the effect —
  // `loading` already starts true. Same shape as ApiStatsPanel.
  const fetchEstimate = () =>
    fetch('/api/admin/clearvin-credits')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d && !d.error) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => { fetchEstimate(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setDriftMsg('');
    setSaving(true);
    try {
      const res = await fetch('/api/admin/clearvin-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ known_balance: balance, low_threshold: threshold, note }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error); return; }

      // Drift is the useful part of recording a sync: it says whether our
      // counting matches reality, which is how we find out that something we
      // treat as free is actually being billed.
      if (d.drift !== null && d.drift !== undefined) {
        const dr = d.drift as number;
        setDriftMsg(
          dr === 0
            ? `Estimate was exactly right (predicted ${d.estimate_at_sync}).`
            : dr > 0
              ? `We predicted ${d.estimate_at_sync}, actual ${d.known_balance} — running ${dr} optimistic. Sustained drift this way means something we count as free is being billed.`
              : `We predicted ${d.estimate_at_sync}, actual ${d.known_balance} — running ${Math.abs(dr)} pessimistic.`
        );
      }
      setBalance(''); setThreshold(''); setNote(''); setOpen(false);
      fetchEstimate();
    } catch {
      setError('Could not record the balance.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-ch-border rounded-xl p-6">
        <Loader2 className="w-5 h-5 animate-spin text-ch-text-muted" />
      </div>
    );
  }

  const alarm = !!data?.isLow || !!data?.baselineStale || !data?.synced;
  const shell = data?.isLow
    ? 'bg-red-50 border-red-200'
    : alarm ? 'bg-amber-50 border-amber-200' : 'bg-white border-ch-border';

  return (
    <div className={`border rounded-xl p-6 ${shell}`}>
      <h2 className="font-semibold text-ch-text mb-1 flex items-center gap-2">
        {alarm ? <AlertTriangle className="w-4 h-4 text-amber-600" /> : <Gauge className="w-4 h-4" />}
        ClearVin Credits
      </h2>

      {/* Never warn off nothing: with no baseline there is no estimate to make. */}
      {!data?.synced && (
        <p className="text-sm text-ch-text-secondary">
          Not synced yet — record the number Daria last reported to start estimating.
        </p>
      )}

      {/* A baseline older than log retention undercounts usage, so the estimate
          would read HIGH. Showing nothing beats showing a reassuring lie. */}
      {data?.synced && data.baselineStale && (
        <p className="text-sm text-amber-800">
          Baseline from {when(data.syncedAt!)} is older than the 90-day log retention, so usage since
          then can no longer be counted. <strong>Estimate suppressed</strong> — re-sync with Daria.
        </p>
      )}

      {data?.synced && !data.baselineStale && (
        <>
          {data.isLow ? (
            <p className="text-lg font-bold text-red-700">
              ⚠️ Estimated ClearVin credits low: ~{data.estimate} remaining. Confirm with Daria.
            </p>
          ) : (
            <p className="text-2xl font-bold text-ch-text">
              ~{data.estimate} <span className="text-sm font-normal text-ch-text-secondary">reports left (estimated)</span>
            </p>
          )}

          {data.estimate === 0 && (
            <p className="text-sm text-red-700 font-medium mt-1">
              May already be exhausted — report generation will start failing.
            </p>
          )}

          <p className="text-xs text-ch-text-muted mt-2">
            Last synced <strong>{data.knownBalance}</strong> on {when(data.syncedAt!)} by {data.recordedBy}
            {data.note && <> · {data.note}</>}
            {' · '}{data.chargedSince} charged {data.chargedSince === 1 ? 'call' : 'calls'} since
          </p>

          {data.failedSince > 0 && (
            <p className="text-xs text-amber-700 mt-1">
              {data.failedSince} failed ClearVin {data.failedSince === 1 ? 'call' : 'calls'} not counted — actual usage may be higher.
            </p>
          )}

          <p className="text-xs text-ch-text-muted mt-2">
            Estimated from our own call log, not a live ClearVin figure. Warns at {data.lowThreshold}.
          </p>
        </>
      )}

      {driftMsg && <p className="text-xs text-ch-blue mt-3 bg-white/70 rounded-lg px-3 py-2">{driftMsg}</p>}

      <div className="mt-4">
        <Button size="sm" variant="outline" onClick={() => setOpen(!open)} className="border-ch-border text-xs gap-1">
          <RefreshCw className="w-3 h-3" /> {open ? 'Cancel' : 'Sync balance'}
        </Button>
      </div>

      {open && (
        <form onSubmit={submit} className="mt-3 bg-white/80 rounded-lg p-4 grid sm:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Reports remaining</Label>
            <Input value={balance} onChange={(e) => setBalance(e.target.value)} inputMode="numeric"
              placeholder="127" required className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Warn below (optional)</Label>
            <Input value={threshold} onChange={(e) => setThreshold(e.target.value)} inputMode="numeric"
              placeholder={String(data?.lowThreshold ?? 20)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Note (optional)</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="Daria, WhatsApp" className="mt-1" />
          </div>
          <div className="sm:col-span-3 flex items-center gap-3">
            <Button type="submit" disabled={saving} className="bg-ch-blue hover:bg-ch-blue-dark text-white text-xs gap-1">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : null} Record
            </Button>
            <span className="text-xs text-ch-text-muted">
              Record it when Daria reports it, not later — usage is counted from this moment.
            </span>
          </div>
          {error && <p className="sm:col-span-3 text-xs text-red-600">{error}</p>}
        </form>
      )}
    </div>
  );
}
