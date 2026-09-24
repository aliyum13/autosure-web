'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ShieldCheck, TrendingUp, MousePointerClick, Banknote, Clock } from 'lucide-react';

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
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <div className="animate-pulse text-slate-400 text-sm">Loading your dashboard...</div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center px-4">
        <div className="bg-white rounded-none border border-slate-200 p-8 text-center max-w-sm w-full">
          <p className="text-slate-500 text-sm">{error || 'Something went wrong.'}</p>
        </div>
      </div>
    );
  }

  const referralLink = `https://autosurevin.com/?ref=${stats.code}`;
  const paidCommission = stats.total_commission_ngn - stats.unpaid_commission_ngn;

  return (
    <div className="min-h-screen bg-[#f5f5f5] px-4 py-12">
      <div className="max-w-lg mx-auto space-y-6">

        {/* Header */}
        <div className="bg-ch-primary rounded-none p-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-white/20 rounded-none flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white/80 text-xs font-medium uppercase tracking-wider">AutoSure Partner</p>
              <h1 className="text-xl font-bold">{stats.name}</h1>
            </div>
          </div>
          <div className="bg-white/10 rounded-none px-4 py-3">
            <p className="text-white/80 text-xs mb-1">Your referral link</p>
            <p className="text-white text-sm font-mono break-all">{referralLink}</p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-none border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <MousePointerClick className="w-4 h-4 text-slate-400" />
              <p className="text-xs text-slate-500 font-medium">Link Clicks</p>
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.clicks.toLocaleString()}</p>
          </div>

          <div className="bg-white rounded-none border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-slate-400" />
              <p className="text-xs text-slate-500 font-medium">Reports Sold</p>
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.total_sales}</p>
          </div>

          <div className="bg-white rounded-none border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Banknote className="w-4 h-4 text-green-500" />
              <p className="text-xs text-slate-500 font-medium">Total Earned</p>
            </div>
            <p className="text-2xl font-bold text-green-600">{fmt(stats.total_commission_ngn)}</p>
          </div>

          <div className="bg-white rounded-none border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-orange-400" />
              <p className="text-xs text-slate-500 font-medium">Pending Payout</p>
            </div>
            <p className="text-2xl font-bold text-orange-500">{fmt(stats.unpaid_commission_ngn)}</p>
          </div>
        </div>

        {/* Commission breakdown */}
        <div className="bg-white rounded-none border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Commission Per Sale</h2>
          <div className="space-y-3">
            {[
              { label: 'Single Report (₦15,000)', amount: '₦2,500' },
              { label: 'Triple Pack', amount: '₦5,000' },
              { label: 'Five Pack', amount: '₦7,500' },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <span className="text-sm text-slate-600">{row.label}</span>
                <span className="text-sm font-bold text-slate-900">{row.amount}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Payout status */}
        {paidCommission > 0 && (
          <div className="bg-green-50 border border-green-100 rounded-none p-5">
            <p className="text-sm text-green-700 font-medium">
              ✅ {fmt(paidCommission)} has been paid out to you
            </p>
          </div>
        )}

        <p className="text-center text-xs text-slate-400 pb-4">
          Payouts are processed monthly to your bank account · AutoSure
        </p>

      </div>
    </div>
  );
}
