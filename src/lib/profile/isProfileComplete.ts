import { validatePostcode } from '@/lib/validations/postcode';

/**
 * Shared profile-completion check.
 *
 * A profile is "complete" when the three mandatory fields — nickname,
 * postcode and avatar_url — are non-empty, non-whitespace strings and
 * do NOT contain placeholder values set during account creation.
 *
 * When `countryCode` is provided, the postcode is also validated against
 * the country's expected format (e.g. 5 digits for Spain, 4 for Argentina).
 *
 * This function is the single source of truth used by:
 *  - ProfileCompletionProvider (context value)
 *  - auth/callback (post-login redirect)
 *  - login page (post-login redirect)
 */
export function isProfileComplete(
    nickname: string | null | undefined,
    postcode: string | null | undefined,
    avatarUrl: string | null | undefined,
    countryCode?: string | null
): boolean {
    const safeNickname = nickname?.trim() ?? '';
    const safePostcode = postcode?.trim() ?? '';
    const safeAvatar = avatarUrl?.trim() ?? '';

    if (!safeNickname || !safePostcode || !safeAvatar) return false;

    const nicknameLower = safeNickname.toLowerCase();
    const postcodeLower = safePostcode.toLowerCase();

    const hasPlaceholderNickname =
        nicknameLower === 'sin nombre' || nicknameLower.startsWith('pending_');
    const hasPlaceholderPostcode = postcodeLower === 'pending';

    if (hasPlaceholderNickname || hasPlaceholderPostcode) return false;

    // Validate postcode format against country rules when country is known
    if (countryCode && safePostcode) {
        if (!validatePostcode(safePostcode, countryCode)) return false;
    }

    return true;
}
