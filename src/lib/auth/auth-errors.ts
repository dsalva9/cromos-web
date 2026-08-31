/**
 * Map of known Supabase GoTrue error messages → i18n keys.
 * Supabase errors are always in English regardless of user locale.
 * We match by substring to handle slight wording changes across versions.
 */
const SUPABASE_ERROR_MAP: Array<{ match: string | RegExp; key: string }> = [
  { match: 'user already registered', key: 'userAlreadyRegistered' },
  { match: 'password should be at least', key: 'passwordTooShort' },
  { match: 'email rate limit exceeded', key: 'emailRateLimitExceeded' },
  { match: 'rate limit exceeded', key: 'rateLimitExceeded' },
  { match: 'invalid email', key: 'invalidEmail' },
  { match: 'signup is disabled', key: 'signupDisabled' },
  { match: 'email not confirmed', key: 'emailNotConfirmed' },
  { match: 'invalid login credentials', key: 'invalidCredentials' },
  { match: /you can only request this once every/i, key: 'rateLimitCooldown' },
];

export function mapSupabaseError(message: string): string {
  const lower = message.toLowerCase();
  for (const { match, key } of SUPABASE_ERROR_MAP) {
    if (typeof match === 'string' ? lower.includes(match) : match.test(message)) {
      return key;
    }
  }
  return ''; // Empty = no mapping found, fallback to 'unexpected'
}

export const KNOWN_AUTH_ERROR_KEYS = new Set([
  'suspended',
  'contactSupport',
  'unexpected',
  'googleUnexpected',
  'userAlreadyRegistered',
  'passwordTooShort',
  'emailRateLimitExceeded',
  'rateLimitExceeded',
  'rateLimitCooldown',
  'invalidEmail',
  'signupDisabled',
  'emailNotConfirmed',
  'invalidCredentials',
]);

/**
 * Safely resolves an auth error translation key against next-intl.
 * If the key is not in the known set of auth translation keys, returns the raw error
 * directly without calling t.has() or t(), avoiding deep namespace lookup recursion.
 */
export function getTranslatedAuthError(
  error: string,
  tErrors: (key: string) => string
): string {
  if (!error) return '';
  if (KNOWN_AUTH_ERROR_KEYS.has(error)) {
    return tErrors(error);
  }
  return error;
}

