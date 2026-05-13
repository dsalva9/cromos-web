import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

/**
 * Locale-aware navigation APIs.
 * These are lightweight wrappers around Next.js navigation that automatically
 * handle locale prefixing based on the routing configuration.
 *
 * Phase 4: infrastructure only — used by Link wrapper and useRouter.
 * Phase 5: will be used directly in all components.
 */
export const {
  Link: IntlLink,
  redirect: intlRedirect,
  usePathname: useIntlPathname,
  useRouter: useIntlRouter,
  getPathname: getIntlPathname,
} = createNavigation(routing);
