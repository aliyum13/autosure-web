// VIN validation including ISO 3779 check digit (position 9)

const TRANSLIT: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
  J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
  '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
};

const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

/**
 * Validates a 17-character VIN.
 * Length and character checks are HARD (catch typos).
 * Check digit is SOFT — returned as `checkDigitValid` but does not fail validation,
 * because some real VINs (certain plants/older models) don't conform to the standard
 * yet still exist in NMVTIS. Blocking on check digit alone would reject real sales.
 */
export function validateVIN(vin: string): { valid: boolean; reason?: string; checkDigitValid?: boolean } {
  const v = vin.trim().toUpperCase();

  if (v.length !== 17) {
    return { valid: false, reason: 'VIN must be exactly 17 characters.' };
  }

  // VINs never contain I, O, or Q (to avoid confusion with 1 and 0)
  if (/[IOQ]/.test(v)) {
    return { valid: false, reason: 'VIN cannot contain the letters I, O, or Q.' };
  }

  // Only valid VIN characters
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(v)) {
    return { valid: false, reason: 'VIN contains invalid characters.' };
  }

  // Check digit — computed but NOT used to block
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const value = TRANSLIT[v[i]];
    if (value === undefined) {
      return { valid: false, reason: 'VIN contains invalid characters.' };
    }
    sum += value * WEIGHTS[i];
  }
  const remainder = sum % 11;
  const expectedCheck = remainder === 10 ? 'X' : String(remainder);
  const checkDigitValid = v[8] === expectedCheck;

  return { valid: true, checkDigitValid };
}

/** Quick boolean helper */
export function isValidVIN(vin: string): boolean {
  return validateVIN(vin).valid;
}

/**
 * True when a ClearVin error means "this VIN is not in our data", as opposed to
 * "ClearVin is having a problem".
 *
 * The two endpoints word it differently — the report endpoint returns
 * "Vin ... is not valid" while the preview endpoint returns "Vin ... is
 * invalid", both observed in api_call_log for the same VIN — so the pattern
 * accepts either. Extracted here so the report path and the preview path cannot
 * drift apart in what they consider a rejection.
 */
export function isVinRejection(message: string | null | undefined): boolean {
  return /\bis\s+(?:not\s+valid|invalid)\b/i.test(message || '');
}
