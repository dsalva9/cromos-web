'use client';

import Link from '@/components/ui/link';
import { ModernCard, ModernCardContent } from '@/components/ui/modern-card';
import { Shield, FileText, Cookie, ChevronRight, ExternalLink } from 'lucide-react';

export function LegalSettingsTab() {
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
                                    <FileText className="w-5 h-5 text-[#FFC000]" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white">Términos de Servicio</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                        Normas de la comunidad y condiciones de uso
                                    </p>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#FFC000] transition-colors" />
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
                                    <h3 className="font-bold text-gray-900 dark:text-white">Política de Privacidad</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                        Cómo gestionamos y protegemos tus datos
                                    </p>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                        </Link>

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
                                    <h3 className="font-bold text-gray-900 dark:text-white">Política de Cookies</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                        Uso de cookies y tecnologías similares
                                    </p>
                                </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-500 transition-colors" />
                        </Link>
                    </div>
                </ModernCardContent>
            </ModernCard>

            <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                    Versión 1.6.0 | © {new Date().getFullYear()} Cambiocromos.com
                </p>
            </div>
        </div>
    );
}
