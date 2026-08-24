'use client';

import { useState } from 'react';
import { Copy, Check, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  code: string;
  shareUrl: string;
  balanceKobo: number;
  rewardKobo: number;
  confirmedReferrals: number;
  pendingReferrals: number;
  reportPriceKobo: number;
}

const naira = (kobo: number) => `₦${(kobo / 100).toLocaleString()}`;

export default function ReferralCard({
  code, shareUrl, balanceKobo, rewardKobo,
  confirmedReferrals, pendingReferrals, reportPriceKobo,
}: Props) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const canBuy = balanceKobo >= reportPriceKobo;
  const shortfall = reportPriceKobo - balanceKobo;

  return (
    <div className="bg-white border border-ch-border rounded-2xl p-6 mb-8">
      <div className="flex items-center gap-2 mb-1">
        <Gift className="w-4 h-4 text-ch-blue" />
        <h2 className="font-semibold text-ch-text">Refer a friend</h2>
      </div>
      <p className="text-sm text-ch-text-secondary mb-5">
        Share your link. When someone buys a report with it, you earn {naira(rewardKobo)} toward your next one.
        Earnings arrive once their payment goes through — not when they sign up.
      </p>

      <div className="grid sm:grid-cols-2 gap-4 mb-5">
        <div className="bg-ch-blue-light rounded-xl p-4">
          <p className="text-xs text-ch-text-secondary mb-1">Your balance</p>
          <p className="text-2xl font-bold text-ch-blue">{naira(balanceKobo)}</p>
          <p className="text-xs text-ch-text-muted mt-1">
            {canBuy
              ? 'Enough for a free report — it will be offered at checkout.'
              : `${naira(shortfall)} more for a free report.`}
          </p>
        </div>
        <div className="bg-slate-50 rounded-xl p-4">
          <p className="text-xs text-ch-text-secondary mb-1">Successful referrals</p>
          <p className="text-2xl font-bold text-ch-text">{confirmedReferrals}</p>
          {pendingReferrals > 0 && (
            <p className="text-xs text-ch-text-muted mt-1">
              {pendingReferrals} started checkout but haven&apos;t paid yet.
            </p>
          )}
        </div>
      </div>

      <label className="text-xs font-semibold uppercase tracking-wide text-ch-text-muted">Your link</label>
      <div className="flex gap-2 mt-1">
        <input
          readOnly
          value={shareUrl}
          onFocus={(e) => e.currentTarget.select()}
          className="flex-1 min-w-0 rounded-lg border border-ch-border bg-slate-50 px-3 py-2 text-sm font-mono text-ch-text"
        />
        <Button onClick={copy} variant="outline" className="border-ch-border shrink-0 gap-1">
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <p className="text-xs text-ch-text-muted mt-2">
        Your code is <span className="font-mono font-semibold">{code}</span> — it can also be typed at checkout.
      </p>
    </div>
  );
}
