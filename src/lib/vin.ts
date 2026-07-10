// VIN validation including ISO 3779 check digit (position 9)

const TRANSLIT: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
  J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
  '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
};

const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

/**
 * Validates a 17-character VIN including the check digit (position 9).
 * Returns { valid, reason }.
 */
export function validateVIN(vin: string): { valid: boolean; reason?: string } {
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

  // Check digit validation (position 9, index 8)
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

  if (v[8] !== expectedCheck) {
    return {
      valid: false,
      reason: 'This VIN appears to be invalid (check digit mismatch). Please double-check you entered it correctly.',
    };
  }

  return { valid: true };
}

/** Quick boolean helper */
export function isValidVIN(vin: string): boolean {
  return validateVIN(vin).valid;
}
