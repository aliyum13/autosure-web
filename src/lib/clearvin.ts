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

  const res = await fetch(`${CLEARVIN_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (data.status !== 'ok' || !data.token) {
    throw new Error(data.message || 'ClearVin login failed');
  }

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
  if (data.status !== 'ok') throw new Error(data.message || 'ClearVin preview failed');
  return data.result;
}

// Fetch just the HTML report (fast)
export async function clearvinReportHTML(vin: string): Promise<string> {
  const token = await clearvinGetToken();
  console.log('[clearvin] Fetching HTML for VIN:', vin);
  const res = await fetch(`${CLEARVIN_BASE}/report?vin=${vin}&format=html`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(err.message || `ClearVin HTML failed: ${res.status}`);
  }
  const html = await res.text();
  if (!html || html.length < 100) throw new Error('ClearVin returned empty HTML');
  console.log('[clearvin] HTML length:', html.length);
  return html;
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
    return null;
  }
  const pdf = await res.arrayBuffer();
  console.log('[clearvin] PDF size:', pdf?.byteLength);
  return pdf;
}

export async function clearvinReportById(reportId: string, format: 'html' | 'pdf' = 'html') {
  const token = await clearvinGetToken();
  const res = await fetch(`${CLEARVIN_BASE}/report?reportId=${reportId}&format=${format}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`ClearVin re-fetch failed: ${res.status}`);
  return format === 'pdf' ? res.arrayBuffer() : res.text();
}
