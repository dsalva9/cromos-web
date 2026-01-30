'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';

const GA_MEASUREMENT_ID = 'G-27DY11PMLQ';

export default function GoogleAnalytics() {
    const [consent, setConsent] = useState<string | null>(null);

    useEffect(() => {
        // Check local storage for consent
        const savedConsent = localStorage.getItem('cookie-consent');
        setConsent(savedConsent);

        // Listen for custom event when consent is updated
        const handleConsentChange = () => {
            setConsent(localStorage.getItem('cookie-consent'));
        };

        window.addEventListener('cookie-consent-updated', handleConsentChange);
        return () => window.removeEventListener('cookie-consent-updated', handleConsentChange);
    }, []);

    if (consent !== 'accepted') {
        return null;
    }

    return (
        <>
            <Script
                src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
                strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
                {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());

          gtag('config', '${GA_MEASUREMENT_ID}', {
            page_path: window.location.pathname,
          });
        `}
            </Script>
        </>
    );
}
