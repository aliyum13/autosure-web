'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, ShieldCheck, Lock, LockOpen, X, CheckCircle2, Users, Gauge, FileText, AlertTriangle, ShoppingCart, Flame, Tag, Car, Shield, Link2, SearchX, OctagonAlert, Camera, Wallet, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type SummaryCard = {
  icon: React.ReactNode;
  label: string;
  value: string;
  status: 'ok' | 'warn' | 'lock';
};

type VehiclePreview = {
  vin: string;
  make?: string;
  model?: string;
  year?: number;
  trim?: string;
  engine?: string;
  fuel_type?: string;
  drive_type?: string;
  body_type?: string;
  country_of_manufacture?: string;
  recall_count?: number;
  preview_image?: string;
  images_count?: number;
  ownership_records?: number;
  odometer_reading?: string;
  title_records?: number;
  sale_records?: number;
  junk_salvage_records?: number;
  title_brand_records?: number;
  accident_records?: number;
  insurance_records?: number;
  lien_records?: number;
  source?: string;
  fallback_reason?: 'vin_rejected' | 'no_records' | 'error';
};

const BUNDLES = [
  { id: 'single', label: 'Single Report', count: 1, price: 15000, perReport: 15000, saving: null, badge: null },
  { id: 'triple', label: '3 Reports', count: 3, price: 35000, perReport: 11667, saving: '₦10,000 off', badge: 'Popular' },
  { id: 'five', label: '5 Reports', count: 5, price: 50000, perReport: 10000, saving: '₦25,000 off', badge: 'Best Value' },
];

export default function PreviewPage() {
  const { vin } = useParams<{ vin: string }>();
  const router = useRouter();
  const [preview, setPreview] = useState<VehiclePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedBundle, setSelectedBundle] = useState('single');
  const [form, setForm] = useState({ name: '', email: '', phone: '', ref_code: '' });
  const [availableCredits, setAvailableCredits] = useState(0);
  // Referral wallet, for logged-in customers only. /api/referral/me is
  // session-gated and returns 401 when signed out — silently ignored, since
  // checkout must keep working for guests.
  const [earningsKobo, setEarningsKobo] = useState(0);

  // The ISO 3779 check digit was already being computed by validateVIN and
  // thrown away — nothing in the app read it. It is the one signal available
  // for free, before any network call, that distinguishes a mistyped VIN from
  // a real vehicle our provider simply does not hold.
  const [checkDigitOk, setCheckDigitOk] = useState<boolean | null>(null);
  useEffect(() => {
    import('@/lib/vin')
      .then(({ validateVIN }) => setCheckDigitOk(validateVIN(vin).checkDigitValid ?? null))
      .catch(() => {});
  }, [vin]);

  const checkCredits = async (email: string) => {
    if (!email || !email.includes('@')) { setAvailableCredits(0); return; }
    try {
      const res = await fetch(`/api/credits/check?email=${encodeURIComponent(email.trim())}`);
      const data = await res.json();
      setAvailableCredits(data.credits || 0);
    } catch { setAvailableCredits(0); }
  };

  // Who is buying, if anyone is signed in. Drives prefill AND the warning
  // below: orders are attributed to the account, so sending the report to a
  // different address deliberately detaches it from their dashboard.
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [editingEmail, setEditingEmail] = useState(false);

  useEffect(() => {
    fetch('/api/referral/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.balance_kobo) setEarningsKobo(d.balance_kobo); })
      .catch(() => {});

    // 401 when signed out, ignored — guest checkout must keep working exactly
    // as before, with an empty form.
    fetch('/api/account/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.signedIn || !d.email) return;
        setAccountEmail(d.email);
        setForm((p) => ({
          ...p,
          // Never clobber anything already typed.
          name: p.name || d.name || '',
          email: p.email || d.email,
          phone: p.phone || d.phone || '',
        }));
        checkCredits(d.email);
      })
      .catch(() => {});
  }, []);

  const [refValid, setRefValid] = useState<boolean | null>(null);
  const [ordering, setOrdering] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [orderError, setOrderError] = useState('');

  useEffect(() => {
    if (!vin) return;
    fetch(`/api/vehicles/preview/${vin}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else {
          setPreview(data);
          // Save to recently viewed
          try {
            const { saveRecentVIN } = require('@/components/home/RecentlyViewed');
            saveRecentVIN({ vin, make: data.make, model: data.model, year: data.year });
          } catch {}
        }
      })
      .catch(() => setError('Vehicle not found.'))
      .finally(() => setLoading(false));
  }, [vin]);

  const applyRefCode = async () => {
    if (!form.ref_code.trim()) return;
    const res = await fetch(`/api/referral/validate?code=${form.ref_code.trim().toUpperCase()}`);
    const data = await res.json();
    setRefValid(data.valid);
  };

  const handleOrder = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      setOrderError('Name and email are required.');
      return;
    }
    // Required, not optional: if this email ever lands on the suppression list
    // we can't mail them the report OR a login code, and a WhatsApp number is
    // then the only way to deliver what they paid for.
    const { validatePhone } = await import('@/lib/phone');
    const phoneCheck = validatePhone(form.phone);
    if (!phoneCheck.valid) {
      setOrderError(phoneCheck.reason || 'A valid WhatsApp number is required.');
      return;
    }
    // Validate VIN check digit before allowing payment
    const { validateVIN } = await import('@/lib/vin');
    const vinCheck = validateVIN(vin);
    if (!vinCheck.valid) {
      setOrderError(vinCheck.reason || 'This VIN appears to be invalid.');
      return;
    }
    setOrdering(true);
    setOrderError('');
    try {
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vin,
          bundle_id: selectedBundle,
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          ref_code: form.ref_code.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.comp || data.credit_used) {
        // Free report — comp code or bundle credit — no payment
        setRedirecting(true);
        if (data.credit_used) {
          // Pass the report id through so the success page can link straight to
          // it. Without this the credit path had the same defect as the paid
          // path: the report exists, we know its id, and the customer is still
          // told to wait for an email.
          window.location.href = `/payments/success?credit=1&remaining=${data.credits_remaining ?? 0}${data.report_id ? `&report=${encodeURIComponent(data.report_id)}` : ''}`;
        } else {
          window.location.href = '/payments/success?comp=1';
        }
        return;
      }
      if (data.authorization_url) {
        // Keep the loading state active — do NOT reset ordering, page is navigating away
        setRedirecting(true);
        window.location.href = data.authorization_url;
        return;
      } else {
        setOrderError(data.error || 'Could not create order. Please try again.');
        setOrdering(false);
      }
    } catch {
      setOrderError('Something went wrong. Please try again.');
      setOrdering(false);
    }
  };

  if (redirecting) return (
    <div className="fixed inset-0 z-50 bg-white/95 backdrop-blur-sm flex items-center justify-center">
      <div className="text-center px-6">
        <Loader2 className="w-10 h-10 animate-spin text-ch-primary mx-auto mb-4" />
        <h2 className="text-lg font-bold text-ch-text mb-1">Redirecting to secure payment...</h2>
        <p className="text-sm text-ch-text-secondary">Please wait, do not close this page.</p>
      </div>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen bg-ch-surface flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-ch-primary mx-auto mb-3" />
        <p className="text-ch-text-secondary">Checking vehicle records...</p>
      </div>
    </div>
  );

  if (error || !preview) return (
    <div className="min-h-screen bg-ch-surface flex items-center justify-center px-4">
      <div className="text-center max-w-md surface-card p-8">
        <SearchX className="w-12 h-12 text-ch-text-muted mx-auto mb-4" strokeWidth={1.75} aria-hidden />
        <h1 className="text-2xl text-ch-ink mb-2">Vehicle Not Found</h1>
        <p className="text-ch-text-secondary mb-6">{error || 'No data found for this VIN.'}</p>
        <Button onClick={() => router.push('/')} className="h-11 px-6 bg-ch-primary hover:bg-ch-primary-dark text-white font-semibold">Try Another VIN</Button>
      </div>
    </div>
  );

  const recallCount = preview.recall_count ?? 0;

  const summaryCards: SummaryCard[] = [
    { icon: <Users className="w-6 h-6" />, label: 'Ownership History', value: preview.ownership_records != null ? (preview.ownership_records === 0 ? 'No Records Reported' : `${preview.ownership_records} record(s) found`) : 'Locked', status: preview.ownership_records != null ? (preview.ownership_records === 0 ? 'ok' : 'warn') : 'lock' },
    { icon: <Gauge className="w-6 h-6" />, label: 'Odometer Reading', value: preview.odometer_reading ?? 'Locked', status: preview.odometer_reading ? 'ok' : 'lock' },
    { icon: <FileText className="w-6 h-6" />, label: 'Title History', value: preview.title_records != null ? (preview.title_records === 0 ? 'No Records Reported' : `${preview.title_records} record(s) found`) : 'Locked', status: preview.title_records != null ? (preview.title_records === 0 ? 'ok' : 'warn') : 'lock' },
    { icon: <AlertTriangle className="w-6 h-6" />, label: 'Recalls', value: recallCount === 0 ? 'No Records Reported' : `${recallCount} record(s) found`, status: recallCount === 0 ? 'ok' : 'warn' },
    { icon: <ShoppingCart className="w-6 h-6" />, label: 'Sale History', value: preview.sale_records != null ? (preview.sale_records === 0 ? 'No Records Reported' : `${preview.sale_records} record(s) found`) : 'Locked', status: preview.sale_records != null ? (preview.sale_records === 0 ? 'ok' : 'warn') : 'lock' },
    { icon: <Flame className="w-6 h-6" />, label: 'Junk & Salvage', value: preview.junk_salvage_records != null ? (preview.junk_salvage_records === 0 ? 'No Records Reported' : `${preview.junk_salvage_records} record(s) found`) : 'Locked', status: preview.junk_salvage_records != null ? (preview.junk_salvage_records === 0 ? 'ok' : 'warn') : 'lock' },
    { icon: <Tag className="w-6 h-6" />, label: 'Title Brands', value: preview.title_brand_records != null ? (preview.title_brand_records === 0 ? 'No Records Reported' : `${preview.title_brand_records} record(s) found`) : 'Locked', status: preview.title_brand_records != null ? (preview.title_brand_records === 0 ? 'ok' : 'warn') : 'lock' },
    { icon: <Car className="w-6 h-6" />, label: 'Accident & Damage', value: preview.accident_records != null ? (preview.accident_records === 0 ? 'No Records Reported' : `${preview.accident_records} record(s) found`) : 'Locked', status: preview.accident_records != null ? (preview.accident_records === 0 ? 'ok' : 'warn') : 'lock' },
    { icon: <Shield className="w-6 h-6" />, label: 'Insurance Records', value: preview.insurance_records != null ? (preview.insurance_records === 0 ? 'No Records Reported' : `${preview.insurance_records} record(s) found`) : 'Locked', status: preview.insurance_records != null ? (preview.insurance_records === 0 ? 'ok' : 'warn') : 'lock' },
    { icon: <Link2 className="w-6 h-6" />, label: 'Lien & Impound', value: preview.lien_records != null ? (preview.lien_records === 0 ? 'No Records Reported' : `${preview.lien_records} record(s) found`) : 'Locked', status: preview.lien_records != null ? (preview.lien_records === 0 ? 'ok' : 'warn') : 'lock' },
  ];

  const selected = BUNDLES.find((b) => b.id === selectedBundle)!;

  return (
    <div className="min-h-screen bg-ch-surface">
      <div className="max-w-3xl mx-auto px-4 py-10 sm:py-14 space-y-4">

        {/* Header card */}
        {/* Three states, not one. The old notice fired identically whether the
            customer had mistyped a character or was looking up a genuine import
            our provider has no records for — so the only recoverable case was
            buried in wording about neither. */}
        {preview.source === 'nhtsa' && preview.fallback_reason === 'vin_rejected' && checkDigitOk === false && (
          <div className="bg-ch-red-light border border-ch-red/30 rounded-xl p-4 flex items-start gap-3">
            <OctagonAlert className="w-5 h-5 text-ch-red shrink-0 mt-0.5" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-ch-red mb-1">
                This VIN looks mistyped — a report probably can&apos;t be generated
              </p>
              <p className="text-xs text-ch-red leading-relaxed">
                Our data provider rejected <span className="font-mono font-semibold">{vin}</span> as invalid, and its
                built-in checksum doesn&apos;t match either. Together that almost always means a character was typed
                wrong. Compare it against your vehicle&apos;s VIN plate — <strong>0 and O, 1 and I, 5 and S, 8 and B</strong>{' '}
                are the usual culprits. If you buy now and no report can be produced, you&apos;ll need to contact us
                for a refund.
              </p>
            </div>
          </div>
        )}

        {preview.source === 'nhtsa' && preview.fallback_reason === 'vin_rejected' && checkDigitOk !== false && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-amber-800 mb-1">
                Our provider has no record of this vehicle
              </p>
              <p className="text-xs text-amber-700 leading-relaxed">
                The VIN itself looks structurally valid, but our data provider doesn&apos;t recognise it. That usually
                means the vehicle was never registered in the United States — imports from Japan and Europe often
                aren&apos;t covered. The details above come from a basic VIN decode only, and a full history report
                likely cannot be generated for this vehicle.
              </p>
            </div>
          </div>
        )}

        {preview.source === 'nhtsa' && preview.fallback_reason !== 'vin_rejected' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-amber-800 mb-1">
                Limited data — a full report may be unavailable for this VIN
              </p>
              <p className="text-xs text-amber-700 leading-relaxed">
                Our main vehicle-history database returned no records for this VIN, so the details shown above come
                from a basic VIN decode only. A full history report may be incomplete for this vehicle — and in some
                cases cannot be generated at all. Please double-check the VIN matches your vehicle exactly before
                purchasing.
              </p>
            </div>
          </div>
        )}

        <div className="surface-card overflow-hidden">
          <div className="px-6 pt-6 pb-4 border-b border-ch-border">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-ch-text-muted mb-1">Vehicle History Report For</p>
                <h1 className="text-xl sm:text-2xl text-ch-ink font-mono tabular break-all">VIN# {vin}</h1>
              </div>
              <div className="shrink-0 flex items-center gap-1.5 bg-ch-surface border border-ch-border rounded-lg px-3 py-1.5">
                <ShieldCheck className="w-4 h-4 text-ch-primary" />
                <span className="text-xs font-bold text-ch-primary">CLEARVIN</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
            <div className="relative bg-ch-surface min-h-[200px] flex items-center justify-center overflow-hidden">
              {preview.preview_image ? (
                <img src={`/api/proxy/image?url=${encodeURIComponent(preview.preview_image)}`} alt="Vehicle" className="w-full h-full object-cover max-h-64" />
              ) : (
                <div className="text-ch-text-muted text-center p-8"><Car className="w-16 h-16 mx-auto mb-2 opacity-30" /><p className="text-sm">Preview Only</p></div>
              )}
              {(preview.images_count ?? 0) > 0 && (
                <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full inline-flex items-center gap-1.5"><Camera className="w-3.5 h-3.5" aria-hidden />{preview.images_count} auction photos</div>
              )}
            </div>
            <div className="p-5 space-y-3">
              <div>
                <h2 className="text-lg font-bold text-ch-ink">{preview.year} {preview.make} {preview.model}</h2>
                {preview.trim && <p className="text-sm text-ch-text-muted">{preview.trim}</p>}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b border-ch-border pb-2"><span className="text-ch-text-muted">Report ID:</span><span className="font-semibold text-ch-text">PREVIEW-MODE</span></div>
                <div className="flex justify-between border-b border-ch-border pb-2"><span className="text-ch-text-muted">Date:</span><span className="font-semibold text-ch-text">{new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
                {recallCount > 0 && <div className="flex justify-between border-b border-ch-border pb-2"><span className="text-ch-text-muted">Recalls:</span><span className="font-semibold text-amber-600 inline-flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" aria-hidden />{recallCount} found</span></div>}
              </div>
              <div className="bg-ch-surface rounded-lg p-3 text-center border border-ch-border">
                <Lock className="w-5 h-5 text-ch-text-muted mx-auto mb-1" />
                <p className="text-xs text-ch-text-muted font-medium">ClearVin Vehicle Rating</p>
                <p className="text-xs text-ch-text-muted">Unlock full report to view</p>
              </div>
            </div>
          </div>
        </div>

        {/* Summary cards */}
        <div className="surface-card p-5">
          <h3 className="text-xs font-semibold text-ch-text-muted mb-4 uppercase tracking-wide">Report Summary</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {summaryCards.map((card) => (
              <div key={card.label} className={`relative rounded-lg border p-3 text-center transition-all ${card.status === 'warn' ? 'border-amber-200 bg-amber-50' : card.status === 'lock' ? 'border-ch-border bg-ch-surface opacity-75' : 'border-ch-secondary/30 bg-ch-secondary-light'}`}>
                <div className={`absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${card.status === 'warn' ? 'bg-amber-500 text-white' : card.status === 'lock' ? 'bg-ch-rule-strong text-ch-text-muted' : 'bg-ch-secondary text-white'}`}>
                  {card.status === 'warn' ? '!' : card.status === 'lock' ? '–' : '✓'}
                </div>
                <div className={`mx-auto mb-2 w-8 h-8 flex items-center justify-center rounded-full ${card.status === 'warn' ? 'text-amber-600' : card.status === 'lock' ? 'text-ch-text-muted' : 'text-ch-secondary'}`}>{card.icon}</div>
                <p className="text-[11px] font-semibold text-ch-text leading-tight mb-1">{card.label}</p>
                {card.status === 'lock' ? (
                  <p className="text-[10px] leading-tight text-ch-rule-strong select-none blur-[3px]">X record(s) found</p>
                ) : (
                  <p className={`text-[10px] leading-tight ${card.status === 'warn' ? 'text-amber-700' : 'text-ch-secondary-dark'}`}>{card.value}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Specs */}
        <div className="surface-card p-5">
          <h3 className="text-xs font-semibold text-ch-text-muted mb-4 uppercase tracking-wide">Vehicle Specifications <span className="text-ch-text-muted font-normal normal-case">(free)</span></h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'Make', value: preview.make }, { label: 'Model', value: preview.model },
              { label: 'Year', value: preview.year?.toString() }, { label: 'Engine', value: preview.engine },
              { label: 'Fuel Type', value: preview.fuel_type }, { label: 'Body Type', value: preview.body_type },
              { label: 'Manufactured', value: preview.country_of_manufacture },
            ].map((spec) => spec.value && (
              <div key={spec.label} className="bg-ch-surface rounded-lg p-3 border border-ch-border">
                <p className="text-[10px] uppercase tracking-wide text-ch-text-muted mb-0.5">{spec.label}</p>
                <p className="text-sm font-semibold text-ch-text">{spec.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="surface-card p-6 text-center">
          <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-full px-4 py-1.5 mb-3">
            <Lock className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-xs font-semibold text-amber-700">Full History Analysis Available</span>
          </div>
          <h2 className="text-2xl text-ch-ink mb-2">Unlock the Complete Report</h2>
          <p className="text-sm text-ch-text-muted mb-5">Auction photos, title records, accident history & more — delivered to your email as PDF</p>
          <Button onClick={() => setShowModal(true)} className="bg-ch-primary hover:bg-ch-primary-dark text-white px-8 h-12 text-base font-semibold w-full sm:w-auto rounded-lg">
            <LockOpen className="w-5 h-5 mr-2" aria-hidden />
            Unlock Full Report — ₦15,000
          </Button>
          <div className="flex items-center justify-center gap-2 mt-3">
            <ShieldCheck className="w-4 h-4 text-ch-text-muted" />
            {/* TODO(autosure-delivery-time): see payments/success — replace with the measured p90. */}
            <p className="text-xs text-ch-text-muted">Secured by Paystack · Report emailed to you, usually within a few minutes</p>
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="bg-white rounded-xl shadow-card w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between p-5 border-b border-ch-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-ch-primary rounded-full flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-ch-ink">Unlock Full History</h3>
                  <p className="text-xs text-ch-text-muted">SECURE DOCUMENT ACCESS</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} aria-label="Close" className="p-1 rounded-lg text-ch-text-muted hover:text-ch-text transition-colors duration-200 ease-out"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-sm text-ch-text-secondary">Your <strong>email is mandatory</strong> to receive the official ClearVin PDF report after payment.</p>

              {/* Form */}
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-ch-text-muted uppercase tracking-wide">FULL NAME <span className="text-ch-red">* REQUIRED</span></Label>
                  <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Adebayo Chukwuma" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs text-ch-text-muted uppercase tracking-wide">EMAIL ADDRESS <span className="text-ch-red">* REQUIRED</span></Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                    onBlur={(e) => checkCredits(e.target.value)}
                    placeholder="yourname@example.com" className="mt-1"
                    disabled={!!accountEmail && !editingEmail} />
                  {accountEmail && !editingEmail && (
                    <p className="text-xs text-ch-text-muted mt-1">
                      Buying as <span className="font-medium text-ch-text">{accountEmail}</span> ·{' '}
                      <button type="button" onClick={() => setEditingEmail(true)}
                        className="text-ch-primary underline underline-offset-2">use a different email</button>
                    </p>
                  )}
                  {accountEmail && editingEmail && form.email.trim().toLowerCase() !== accountEmail.toLowerCase() && (
                    <p className="text-xs text-amber-700 mt-1">
                      <AlertTriangle className="inline w-3.5 h-3.5 -mt-0.5 mr-1" aria-hidden />This report will be sent to that address and <strong>won&apos;t appear in your dashboard</strong>,
                      and your credits and earnings won&apos;t apply to it.
                    </p>
                  )}
                  {availableCredits === 0 && earningsKobo >= selected.price * 100 && (
                    <div className="bg-ch-secondary-light border border-ch-secondary/20 rounded-lg p-3 mt-3">
                      <p className="text-sm text-ch-secondary-dark font-medium">
                        <Wallet className="inline w-4 h-4 -mt-0.5 mr-1.5" aria-hidden />You have ₦{(earningsKobo / 100).toLocaleString()} in referral earnings — this report is covered.
                      </p>
                    </div>
                  )}
                  {availableCredits > 0 && (
                    <div className="mt-2 bg-ch-secondary-light border border-ch-secondary/30 rounded-lg px-3 py-2">
                      <p className="text-sm text-ch-secondary-dark font-medium">
                        <Gift className="inline w-4 h-4 -mt-0.5 mr-1.5" aria-hidden />You have {availableCredits} bundle {availableCredits === 1 ? 'report' : 'reports'} available — this check is free!
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-ch-text-muted uppercase tracking-wide">WHATSAPP PHONE</Label>
                  <Input value={form.phone} onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))}
                    placeholder="e.g. 08012345678" required className="mt-1" />
                  <p className="text-xs text-ch-text-muted mt-1">So we can send your report on WhatsApp if email fails.</p>
                </div>
                <div>
                  <Label className="text-xs text-ch-text-muted uppercase tracking-wide">DISCOUNT / AFFILIATE CODE (OPTIONAL)</Label>
                  <div className="flex gap-2 mt-1">
                    <Input value={form.ref_code} onChange={(e) => { setForm(p => ({ ...p, ref_code: e.target.value.toUpperCase() })); setRefValid(null); }}
                      placeholder="E.G. HASSAN10" className="font-mono" />
                    <Button variant="outline" onClick={applyRefCode} className="shrink-0">Apply</Button>
                  </div>
                  {refValid === true && <p className="text-xs text-ch-secondary-dark mt-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Code applied!</p>}
                  {refValid === false && <p className="text-xs text-ch-red mt-1">Invalid code</p>}
                </div>
              </div>

              {/* Bundle selector */}
              <div>
                <Label className="text-xs text-ch-text-muted uppercase tracking-wide mb-2 block">SELECT PACKAGE</Label>
                <div className="grid grid-cols-3 gap-2">
                  {BUNDLES.map((bundle) => (
                    <button key={bundle.id} onClick={() => setSelectedBundle(bundle.id)}
                      className={`relative rounded-lg border-2 p-2 text-left transition-all ${selectedBundle === bundle.id ? 'border-ch-primary bg-ch-primary/5' : 'border-ch-border'}`}>
                      {bundle.badge && <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-ch-primary text-white whitespace-nowrap">{bundle.badge}</span>}
                      <p className="text-xs font-semibold text-ch-text">{bundle.label}</p>
                      <p className="text-sm font-bold text-ch-primary">₦{bundle.price.toLocaleString()}</p>
                      {bundle.saving && <p className="text-[10px] text-ch-secondary-dark font-medium">{bundle.saving}</p>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price summary */}
              <div className="bg-ch-surface rounded-lg p-3 border border-ch-border">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-ch-text-secondary">Vehicle History Report</span>
                  <span className="font-medium">₦{selected.price.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-ch-ink border-t border-ch-border pt-2 mt-2">
                  <span>Total</span>
                  <span>₦{selected.price.toLocaleString()}</span>
                </div>
              </div>

              {orderError && <p className="text-sm text-ch-red">{orderError}</p>}

              <p className="text-center text-xs text-ch-text-muted">
                This report uses official NMVTIS federal vehicle data. See our{' '}
                <a href="/terms#nmvtis-disclaimer" className="text-ch-primary font-semibold hover:underline">
                  Terms
                </a>{' '}
                for the full data source disclosure.
              </p>

              <Button onClick={handleOrder} disabled={ordering} className="w-full h-12 bg-ch-primary hover:bg-ch-primary-dark text-white font-bold text-base rounded-lg">
                {ordering ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Processing...</>
                  : availableCredits > 0 ? <><Gift className="w-4 h-4 mr-2" aria-hidden />USE BUNDLE REPORT — FREE</>
                  : earningsKobo >= selected.price * 100 ? <><Wallet className="w-4 h-4 mr-2" aria-hidden />USE REFERRAL EARNINGS — FREE</>
                  : <><ShoppingCart className="w-4 h-4 mr-2" aria-hidden />ORDER REPORT NOW — ₦{selected.price.toLocaleString()}</>}
              </Button>

              <p className="text-center text-xs text-ch-text-muted">after the payment you will be redirected to your vehicle report</p>

              <p className="text-center text-xs text-ch-text-muted">
                {/* TODO(autosure-contact): AutoSure has no WhatsApp line or social accounts yet. */}
                Questions before you pay? Email us:{' '}
                <a href="mailto:support@autosurevin.com" className="text-ch-primary font-semibold">support@autosurevin.com</a>
              </p>

              <p className="text-center text-xs text-ch-text-muted">
                By clicking ORDER REPORT NOW you agree to{' '}
                <a href="/terms" className="text-ch-primary hover:underline">Terms and Conditions</a>{' '}
                and <a href="/terms#nmvtis-disclaimer" className="text-ch-primary hover:underline">NMVTIS disclaimer</a>.
              </p>

              <div className="bg-ch-surface rounded-lg p-3 border border-ch-border">
                <p className="text-[10px] text-ch-text-muted leading-relaxed">
                  <strong>NMVTIS DISCLAIMER:</strong> The National Motor Vehicle Title Information System (NMVTIS) is an electronic system that contains information on certain automobiles titled in the United States. NMVTIS is intended to serve as a reliable source of title and brand history for automobiles, but it does not contain detailed information regarding a vehicle&apos;s repair history. A vehicle history report is NOT a substitute for an independent vehicle inspection.{' '}
                  <a href="/terms#nmvtis-disclaimer" className="text-ch-primary hover:underline">Read full disclaimer →</a>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
