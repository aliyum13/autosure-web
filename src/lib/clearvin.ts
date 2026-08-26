import { logApiCall } from '@/lib/apiLog';
// Extraction lives in its own dependency-free module so it can be validated
// against real stored HTML without a live API call — see scripts/.
import { extractReportId } from '@/lib/reportId';

export { extractReportId };

const CLEARVIN_BASE = 'https://www.clearvin.com/rest/vendor';

let prodTokenCache: { token: string; expiresAt: number } | null = null;

export async function clearvinGetToken(): Promise<string> {
  if (process.env.CLEARVIN_USE_TEST === 'true' && process.env.CLEARVIN_TEST_TOKEN) {
    return process.env.CLEARVIN_TEST_TOKEN;
  }

  const now = Date.now();
  if (prodTokenCache && prodTokenCache.expiresAt > now) {
    return prodTokenCache.token;
  }

  const email = process.env.CLEARVIN_EMAIL;
  const password = process.env.CLEARVIN_PASSWORD;
  if (!email || !password) throw new Error('ClearVin production credentials not configured');

  // Only logged past the cache check above — a cache hit makes no HTTP call, and
  // logging those would swamp the table with entries for calls that never happened.
  const res = await fetch(`${CLEARVIN_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (data.status !== 'ok' || !data.token) {
    await logApiCall('clearvin', 'login', false, data.message || 'ClearVin login failed');
    throw new Error(data.message || 'ClearVin login failed');
  }
  await logApiCall('clearvin', 'login', true);

  prodTokenCache = { token: data.token, expiresAt: now + 110 * 60 * 1000 };
  return data.token;
}

export async function clearvinPreview(vin: string) {
  const token = await clearvinGetToken();
  const res = await fetch(`${CLEARVIN_BASE}/preview?vin=${vin}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 3600 },
  });
  const data = await res.json();
  if (data.status !== 'ok') {
    await logApiCall('clearvin', 'preview', false, data.message || 'ClearVin preview failed');
    throw new Error(data.message || 'ClearVin preview failed');
  }
  await logApiCall('clearvin', 'preview', true);
  return data.result;
}

// Fetch just the HTML report (fast). Returns the reportId alongside it so the
// PDF can be re-fetched free — see extractReportId above.
export async function clearvinReportHTML(vin: string): Promise<{ html: string; reportId: string | null }> {
  const token = await clearvinGetToken();
  console.log('[clearvin] Fetching HTML for VIN:', vin);

  // Per ClearVin API docs: to receive the rendered HTML report, you MUST send
  // Content-Type: text/html. Without it, the endpoint returns JSON (with an empty
  // html_report wrapper), which is what caused blank reports.
  const res = await fetch(`${CLEARVIN_BASE}/report?vin=${vin}&format=html`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'text/html',
      Accept: 'text/html',
    },
  });

  const raw = await res.text();

  if (!res.ok) {
    let msg = `ClearVin HTML failed: ${res.status}`;
    try { msg = (JSON.parse(raw)?.message) || msg; } catch {}
    await logApiCall('clearvin', 'report_html', false, msg);
    throw new Error(msg);
  }

  // With the text/html header, ClearVin returns raw HTML. But defensively handle
  // the case where a JSON wrapper still comes back (extract html_report).
  let html = raw;
  const trimmed = raw.trimStart();
  if (trimmed.startsWith('{') && !trimmed.startsWith('<')) {
    try {
      const parsed = JSON.parse(raw);
      const extracted =
        parsed?.result?.html_report ?? parsed?.result?.html ?? parsed?.html_report ?? '';
      console.log('[clearvin] Got JSON instead of HTML. keys:', Object.keys(parsed?.result || parsed || {}).join(','), '| extracted len:', (extracted || '').length);
      if (extracted) html = extracted;
    } catch { /* keep raw */ }
  }

  // Validate real report content (strip tags + whitespace).
  const textContent = (html || '').replace(/<[^>]*>/g, '').replace(/\s/g, '');
  if (textContent.length < 100) {
    console.warn('[clearvin] Empty report — text length:', textContent.length, '| raw length:', raw.length);
    await logApiCall('clearvin', 'report_html', false, 'ClearVin returned an empty report');
    throw new Error('ClearVin returned an empty report');
  }

  // Extracted from the RAW response, not the unwrapped html: if a JSON wrapper
  // came back, the id may live in the envelope rather than the markup.
  const reportId = extractReportId(raw) ?? extractReportId(html);
  if (reportId) {
    console.log('[clearvin] HTML OK — raw:', raw.length, '| text:', textContent.length, '| reportId:', reportId);
  } else {
    // Loud, because it means the PDF below falls back to a CHARGED ?vin= call.
    console.warn('[clearvin] HTML OK but NO reportId extracted — PDF will be charged. raw:', raw.length);
  }
  await logApiCall('clearvin', 'report_html', true);
  return { html, reportId };
}

/**
 * Re-fetches an already-purchased report's PDF by its ClearVin report id.
 *
 * Per ClearVin's API docs this is FREE, where ?vin= generates and charges a new
 * report. That distinction is the entire fix.
 *
 * Caveat worth keeping in mind: a 200 here proves the right bytes came back, it
 * does NOT prove the call went unbilled. Only ClearVin's next activity export
 * settles that — hence the CLEARVIN_REUSE_REPORT_ID kill switch below.
 */
export async function clearvinReportPDFById(reportId: string): Promise<ArrayBuffer | null> {
  const token = await clearvinGetToken();
  console.log('[clearvin] Fetching PDF by reportId (free path):', reportId);
  const res = await fetch(`${CLEARVIN_BASE}/report?reportId=${encodeURIComponent(reportId)}&format=pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    console.warn('[clearvin] PDF-by-reportId failed:', res.status);
    await logApiCall('clearvin', 'report_pdf_by_id', false, `PDF by reportId failed: ${res.status}`);
    return null;
  }
  const pdf = await res.arrayBuffer();
  console.log('[clearvin] PDF (by reportId) size:', pdf?.byteLength);
  await logApiCall('clearvin', 'report_pdf_by_id', true);
  return pdf;
}

/**
 * Kill switch for the free re-fetch path.
 *
 * Billing cannot be confirmed from our side until the next activity export. If
 * that export shows ?reportId= being charged after all, setting this to 'false'
 * reverts to the old charged-by-VIN behaviour instantly, with no deploy.
 */
export function reportIdReuseEnabled(): boolean {
  return process.env.CLEARVIN_REUSE_REPORT_ID !== 'false';
}

// Fetch just the PDF (slower, separate call)
export async function clearvinReportPDF(vin: string): Promise<ArrayBuffer | null> {
  const token = await clearvinGetToken();
  console.log('[clearvin] Fetching PDF for VIN:', vin);
  const res = await fetch(`${CLEARVIN_BASE}/report?vin=${vin}&format=pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    console.warn('[clearvin] PDF fetch failed:', res.status);
    await logApiCall('clearvin', 'report_pdf', false, `PDF fetch failed: ${res.status}`);
    return null;
  }
  const pdf = await res.arrayBuffer();
  console.log('[clearvin] PDF size:', pdf?.byteLength);
  await logApiCall('clearvin', 'report_pdf', true);
  return pdf;
}
