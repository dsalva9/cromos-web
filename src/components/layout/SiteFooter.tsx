import Link from '@/components/ui/link';
import { siteConfig } from '@/config/site';

export function SiteFooter() {
  return (
    <footer role="contentinfo" className="hidden md:block border-t bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800">
      <div className="container mx-auto px-4 py-6 text-sm text-gray-600 dark:text-gray-400">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <span>
            © {new Date().getFullYear()} {siteConfig.name}
          </span>
          <div className="flex flex-wrap items-center gap-4 md:gap-6">
            <Link href="/legal/terms" className="hover:text-[#FFC000] transition-colors">
              Términos
            </Link>
            <Link href="/legal/privacy" className="hover:text-[#FFC000] transition-colors">
              Privacidad
            </Link>
            <Link href="/legal/cookies" className="hover:text-[#FFC000] transition-colors">
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

