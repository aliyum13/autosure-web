import Link from 'next/link';
import { Download, FileText, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { verifySession } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { Button } from '@/components/ui/button';
import LogoutButton from '@/components/dashboard/LogoutButton';
import ReferralCard from '@/components/dashboard/ReferralCard';
import { getOrCreateReferralCode, getReferralBalance, CUSTOMER_REFERRAL_REWARD_KOBO } from '@/lib/referral';
import { prisma as db } from '@/lib/db';

interface OrderRow {
  order_id: string;
  vin: string;
  amount_ngn: number;
  payment_status: string;
  bundle_id: string | null;
  bundle_count: number | null;
  created_at: string;
  report_id: string | null;
  report_status: string | null;
  has_pdf: boolean;
}

async function getDashboardData(email: string, accountId: string) {
  const [creditRows, orderRows] = await Promise.all([
    prisma.$queryRawUnsafe(
      `SELECT COALESCE(SUM(credits_total - credits_used), 0) AS available
       FROM report_credits
       WHERE LOWER(email) = LOWER($1) AND credits_used < credits_total`,
      email
    ) as Promise<Array<{ available: number | bigint }>>,
    prisma.$queryRawUnsafe(
      `SELECT o.id AS order_id, o.vin, o.amount_ngn, o.payment_status, o.bundle_id, o.bundle_count, o.created_at,
              r.id AS report_id, r.status AS report_status, (r.pdf_data IS NOT NULL) AS has_pdf
       FROM orders o
       LEFT JOIN reports r ON r.order_id = o.id
       -- Both paths deliberately. user_id is the reliable link going forward;
       -- the email match still covers anything migration 015 could not attach,
       -- such as an order placed under an address the customer later changed.
       WHERE o.user_id = $2 OR LOWER(o.guest_email) = LOWER($1)
       ORDER BY o.created_at DESC`,
      email, accountId
    ) as Promise<OrderRow[]>,
  ]);

  return {
    creditsRemaining: Number(creditRows[0]?.available ?? 0),
    orders: orderRows,
  };
}

function StatusBadge({ status }: { status: string | null }) {
  if (status === 'COMPLETED') {
    return <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full"><CheckCircle2 className="w-3 h-3" /> Ready</span>;
  }
  if (status === 'PROCESSING' || status === 'PENDING') {
    return <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full"><Clock className="w-3 h-3" /> Processing</span>;
  }
  if (status === 'FAILED') {
    return <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full"><XCircle className="w-3 h-3" /> Failed</span>;
  }
  if (status === 'INVALID_VIN') {
    return <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full"><XCircle className="w-3 h-3" /> Invalid VIN</span>;
  }
  return null;
}

// Only converted referrals count as successful — a referred checkout that was
// never paid must not be shown to the customer as a referral they earned from.
async function getReferralSummary(accountId: string, email: string) {
  try {
    const [code, balanceKobo, counts] = await Promise.all([
      getOrCreateReferralCode(accountId, 'CarHaki customer'),
      getReferralBalance(email),
      db.$queryRawUnsafe(
        `SELECT COUNT(*) FILTER (WHERE r.converted_at IS NOT NULL)::int AS confirmed,
                COUNT(*) FILTER (WHERE r.converted_at IS NULL)::int     AS pending
         FROM referrals r
         JOIN referral_codes rc ON rc.id = r.referral_code_id
         WHERE rc.owner_account_id = $1`,
        accountId
      ) as Promise<Array<{ confirmed: number; pending: number }>>,
    ]);
    return {
      code, balanceKobo,
      confirmed: Number(counts[0]?.confirmed ?? 0),
      pending: Number(counts[0]?.pending ?? 0),
    };
  } catch (e) {
    // A referral-card failure must not take down the whole dashboard, which is
    // where customers go to retrieve reports they have already paid for.
    console.warn('[dashboard] referral summary unavailable:', (e as Error).message);
    return null;
  }
}

export default async function DashboardPage() {
  const session = await verifySession();
  const { creditsRemaining, orders } = await getDashboardData(session.email, session.userId);
  const referral = await getReferralSummary(session.userId, session.email);

  return (
    <div className="min-h-screen bg-ch-bg px-4 py-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-ch-text mb-1">Your CarHaki Dashboard</h1>
            <p className="text-ch-text-secondary">{session.email}</p>
          </div>
          <LogoutButton />
        </div>

        {/* Credits remaining */}
        <div className="bg-white border border-ch-border rounded-2xl p-6 mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm text-ch-text-secondary">Bundle credits remaining</p>
            <p className="text-3xl font-bold text-ch-text">{creditsRemaining}</p>
          </div>
          <Link href="/pricing">
            <Button variant="outline" className="border-ch-border">Buy more</Button>
          </Link>
        </div>

        {referral && (
          <ReferralCard
            code={referral.code}
            shareUrl={`https://carhaki.com/?ref=${referral.code}`}
            balanceKobo={referral.balanceKobo}
            rewardKobo={CUSTOMER_REFERRAL_REWARD_KOBO}
            confirmedReferrals={referral.confirmed}
            pendingReferrals={referral.pending}
            reportPriceKobo={15000 * 100}
          />
        )}

        {/* Order history */}
        <h2 className="text-lg font-bold text-ch-text mb-4">Your Reports</h2>
        {orders.length === 0 ? (
          <div className="bg-white border border-ch-border rounded-2xl p-8 text-center">
            <FileText className="w-10 h-10 text-ch-text-muted mx-auto mb-3" />
            <p className="text-ch-text-secondary mb-4">No reports yet.</p>
            <Link href="/"><Button className="bg-ch-blue hover:bg-ch-blue-dark text-white">Check a VIN</Button></Link>
          </div>
        ) : (
          <div className="bg-white border border-ch-border rounded-2xl divide-y divide-ch-border overflow-hidden">
            {orders.map((o) => (
              <div key={o.order_id} className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-mono font-semibold text-ch-text truncate">{o.vin}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={o.report_status} />
                    <span className="text-xs text-ch-text-muted">
                      {new Date(o.created_at).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                    {o.amount_ngn > 0 && (
                      <span className="text-xs text-ch-text-muted">₦{(o.amount_ngn / 100).toLocaleString()}</span>
                    )}
                  </div>
                </div>
                {o.report_id && o.report_status === 'COMPLETED' && (
                  <div className="flex gap-2 shrink-0">
                    <Link href={`/reports/${o.report_id}`}>
                      <Button variant="outline" size="sm" className="border-ch-border">View</Button>
                    </Link>
                    <a href={`/api/reports/${o.report_id}/pdf?download=1`}>
                      <Button size="sm" className="bg-ch-blue hover:bg-ch-blue-dark text-white gap-1">
                        <Download className="w-3.5 h-3.5" /> PDF
                      </Button>
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
