// Email-shape validation. Deliberately dependency-free so it can be executed
// directly against real inputs — the same reason lib/vin.ts and lib/reportId.ts
// hold their parsers.
//
// Named emailValidation rather than living in lib/email.ts, which SENDS mail
// and pulls in Resend and Prisma.

/**
 * Is this a plausibly-deliverable address?
 *
 * Not RFC 5322 — that grammar accepts things no mail system routes, and a
 * regex claiming to implement it is famously wrong anyway. This checks the
 * shape every real address has: something, an @, a domain with a dot, and no
 * whitespace.
 *
 * The bar it replaces in /api/orders/create was `email.includes('@')`, which
 * accepts "a@", "@" and "x@y". Those reached Paystack, which rejected them with
 * "Invalid Email Address Passed" — logged as a Paystack FAILURE, so a bot
 * hammering checkout with a malformed address tripped the dependency alert
 * while never touching a real customer.
 */
export function isValidEmail(email: string | null | undefined): boolean {
  const value = (email || '').trim();
  if (!value || value.length > 254) return false;          // RFC 5321 max length
  if (/\s/.test(value)) return false;
  // One @, a dot-bearing domain, no leading/trailing dot in the domain.
  return /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(value);
}
