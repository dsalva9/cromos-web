/**
 * Country-aware postcode validation rules.
 *
 * Each country defines: validation regex, display label,
 * placeholder text, and maximum input length.
 */
export const COUNTRY_POSTCODE_RULES: Record<string, {
  regex: RegExp;
  label: string;
  placeholder: string;
  maxLength: number;
}> = {
  ES: { regex: /^(?:0[1-9]|[1-4]\d|5[0-2])\d{3}$/, label: 'Código Postal', placeholder: '28001', maxLength: 5 },
  US: { regex: /^\d{5}$/, label: 'ZIP Code', placeholder: '10001', maxLength: 5 },
  BR: { regex: /^\d{5}-?\d{3}$/, label: 'CEP', placeholder: '01310-100', maxLength: 9 },
  AR: { regex: /^([A-Za-z]\d{4}[A-Za-z]{3}|\d{4})$/, label: 'Código Postal', placeholder: '1425', maxLength: 8 },
  CO: { regex: /^\d{6}$/, label: 'Código Postal', placeholder: '110111', maxLength: 6 },
  MX: { regex: /^\d{5}$/, label: 'Código Postal', placeholder: '06600', maxLength: 5 },
};

/**
 * Validate a postcode against the country's expected format.
 * Returns `true` if the postcode matches the country's regex.
 */
export function validatePostcode(postcode: string, countryCode: string): boolean {
  const rule = COUNTRY_POSTCODE_RULES[countryCode];
  if (!rule) return false;
  return rule.regex.test(postcode.trim());
}

/**
 * Get the postcode validation rule for a country.
 * Falls back to Spain if the country code is unknown.
 */
export function getPostcodeRule(countryCode: string | null | undefined) {
  return COUNTRY_POSTCODE_RULES[countryCode ?? 'ES'] ?? COUNTRY_POSTCODE_RULES.ES;
}
