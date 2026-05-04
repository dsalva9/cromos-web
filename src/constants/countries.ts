export const SUPPORTED_COUNTRIES = [
  { code: 'ES', name: 'España', flag: '🇪🇸', currency: '€', currencyCode: 'EUR' },
  { code: 'US', name: 'United States', flag: '🇺🇸', currency: '$', currencyCode: 'USD' },
  { code: 'BR', name: 'Brasil', flag: '🇧🇷', currency: 'R$', currencyCode: 'BRL' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', currency: '$', currencyCode: 'ARS' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', currency: '$', currencyCode: 'COP' },
  { code: 'MX', name: 'México', flag: '🇲🇽', currency: '$', currencyCode: 'MXN' },
] as const;

export type CountryCode = (typeof SUPPORTED_COUNTRIES)[number]['code'];

/** Look up country info by code. Falls back to Spain if not found. */
export function getCountryByCode(code: string | null | undefined) {
  return SUPPORTED_COUNTRIES.find(c => c.code === code) ?? SUPPORTED_COUNTRIES[0];
}

/** Get currency symbol for a country code. */
export function getCurrencySymbol(countryCode: string | null | undefined): string {
  return getCountryByCode(countryCode).currency;
}

/** Get ISO currency code for a country code (for structured data/SEO). */
export function getCurrencyCode(countryCode: string | null | undefined): string {
  return getCountryByCode(countryCode).currencyCode;
}
