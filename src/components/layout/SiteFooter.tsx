'use client';

import { useState } from 'react';
import { siteConfig } from '@/config/site';
import { LegalModal } from '@/components/legal/LegalModal';

export function SiteFooter() {
  const [legalModalOpen, setLegalModalOpen] = useState(false);

  return (
    <>
      <footer role="contentinfo" className="border-t hidden md:block bg-gray-50 border-gray-200">
        <div className="container mx-auto px-4 py-6 text-sm text-gray-600">
          <div className="flex items-center justify-between">
            <span>
              © {new Date().getFullYear()} {siteConfig.name}
            </span>
            <button
              onClick={() => setLegalModalOpen(true)}
              className="text-[#FFC000] hover:text-[#FFD700] underline font-medium transition-colors"
            >
              Información Legal
            </button>
          </div>
        </div>
      </footer>
      <LegalModal open={legalModalOpen} onOpenChange={setLegalModalOpen} />
    </>
  );
}
