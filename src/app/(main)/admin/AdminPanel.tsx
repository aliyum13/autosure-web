'use client';

import { useState, useEffect } from 'react';
import { Plus, Loader2, Trash2, Copy, BadgeCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import CompReportPanel from './CompReportPanel';
import ApiStatsPanel from './ApiStatsPanel';
import UndeliveredPanel from './UndeliveredPanel';
import ClearVinCreditsPanel from './ClearVinCreditsPanel';
import AlertsPanel from './AlertsPanel';
import RefundsPanel from './RefundsPanel';

interface ReferralCode {
  id: string;
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  clicks: number;
  total_sales: number;
  pending_checkouts: number;
  total_commission: number;
  unpaid_commission: number;
}

export default function AdminPanel() {
  const [codes, setCodes] = useState<ReferralCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', email: '', phone: '' });
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  // --- Stuck report recovery ---
  const [recovering, setRecovering] = useState(false);
  const [recoverLog, setRecoverLog] = useState<string[]>([]);
  const [recoverRemaining, setRecoverRemaining] = useState<number | null>(null);

  const runRecovery = async () => {
    setRecovering(true);
    setRecoverLog([]);
    let keepGoing = true;
    let count = 0;
    while (keepGoing) {
      try {
        const res = await fetch('/api/admin/recover', { method: 'POST' });
        const data = await res.json();
        if (data.done) {
          setRecoverLog(prev => [...prev, `✓ All done — no stuck reports remaining.`]);
          setRecoverRemaining(0);
          keepGoing = false;
          break;
        }
        count++;
        const p = data.processed;
        setRecoverLog(prev => [...prev, `${p.ok ? '✓' : '✗'} ${p.email} (${p.vin})${p.ok ? '' : ' — ' + p.error}`]);
        setRecoverRemaining(data.remaining);
        if (data.remaining === 0) { keepGoing = false; }
        // Safety cap
        if (count > 100) { keepGoing = false; }
      } catch (e) {
        setRecoverLog(prev => [...prev, `✗ Error: ${(e as Error).message}. Tap again to continue.`]);
        keepGoing = false;
      }
    }
    setRecovering(false);
  };

  const loadCodes = () => {
    setLoading(true);
    fetch('/api/admin/referral')
      .then((r) => r.json())
      .then((data) => setCodes(data.codes || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadCodes(); }, []);

  const createCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      const res = await fetch('/api/admin/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setForm({ code: '', name: '', email: '', phone: '' });
      loadCodes();
    } catch {
      setError('Failed to create code');
    } finally {
      setCreating(false);
    }
  };

  const [settling, setSettling] = useState<string | null>(null);
  const [settleMsg, setSettleMsg] = useState<string | null>(null);

  // Settles every confirmed, unpaid referral for a code and writes an audit
  // row. Confirms first: this is the record that money changed hands, and it
  // cannot be undone from the UI.
  const settlePayout = async (rc: ReferralCode) => {
    const naira = (rc.unpaid_commission / 100).toLocaleString();
    if (!window.confirm(
      `Mark ₦${naira} as paid to ${rc.name} (${rc.code})?

` +
      `This records that you have already sent the money. It cannot be undone here.`
    )) return;

    setSettling(rc.id);
    setSettleMsg(null);
    try {
      const res = await fetch('/api/admin/referral', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rc.id }),
      });
      const data = await res.json();
      if (!res.ok) { setSettleMsg(data.error); return; }
      setSettleMsg(`✓ Settled ₦${(data.amount_kobo / 100).toLocaleString()} to ${rc.code} across ${data.referral_count} referral(s).`);
      loadCodes();
    } catch {
      setSettleMsg('Failed to settle payout');
    } finally {
      setSettling(null);
    }
  };

  const deactivate = async (id: string) => {
    await fetch('/api/admin/referral', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    loadCodes();
  };

  const copyLink = (code: string) => {
    navigator.clipboard.writeText(`https://autosurevin.com?ref=${code}`);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) return (
    <div className="min-h-screen bg-ch-bg flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-ch-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-ch-bg py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ch-primary mb-1">Admin</p>
          <h1 className="text-2xl font-bold text-ch-text">Referral Management</h1>
        </div>

        {/* Health first: if something is broken, nothing else on this page
            matters until it isn't. */}
        <AlertsPanel />

        {/* Money owed to customers ranks above operational warnings. */}
        <RefundsPanel />

        {/* Credit warning sits above everything — a low-balance alert below the
            fold is worthless, and running out silently stops all generation. */}
        <ClearVinCreditsPanel />

        {/* Stuck report recovery */}
        <div className="bg-white border border-amber-200 rounded-none p-6">
          <h2 className="font-semibold text-ch-text mb-1">🔧 Recover Stuck Reports</h2>
          <p className="text-sm text-ch-text-secondary mb-4">
            Regenerates all paid reports stuck at PROCESSING/FAILED and emails them to customers.
            Runs one at a time; leave this open until it finishes.
          </p>
          <Button
            onClick={runRecovery}
            disabled={recovering}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {recovering ? `Recovering… ${recoverRemaining ?? ''} left` : 'Start Recovery'}
          </Button>
          {recoverRemaining !== null && !recovering && (
            <p className="text-sm font-semibold text-green-700 mt-3">
              {recoverRemaining === 0 ? '✓ All stuck reports recovered.' : `${recoverRemaining} remaining — tap again.`}
            </p>
          )}
          {recoverLog.length > 0 && (
            <div className="mt-4 max-h-64 overflow-y-auto bg-slate-50 rounded-lg p-3 text-xs font-mono space-y-1">
              {recoverLog.map((line, i) => (
                <div key={i} className={line.startsWith('✗') ? 'text-red-600' : 'text-slate-700'}>{line}</div>
              ))}
            </div>
          )}
        </div>

        <UndeliveredPanel />

        <ApiStatsPanel />

        <CompReportPanel />

        {/* Create new code */}
        <div className="bg-white border border-ch-border rounded-none p-6">
          <h2 className="font-semibold text-ch-text mb-4">Create Referral Code</h2>
          {error && <p className="text-ch-red text-sm mb-3">{error}</p>}
          <form onSubmit={createCode} className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Code (e.g. HASSAN10)</Label>
              <Input value={form.code} onChange={(e) => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                placeholder="HASSAN10" required className="mt-1 font-mono" />
            </div>
            <div>
              <Label>Influencer Name</Label>
              <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Hassan Ahmed" required className="mt-1" />
            </div>
            <div>
              <Label>Email (optional)</Label>
              <Input value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="hassan@example.com" className="mt-1" />
            </div>
            <div>
              <Label>WhatsApp (optional)</Label>
              <Input value={form.phone} onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))}
                placeholder="+234 800 000 0000" className="mt-1" />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={creating} className="bg-ch-primary-dark hover:bg-ch-ink text-white gap-2">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create Code
              </Button>
            </div>
          </form>
        </div>

        {/* Codes list */}
        <div className="bg-white border border-ch-border rounded-none overflow-hidden">
          <div className="px-5 py-4 border-b border-ch-border">
            <h2 className="font-semibold text-ch-text">Active Referral Codes ({codes.length})</h2>
            <p className="text-xs text-ch-text-muted mt-1">
              Earnings count only <strong>confirmed sales</strong> — a referred checkout that was actually paid.
              Started-but-unpaid checkouts are shown separately and are never owed.
            </p>
            {settleMsg && <p className="text-xs text-green-700 mt-2">{settleMsg}</p>}
          </div>
          {codes.length === 0 ? (
            <div className="py-12 text-center text-ch-text-muted">No referral codes yet</div>
          ) : (
            <div className="divide-y divide-ch-border">
              {codes.map((rc) => (
                <div key={rc.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-sm font-bold text-ch-primary bg-ch-primary-light px-2 py-0.5 rounded">{rc.code}</code>
                        <span className="text-sm font-medium text-ch-text">{rc.name}</span>
                        {!rc.is_active && <Badge className="bg-slate-100 text-slate-500 border-0 text-xs">Inactive</Badge>}
                      </div>
                      {(rc.email || rc.phone) && (
                        <p className="text-xs text-ch-text-muted">{rc.email} {rc.phone && `• ${rc.phone}`}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-xs text-ch-text-muted">{rc.clicks} clicks</span>
                        <span className="text-xs text-ch-green font-medium">{Number(rc.total_sales)} confirmed sales</span>
                        {Number(rc.pending_checkouts) > 0 && (
                          <span className="text-xs text-ch-text-muted" title="Checkouts started but never paid — not owed">
                            {Number(rc.pending_checkouts)} unpaid checkouts
                          </span>
                        )}
                        <span className="text-xs text-ch-amber font-medium">
                          ₦{(Number(rc.unpaid_commission) / 100).toLocaleString()} owed
                        </span>
                        <span className="text-xs text-ch-text-muted">
                          ₦{(Number(rc.total_commission) / 100).toLocaleString()} total earned
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => copyLink(rc.code)}
                        className="border-ch-border text-xs gap-1">
                        <Copy className="w-3 h-3" />
                        {copied === rc.code ? 'Copied!' : 'Copy Link'}
                      </Button>
                      {Number(rc.unpaid_commission) > 0 && (
                        <Button size="sm" variant="outline" disabled={settling === rc.id}
                          onClick={() => settlePayout(rc)}
                          className="border-ch-border text-xs gap-1 text-green-700">
                          {settling === rc.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <BadgeCheck className="w-3 h-3" />}
                          Mark paid
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => deactivate(rc.id)}
                        className="border-ch-border text-ch-red hover:text-ch-red text-xs">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
