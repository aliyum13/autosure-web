// WhatsApp phone handling. This is the fallback delivery channel: when an
// address lands on Resend's suppression list we cannot mail the customer at
// all — not the report, not a login code — so a number on file is the only way
// to reach them. That's why it's a required checkout field rather than a
// nice-to-have.

/**
 * Validates a customer phone number, deliberately loosely.
 *
 * Nigerian mobiles are 11 digits local ("08012345678") or 13 with the country
 * code ("2348012345678"); we also accept a bare 10-digit number, since people
 * drop the leading zero. Anything else with a plausible international length
 * passes too — a customer with a foreign number should not be blocked from
 * buying. The point is catching typos and empty-ish input, not enforcing a
 * carrier prefix table that goes stale.
 */
export function validatePhone(phone: string): { valid: boolean; reason?: string } {
  const digits = (phone || '').replace(/\D/g, '');

  if (!digits) {
    return { valid: false, reason: 'WhatsApp number is required — it is how we reach you if email fails.' };
  }
  if (digits.length < 10) {
    return { valid: false, reason: 'That number looks too short. Enter your full WhatsApp number, e.g. 08012345678.' };
  }
  if (digits.length > 15) {
    return { valid: false, reason: 'That number looks too long. Enter your full WhatsApp number, e.g. 08012345678.' };
  }
  return { valid: true };
}

/**
 * Converts a stored number into the digits-only international form wa.me needs.
 * Returns null when there is nothing usable to dial.
 */
export function toWhatsAppNumber(phone: string | null | undefined): string | null {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('234')) return digits;
  if (digits.startsWith('0') && digits.length === 11) return `234${digits.slice(1)}`;
  if (digits.length === 10) return `234${digits}`;
  // Not a recognisable Nigerian shape — pass the digits through rather than
  // mangling what may be a valid foreign number.
  return digits;
}
