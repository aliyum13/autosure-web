'use client';

import { useState, useEffect } from 'react';
import { Loader2, Activity, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StatRow {
  service: string;
  operation: string;
  calls_24h: number;
  errors_24h: number;
  calls_7d: number;
  errors_7d: number;
}

interface ErrorRow {
  service: string;
  operation: string;
  error_message: string | null;
  created_at: string;
}

const SERVICE_LABELS: Record<string, string> = {
  clearvin: 'ClearVin',
  paystack: 'Paystack',
  resend: 'Resend',
};

function rate(errors: number, calls: number): string {
  if (calls === 0) return '—';
  return `${((errors / calls) * 100).toFixed(1)}%`;
}

function rateClass(errors: number, calls: number): string {
  if (calls === 0) return 'text-ch-text-muted';
  const pct = (errors / calls) * 100;
  if (pct === 0) return 'text-ch-secondary-dark';
  if (pct < 10) return 'text-amber-700';
  return 'text-ch-red font-semibold';
}

interface CronRun {
  job: string;
  rows_deleted: number;
  note: string | null;
  created_at: string;
}

export default function ApiStatsPanel() {
  const [stats, setStats] = useState<StatRow[]>([]);
  const [errors, setErrors] = useState<ErrorRow[]>([]);
  const [cronRuns, setCronRuns] = useState<CronRun[]>([]);
  const [loading, setLoading] = useState(true);

  // State is only set from async callbacks here, never synchronously in the
  // effect body below — `loading` already starts true, so the initial render
  // shows the spinner without an extra synchronous set.
  const fetchStats = () =>
    fetch('/api/admin/api-stats')
      .then((r) => r.json())
      .then((data) => {
        setStats(data.stats || []);
        setErrors(data.recentErrors || []);
        setCronRuns(data.cronRuns || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

  // Refresh button — unlike the initial load, this does want the spinner back.
  const load = () => {
    setLoading(true);
    fetchStats();
  };

  useEffect(() => { fetchStats(); }, []);

  // Group by service so each provider reads as its own block.
  const services = Array.from(new Set(stats.map((s) => s.service)));

  return (
    <div className="surface-card p-6">
      <div className="flex items-start justify-between mb-1">
        <h2 className="font-semibold text-ch-text flex items-center gap-2"><Activity className="w-4 h-4" /> API Call Monitoring</h2>
        <Button type="button" variant="outline" size="sm" onClick={load} disabled={loading} className="border-ch-border gap-1">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Refresh
        </Button>
      </div>
      <p className="text-sm text-ch-text-secondary mb-4">
        Outbound calls to ClearVin, Paystack and Resend. Watch for call-count spikes (duplicate charges) and non-zero error rates.
      </p>

      {loading && stats.length === 0 ? (
        <Loader2 className="w-5 h-5 animate-spin text-ch-text-muted" />
      ) : stats.length === 0 ? (
        <p className="text-xs text-ch-text-muted">No calls recorded yet.</p>
      ) : (
        <div className="space-y-4">
          {services.map((svc) => (
            <div key={svc}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ch-primary mb-1">{SERVICE_LABELS[svc] || svc}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-ch-text-muted border-b border-ch-border">
                      <th className="text-left font-medium py-1.5 pr-3">Operation</th>
                      <th className="text-right font-medium py-1.5 px-2">24h calls</th>
                      <th className="text-right font-medium py-1.5 px-2">24h errors</th>
                      <th className="text-right font-medium py-1.5 px-2">24h rate</th>
                      <th className="text-right font-medium py-1.5 px-2">7d calls</th>
                      <th className="text-right font-medium py-1.5 px-2">7d errors</th>
                      <th className="text-right font-medium py-1.5 pl-2">7d rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.filter((s) => s.service === svc).map((s) => (
                      <tr key={`${s.service}-${s.operation}`} className="border-b border-ch-border/50 last:border-0">
                        <td className="py-1.5 pr-3 font-mono">{s.operation}</td>
                        <td className="text-right py-1.5 px-2">{s.calls_24h}</td>
                        <td className="text-right py-1.5 px-2">{s.errors_24h}</td>
                        <td className={`text-right py-1.5 px-2 ${rateClass(s.errors_24h, s.calls_24h)}`}>{rate(s.errors_24h, s.calls_24h)}</td>
                        <td className="text-right py-1.5 px-2 text-ch-text-muted">{s.calls_7d}</td>
                        <td className="text-right py-1.5 px-2 text-ch-text-muted">{s.errors_7d}</td>
                        <td className={`text-right py-1.5 pl-2 ${rateClass(s.errors_7d, s.calls_7d)}`}>{rate(s.errors_7d, s.calls_7d)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-ch-border">
        <h3 className="text-sm font-semibold text-ch-text mb-2">Log retention (auto-prune, daily)</h3>
        {cronRuns.length === 0 ? (
          <p className="text-xs text-ch-text-muted">
            No prune runs recorded yet. Runs daily at 03:17 UTC and deletes call-log rows older than 90 days.
          </p>
        ) : (
          <div className="max-h-40 overflow-y-auto space-y-1">
            {cronRuns.map((c, i) => (
              <div key={i} className={`text-xs rounded p-2 ${c.note?.startsWith('FAILED') ? 'bg-ch-red-light' : 'bg-ch-surface'}`}>
                <span className="font-mono">{c.job}</span>
                <span className="text-ch-text-secondary"> — {c.rows_deleted} row{c.rows_deleted === 1 ? '' : 's'} deleted</span>
                {c.note && <span className={c.note.startsWith('FAILED') ? 'text-ch-red' : 'text-ch-amber'}> · {c.note}</span>}
                <span className="text-ch-text-muted"> · {new Date(c.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-ch-border">
        <h3 className="text-sm font-semibold text-ch-text mb-2">Recent failures ({errors.length})</h3>
        {errors.length === 0 ? (
          <p className="text-xs text-ch-secondary-dark">No failures in the last 7 days.</p>
        ) : (
          <div className="max-h-64 overflow-y-auto space-y-1">
            {errors.map((e, i) => (
              <div key={i} className="text-xs bg-ch-red-light rounded p-2">
                <span className="font-semibold">{SERVICE_LABELS[e.service] || e.service}</span>
                <span className="font-mono"> {e.operation}</span>
                {e.error_message && <span className="text-ch-red"> — {e.error_message}</span>}
                <span className="text-ch-text-muted"> · {new Date(e.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
