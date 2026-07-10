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
