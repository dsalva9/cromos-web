'use client';

import { useState, useCallback } from 'react';
import Link from '@/components/ui/link';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Shield, FileText, Cookie, ChevronRight, SlidersHorizontal, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { isNative } from '@/lib/platform';

export function LegalSettingsTab() {
    const t = useTranslations('settings');
    const [consentLoading, setConsentLoading] = useState(false);

    const handleConsentSettings = useCallback(async () => {
        if (consentLoading) return;
        setConsentLoading(true);
        try {
            const { AdMob, AdmobConsentDebugGeography } = await import('@capacitor-community/admob');
            // requestConsentInfo loads the latest consent state from Google's servers
            const consentInfo = await AdMob.requestConsentInfo({
                debugGeography: AdmobConsentDebugGeography.DISABLED,
                testDeviceIdentifiers: [],
            });
            // showPrivacyOptionsForm is the correct API for settings pages —
            // it shows the "Manage options" form even when consent is already obtained.
            // showConsentForm only shows when consent is newly required.
            // PrivacyOptionsRequirementStatus enum is not exported from package root,
            // so we compare against the string value directly.
            if (consentInfo.privacyOptionsRequirementStatus === 'REQUIRED') {
                await AdMob.showPrivacyOptionsForm();
            } else {
                console.log('[AdMob] Privacy options form not required in this region:', consentInfo.privacyOptionsRequirementStatus);
            }
        } catch (err) {
            console.warn('[AdMob] Failed to show privacy options form:', err);
        } finally {
            setConsentLoading(false);
        }
    }, [consentLoading]);

    return (
        <div className="space-y-4 md:space-y-6">
            <ModernCard className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <ModernCardContent className="p-0 overflow-hidden">
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {/* Terms */}
                        <Link
                            href="/legal/terms"
                            className="flex items-center justify-between px-6 py-5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-gold" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white">{t('legal.terms.title')}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('legal.terms.description')}</p>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gold transition-colors" />
                        </Link>

                        {/* Privacy */}
                        <Link
                            href="/legal/privacy"
                            className="flex items-center justify-between px-6 py-5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                                    <Shield className="w-5 h-5 text-blue-500" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white">{t('legal.privacy.title')}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('legal.privacy.description')}</p>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                        </Link>

                        {/* Ad Privacy Preferences — native Android only */}
                        {isNative() && (
                            <button
                                onClick={handleConsentSettings}
                                disabled={consentLoading}
                                className="w-full flex items-center justify-between px-6 py-5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group disabled:opacity-60"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                                        {consentLoading
                                            ? <Loader2 className="w-5 h-5 text-green-500 animate-spin" />
                                            : <SlidersHorizontal className="w-5 h-5 text-green-500" />
                                        }
                                    </div>
                                    <div className="text-left">
                                        <h3 className="font-bold text-gray-900 dark:text-white">{t('legal.adPrivacy.title')}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('legal.adPrivacy.description')}</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-green-500 transition-colors" />
                            </button>
                        )}

                        {/* Cookies */}
                        <Link
                            href="/legal/cookies"
                            className="flex items-center justify-between px-6 py-5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                                    <Cookie className="w-5 h-5 text-purple-500" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white">{t('legal.cookies.title')}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('legal.cookies.description')}</p>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-500 transition-colors" />
                        </Link>
                    </div>
                </ModernCardContent>
            </ModernCard>

            <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('legal.version')}  1.6.0 | © {new Date().getFullYear()} Cambiocromos.com
                </p>
            </div>
        </div>
    );
}

