'use client';

import { useState } from 'react';
import Link from 'next/link';
import { siteConfig } from '@/config/site';


export function SiteFooter() {
  const [legalModalOpen, setLegalModalOpen] = useState(false);

  return (
    <>
      <footer role="contentinfo" className="border-t hidden md:block bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 py-6 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center justify-between">
            <span>
              © {new Date().getFullYear()} {siteConfig.name}
            </span>
            <div className="flex items-center gap-6">
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
    </>
  );
}
