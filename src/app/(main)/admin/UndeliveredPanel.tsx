'use client';

import { useState, useEffect } from 'react';
import { Loader2, MailX, MessageCircle, Copy, Check, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toWhatsAppNumber } from '@/lib/phone';

interface BlockRow {
  id: string;
  email: string;
  context: string;
  origin: string | null;
  created_at: string;
  order_id: string | null;
  report_id: string | null;
  report_status: string | null;
  vin: string | null;
  guest_name: string | null;
  guest_phone: string | null;
  amount_ngn: number | null;
}

function OriginBadge({ origin }: { origin: string | null }) {
  const map: Record<string, { cls: string; text: string }> = {
    bounce: { cls: 'bg-amber-50 text-amber-700', text: 'Bounced — likely a typo' },
    complaint: { cls: 'bg-red-50 text-red-700', text: 'Spam complaint — do NOT re-mail' },
    manual: { cls: 'bg-slate-100 text-slate-600', text: 'Manually suppressed' },
  };
  const m = map[origin || ''] || { cls: 'bg-slate-100 text-slate-600', text: 'Suppressed — reason unknown' };
  return <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${m.cls}`}>{m.text}</span>;
}

export default function UndeliveredPanel() {
  const [rows, setRows] = useState<BlockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);
  // Panel-level, not per-row: a successful correction removes its own row from
  // the list, so a message anchored to that row would vanish before it's read.
  const [banner, setBanner] = useState<string | null>(null);

  // Same split as ApiStatsPanel: state is only set from async callbacks here,
  // never synchronously in the effect body — `loading` already starts true, so
  // the first render shows the spinner without an extra synchronous set.
  const fetchRows = () =>
    fetch('/api/admin/undelivered')
      .then((r) => r.json())
      .then((d) => setRows(d.rows || []))
      .catch(() => {})
      .finally(() => setLoading(false));

  // After an action resolves a row, refresh silently — flashing the whole panel
  // back to a spinner would hide the confirmation banner that just appeared.
  const load = () => { fetchRows(); };

  useEffect(() => { fetchRows(); }, []);

  const reportUrl = (id: string) => `https://carhaki.com/reports/${id}`;

  const copyLink = (row: BlockRow) => {
    if (!row.report_id) return;
    navigator.clipboard.writeText(reportUrl(row.report_id));
    setCopied(row.id);
    setTimeout(() => setCopied(null), 2000);
  };

  const resolve = async (row: BlockRow, resolution: 'whatsapp' | 'other') => {
    setBusy(row.id);
    setRowError(null);
    try {
      const res = await fetch('/api/admin/undelivered', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, resolution }),
      });
      const data = await res.json();
      if (!res.ok) { setRowError({ id: row.id, message: data.error }); return; }
      load();
    } catch {
      setRowError({ id: row.id, message: 'Failed to update' });
    } finally {
      setBusy(null);
    }
  };

  const correctEmail = async (row: BlockRow) => {
    setBusy(row.id);
    setRowError(null);
    setBanner(null);
    try {
      const res = await fetch('/api/admin/undelivered', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, new_email: newEmail }),
      });
      const data = await res.json();
      if (!res.ok) { setRowError({ id: row.id, message: data.error }); return; }
      // The address is updated even when the re-send fails, so say which
      // happened rather than a blanket "done". The row count is called out
      // because a correction clears every row for that customer, and rows
      // vanishing without explanation looks like a glitch.
      const extra = data.blocks_resolved > 1 ? ` ${data.blocks_resolved} rows cleared.` : '';
      setBanner(data.sent
        ? `✓ ${row.email} → ${newEmail} — report re-sent.${extra}`
        : `Address updated to ${newEmail}, but the send failed: ${data.error}${extra}`);
      setEditing(null);
      setNewEmail('');
      load();
    } catch {
      setRowError({ id: row.id, message: 'Failed to update' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="bg-white border border-ch-border rounded-xl p-6">
      <h2 className="font-semibold text-ch-text mb-1 flex items-center gap-2">
        <MailX className="w-4 h-4" /> Undelivered Reports ({rows.length})
      </h2>
      <p className="text-sm text-ch-text-secondary mb-4">
        Customers whose email is on Resend&apos;s suppression list. We cannot mail them at all — not the report,
        not a login code — so reach them on WhatsApp and send the report link, which works without logging in.
      </p>

      {banner && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 mb-4">{banner}</p>}

      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-ch-text-muted" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-green-700">✓ Nothing undelivered — every customer is reachable.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const wa = toWhatsAppNumber(row.guest_phone);
            const ready = row.report_status === 'COMPLETED' && !!row.report_id;
            const waText = ready
              ? `Hi ${row.guest_name?.split(' ')[0] || 'there'}, this is CarHaki. We could not deliver your report by email, so here is your link: ${reportUrl(row.report_id!)}`
              : `Hi ${row.guest_name?.split(' ')[0] || 'there'}, this is CarHaki about your vehicle report — we could not reach you by email.`;

            return (
              <div key={row.id} className="border border-ch-border rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-medium text-ch-text text-sm">{row.guest_name || '(no name on file)'}</span>
                  <OriginBadge origin={row.origin} />
                  {row.context === 'otp_login' && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                      Locked out of login
                    </span>
                  )}
                </div>
                <p className="text-xs text-ch-text-muted">
                  {row.email}
                  {row.vin && <> · <span className="font-mono">{row.vin}</span></>}
                  {row.report_status && <> · report {row.report_status}</>}
                  {' · '}{new Date(row.created_at).toLocaleString()}
                </p>

                {!wa && (
                  <p className="text-xs text-amber-700 mt-2">
                    ⚠ No phone on file — email was the only channel we had. Watch for them to contact support.
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2 mt-3">
                  {wa && (
                    <a href={`https://wa.me/${wa}?text=${encodeURIComponent(waText)}`} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs gap-1">
                        <MessageCircle className="w-3 h-3" /> WhatsApp {row.guest_phone}
                      </Button>
                    </a>
                  )}
                  {ready && (
                    <Button size="sm" variant="outline" onClick={() => copyLink(row)} className="border-ch-border text-xs gap-1">
                      {copied === row.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copied === row.id ? 'Copied!' : 'Copy report link'}
                    </Button>
                  )}
                  {/* Hidden for complaints: that mailbox works fine — the customer
                      marked us spam, and re-routing to another address to get
                      around that is not something to make one click away. */}
                  {row.origin !== 'complaint' && row.order_id && (
                    <Button size="sm" variant="outline" onClick={() => { setEditing(editing === row.id ? null : row.id); setNewEmail(''); setRowError(null); }}
                      className="border-ch-border text-xs gap-1">
                      <Pencil className="w-3 h-3" /> Fix email address
                    </Button>
                  )}
                  <Button size="sm" variant="outline" disabled={busy === row.id} onClick={() => resolve(row, 'whatsapp')}
                    className="border-ch-border text-xs">
                    {busy === row.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Mark delivered'}
                  </Button>
                </div>

                {editing === row.id && (
                  <div className="mt-3 bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-ch-text-secondary mb-2">
                      Confirm the correct address with the customer first. This updates their order and re-sends the
                      report — no new ClearVin charge — and lets them log in with the new address.
                    </p>
                    <div className="flex gap-2">
                      <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} type="email"
                        placeholder="corrected@example.com" className="text-sm" />
                      <Button size="sm" disabled={busy === row.id || !newEmail.trim()} onClick={() => correctEmail(row)}
                        className="bg-ch-blue hover:bg-ch-blue-dark text-white text-xs shrink-0">
                        {busy === row.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Update & re-send'}
                      </Button>
                    </div>
                  </div>
                )}

                {rowError?.id === row.id && <p className="text-xs text-red-600 mt-2">{rowError.message}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
