'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ShieldCheck, TrendingUp, MousePointerClick, Banknote, Clock, CheckCircle2 } from 'lucide-react';

interface ReferralStats {
  code: string;
  name: string;
  clicks: number;
  total_sales: number;
  total_commission_ngn: number;
  unpaid_commission_ngn: number;
}

export default function ReferralDashboard() {
  const { code } = useParams<{ code: string }>();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!code) return;
    fetch(`/api/referral/stats/${code}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError('Referral code not found.');
        else setStats(data);
      })
      .catch(() => setError('Failed to load stats.'))
      .finally(() => setLoading(false));
  }, [code]);

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n / 100);

  if (loading) {
    return (
      <div className="min-h-screen bg-ch-surface flex items-center justify-center">
        <div className="animate-pulse text-ch-text-muted text-sm">Loading your dashboard...</div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-ch-surface flex items-center justify-center px-4">
        <div className="surface-card p-8 text-center max-w-sm w-full">
          <p className="text-ch-text-muted text-sm">{error || 'Something went wrong.'}</p>
        </div>
      </div>
    );
  }

  const referralLink = `https://autosurevin.com/?ref=${stats.code}`;
  const paidCommission = stats.total_commission_ngn - stats.unpaid_commission_ngn;

  return (
    <div className="min-h-screen bg-ch-surface px-4 py-20">
      <div className="max-w-lg mx-auto space-y-6">

        {/* Header */}
        <div className="bg-ch-primary rounded-xl p-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white/80 text-xs font-medium uppercase tracking-wider">AutoSure Partner</p>
              <h1 className="text-2xl text-white">{stats.name}</h1>
            </div>
          </div>
          <div className="bg-white/10 rounded-lg px-4 py-3">
            <p className="text-white/80 text-xs mb-1">Your referral link</p>
            <p className="text-white text-sm font-mono break-all">{referralLink}</p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="surface-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <MousePointerClick className="w-4 h-4 text-ch-text-muted" />
              <p className="text-xs text-ch-text-muted font-medium">Link Clicks</p>
            </div>
            <p className="text-3xl font-bold text-ch-ink">{stats.clicks.toLocaleString()}</p>
          </div>

          <div className="surface-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-ch-text-muted" />
              <p className="text-xs text-ch-text-muted font-medium">Reports Sold</p>
            </div>
            <p className="text-3xl font-bold text-ch-ink">{stats.total_sales}</p>
          </div>

          <div className="surface-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Banknote className="w-4 h-4 text-ch-secondary" />
              <p className="text-xs text-ch-text-muted font-medium">Total Earned</p>
            </div>
            <p className="text-2xl font-bold text-ch-secondary-dark">{fmt(stats.total_commission_ngn)}</p>
          </div>

          <div className="surface-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-ch-amber" />
              <p className="text-xs text-ch-text-muted font-medium">Pending Payout</p>
            </div>
            <p className="text-2xl font-bold text-ch-amber">{fmt(stats.unpaid_commission_ngn)}</p>
          </div>
        </div>

        {/* Commission breakdown */}
        <div className="surface-card p-6">
          <h2 className="text-lg font-semibold text-ch-ink mb-4">Commission Per Sale</h2>
          <div className="space-y-3">
            {[
              { label: 'Single Report (₦15,000)', amount: '₦2,500' },
              { label: 'Triple Pack', amount: '₦5,000' },
              { label: 'Five Pack', amount: '₦7,500' },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between py-2 border-b border-ch-border last:border-0">
                <span className="text-sm text-ch-text-secondary">{row.label}</span>
                <span className="text-sm font-bold text-ch-ink">{row.amount}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Payout status */}
        {paidCommission > 0 && (
          <div className="bg-ch-secondary-light border border-ch-secondary/20 rounded-lg p-5">
            <p className="text-sm text-ch-secondary-dark font-medium inline-flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden />
              {fmt(paidCommission)} has been paid out to you
            </p>
          </div>
        )}

        <p className="text-center text-xs text-ch-text-muted pb-4">
          Payouts are processed monthly to your bank account · AutoSure
        </p>

      </div>
    </div>
  );
}
