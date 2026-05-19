'use client';

import Link from '@/components/ui/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import MarketplaceShowcase from './MarketplaceShowcase';
import AnimatedPhoneMockup from './AnimatedPhoneMockup';
import PWAInstallButton from '@/components/pwa/PWAInstallButton';
import { ArrowRight, Check, Search, Trophy } from 'lucide-react';

export default function LandingPage() {
    const t = useTranslations('landing');
    const tAbout = useTranslations('legal.about');
    const tFaq = useTranslations('legal.faq');

    const questions = [
        { q: tFaq('q1'), a: tFaq('a1') },
        { q: tFaq('q2'), a: tFaq('a2') },
        { q: tFaq('q3'), a: tFaq('a3') },
        { q: tFaq('q4'), a: tFaq('a4') },
        { q: tFaq('q5'), a: tFaq('a5') },
        { q: tFaq('q6'), a: tFaq('a6') },
        { q: tFaq('q7'), a: tFaq('a7') },
        { q: tFaq('q8'), a: tFaq('a8') },
        { q: tFaq('q9'), a: tFaq('a9') },
    ];

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-yellow-50 via-white to-yellow-100/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
            {/* Hero Section */}
            <section className="relative overflow-hidden pt-5 pb-2 lg:pt-12 lg:pb-4">
                {/* Background Decorative Shapes */}
                <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-[800px] h-[800px] bg-gold/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-[600px] h-[600px] bg-gold/10 rounded-full blur-3xl pointer-events-none" />

                <div className="container mx-auto px-4 relative z-10">
                    <div className="flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-16 max-w-6xl mx-auto">

                        {/* Hero Content (Centered) */}
                        <div className="flex-1 max-w-2xl text-center space-y-6 lg:space-y-8 flex flex-col items-center">
                            <Badge className="bg-gold text-black border-2 border-black px-4 py-1 text-sm font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] uppercase tracking-wide w-fit">
                                {t('hero.badge')}
                            </Badge>

                            <div className="relative w-64 h-64 lg:w-80 lg:h-80 mb-0 -mt-6 lg:-mt-8 animate-in fade-in slide-in-from-bottom-10 duration-1000">
                                <Image
                                    src="/assets/LogoBlanco.png"
                                    alt="Logo"
                                    fill
                                    priority
                                    className="object-contain drop-shadow-xl"
                                />
                            </div>


                            <h1 className="-mt-6 lg:-mt-8 text-5xl lg:text-7xl font-black uppercase tracking-tight text-gray-900 dark:text-white leading-[0.9]">
                                {t('hero.titleLine1')} <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold to-yellow-500 drop-shadow-sm">
                                    {t('hero.titleLine2')}
                                </span>
                            </h1>

                            <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                                {t('hero.descriptionPart1')}<span className="text-black dark:text-white font-black bg-gold/20 dark:bg-gold/10 px-1 rounded transform -rotate-1 inline-block border-b-2 border-gold">{t('hero.descriptionHighlight')}</span>
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 pt-2 w-full sm:w-auto">
                                <Button
                                    asChild
                                    size="lg"
                                    className="bg-gold hover:bg-yellow-400 text-black font-black text-lg h-14 px-8 border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 active:translate-y-0 active:shadow-none rounded-xl"
                                >
                                    <Link href="/signup">
                                        {t('hero.startTrading')}
                                    </Link>
                                </Button>
                                <Button
                                    asChild
                                    size="lg"
                                    variant="outline"
                                    className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm text-black dark:text-white font-bold text-lg h-14 px-8 border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 active:translate-y-0 active:shadow-none rounded-xl cursor-pointer"
                                >
                                    <Link href="/explorar">{t('hero.exploreMarket')}</Link>
                                </Button>
                            </div>

                            <Link
                                href="/login"
                                className="text-gray-600 dark:text-gray-400 font-bold hover:text-gold transition-colors flex items-center justify-center gap-2 text-sm pt-2"
                            >
                                {t('hero.alreadyHaveAccount')} <span className="text-black dark:text-white border-b-2 border-gold">{t('hero.login')}</span>
                            </Link>

                            {/* Download Section — mobile only */}
                            <div className="flex flex-col items-center gap-3 pt-4 md:hidden">
                                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                                    {t('hero.availableOn')}
                                </p>
                                <div className="flex flex-row items-center gap-4">
                                    <a
                                        href="https://play.google.com/store/apps/details?id=com.cambiocromos.app"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2.5 bg-black hover:bg-gray-800 text-white rounded-lg px-5 h-[48px] transition-colors"
                                    >
                                        {/* Google Play icon */}
                                        <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.302 2.302a1 1 0 0 1 0 1.38l-2.302 2.302L15.396 13l2.302-2.492zM5.864 3.458L16.8 9.791l-2.302 2.302-8.635-8.635z" fill="#34A853"/>
                                            <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92z" fill="#4285F4"/>
                                            <path d="M5.864 3.458L16.8 9.791l-2.302 2.302-8.635-8.635z" fill="#EA4335"/>
                                            <path d="M16.8 14.209l-2.302 2.302-8.635 8.635L16.8 14.209z" fill="#FBBC05"/>
                                            <path d="M5.864 20.542l8.635-8.635 2.302 2.302L5.864 20.542z" fill="#34A853"/>
                                        </svg>
                                        <span className="text-sm font-semibold">Google Play</span>
                                    </a>
                                    <PWAInstallButton />
                                </div>
                            </div>

                            {/* Phone Mockup - MOBILE ONLY */}
                            <AnimatedPhoneMockup className="flex justify-center relative w-full max-w-[260px] perspective-[2000px] mt-2 lg:hidden" flat />

                        </div>

                        {/* Right Phone Mockup - DESKTOP ONLY */}
                        <AnimatedPhoneMockup />
                    </div>
                </div>
            </section>

            {/* Features Section - Condensed on Mobile */}
            <section className="py-4 lg:py-6 relative bg-gradient-to-b from-transparent via-yellow-50/30 to-yellow-100/60 dark:via-yellow-900/5 dark:to-yellow-900/10">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 max-w-6xl mx-auto">

                        {/* Feature 1 */}
                        <div className="group p-4 lg:p-6 rounded-2xl lg:rounded-3xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border-2 border-transparent hover:border-gold transition-all duration-300 flex flex-row md:flex-col items-center md:items-start gap-4 md:gap-0">
                            <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl bg-gold flex items-center justify-center shadow-lg shrink-0">
                                <Check className="w-6 h-6 lg:w-8 lg:h-8 text-black" strokeWidth={3} />
                            </div>
                            <div className="md:mt-4">
                                <h3 className="text-lg lg:text-xl font-black uppercase mb-1 lg:mb-2 text-gray-900 dark:text-white">{t('features.feature1.title')}</h3>
                                <p className="text-sm lg:text-base text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2 md:line-clamp-none">
                                    {t('features.feature1.desc')}
                                </p>
                            </div>
                        </div>

                        {/* Feature 2 */}
                        <div className="group p-4 lg:p-6 rounded-2xl lg:rounded-3xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border-2 border-transparent hover:border-gold transition-all duration-300 flex flex-row md:flex-col items-center md:items-start gap-4 md:gap-0">
                            <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl bg-black dark:bg-white flex items-center justify-center shadow-lg shrink-0">
                                <Search className="w-6 h-6 lg:w-7 lg:h-7 text-white dark:text-black" strokeWidth={3} />
                            </div>
                            <div className="md:mt-4">
                                <h3 className="text-lg lg:text-xl font-black uppercase mb-1 lg:mb-2 text-gray-900 dark:text-white">{t('features.feature2.title')}</h3>
                                <p className="text-sm lg:text-base text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2 md:line-clamp-none">
                                    {t('features.feature2.desc')}
                                </p>
                            </div>
                        </div>

                        {/* Feature 3 */}
                        <div className="group p-4 lg:p-6 rounded-2xl lg:rounded-3xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border-2 border-transparent hover:border-gold transition-all duration-300 flex flex-row md:flex-col items-center md:items-start gap-4 md:gap-0">
                            <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shrink-0">
                                <Trophy className="w-6 h-6 lg:w-7 lg:h-7 text-white" strokeWidth={3} />
                            </div>
                            <div className="md:mt-4">
                                <h3 className="text-lg lg:text-xl font-black uppercase mb-1 lg:mb-2 text-gray-900 dark:text-white">{t('features.feature3.title')}</h3>
                                <p className="text-sm lg:text-base text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2 md:line-clamp-none">
                                    {t('features.feature3.desc')}
                                </p>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* Blog CTA */}
            <section className="py-8 lg:py-12 bg-gradient-to-b from-yellow-100/60 via-yellow-50/30 to-transparent dark:from-yellow-900/10 dark:via-gray-900/50 dark:to-transparent">
                <div className="container mx-auto px-4">
                    <Link href="/blog" className="block max-w-2xl mx-auto group">
                        <div className="relative overflow-hidden rounded-2xl border-2 border-gold/30 dark:border-gold/20 bg-gradient-to-br from-yellow-50 via-white to-amber-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-750 p-6 md:p-8 shadow-lg hover:shadow-xl hover:border-gold transition-all duration-300">
                            {/* Decorative accent */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gold via-yellow-400 to-gold" />

                            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                                <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gold/10 dark:bg-gold/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gold"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                                </div>
                                <div className="flex-1 text-center sm:text-left">
                                    <p className="text-gray-700 dark:text-gray-200 text-base md:text-lg font-medium">
                                        {t('blogCta.text')}
                                    </p>
                                    <span className="inline-flex items-center gap-1 mt-2 text-gold font-bold text-sm md:text-base group-hover:underline">
                                        {t('blogCta.link')} →
                                    </span>
                                </div>
                            </div>
                        </div>
                    </Link>
                </div>
            </section>

            {/* Marketplace Preview */}
            <div id="marketplace" className="relative">
                {/* Subtle warm background tint for marketplace section */}
                <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-yellow-100/30 to-transparent dark:from-yellow-900/10 dark:to-transparent pointer-events-none" />
                <MarketplaceShowcase />
            </div>

            {/* SEO Context Paragraph */}
            <section className="py-12 lg:py-16 bg-gradient-to-b from-yellow-50/20 via-gray-100/60 to-transparent dark:from-gray-800/20 dark:via-gray-800/40 dark:to-transparent">
                <div className="container mx-auto px-4">
                    <div className="max-w-3xl mx-auto text-center space-y-4">
                        <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-gray-900 dark:text-white">
                            {t('seo.title')}
                        </h2>
                        <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 leading-relaxed">
                            {t('seo.desc')}
                        </p>
                    </div>
                </div>
            </section>

            {/* Social Media Follow */}
            <section className="py-10 lg:py-14">
                <div className="container mx-auto px-4">
                    <div className="max-w-2xl mx-auto text-center space-y-5">
                        <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight text-gray-900 dark:text-white">
                            {t('social.title')}
                        </h3>
                        <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 leading-relaxed">
                            {t('social.subtitle')}
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                            <a
                                href="https://www.instagram.com/cambiocromos.comm/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 hover:from-purple-700 hover:via-pink-600 hover:to-orange-500 text-white rounded-xl px-6 h-12 transition-all hover:scale-105 hover:shadow-lg font-bold text-sm shadow-md"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C16.67.014 16.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                                </svg>
                                Instagram
                            </a>
                            <a
                                href="https://www.tiktok.com/@cambiocromos.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-3 bg-black hover:bg-gray-800 text-white rounded-xl px-6 h-12 transition-all hover:scale-105 hover:shadow-lg font-bold text-sm shadow-md"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.48v-7.13a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-.8-.07 4.86 4.86 0 01-.39-3.91z"/>
                                </svg>
                                TikTok
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* About & FAQ Grid Section */}
            <section className="py-16 lg:py-24 bg-gray-50/50 dark:bg-gray-900/50 border-y-2 border-gray-100 dark:border-gray-800">
                <div className="container mx-auto px-4 max-w-6xl">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
                        
                        {/* Left Column: About Us */}
                        <div className="lg:col-span-5 space-y-6">
                            <div className="space-y-4">
                                <h2 className="text-3xl lg:text-4xl font-black uppercase text-gray-900 dark:text-white tracking-tight border-b-4 border-gold pb-2 w-fit">
                                    {tAbout('title')}
                                </h2>
                                <p className="text-lg font-bold text-gray-900 dark:text-white pt-2">
                                    {tAbout('greeting')}
                                </p>
                            </div>
                            <div className="space-y-4 text-gray-600 dark:text-gray-400 leading-relaxed text-sm md:text-base">
                                <p>{tAbout('intro')}</p>
                                <p>{tAbout('origin')}</p>
                                <p>{tAbout('spark')}</p>
                                <blockquote className="border-l-4 border-gold pl-4 italic font-semibold text-gray-700 dark:text-gray-300 my-4">
                                    &ldquo;{tAbout('quote')}&rdquo;
                                </blockquote>
                                <p>{tAbout('start')}</p>
                                <p>{tAbout('team')}</p>
                                <p>{tAbout('born')}</p>
                                {tAbout('community') && <p>{tAbout('community')}</p>}
                                <p>{tAbout('mission')}</p>
                                <p className="font-bold text-gray-900 dark:text-white text-base">
                                    {tAbout('cta')}
                                </p>
                            </div>
                        </div>

                        {/* Right Column: FAQ */}
                        <div className="lg:col-span-7 space-y-6">
                            <h2 className="text-3xl lg:text-4xl font-black uppercase text-gray-900 dark:text-white tracking-tight border-b-4 border-gold pb-2 w-fit mb-6">
                                {tFaq('title')}
                            </h2>
                            <div className="space-y-4">
                                {questions.map((item, i) => (
                                    <div 
                                        key={i} 
                                        className="bg-white dark:bg-gray-800 p-6 rounded-2xl border-2 border-gray-100 dark:border-gray-800 hover:border-gold/50 shadow-sm transition-all duration-300"
                                    >
                                        <h3 className="text-base md:text-lg font-black text-gray-900 dark:text-white mb-2">
                                            {item.q}
                                        </h3>
                                        <p
                                            className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm md:text-base"
                                            dangerouslySetInnerHTML={{ __html: item.a }}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-24 bg-gold relative overflow-hidden">
                {/* Pattern Overlay */}
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

                <div className="container mx-auto px-4 text-center relative z-10">
                    <h2 className="text-4xl md:text-6xl font-black uppercase mb-8 text-black tracking-tight">
                        {t('cta.title')}
                    </h2>
                    <p className="text-xl md:text-2xl text-black/80 font-bold max-w-2xl mx-auto mb-10">
                        {t('cta.desc')}
                    </p>
                    <Button
                        asChild
                        size="lg"
                        className="bg-black hover:bg-gray-800 text-white font-black text-xl h-16 px-12 border-2 border-transparent shadow-2xl transition-all hover:scale-105 rounded-full"
                    >
                        <Link href="/signup">
                            {t('cta.button')} <ArrowRight className="ml-2 w-6 h-6" />
                        </Link>
                    </Button>
                </div>
            </section>
        </div>
    );
}
