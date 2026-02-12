/**
 * Shared profile-completion check.
 *
 * A profile is "complete" when the three mandatory fields — nickname,
 * postcode and avatar_url — are non-empty, non-whitespace strings and
 * do NOT contain placeholder values set during account creation.
 *
 * This function is the single source of truth used by:
 *  - ProfileCompletionProvider (context value)
 *  - auth/callback (post-login redirect)
 *  - login page (post-login redirect)
 */
export function isProfileComplete(
    nickname: string | null | undefined,
    postcode: string | null | undefined,
    avatarUrl: string | null | undefined
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

    return true;
}
