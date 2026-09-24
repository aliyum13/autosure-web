'use client';

import { useState, useEffect } from 'react';
import { Loader2, Search, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PriorOrder {
  id: string;
  vin: string;
  guest_name: string;
  amount_ngn: number;
  paid_at: string | null;
  created_at: string;
  report_id: string | null;
  report_status: string | null;
}

interface LogRow {
  id: string;
  admin_email: string;
  order_id: string;
  linked_order_id: string | null;
  vin: string;
  guest_email: string;
  reason: string | null;
  created_at: string;
}

export default function CompReportPanel() {
  const [email, setEmail] = useState('');
  const [looking, setLooking] = useState(false);
  const [priorOrders, setPriorOrders] = useState<PriorOrder[] | null>(null);
  const [lookupError, setLookupError] = useState('');

  const [linkedOrderId, setLinkedOrderId] = useState('');
  const [reason, setReason] = useState('');
  const [vin, setVin] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitOk, setSubmitOk] = useState('');

  const [log, setLog] = useState<LogRow[]>([]);
  const [logLoading, setLogLoading] = useState(true);

  const loadLog = () => {
    setLogLoading(true);
    fetch('/api/admin/comp-report')
      .then((r) => r.json())
      .then((data) => setLog(data.log || []))
      .catch(() => {})
      .finally(() => setLogLoading(false));
  };

  useEffect(() => { loadLog(); }, []);

  const lookupOrders = async () => {
    setLookupError('');
    setPriorOrders(null);
    setLinkedOrderId('');
    if (!email.trim()) return;
    setLooking(true);
    try {
      const res = await fetch(`/api/admin/comp-report/orders?email=${encodeURIComponent(email.trim())}`);
      const data = await res.json();
      if (!res.ok) { setLookupError(data.error || 'Lookup failed'); return; }
      setPriorOrders(data.orders || []);
    } catch {
      setLookupError('Lookup failed');
    } finally {
      setLooking(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitOk('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/comp-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vin, guest_name: name, guest_email: email,
          linked_order_id: linkedOrderId || undefined,
          reason: linkedOrderId ? undefined : reason,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setSubmitError(data.error); return; }
      setSubmitOk(`Sent — report ${data.report_id}`);
      setVin(''); setName(''); setReason(''); setLinkedOrderId('');
      loadLog();
    } catch {
      setSubmitError('Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="surface-card p-6">
      <h2 className="font-semibold text-ch-text mb-1 flex items-center gap-2"><Gift className="w-4 h-4" /> Issue Comp Report</h2>
      <p className="text-sm text-ch-text-secondary mb-4">
        For &quot;paid but didn&apos;t receive report&quot; cases. Must link to the customer&apos;s original paid order, or give an explicit reason if there isn&apos;t one.
      </p>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label>Customer email</Label>
          <div className="flex gap-2 mt-1">
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="customer@example.com" type="email" required />
            <Button type="button" variant="outline" onClick={lookupOrders} disabled={looking} className="border-ch-border shrink-0 gap-1">
              {looking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Look up orders
            </Button>
          </div>
          {lookupError && <p className="text-xs text-ch-red mt-1">{lookupError}</p>}
        </div>

        {priorOrders !== null && (
          <div className="bg-ch-surface rounded-lg p-3">
            {priorOrders.length === 0 ? (
              <p className="text-xs text-ch-text-secondary">No paid orders found for this email. You&apos;ll need to give a reason below.</p>
            ) : (
              <>
                <p className="text-xs font-semibold text-ch-text-secondary mb-2">Select the order this comp report is for:</p>
                <div className="space-y-1">
                  {priorOrders.map((o) => (
                    <label key={o.id} className="flex items-center gap-2 text-xs">
                      <input type="radio" name="linkedOrder" value={o.id} checked={linkedOrderId === o.id}
                        onChange={() => setLinkedOrderId(o.id)} />
                      <span className="font-mono">{o.vin}</span>
                      <span className="text-ch-text-muted">₦{(o.amount_ngn / 100).toLocaleString()} · {new Date(o.created_at).toLocaleDateString()} · {o.report_status || 'no report'}</span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {!linkedOrderId && (
          <div>
            <Label>Reason (required if not linking a prior order)</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. goodwill credit, support escalation #123" className="mt-1" />
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>VIN to generate</Label>
            <Input value={vin} onChange={(e) => setVin(e.target.value.toUpperCase())} placeholder="17-character VIN" required className="mt-1 font-mono" />
          </div>
          <div>
            <Label>Customer name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Customer full name" required className="mt-1" />
          </div>
        </div>

        {submitError && <p className="text-sm text-ch-red">{submitError}</p>}
        {submitOk && <p className="text-sm text-ch-secondary-dark">{submitOk}</p>}
        <Button type="submit" disabled={submitting} className="bg-ch-primary hover:bg-ch-primary-dark text-white gap-2">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
          Issue Free Report
        </Button>
      </form>

      <div className="mt-6 pt-4 border-t border-ch-border">
        <h3 className="text-sm font-semibold text-ch-text mb-2">Recent comp reports ({log.length})</h3>
        {logLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-ch-text-muted" />
        ) : log.length === 0 ? (
          <p className="text-xs text-ch-text-muted">None yet.</p>
        ) : (
          <div className="max-h-64 overflow-y-auto space-y-1">
            {log.map((l) => (
              <div key={l.id} className="text-xs bg-ch-surface rounded p-2">
                <span className="font-semibold">{l.admin_email}</span> issued <span className="font-mono">{l.vin}</span> to {l.guest_email}
                {l.linked_order_id ? <span> — linked to order <span className="font-mono">{l.linked_order_id}</span></span> : <span className="text-amber-700"> — no linked order: &quot;{l.reason}&quot;</span>}
                <span className="text-ch-text-muted"> · {new Date(l.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
