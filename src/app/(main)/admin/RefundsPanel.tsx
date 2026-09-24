'use client';

import { useState, useEffect } from 'react';
import { Loader2, BadgeDollarSign, MessageCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toWhatsAppNumber } from '@/lib/phone';

interface Owed {
  order_id: string;
  vin: string;
  guest_name: string | null;
  guest_email: string;
  guest_phone: string | null;
  amount_ngn: number;
  paystack_reference: string;
  created_at: string;
  report_id: string;
}

const naira = (kobo: number) => `₦${(kobo / 100).toLocaleString()}`;

export default function RefundsPanel() {
  const [owed, setOwed] = useState<Owed[]>([]);
  const [totalKobo, setTotalKobo] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const fetchOwed = () =>
    fetch('/api/admin/refunds')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && !d.error) { setOwed(d.owed || []); setTotalKobo(d.totalKobo || 0); setLoadFailed(false); }
        else setLoadFailed(true);
      })
      .catch(() => setLoadFailed(true))
      .finally(() => setLoading(false));

  useEffect(() => { fetchOwed(); }, []);

  const resolve = async (o: Owed, status: 'refunded' | 'waived') => {
    const verb = status === 'refunded' ? 'refunded' : 'waived';
    if (!window.confirm(
      `Mark ${naira(o.amount_ngn)} to ${o.guest_email} as ${verb}?\n\n` +
      `This records the decision — it does NOT move money. Issue the actual refund in Paystack first.`
    )) return;

    setBusy(o.order_id);
    setError(null);
    try {
      const res = await fetch('/api/admin/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: o.order_id, status, note: note[o.order_id] }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error); return; }
      fetchOwed();
    } catch {
      setError('Could not record the refund.');
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return <div className="surface-card p-6"><Loader2 className="w-5 h-5 animate-spin text-ch-text-muted" /></div>;
  }

  // "Couldn't load" must never look like "nobody is owed money".
  if (loadFailed) {
    return (
      <div className="border rounded-lg p-6 bg-amber-50 border-amber-200">
        <h2 className="font-semibold text-ch-text mb-1">Refunds Owed</h2>
        <p className="text-sm text-amber-800">
          Could not load the refund queue. <strong>This is not the same as nothing being owed.</strong>
        </p>
      </div>
    );
  }

  return (
    <div className={`border rounded-lg p-6 ${owed.length > 0 ? 'bg-ch-red-light border-ch-red/30' : 'bg-white border-ch-border'}`}>
      <h2 className="font-semibold text-ch-text mb-1 flex items-center gap-2">
        <BadgeDollarSign className="w-4 h-4" /> Refunds Owed ({owed.length})
      </h2>
      <p className="text-sm text-ch-text-secondary mb-4">
        Customers who paid for a report our data provider then refused to generate. Bundle credits and
        referral earnings refund themselves; a card charge cannot — it has to be issued in Paystack.
      </p>

      {owed.length === 0 ? (
        <p className="text-sm text-ch-secondary-dark">✓ Nobody is currently owed a refund.</p>
      ) : (
        <>
          <p className="text-lg font-bold text-ch-red mb-3">{naira(totalKobo)} outstanding</p>
          <div className="space-y-3">
            {owed.map((o) => {
              const wa = toWhatsAppNumber(o.guest_phone);
              return (
                <div key={o.order_id} className="bg-white/80 rounded-lg p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-ch-text text-sm">{o.guest_name || '(no name)'}</span>
                    <span className="text-sm font-bold text-ch-red">{naira(o.amount_ngn)}</span>
                    <span className="font-mono text-xs text-ch-text-muted">{o.vin}</span>
                  </div>
                  <p className="text-xs text-ch-text-muted mt-1">
                    {o.guest_email} · paid {new Date(o.created_at).toLocaleDateString()} ·{' '}
                    <span className="font-mono">{o.paystack_reference}</span>
                  </p>
                  <p className="text-xs text-ch-text-muted mt-1">
                    Search that reference in Paystack to issue the refund.
                  </p>

                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <Input
                      value={note[o.order_id] ?? ''}
                      onChange={(e) => setNote((p) => ({ ...p, [o.order_id]: e.target.value }))}
                      placeholder="Paystack refund reference (optional)"
                      className="text-xs h-8 flex-1 min-w-[200px]"
                    />
                    <Button size="sm" disabled={busy === o.order_id} onClick={() => resolve(o, 'refunded')}
                      className="bg-ch-secondary hover:bg-ch-secondary-dark text-white text-xs gap-1">
                      {busy === o.order_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      Mark refunded
                    </Button>
                    <Button size="sm" variant="outline" disabled={busy === o.order_id}
                      onClick={() => resolve(o, 'waived')} className="border-ch-border text-xs">
                      Waive
                    </Button>
                    {wa && (
                      <Button asChild size="sm" variant="outline" className="border-ch-border text-xs gap-1">
                        <a href={`https://wa.me/${wa}?text=${encodeURIComponent(
                        `Hi ${o.guest_name?.split(' ')[0] || 'there'}, this is AutoSure. We couldn't produce a report for ${o.vin}, so we're refunding your ${naira(o.amount_ngn)}.`
                      )}`} target="_blank" rel="noopener noreferrer"><MessageCircle className="w-3 h-3" /> Tell them</a>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {error && <p className="text-xs text-ch-red mt-3">{error}</p>}
    </div>
  );
}
