import SiteHeader from '@/components/site-header';
import { SiteFooter } from '@/components/layout/SiteFooter';

export default function LegalLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
            <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 md:p-10">
                    {children}
                </div>
            </main>
        </div>
    );
}
