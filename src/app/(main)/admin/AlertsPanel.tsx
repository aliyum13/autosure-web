'use client';

import { useState, useEffect } from 'react';
import { Loader2, ShieldAlert, ShieldCheck, MailWarning } from 'lucide-react';

interface Alert {
  id: string;
  probe: string;
  severity: string;
  detail: string;
  notified_at: string | null;
  created_at: string;
  emailFailed: boolean;
}

interface Data {
  openAlerts: Alert[];
  recentlyResolved: Array<{ probe: string; detail: string; created_at: string; resolved_at: string }>;
  heartbeat: { lastRun: string | null; minutesSince: number | null; note: string | null; stale: boolean };
}

const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
};

export default function AlertsPanel() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  // Distinguished from "loaded and healthy". Without this the panel renders
  // "all probes healthy" whenever the health API itself is unreachable — a
  // monitor that reports success when it cannot see anything is worse than no
  // monitor, because it is actively reassuring.
  const [loadFailed, setLoadFailed] = useState(false);

  // State set only from async callbacks; `loading` starts true. Same shape as
  // ApiStatsPanel.
  const fetchAlerts = () =>
    fetch('/api/admin/alerts')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && !d.error) { setData(d); setLoadFailed(false); }
        else setLoadFailed(true);
      })
      .catch(() => setLoadFailed(true))
      .finally(() => setLoading(false));

  useEffect(() => { fetchAlerts(); }, []);

  if (loading) {
    return (
      <div className="bg-white border border-ch-border rounded-xl p-6">
        <Loader2 className="w-5 h-5 animate-spin text-ch-text-muted" />
      </div>
    );
  }

  if (loadFailed) {
    return (
      <div className="border rounded-xl p-6 bg-amber-50 border-amber-200">
        <h2 className="font-semibold text-ch-text mb-1 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600" /> System Health
        </h2>
        <p className="text-sm text-amber-800">
          Could not load health status. <strong>This is not the same as healthy</strong> — the
          monitoring data is unreachable, so there may be active alerts you cannot see here.
          Check the runtime logs directly.
        </p>
      </div>
    );
  }

  const open = data?.openAlerts ?? [];
  const hb = data?.heartbeat;
  const critical = open.some((a) => a.severity === 'critical');
  const shell = critical ? 'bg-red-50 border-red-200'
    : open.length > 0 || hb?.stale ? 'bg-amber-50 border-amber-200'
    : 'bg-white border-ch-border';

  return (
    <div className={`border rounded-xl p-6 ${shell}`}>
      <h2 className="font-semibold text-ch-text mb-1 flex items-center gap-2">
        {open.length > 0 ? <ShieldAlert className="w-4 h-4 text-red-600" /> : <ShieldCheck className="w-4 h-4 text-green-600" />}
        System Health
      </h2>

      {/* A stopped cron looks identical to a healthy system, so say so loudly. */}
      {hb?.stale && (
        <p className="text-sm text-amber-800 font-medium mb-3">
          ⚠ Healthcheck hasn&apos;t run {hb.lastRun ? `in ${hb.minutesSince} minutes` : 'at all'} — monitoring
          may be down, so &quot;no alerts&quot; below cannot be trusted.
        </p>
      )}

      {open.length === 0 ? (
        <p className="text-sm text-green-700">
          ✓ All probes healthy{hb?.lastRun && !hb.stale ? ` — last checked ${ago(hb.lastRun)}` : ''}.
        </p>
      ) : (
        <div className="space-y-2">
          {open.map((a) => (
            <div key={a.id} className="bg-white/70 rounded-lg p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  a.severity === 'critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
                }`}>{a.severity}</span>
                <span className="font-mono text-sm font-medium text-ch-text">{a.probe}</span>
                <span className="text-xs text-ch-text-muted">failing since {ago(a.created_at)}</span>
              </div>
              <p className="text-xs text-ch-text-secondary mt-1 break-words">{a.detail}</p>
              {/* Worse than the alert itself: it means the push channel is down. */}
              {a.emailFailed && (
                <p className="text-xs text-red-700 mt-1 flex items-center gap-1">
                  <MailWarning className="w-3 h-3" /> Raised but the alert email failed — this panel is the only notice.
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {(data?.recentlyResolved?.length ?? 0) > 0 && (
        <details className="mt-4">
          <summary className="text-xs text-ch-text-muted cursor-pointer">
            Recently resolved ({data!.recentlyResolved.length})
          </summary>
          <div className="mt-2 space-y-1">
            {data!.recentlyResolved.map((r, i) => (
              <p key={i} className="text-xs text-ch-text-muted">
                <span className="font-mono">{r.probe}</span> — recovered {ago(r.resolved_at)}
              </p>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
