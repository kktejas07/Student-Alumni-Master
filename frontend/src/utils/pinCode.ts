/**
 * pinCode — country-aware postal/PIN code validation.
 *
 * Used by any flow that asks for a postal/ZIP/PIN code. Pass the user's
 * 2-letter country code (ISO-3166 alpha-2) along with the typed value.
 *
 * Patterns sourced from the Universal Postal Union spec; we cover ~30
 * countries explicitly and fall back to a permissive 3-10 alphanumeric
 * regex for everything else.
 */

type Country = string;

const PATTERNS: Record<Country, { regex: RegExp; sample: string; label: string }> = {
  IN: { regex: /^[1-9]\d{5}$/,                              sample: '110001',     label: '6-digit PIN' },
  US: { regex: /^\d{5}(-\d{4})?$/,                          sample: '10001 or 10001-1234', label: 'ZIP or ZIP+4' },
  GB: { regex: /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i,      sample: 'SW1A 1AA',   label: 'UK postcode' },
  CA: { regex: /^[A-CEGHJ-NPR-TVXY]\d[A-Z]\s?\d[A-Z]\d$/i,  sample: 'K1A 0B1',    label: 'Canadian postcode' },
  AU: { regex: /^\d{4}$/,                                   sample: '2000',       label: '4-digit postcode' },
  AE: { regex: /^\d{4,6}$/,                                 sample: '00000',      label: 'PO Box / postcode' },
  SG: { regex: /^\d{6}$/,                                   sample: '238801',     label: '6-digit postcode' },
  DE: { regex: /^\d{5}$/,                                   sample: '10115',      label: '5-digit postcode' },
  FR: { regex: /^\d{5}$/,                                   sample: '75001',      label: '5-digit postcode' },
  IT: { regex: /^\d{5}$/,                                   sample: '00100',      label: '5-digit CAP' },
  ES: { regex: /^\d{5}$/,                                   sample: '28001',      label: '5-digit CP' },
  JP: { regex: /^\d{3}-?\d{4}$/,                            sample: '100-0001',   label: '7-digit postcode' },
  CN: { regex: /^\d{6}$/,                                   sample: '100000',     label: '6-digit postcode' },
  KR: { regex: /^\d{5}$/,                                   sample: '03187',      label: '5-digit postcode' },
  BR: { regex: /^\d{5}-?\d{3}$/,                            sample: '01000-000',  label: '8-digit CEP' },
  MX: { regex: /^\d{5}$/,                                   sample: '01000',      label: '5-digit CP' },
  RU: { regex: /^\d{6}$/,                                   sample: '101000',     label: '6-digit postcode' },
  ZA: { regex: /^\d{4}$/,                                   sample: '0001',       label: '4-digit postcode' },
  NZ: { regex: /^\d{4}$/,                                   sample: '6011',       label: '4-digit postcode' },
  IE: { regex: /^[A-Z]\d{2}\s?[A-Z\d]{4}$/i,                sample: 'D02 X285',   label: 'Eircode' },
  NL: { regex: /^\d{4}\s?[A-Z]{2}$/i,                       sample: '1011 AC',    label: '4 digits + 2 letters' },
  BE: { regex: /^\d{4}$/,                                   sample: '1000',       label: '4-digit postcode' },
  CH: { regex: /^\d{4}$/,                                   sample: '8001',       label: '4-digit postcode' },
  AT: { regex: /^\d{4}$/,                                   sample: '1010',       label: '4-digit postcode' },
  SE: { regex: /^\d{3}\s?\d{2}$/,                           sample: '111 22',     label: '5-digit postcode' },
  DK: { regex: /^\d{4}$/,                                   sample: '1050',       label: '4-digit postcode' },
  FI: { regex: /^\d{5}$/,                                   sample: '00100',      label: '5-digit postcode' },
  NO: { regex: /^\d{4}$/,                                   sample: '0010',       label: '4-digit postcode' },
  PL: { regex: /^\d{2}-\d{3}$/,                             sample: '00-001',     label: '5-digit postcode' },
  PK: { regex: /^\d{5}$/,                                   sample: '44000',      label: '5-digit postcode' },
  BD: { regex: /^\d{4}$/,                                   sample: '1000',       label: '4-digit postcode' },
  LK: { regex: /^\d{5}$/,                                   sample: '00100',      label: '5-digit postcode' },
  NP: { regex: /^\d{5}$/,                                   sample: '44600',      label: '5-digit postcode' },
};

const FALLBACK = { regex: /^[A-Z\d \-]{3,10}$/i, sample: '12345', label: 'Postal code' };

export function getPostalCodeFormat(country: string): { regex: RegExp; sample: string; label: string } {
  return PATTERNS[country?.toUpperCase()] || FALLBACK;
}

export function validatePostalCode(country: string, value: string): { ok: boolean; message?: string } {
  if (!value || !value.trim()) return { ok: false, message: 'Postal code is required.' };
  const { regex, sample, label } = getPostalCodeFormat(country);
  if (!regex.test(value.trim())) {
    return {
      ok: false,
      message: `Invalid ${label} for ${country?.toUpperCase() || 'this country'}. Example: ${sample}`,
    };
  }
  return { ok: true };
}

/** Country-specific phone length sanity check (minimum digits after dial code) */
export function validatePhoneLength(country: string, digits: string): { ok: boolean; message?: string } {
  // Strip non-digits.
  const d = digits.replace(/\D/g, '');
  // Per-country expected length(s) of the *national* number (without dial code).
  const lengths: Record<string, number[]> = {
    IN: [10],
    US: [10], CA: [10],
    GB: [10, 11],
    AU: [9, 10],
    AE: [9],
    SG: [8],
    DE: [10, 11], FR: [9, 10], IT: [9, 10], ES: [9],
    JP: [10, 11], CN: [11], KR: [10, 11],
    BR: [10, 11], MX: [10], RU: [10, 11],
    ZA: [9], NZ: [8, 9, 10], IE: [9],
    NL: [9], BE: [9], CH: [9], AT: [10, 11],
    SE: [7, 9, 10], DK: [8], FI: [9, 10], NO: [8],
    PL: [9], PK: [10], BD: [10], LK: [9], NP: [10],
  };
  const expected = lengths[country?.toUpperCase()];
  if (!expected) {
    if (d.length < 6 || d.length > 15) return { ok: false, message: 'Phone number must be 6–15 digits.' };
    return { ok: true };
  }
  if (!expected.includes(d.length)) {
    const exp = expected.join(' or ');
    return { ok: false, message: `Phone number for ${country.toUpperCase()} must be ${exp} digits.` };
  }
  return { ok: true };
}
