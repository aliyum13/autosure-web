// ClearVin report-id extraction.
//
// Deliberately dependency-free — no imports at all — so it can be run directly
// against real stored HTML by scripts/validate-report-id-extraction.mjs without
// dragging in Prisma or path aliases. The previous version lived inside
// clearvin.ts and could only be exercised by making a live API call, which is
// how it shipped broken twice.

// ClearVin's report id: 8 hex chars. This is the String_ID column in their
// activity export, NOT the numeric Report_ID.
const REPORT_ID_RE = /^[0-9A-F]{8}$/i;

// JSON.parse output is a tree, never cyclic, so this bound exists only to stop
// pathological input from blowing the stack — not to limit legitimate nesting.
//
// It was 8, and that was the bug. ClearVin embeds the id inside a framework
// page-state blob containing 107 nested objects; reportId sits far deeper than
// 8 levels, so the walk returned null on every real report while passing on
// every shallow hand-built fixture.
const MAX_DEPTH = 64;

/** Walks a parsed object for a `reportId` that passes REPORT_ID_RE. */
function deepFindReportId(node: unknown, depth = 0): string | null {
  if (node == null || depth > MAX_DEPTH) return null;

  if (Array.isArray(node)) {
    for (const v of node) {
      const found = deepFindReportId(v, depth + 1);
      if (found) return found;
    }
    return null;
  }

  if (typeof node === 'object') {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k === 'reportId' && typeof v === 'string' && REPORT_ID_RE.test(v.trim())) {
        return v.trim().toUpperCase();
      }
      const found = deepFindReportId(v, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Direct textual patterns, tried before any parsing.
 *
 * These need neither the blob to parse as JSON nor the document to decode as a
 * whole, so they survive: deep nesting, multiple blobs, a stray `%` anywhere in
 * the document (which makes decodeURIComponent throw), and truncation.
 *
 * The percent-encoded form is first because it matches 100% of the 227 reports
 * currently stored — ClearVin embeds the blob as
 * JSON.parse(decodeURIComponent('%7B…%7D')).
 */
const DIRECT_PATTERNS: RegExp[] = [
  /%22reportId%22\s*%3A\s*%22([0-9A-F]{8})%22/i,          // percent-encoded
  /"reportId"\s*:\s*"([0-9A-F]{8})"/i,                     // plain JSON
  /\\"reportId\\"\s*:\s*\\"([0-9A-F]{8})\\"/i,             // backslash-escaped
  /&quot;reportId&quot;\s*:\s*&quot;([0-9A-F]{8})&quot;/i, // HTML entities
  /\\u0022reportId\\u0022\s*:\s*\\u0022([0-9A-F]{8})/i,    // unicode-escaped
];

/**
 * Pulls ClearVin's reportId out of an HTML report response.
 *
 * With it, the PDF can be re-fetched via ?reportId= for free instead of ?vin=,
 * which mints and charges a second full report — 39% of charges over Jul-Aug.
 *
 * Layered, cheapest and most robust first: direct text patterns, then
 * structural parsing as a fallback should ClearVin change how it embeds state.
 *
 * Returns null rather than throwing on ANY failure. A missed optimisation is a
 * charged PDF; a thrown error is a customer with no report.
 */
export function extractReportId(html: string): string | null {
  if (!html) return null;

  try {
    // 1. Direct patterns — no parsing, no whole-document decoding.
    for (const re of DIRECT_PATTERNS) {
      const m = html.match(re);
      if (m && REPORT_ID_RE.test(m[1])) return m[1].toUpperCase();
    }

    // 2. JSON embedded in a script tag (__NEXT_DATA__ and friends).
    for (const m of html.matchAll(
      /<script[^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi
    )) {
      try {
        const found = deepFindReportId(JSON.parse(m[1]));
        if (found) return found;
      } catch { /* next script */ }
    }

    // 3. Percent-encoded JSON blob, e.g. JSON.parse(decodeURIComponent('%7B…%7D')).
    //    Lazy rather than greedy: a run may contain several complete objects,
    //    and taking the first that parses beats spanning to the last %7D and
    //    failing to parse the lot.
    for (const m of html.matchAll(/%7B[^"'\s<>]*?%7D/gi)) {
      try {
        const found = deepFindReportId(JSON.parse(decodeURIComponent(m[0])));
        if (found) return found;
      } catch { /* next blob */ }
    }

    // 4. HTML-entity-encoded JSON in an attribute (Inertia-style data-page).
    for (const m of html.matchAll(/=["'](\{&quot;[\s\S]*?\})["']/gi)) {
      try {
        const decoded = m[1]
          .replace(/&quot;/g, '"').replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'");
        const found = deepFindReportId(JSON.parse(decoded));
        if (found) return found;
      } catch { /* next attribute */ }
    }

    // 5. Last resort: loose key/value anywhere. Decoding is attempted locally
    //    around each candidate rather than across the whole document, because a
    //    single stray '%' (CSS "100%") makes a whole-document decode throw and
    //    silently disable this layer entirely — which is what happened before.
    for (const m of html.matchAll(/reportId[\s\S]{0,24}?([0-9A-F]{8})\b/gi)) {
      if (REPORT_ID_RE.test(m[1])) return m[1].toUpperCase();
    }
  } catch {
    // Swallowed deliberately: see the contract above.
  }

  return null;
}
